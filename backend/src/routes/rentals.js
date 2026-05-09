import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';
import { maybeSnapshot } from '../services/netWorthSnapshot.js';

const router = express.Router();

async function upsertIntegrations(userId, property, snapshotDate = null) {
  const dateStr = snapshotDate || new Date().toISOString().split('T')[0];

  // 1. ASSET (Current Market Value)
  const { data: assetCheck } = await supabase.from('assets')
    .select('id')
    .eq('source_id', property.id)
    .eq('source_type', 'rental_property')
    .eq('date', dateStr)
    .maybeSingle();

  const assetData = {
    user_id: userId,
    name: property.property_name,
    type: 'Real Estate',
    institution: 'Real Estate Portfolio',
    amount: property.current_market_value,
    date: dateStr,
    is_auto_injected: true,
    source_id: property.id,
    source_type: 'rental_property',
    updated_at: new Date().toISOString()
  };
  if (assetCheck) {
    await supabase.from('assets').update(assetData).eq('id', assetCheck.id);
  } else {
    await supabase.from('assets').insert([assetData]);
  }

  // 2. LIABILITY (Mortgage Balance)
  if (Number(property.mortgage_balance) > 0) {
    const { data: liabCheck } = await supabase.from('liabilities')
      .select('id')
      .eq('source_id', property.id)
      .eq('source_type', 'rental_property')
      .eq('date', dateStr)
      .maybeSingle();

    const liabData = {
      user_id: userId,
      name: `${property.property_name} Mortgage`,
      type: 'RE Mortgage',
      institution: property.mortgage_bank || 'Mortgage Bank',
      amount: property.mortgage_balance,
      date: dateStr,
      is_auto_injected: true,
      source_id: property.id,
      source_type: 'rental_property',
      updated_at: new Date().toISOString()
    };
    if (liabCheck) {
      await supabase.from('liabilities').update(liabData).eq('id', liabCheck.id);
    } else {
      await supabase.from('liabilities').insert([liabData]);
    }
  } else {
    await supabase.from('liabilities').delete().eq('source_id', property.id).eq('source_type', 'rental_property');
  }

  // 3. INCOME (Rent) — keep this synced so rent appears in income tracker
  if (Number(property.rent) > 0) {
    const { data: incCheck } = await supabase.from('income').select('id').eq('source_id', property.id).eq('source_type', 'rental_property').maybeSingle();
    const incData = {
      user_id: userId,
      name: `${property.property_name} Rent`,
      type: 'Rental',
      frequency: 'Monthly',
      amount: property.rent,
      gross_income: property.rent,
      is_auto_injected: true,
      source_id: property.id,
      source_type: 'rental_property',
      updated_at: new Date().toISOString()
    };
    if (incCheck) await supabase.from('income').update(incData).eq('id', incCheck.id);
    else await supabase.from('income').insert([incData]);
  } else {
    await supabase.from('income').delete().eq('source_id', property.id).eq('source_type', 'rental_property');
  }

  // Clean up any previously auto-injected budget entries (mortgage/PM fees no longer auto-injected)
  await supabase.from('budget_line_items').delete().eq('source_id', property.id).eq('user_id', userId);

  await maybeSnapshot(userId);
}

async function deleteIntegrations(userId, propertyId) {
  await supabase.from('assets').delete().eq('source_id', propertyId).eq('user_id', userId);
  await supabase.from('liabilities').delete().eq('source_id', propertyId).eq('user_id', userId);
  // Also clean up any legacy budget/income entries
  await supabase.from('budget_line_items').delete().eq('source_id', propertyId).eq('user_id', userId);
  await supabase.from('income').delete().eq('source_id', propertyId).eq('user_id', userId);
  await maybeSnapshot(userId);
}

async function syncRentalFinancials(userId, propertyId) {
  // 1. Fetch latest history record
  const { data: latest } = await supabase
    .from('rental_financial_history')
    .select('*')
    .eq('rental_property_id', propertyId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const market_value = latest ? latest.market_value : 0;
  const rent = latest ? latest.monthly_rent : 0;
  const pm_fees = latest ? latest.pm_fees : 0;
  const mortgage_balance = latest ? latest.mortgage_balance : 0;

  // 2. Update rental_properties main row
  const { data: updatedProperty, error } = await supabase
    .from('rental_properties')
    .update({
      current_market_value: market_value,
      rent: rent,
      property_management_fees: pm_fees,
      mortgage_balance: mortgage_balance,
      updated_at: new Date().toISOString()
    })
    .eq('id', propertyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  // 3. Trigger integration upserts
  await upsertIntegrations(userId, updatedProperty, latest ? latest.date : null);
}


// --- CRUD ROUTES ---

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rental_properties')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/',
  [
    body('property_name').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const payload = { ...req.body, user_id: req.userId };
      const { data, error } = await supabase
        .from('rental_properties')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Create initial snapshot
      await supabase.from('rental_financial_history').insert([{
        rental_property_id: data.id,
        user_id: req.userId,
        date: new Date().toISOString().split('T')[0],
        market_value: data.current_market_value || 0,
        monthly_rent: data.rent || 0,
        pm_fees: data.property_management_fees || 0,
        notes: 'Initial property setup'
      }]);

      await upsertIntegrations(req.userId, data);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id',
  [
    body('property_name').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const payload = { ...req.body, updated_at: new Date().toISOString() };
      delete payload.id;
      delete payload.user_id;

      const { data, error } = await supabase
        .from('rental_properties')
        .update(payload)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;

      await upsertIntegrations(req.userId, data);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('rental_properties')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;

    await deleteIntegrations(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LEDGER ROUTES ---

async function syncLedgerToExpenses(userId, ledgerItem, propertyName) {
  if (ledgerItem.type !== 'Expense') return; // Only mirror expenses

  const expenseData = {
    user_id: userId,
    vendor: propertyName ? `${propertyName} - ${ledgerItem.category}` : ledgerItem.category,
    amount: ledgerItem.amount,
    date: ledgerItem.date,
    budget_category: propertyName ? `${propertyName} ${ledgerItem.category}` : ledgerItem.category, // Guess a budget category
    is_auto_injected: true,
    source_id: ledgerItem.id,
    source_type: 'rental_ledger',
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await supabase
    .from('expenses')
    .select('id')
    .eq('source_id', ledgerItem.id)
    .eq('source_type', 'rental_ledger')
    .maybeSingle();

  if (existing) {
    await supabase.from('expenses').update(expenseData).eq('id', existing.id);
  } else {
    await supabase.from('expenses').insert([expenseData]);
  }
}

async function removeLedgerFromExpenses(ledgerId) {
  await supabase.from('expenses').delete().eq('source_id', ledgerId).eq('source_type', 'rental_ledger');
}

router.get('/:id/ledger', async (req, res) => {
  try {
    const propertyId = req.params.id;
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const currentMonthDate = `${currentMonth}-01`;

    // 1. Fetch property details
    const { data: prop, error: propErr } = await supabase
      .from('rental_properties')
      .select('*')
      .eq('id', propertyId)
      .eq('user_id', req.userId)
      .single();

    if (propErr) throw propErr;

    // 2. Fetch existing automated entries for THIS month
    const { data: existingLedger } = await supabase
      .from('rental_ledger')
      .select('*')
      .eq('rental_property_id', propertyId)
      .eq('is_automated', true)
      .gte('date', currentMonthDate)
      .lte('date', `${currentMonth}-31`);

    const existingCategories = existingLedger ? existingLedger.map(e => e.category) : [];
    const newEntries = [];

    // Rent
    if (prop.rent > 0 && !existingCategories.includes('Rent')) {
      newEntries.push({
        user_id: req.userId,
        rental_property_id: propertyId,
        date: currentMonthDate,
        type: 'Income',
        category: 'Rent',
        amount: prop.rent,
        is_automated: true
      });
    }

    // Mortgage
    const mortAmt = (Number(prop.mortgage_pi) || 0) + (Number(prop.mortgage_escrow) || 0);
    if (mortAmt > 0 && !existingCategories.includes('Mortgage')) {
      newEntries.push({
        user_id: req.userId,
        rental_property_id: propertyId,
        date: currentMonthDate,
        type: 'Expense',
        category: 'Mortgage',
        amount: mortAmt,
        is_automated: true
      });
    }

    // PM Fees
    if (prop.property_management_fees > 0 && !existingCategories.includes('PM Fees')) {
      newEntries.push({
        user_id: req.userId,
        rental_property_id: propertyId,
        date: currentMonthDate,
        type: 'Expense',
        category: 'PM Fees',
        amount: prop.property_management_fees,
        is_automated: true
      });
    }

    if (newEntries.length > 0) {
      const { data: insertedLedger, error: insertErr } = await supabase.from('rental_ledger').insert(newEntries).select();
      if (insertErr) console.error(insertErr);
      if (insertedLedger) {
        for (const entry of insertedLedger) {
          await syncLedgerToExpenses(req.userId, entry, prop.property_name);
        }
      }
    }

    // 3. Fetch full ledger history
    const { data: finalLedger, error: ledgerErr } = await supabase
      .from('rental_ledger')
      .select('*')
      .eq('rental_property_id', propertyId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (ledgerErr) throw ledgerErr;

    res.json(finalLedger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/ledger', async (req, res) => {
  try {
    const propertyId = req.params.id;
    const { data: prop } = await supabase.from('rental_properties').select('property_name').eq('id', propertyId).single();

    const payload = { ...req.body, rental_property_id: propertyId, user_id: req.userId };
    const { data, error } = await supabase.from('rental_ledger').insert([payload]).select().single();
    if (error) throw error;

    await syncLedgerToExpenses(req.userId, data, prop?.property_name);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/ledger/:ledgerId', async (req, res) => {
  try {
    const propertyId = req.params.id;
    const { data: prop } = await supabase.from('rental_properties').select('property_name').eq('id', propertyId).single();

    const payload = { ...req.body, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.user_id;
    delete payload.rental_property_id;

    const { data, error } = await supabase
      .from('rental_ledger')
      .update(payload)
      .eq('id', req.params.ledgerId)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    
    await syncLedgerToExpenses(req.userId, data, prop?.property_name);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/ledger/:ledgerId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('rental_ledger')
      .delete()
      .eq('id', req.params.ledgerId)
      .eq('user_id', req.userId);

    if (error) throw error;

    await removeLedgerFromExpenses(req.params.ledgerId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- HISTORY ROUTES ---

router.get('/:id/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rental_financial_history')
      .select('*')
      .eq('rental_property_id', req.params.id)
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/history', async (req, res) => {
  try {
    const payload = { ...req.body, rental_property_id: req.params.id, user_id: req.userId };
    const { data, error } = await supabase.from('rental_financial_history').insert([payload]).select().single();
    if (error) throw error;
    
    await syncRentalFinancials(req.userId, req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/history/:historyId', async (req, res) => {
  try {
    const payload = { ...req.body, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.user_id;
    delete payload.rental_property_id;

    const { data, error } = await supabase
      .from('rental_financial_history')
      .update(payload)
      .eq('id', req.params.historyId)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    
    await syncRentalFinancials(req.userId, req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/history/:historyId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('rental_financial_history')
      .delete()
      .eq('id', req.params.historyId)
      .eq('user_id', req.userId);

    if (error) throw error;
    
    await syncRentalFinancials(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
