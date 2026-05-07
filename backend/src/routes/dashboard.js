import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

router.get('/net-worth-snapshot', async (req, res) => {
  try {
    const { data: assets, error: assetsError } = await supabase.from('assets').select('amount').eq('user_id', req.userId);
    if (assetsError) throw assetsError;
    const totalAssets = assets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const { data: liabilities, error: liabilitiesError } = await supabase.from('liabilities').select('amount').eq('user_id', req.userId);
    if (liabilitiesError) throw liabilitiesError;
    const totalLiabilities = liabilities.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    res.json({
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/net-worth-history', async (req, res) => {
  try {
    const monthsParam = req.query.months || '6';
    let data;

    if (monthsParam === 'all') {
      const { data: allData, error } = await supabase
        .from('net_worth_snapshots')
        .select('*')
        .eq('user_id', req.userId)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      data = allData;
    } else {
      const months = parseInt(monthsParam);
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      const cutoffDate = d.toISOString().split('T')[0];

      const { data: filteredData, error } = await supabase
        .from('net_worth_snapshots')
        .select('*')
        .eq('user_id', req.userId)
        .gte('snapshot_date', cutoffDate)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      data = filteredData;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/expense-vs-budget', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7); // YYYY-MM
    
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId);
    if (expError) throw expError;

    const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(month));

    const { data: budgetItems, error: budError } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId)
      .eq('section', 'guilt_free');
    if (budError) throw budError;

    const result = [];
    const categories = [...new Set(budgetItems.map(b => b.category))];

    categories.forEach(category => {
      if (!category) return;
      
      const item = budgetItems.find(b => b.category === category);
      const budgeted = Number(item.amount) || 0;

      const actual = monthExpenses
        .filter(e => e.budget_category === category)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      result.push({ category, budgeted, actual });
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/monthly-spend', async (req, res) => {
  try {
    const monthsParam = parseInt(req.query.months) || 6;
    
    const d = new Date();
    d.setMonth(d.getMonth() - monthsParam);
    const cutoffDate = d.toISOString().split('T')[0];

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .gte('date', cutoffDate);
    if (expError) throw expError;

    const monthlyMap = {};
    expenses.forEach(e => {
      const monthStr = e.date ? e.date.substring(0, 7) : null;
      if (!monthStr || !e.budget_category) return;
      
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { month: monthStr };
      if (!monthlyMap[monthStr][e.budget_category]) monthlyMap[monthStr][e.budget_category] = 0;
      
      monthlyMap[monthStr][e.budget_category] += (Number(e.amount) || 0);
    });

    const result = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/annual-budget-vs-actual', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId);
    if (expError) throw expError;

    const yearExpenses = expenses.filter(e => e.date && e.date.startsWith(year));

    const { data: budgetItems, error: budError } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId)
      .eq('section', 'annual');
    if (budError) throw budError;

    const result = budgetItems.map(item => {
      const ytdActual = yearExpenses
        .filter(e => e.budget_category === item.category)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      return {
        category: item.category,
        budgeted: Number(item.amount) || 0,
        ytdActual
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
