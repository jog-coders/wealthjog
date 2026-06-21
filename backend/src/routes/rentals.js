// rentals.js — rewritten to use new `properties` + `transactions` tables
import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * After saving a property, keep three linked records in sync:
 *   1. balance_sheet_accounts — real_estate asset  (market value)
 *   2. balance_sheet_accounts — mortgage_liability  (current balance + monthly P&I+escrow)
 *   3. income_sources         — rental income       (gross monthly rent)
 *
 * Strategy: find existing row by linked_property_id, then UPDATE; if none, INSERT.
 * Passing p = null removes all three (called on property delete).
 */
async function syncPropertyRecords(userId, p) {
  if (!p) return; // guard

  const propertyId   = p.id;
  const label        = p.property_name || p.address || 'Rental Property';
  const valueCents   = p.property_value_cents   || 0;
  const mortgageCents = Math.abs(p.mortgage_balance_cents || 0);
  const rentCents    = p.gross_rent_cents        || 0;
  const piCents      = p.pi_cents                || 0;
  const escrowCents  = p.escrow_cents            || 0;
  const monthlyPaymentCents = piCents + escrowCents;
  const pmFeesCents  = p.property_management_fees_cents || 0;
  const bank         = p.mortgage_bank           || null;

  // ── 1. Real-estate asset ─────────────────────────────────────────────────────
  const { data: existingAsset } = await supabase
    .from('balance_sheet_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('linked_property_id', propertyId)
    .eq('account_class', 'real_estate')
    .maybeSingle();

  if (existingAsset) {
    await supabase.from('balance_sheet_accounts').update({
      name: label,
      current_balance_cents: valueCents,
      institution: bank,
      updated_at: new Date().toISOString(),
    }).eq('id', existingAsset.id);
  } else {
    await supabase.from('balance_sheet_accounts').insert({
      user_id: userId,
      name: label,
      account_class: 'real_estate',
      current_balance_cents: valueCents,
      institution: bank,
      linked_property_id: propertyId,
      sort_order: 9999,
    });
  }

  // ── 2. Mortgage liability ────────────────────────────────────────────────────
  const { data: existingMortgage } = await supabase
    .from('balance_sheet_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('linked_property_id', propertyId)
    .eq('account_class', 'mortgage_liability')
    .maybeSingle();

  if (mortgageCents > 0) {
    const mortgageRow = {
      name: `${label} – Mortgage`,
      account_class: 'mortgage_liability',
      current_balance_cents: -mortgageCents,   // liabilities stored as negative
      monthly_payment_cents: monthlyPaymentCents,
      institution: bank,
      linked_property_id: propertyId,
      updated_at: new Date().toISOString(),
    };
    if (existingMortgage) {
      await supabase.from('balance_sheet_accounts').update(mortgageRow).eq('id', existingMortgage.id);
    } else {
      await supabase.from('balance_sheet_accounts').insert({ user_id: userId, ...mortgageRow, sort_order: 9999 });
    }
    // Sync mortgage payment into Fixed Monthly budget
    await syncBudgetEntry(userId, `${label} – Mortgage`, monthlyPaymentCents);
  } else if (existingMortgage) {
    // Mortgage paid off — remove the record and its budget entry
    await supabase.from('balance_sheet_accounts').delete().eq('id', existingMortgage.id);
    await syncBudgetEntry(userId, `${label} – Mortgage`, 0);
  }

  // ── 3. Property management fee → Fixed Monthly budget ────────────────────────
  await syncBudgetEntry(userId, `${label} – PM Fees`, pmFeesCents);

  // ── 4. Rental income source ──────────────────────────────────────────────────
  const { data: existingIncome } = await supabase
    .from('income_sources')
    .select('id')
    .eq('user_id', userId)
    .eq('linked_property_id', propertyId)
    .maybeSingle();

  if (rentCents > 0) {
    const incomeRow = {
      name: `${label} – Rental Income`,
      source_type: 'rental',
      monthly_amount_cents: rentCents,
      frequency: 'Monthly',
      linked_property_id: propertyId,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (existingIncome) {
      await supabase.from('income_sources').update(incomeRow).eq('id', existingIncome.id);
    } else {
      await supabase.from('income_sources').insert({ user_id: userId, ...incomeRow });
    }
  } else if (existingIncome) {
    await supabase.from('income_sources').delete().eq('id', existingIncome.id);
  }
}

/** Shared helper: upsert / remove an auto-injected fixed-cost budget entry by name. */
async function syncBudgetEntry(userId, name, monthlyCents) {
  await supabase.from('budget_categories').delete()
    .eq('user_id', userId).eq('name', name).eq('is_auto_injected', true);
  if (monthlyCents > 0) {
    await supabase.from('budget_categories').insert({
      user_id: userId, name, category_type: 'fixed_cost',
      monthly_amount_cents: monthlyCents, is_auto_injected: true,
      sort_order: 9999, is_active: true,
    });
  }
}

// Helper: map a properties row to the shape expected by the frontend
function toShape(p) {
  const addressObj = {
    street:  p.address_street || '',
    city:    p.address_city   || '',
    state:   p.address_state  || '',
    zip:     p.address_zip    || '',
    country: '',
  };
  return {
    ...p,
    property_name: p.property_name || p.address || '',
    address: addressObj,
    status_occupied: p.is_occupied ?? true,
    current_market_value: (p.property_value_cents || 0) / 100,
    purchase_price:       (p.purchase_price_cents || 0) / 100,
    mortgage_initial_amount: (p.mortgage_initial_cents || 0) / 100,
    rent:             (p.gross_rent_cents || 0) / 100,
    mortgage_balance: Math.abs(p.mortgage_balance_cents || 0) / 100,
    mortgage_pi:      (p.pi_cents || 0) / 100,
    mortgage_escrow:  (p.escrow_cents || 0) / 100,
    mortgage_interest_rate: p.interest_rate ? parseFloat((p.interest_rate * 100).toFixed(4)) : '',
    property_management_fees: (p.property_management_fees_cents || 0) / 100,
  };
}

// Helper: build a DB insert/update payload from request body fields
function toDbPayload(body) {
  const {
    property_name, address, status_occupied,
    purchase_price, current_market_value, purchase_date, closing_date,
    rent, property_management_fees,
    mortgage_initial_amount, mortgage_balance, mortgage_interest_rate,
    mortgage_pi, mortgage_escrow, mortgage_bank,
    mortgage_loan_number, mortgage_maturity_date,
    lease_tenant_name, lease_start_date, lease_end_date, lease_document_url,
    pm_name, pm_poc, pm_email, pm_phone,
    notes, is_active,
  } = body;

  const payload = {};

  if (property_name !== undefined) payload.property_name = property_name;
  if (status_occupied !== undefined) payload.is_occupied = status_occupied;

  // address comes as { street, city, state, zip } from the form
  if (address !== undefined) {
    if (address && typeof address === 'object') {
      payload.address_street = address.street || null;
      payload.address_city   = address.city   || null;
      payload.address_state  = address.state  || null;
      payload.address_zip    = address.zip    || null;
      // Keep the flat address column as a combined display string
      const parts = [address.street, address.city, address.state, address.zip].filter(Boolean);
      payload.address = parts.join(', ') || property_name || '';
    } else {
      payload.address = address;
    }
  }
  if (notes        !== undefined) payload.notes          = notes;
  if (is_active    !== undefined) payload.is_active      = is_active;

  // Cents conversions
  if (purchase_price       !== undefined) payload.purchase_price_cents       = Math.round((parseFloat(purchase_price) || 0) * 100);
  if (current_market_value !== undefined) payload.property_value_cents       = Math.round((parseFloat(current_market_value) || 0) * 100);
  if (rent                 !== undefined) payload.gross_rent_cents           = Math.round((parseFloat(rent) || 0) * 100);
  if (mortgage_initial_amount !== undefined) payload.mortgage_initial_cents  = Math.round((parseFloat(mortgage_initial_amount) || 0) * 100);
  if (mortgage_balance     !== undefined) payload.mortgage_balance_cents     = Math.round((parseFloat(mortgage_balance) || 0) * 100);
  if (mortgage_pi          !== undefined) payload.pi_cents                   = Math.round((parseFloat(mortgage_pi) || 0) * 100);
  if (mortgage_escrow      !== undefined) payload.escrow_cents               = Math.round((parseFloat(mortgage_escrow) || 0) * 100);
  if (property_management_fees !== undefined) payload.property_management_fees_cents = Math.round((parseFloat(property_management_fees) || 0) * 100);

  // Rate: frontend sends percentage like 6.75, store as 0.0675
  if (mortgage_interest_rate !== undefined && mortgage_interest_rate !== '') {
    payload.interest_rate = parseFloat(mortgage_interest_rate) / 100;
  }

  // Dates (null if empty)
  const toDate = v => (v && String(v).trim() !== '' ? v : null);
  if (purchase_date         !== undefined) payload.purchase_date          = toDate(purchase_date);
  if (closing_date          !== undefined) payload.closing_date           = toDate(closing_date);
  if (mortgage_maturity_date !== undefined) payload.mortgage_maturity_date = toDate(mortgage_maturity_date);
  if (lease_start_date      !== undefined) payload.lease_start_date       = toDate(lease_start_date);
  if (lease_end_date        !== undefined) payload.lease_end_date         = toDate(lease_end_date);

  // Text fields
  if (mortgage_bank        !== undefined) payload.mortgage_bank        = mortgage_bank;
  if (mortgage_loan_number !== undefined) payload.mortgage_loan_number  = mortgage_loan_number;
  if (lease_tenant_name    !== undefined) payload.lease_tenant_name     = lease_tenant_name;
  if (lease_document_url   !== undefined) payload.lease_document_url    = lease_document_url;
  if (pm_name              !== undefined) payload.pm_name               = pm_name;
  if (pm_poc               !== undefined) payload.pm_poc                = pm_poc;
  if (pm_email             !== undefined) payload.pm_email              = pm_email;
  if (pm_phone             !== undefined) payload.pm_phone              = pm_phone;

  return payload;
}

// ── Property CRUD ─────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(toShape));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;
    res.json(toShape(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/',
  [body('property_name').notEmpty().withMessage('property_name is required')],
  validate,
  async (req, res) => {
    try {
      const payload = toDbPayload(req.body);
      payload.user_id = req.userId;
      if (!payload.address) payload.address = req.body.property_name || '';

      const { data, error } = await supabase
        .from('properties').insert([payload]).select().single();

      if (error) throw error;
      await syncPropertyRecords(req.userId, data);
      res.json(toShape(data));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id',
  [body('property_name').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const payload = toDbPayload(req.body);
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('properties').update(payload)
        .eq('id', req.params.id).eq('user_id', req.userId)
        .select().single();

      if (error) throw error;
      await syncPropertyRecords(req.userId, data);
      res.json(toShape(data));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    // Fetch property before deleting so we can clean up linked records
    const { data: property } = await supabase
      .from('properties').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();

    const { error } = await supabase
      .from('properties').delete()
      .eq('id', req.params.id).eq('user_id', req.userId);

    if (error) throw error;

    // Remove linked asset, liability, income, and budget entries
    if (property) {
      const label = property.property_name || property.address || 'Rental Property';
      await supabase.from('balance_sheet_accounts').delete()
        .eq('user_id', req.userId).eq('linked_property_id', req.params.id);
      await supabase.from('income_sources').delete()
        .eq('user_id', req.userId).eq('linked_property_id', req.params.id);
      await syncBudgetEntry(req.userId, `${label} – Mortgage`, 0);
      await syncBudgetEntry(req.userId, `${label} – PM Fees`, 0);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const { data, error } = await supabase
      .from('properties')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(toShape(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Ledger — now reads from transactions filtered by property_id ───────────────

router.get('/:id/ledger', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, budget_categories(id, name)')
      .eq('user_id', req.userId)
      .eq('property_id', req.params.id)
      .is('parent_tx_id', null)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(t => ({
      ...t,
      amount: t.amount_cents / 100,
      budget_category: t.budget_categories?.name || '',
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/ledger',
  [body('amount').isFloat(), body('date').isISO8601()],
  validate,
  async (req, res) => {
    try {
      // amount_cents: positive = expense, negative = income
      // Frontend sends signed float: negative for expenses, positive for income
      const { amount, date, vendor, notes, category_id, schedule_e_cat } = req.body;
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: req.userId,
          property_id: req.params.id,
          amount_cents: Math.round(parseFloat(amount) * 100),
          date,
          vendor: vendor || 'Unknown',
          notes,
          category_id: category_id || null,
          schedule_e_cat: schedule_e_cat || null,
          status: category_id || schedule_e_cat ? 'categorized' : 'uncategorized',
          import_source: 'manual',
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({ ...data, amount: data.amount_cents / 100 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id/ledger/:txId',
  [body('amount').isFloat(), body('date').isISO8601()],
  validate,
  async (req, res) => {
    try {
      const { amount, date, vendor, notes, category_id, schedule_e_cat } = req.body;
      const { data, error } = await supabase
        .from('transactions')
        .update({
          amount_cents: Math.round(parseFloat(amount) * 100),
          date,
          vendor,
          notes,
          category_id: category_id || null,
          schedule_e_cat: schedule_e_cat || null,
          status: category_id ? 'categorized' : 'uncategorized',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.txId)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ ...data, amount: data.amount_cents / 100 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id/ledger/:txId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.txId)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── History stub — returns monthly aggregates from transactions ───────────────

// ── Bulk CSV Import ───────────────────────────────────────────────────────────
// Accepts pre-parsed rows from the client. Each row must include property_id.
// amount_cents convention: positive = expense, negative = income.
router.post('/import', async (req, res) => {
  try {
    const { rows } = req.body; // [{ property_id, date, vendor, notes, amount_cents, schedule_e_cat }]
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const inserts = rows.map(r => ({
      user_id:       req.userId,
      property_id:   r.property_id,
      date:          r.date,
      vendor:        r.vendor || 'Unknown',
      notes:         r.notes  || null,
      amount_cents:  Math.round(parseFloat(r.amount_cents) || 0),
      schedule_e_cat:r.schedule_e_cat || null,
      status:        r.schedule_e_cat ? 'categorized' : 'uncategorized',
      import_source: 'csv',
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(inserts)
      .select();

    if (error) throw error;
    res.json({ imported: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Financial Value History (property_snapshots) ────────────────────────────

function snapshotToShape(s) {
  return {
    ...s,
    market_value:    (s.market_value_cents    || 0) / 100,
    monthly_rent:    (s.monthly_rent_cents    || 0) / 100,
    pm_fees:         (s.pm_fees_cents         || 0) / 100,
    mortgage_balance:(s.mortgage_balance_cents|| 0) / 100,
  };
}

router.get('/:id/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('property_snapshots')
      .select('*')
      .eq('user_id', req.userId)
      .eq('property_id', req.params.id)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(snapshotToShape));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/history', async (req, res) => {
  try {
    const { date, market_value, monthly_rent, pm_fees, mortgage_balance, notes } = req.body;
    const { data, error } = await supabase
      .from('property_snapshots')
      .insert({
        user_id:               req.userId,
        property_id:           req.params.id,
        date,
        market_value_cents:    Math.round((parseFloat(market_value)    || 0) * 100),
        monthly_rent_cents:    Math.round((parseFloat(monthly_rent)    || 0) * 100),
        pm_fees_cents:         Math.round((parseFloat(pm_fees)         || 0) * 100),
        mortgage_balance_cents:Math.round((parseFloat(mortgage_balance)|| 0) * 100),
        notes: notes || null,
      })
      .select().single();
    if (error) throw error;

    // Sync the latest snapshot values back to the property row so the dashboard
    // always reflects current numbers
    await syncLatestSnapshot(req.userId, req.params.id);

    res.json(snapshotToShape(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/history/:snapId', async (req, res) => {
  try {
    const { date, market_value, monthly_rent, pm_fees, mortgage_balance, notes } = req.body;
    const { data, error } = await supabase
      .from('property_snapshots')
      .update({
        date,
        market_value_cents:    Math.round((parseFloat(market_value)    || 0) * 100),
        monthly_rent_cents:    Math.round((parseFloat(monthly_rent)    || 0) * 100),
        pm_fees_cents:         Math.round((parseFloat(pm_fees)         || 0) * 100),
        mortgage_balance_cents:Math.round((parseFloat(mortgage_balance)|| 0) * 100),
        notes: notes || null,
      })
      .eq('id', req.params.snapId)
      .eq('user_id', req.userId)
      .select().single();
    if (error) throw error;

    await syncLatestSnapshot(req.userId, req.params.id);

    res.json(snapshotToShape(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/history/:snapId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('property_snapshots')
      .delete()
      .eq('id', req.params.snapId)
      .eq('user_id', req.userId);
    if (error) throw error;

    await syncLatestSnapshot(req.userId, req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * After any snapshot change, pull the most recent snapshot for this property
 * and push its values back into the properties row + linked balance sheet accounts.
 */
async function syncLatestSnapshot(userId, propertyId) {
  const { data: snaps } = await supabase
    .from('property_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .order('date', { ascending: false })
    .limit(1);

  if (!snaps || snaps.length === 0) return;
  const latest = snaps[0];

  // Update the canonical property row
  await supabase.from('properties').update({
    property_value_cents:   latest.market_value_cents,
    gross_rent_cents:       latest.monthly_rent_cents,
    mortgage_balance_cents: latest.mortgage_balance_cents,
    property_management_fees_cents: latest.pm_fees_cents,
    updated_at: new Date().toISOString(),
  }).eq('id', propertyId).eq('user_id', userId);

  // Fetch updated property to re-sync linked records
  const { data: prop } = await supabase
    .from('properties').select('*').eq('id', propertyId).single();
  if (prop) await syncPropertyRecords(userId, prop);
}

export default router;
