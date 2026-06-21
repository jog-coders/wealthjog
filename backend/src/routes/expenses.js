// expenses.js — now proxies to the transactions table (new schema)
import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// GET /api/expenses — read from transactions
router.get('/', async (req, res) => {
  try {
    const { month, category } = req.query;
    let query = supabase
      .from('transactions')
      .select('*, budget_categories(id, name)')
      .eq('user_id', req.userId)
      .neq('status', 'excluded')
      .is('parent_tx_id', null)
      .order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let result = (data || []).map(t => ({
      ...t,
      amount: t.amount_cents / 100,
      budget_category: t.budget_categories?.name || '',
      vendor: t.vendor,
    }));

    if (month) result = result.filter(t => t.date && t.date.startsWith(month));
    if (category) result = result.filter(t => t.budget_category === category);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/',
  [body('vendor').notEmpty(), body('amount').isFloat({ min: 0 }), body('date').isISO8601()],
  validate,
  async (req, res) => {
    try {
      const { vendor, amount, date, budget_category } = req.body;

      // Resolve category_id from name
      let category_id = null;
      if (budget_category) {
        const { data: cat } = await supabase
          .from('budget_categories')
          .select('id')
          .eq('user_id', req.userId)
          .eq('name', budget_category)
          .maybeSingle();
        category_id = cat?.id || null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: req.userId,
          vendor,
          amount_cents: Math.round(amount * 100),
          date,
          category_id,
          status: category_id ? 'categorized' : 'uncategorized',
          import_source: 'manual',
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({ ...data, amount: data.amount_cents / 100, budget_category });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/expenses/bulk
router.post('/bulk', async (req, res) => {
  try {
    const expenses = Array.isArray(req.body) ? req.body : [];
    const inserts = expenses.map(e => ({
      user_id: req.userId,
      vendor: e.vendor || 'Unknown',
      amount_cents: Math.round((parseFloat(e.amount) || 0) * 100),
      date: e.date,
      status: 'categorized',
      import_source: 'manual',
    }));

    const { data, error } = await supabase.from('transactions').insert(inserts).select();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id',
  [body('vendor').notEmpty(), body('amount').isFloat({ min: 0 }), body('date').isISO8601()],
  validate,
  async (req, res) => {
    try {
      const { vendor, amount, date, budget_category } = req.body;

      let category_id = null;
      if (budget_category) {
        const { data: cat } = await supabase
          .from('budget_categories')
          .select('id').eq('user_id', req.userId).eq('name', budget_category).maybeSingle();
        category_id = cat?.id || null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update({ vendor, amount_cents: Math.round(amount * 100), date, category_id, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select().single();

      if (error) throw error;
      res.json({ ...data, amount: data.amount_cents / 100 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('transactions').delete()
      .eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/overspend/alerts
router.get('/overspend/alerts', async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);

    const { data: txRows } = await supabase
      .from('transactions')
      .select('amount_cents, date, category_id, budget_categories(id, name, monthly_amount_cents)')
      .eq('user_id', req.userId)
      .neq('status', 'excluded');

    const alerts = [];
    const catMap = {};

    for (const tx of (txRows || [])) {
      const cat = tx.budget_categories;
      if (!cat) continue;
      if (!catMap[cat.id]) catMap[cat.id] = { name: cat.name, budget: cat.monthly_amount_cents, spent: 0 };
      if (tx.date?.startsWith(currentMonth)) catMap[cat.id].spent += tx.amount_cents;
    }

    for (const { name, budget, spent } of Object.values(catMap)) {
      if (budget > 0 && spent > budget) {
        alerts.push({ category: name, type: 'monthly', budget: budget / 100, spent: spent / 100, over: (spent - budget) / 100 });
      }
    }

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
