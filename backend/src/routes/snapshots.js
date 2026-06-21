import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// GET /api/snapshots — list all closed months for user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('month_snapshots')
      .select('*')
      .eq('user_id', req.userId)
      .order('period', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/snapshots/close — run month close for a given period
// Body: { period: "2026-06-01" }
router.post('/close', async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: 'period required (YYYY-MM-01)' });

    const userId = req.userId;

    // 1. Budget status for the period (sum transactions for that month)
    const periodStart = period;
    const periodEnd   = new Date(new Date(period).getFullYear(),
                                 new Date(period).getMonth() + 1, 0)
                          .toISOString().split('T')[0];

    const { data: txRows, error: txErr } = await supabase
      .from('transactions')
      .select('category_id, amount_cents, status')
      .eq('user_id', userId)
      .gte('date', periodStart)
      .lte('date', periodEnd)
      .neq('status', 'excluded');

    if (txErr) throw txErr;

    const { data: cats, error: catErr } = await supabase
      .from('budget_categories')
      .select('id, monthly_amount_cents')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (catErr) throw catErr;

    // Build category_totals
    const spentMap = {};
    for (const tx of txRows) {
      if (tx.category_id) {
        spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + tx.amount_cents;
      }
    }

    const categoryTotals = {};
    let totalBudgeted = 0;
    let totalSpent = 0;
    for (const cat of cats) {
      categoryTotals[cat.id] = {
        budgeted: cat.monthly_amount_cents,
        spent: spentMap[cat.id] || 0,
        carryover_in: 0,
        carryover_out: 0,
      };
      totalBudgeted += cat.monthly_amount_cents;
      totalSpent += spentMap[cat.id] || 0;
    }

    // 2. Property totals from v_property_cash_flow
    const { data: propRows, error: propErr } = await supabase
      .from('v_property_cash_flow')
      .select('*')
      .eq('user_id', userId);

    if (propErr) throw propErr;

    const propertyTotals = {};
    for (const p of propRows) {
      propertyTotals[p.id] = {
        rent: p.gross_rent_cents,
        pi: p.pi_cents,
        escrow: p.escrow_cents,
        reserve: p.maintenance_reserve_cents,
        net: p.net_cash_flow_cents,
      };
    }

    // 3. Net worth from balance_sheet_accounts
    const { data: nwRow, error: nwErr } = await supabase
      .from('v_net_worth')
      .select('net_worth_cents')
      .eq('user_id', userId)
      .maybeSingle();

    if (nwErr) throw nwErr;

    // 4. Income total from income_sources
    const { data: incRows, error: incErr } = await supabase
      .from('income_sources')
      .select('monthly_amount_cents')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (incErr) throw incErr;
    const netIncome = incRows.reduce((sum, r) => sum + r.monthly_amount_cents, 0);

    // 5. Write snapshot (INSERT only — no update policy)
    const { data: snap, error: snapErr } = await supabase
      .from('month_snapshots')
      .insert([{
        user_id: userId,
        period: periodStart,
        net_income_cents: netIncome,
        total_budgeted_cents: totalBudgeted,
        total_spent_cents: totalSpent,
        net_worth_cents: nwRow?.net_worth_cents || 0,
        category_totals: categoryTotals,
        property_totals: propertyTotals,
      }])
      .select()
      .single();

    if (snapErr) throw snapErr;
    res.json(snap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
