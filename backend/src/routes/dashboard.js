// dashboard.js — updated to use new schema tables and views
import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// GET /api/dashboard/net-worth-snapshot
router.get('/net-worth-snapshot', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_net_worth')
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle();
    if (error) throw error;

    const totalAssets      = Math.max(0, (data?.total_assets_cents || 0)) / 100;
    const totalLiabilities = Math.abs(Math.min(0, (data?.total_liabilities_cents || 0))) / 100;
    const netWorth         = (data?.net_worth_cents || 0) / 100;
    res.json({ totalAssets, totalLiabilities, netWorth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/net-worth-history
router.get('/net-worth-history', async (req, res) => {
  try {
    const monthsParam = req.query.months || '6';
    let query = supabase
      .from('month_snapshots')
      .select('period, net_worth_cents')
      .eq('user_id', req.userId)
      .order('period', { ascending: true });

    if (monthsParam !== 'all') {
      const d = new Date();
      d.setMonth(d.getMonth() - parseInt(monthsParam));
      query = query.gte('period', d.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map(r => ({ snapshot_date: r.period, net_worth: r.net_worth_cents / 100 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/expense-vs-budget
router.get('/expense-vs-budget', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);

    const { data: status, error } = await supabase
      .from('v_budget_status')
      .select('*')
      .eq('user_id', req.userId);
    if (error) throw error;

    res.json((status || [])
      .filter(r => r.category_type === 'envelope')
      .map(r => ({ category: r.name, budgeted: r.budgeted_cents / 100, actual: r.spent_cents / 100 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/monthly-spend
router.get('/monthly-spend', async (req, res) => {
  try {
    const monthsParam = parseInt(req.query.months) || 6;
    const d = new Date();
    d.setMonth(d.getMonth() - monthsParam);
    const cutoff = d.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select('date, amount_cents, budget_categories(name)')
      .eq('user_id', req.userId)
      .neq('status', 'excluded')
      .gte('date', cutoff);
    if (error) throw error;

    const monthlyMap = {};
    for (const tx of (data || [])) {
      const m = tx.date?.substring(0, 7);
      const cat = tx.budget_categories?.name;
      if (!m || !cat) continue;
      if (!monthlyMap[m]) monthlyMap[m] = { month: m };
      monthlyMap[m][cat] = (monthlyMap[m][cat] || 0) + tx.amount_cents / 100;
    }

    res.json(Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/annual-budget-vs-actual
router.get('/annual-budget-vs-actual', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();

    const [{ data: cats }, { data: txs }] = await Promise.all([
      supabase.from('budget_categories').select('id, name, annual_target_cents, monthly_amount_cents')
        .eq('user_id', req.userId).eq('category_type', 'sinking_fund'),
      supabase.from('transactions').select('amount_cents, date, category_id')
        .eq('user_id', req.userId).neq('status', 'excluded')
        .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
    ]);

    const spentMap = {};
    for (const tx of (txs || [])) {
      if (tx.category_id) spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + tx.amount_cents;
    }

    res.json((cats || []).map(c => ({
      category: c.name,
      budgeted: (c.annual_target_cents || c.monthly_amount_cents * 12) / 100,
      ytdActual: (spentMap[c.id] || 0) / 100,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
