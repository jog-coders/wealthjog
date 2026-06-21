import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// ── GET /api/transactions ─────────────────────────────────────────────────────
// Query params: month (YYYY-MM), property_id, status, category_id
router.get('/', async (req, res) => {
  try {
    const { month, property_id, status, category_id } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        budget_categories ( id, name ),
        properties ( id, address )
      `)
      .eq('user_id', req.userId)
      .is('parent_tx_id', null)          // top-level only (children fetched via parent)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (status)      query = query.eq('status', status);
    if (property_id) query = query.eq('property_id', property_id);
    if (category_id) query = query.eq('category_id', category_id);

    const { data, error } = await query;
    if (error) throw error;

    let result = data;
    if (month) {
      result = data.filter(t => t.date && t.date.startsWith(month));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transactions/uncategorized-count ─────────────────────────────────
router.get('/uncategorized-count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('status', 'uncategorized');

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/transactions (single manual entry) ──────────────────────────────
router.post('/',
  [
    body('date').isISO8601(),
    body('vendor').notEmpty(),
    body('amount_cents').isInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const { date, vendor, amount_cents, category_id, property_id, schedule_e_cat, notes } = req.body;

      const status = category_id ? 'categorized' : 'uncategorized';

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: req.userId,
          date, vendor, amount_cents,
          category_id: category_id || null,
          property_id: property_id || null,
          schedule_e_cat: schedule_e_cat || null,
          notes: notes || null,
          status,
          import_source: 'manual',
        }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

const MAX_BULK_IMPORT_ROWS = 5000;

function applyVendorRule(vendor, rules = []) {
  const v = String(vendor || '').toLowerCase();
  for (const rule of rules) {
    const pattern = String(rule.pattern || '').toLowerCase().trim();
    if (!pattern) continue;

    const matchType = rule.match_type || 'contains';
    let matched = false;
    if (matchType === 'exact') matched = v === pattern;
    else if (matchType === 'starts_with') matched = v.startsWith(pattern);
    else if (matchType === 'regex') {
      try {
        matched = new RegExp(rule.pattern, 'i').test(vendor);
      } catch {
        matched = false;
      }
    } else {
      matched = v.includes(pattern);
    }

    if (matched) return rule;
  }
  return null;
}

// ── POST /api/transactions/bulk ───────────────────────────────────────────────
// Used by CSV import. Accepts pre-normalised rows; applies vendor rules server-side.
router.post('/bulk', async (req, res) => {
  try {
    const { rows } = req.body; // [{ date, vendor, amount_cents }]
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array required' });
    }
    if (rows.length > MAX_BULK_IMPORT_ROWS) {
      return res.status(413).json({ error: `Import is limited to ${MAX_BULK_IMPORT_ROWS} rows at a time` });
    }

    // Fetch vendor rules + budget categories in parallel
    const [{ data: rules, error: rulesError }, { data: cats }] = await Promise.all([
      supabase.from('vendor_rules').select('pattern, match_type, category_id, property_id, schedule_e_cat, priority')
        .eq('user_id', req.userId).order('priority', { ascending: false }),
      supabase.from('budget_categories').select('id, name')
        .eq('user_id', req.userId).eq('is_active', true),
    ]);

    if (rulesError) throw rulesError;

    // Build a case-insensitive name → id map for budget categories
    const catNameMap = {};
    (cats || []).forEach(c => { catNameMap[c.name.toLowerCase().trim()] = c.id; });

    const errors = [];
    const insert = rows.map((row, index) => {
      const amount = Math.round(Number(row.amount_cents));
      if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        errors.push(`Row ${index + 1}: invalid date`);
        return null;
      }
      if (!row.vendor || !String(row.vendor).trim()) {
        errors.push(`Row ${index + 1}: vendor is required`);
        return null;
      }
      if (!Number.isFinite(amount) || amount === 0) {
        errors.push(`Row ${index + 1}: amount must be a non-zero number of cents`);
        return null;
      }

      // 1. Exact match on category_name from CSV (highest priority)
      const csvCatId = row.category_name
        ? catNameMap[row.category_name.toLowerCase().trim()] || null
        : null;
      // 2. Fall back to vendor rule matching
      const matchedRule = csvCatId ? null : applyVendorRule(row.vendor, rules || []);
      const category_id = csvCatId || matchedRule?.category_id || null;
      return {
        user_id: req.userId,
        date: row.date,
        vendor: String(row.vendor).trim(),
        amount_cents: amount,
        category_id,
        property_id: row.property_id || matchedRule?.property_id || null,
        schedule_e_cat: row.schedule_e_cat || matchedRule?.schedule_e_cat || null,
        status: category_id ? 'categorized' : 'uncategorized',
        import_source: row.import_source || 'csv',
        external_id: row.external_id || null,
      };
    }).filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.slice(0, 5).join('; '), errors });
    }

    // Upsert on external_id to prevent duplicate imports
    const { data, error } = await supabase
      .from('transactions')
      .upsert(insert, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    const inserted = data || [];
    const uncategorized = inserted.filter(r => r.status === 'uncategorized').length;
    const imported = inserted.length;
    const skipped = Math.max(0, insert.length - imported);

    res.json({ imported, skipped, uncategorized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/transactions/:id (categorize / update) ────────────────────────
router.patch('/:id',
  [body('status').optional().isIn(['categorized', 'uncategorized', 'excluded'])],
  validate,
  async (req, res) => {
    try {
      const { category_id, schedule_e_cat, property_id, status, notes } = req.body;

      const updates = { updated_at: new Date().toISOString() };
      if (category_id   !== undefined) updates.category_id   = category_id;
      if (schedule_e_cat !== undefined) updates.schedule_e_cat = schedule_e_cat;
      if (property_id   !== undefined) updates.property_id   = property_id;
      if (notes         !== undefined) updates.notes         = notes;
      if (status        !== undefined) updates.status        = status;
      // Auto-set categorized when category assigned
      if (category_id && !status) updates.status = 'categorized';

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/transactions/:id/mortgage-split ─────────────────────────────────
// Creates 3 child transactions (interest, principal, escrow) from a parent payment.
router.post('/:id/mortgage-split', async (req, res) => {
  try {
    const { property_id } = req.body;

    // Fetch parent tx
    const { data: parent, error: pErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (pErr) throw pErr;

    // Fetch property for interest rate
    const { data: prop, error: propErr } = await supabase
      .from('properties')
      .select('interest_rate, mortgage_balance_cents, pi_cents, escrow_cents')
      .eq('id', property_id)
      .eq('user_id', req.userId)
      .single();
    if (propErr) throw propErr;

    // Approximate interest for this month
    const monthlyRate = prop.interest_rate / 12;
    const interestCents = Math.round(prop.mortgage_balance_cents * monthlyRate);
    const principalCents = Math.max(0, prop.pi_cents - interestCents);
    const escrowCents = prop.escrow_cents;

    const children = [
      { schedule_e_cat: 'mortgage_interest',  amount_cents: interestCents,   label: 'Mortgage Interest' },
      { schedule_e_cat: 'principal_reduction', amount_cents: principalCents,  label: 'Principal Reduction' },
      { schedule_e_cat: 'taxes',               amount_cents: escrowCents,     label: 'Escrow (Tax/Insurance)' },
    ];

    const inserts = children.map(c => ({
      user_id: req.userId,
      date: parent.date,
      vendor: `${parent.vendor} — ${c.label}`,
      amount_cents: c.amount_cents,
      property_id,
      schedule_e_cat: c.schedule_e_cat,
      status: 'categorized',
      parent_tx_id: parent.id,
      import_source: 'manual',
    }));

    // Mark parent as split parent
    await supabase
      .from('transactions')
      .update({ is_mortgage_parent: true, property_id, updated_at: new Date().toISOString() })
      .eq('id', parent.id);

    const { data, error } = await supabase
      .from('transactions')
      .insert(inserts)
      .select();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
