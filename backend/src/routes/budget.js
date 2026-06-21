// budget.js — now uses budget_categories + income_sources (new schema)
import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

const SECTION_TO_TYPE = { annual: 'sinking_fund', fixed_monthly: 'fixed_cost', guilt_free: 'envelope' };
const TYPE_TO_SECTION = { sinking_fund: 'annual', fixed_cost: 'fixed_monthly', envelope: 'guilt_free' };

// GET /api/budget/summary
router.get('/summary', async (req, res) => {
  try {
    const [{ data: cats, error: catErr }, { data: income, error: incErr }] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('user_id', req.userId).eq('is_active', true).order('sort_order'),
      supabase.from('income_sources').select('monthly_amount_cents').eq('user_id', req.userId).eq('is_active', true),
    ]);
    if (catErr) throw catErr;
    if (incErr) throw incErr;

    const monthlyIncome = (income || []).reduce((s, r) => s + r.monthly_amount_cents, 0) / 100;

    let annualTotal = 0, fixedMonthlyTotal = 0, guiltFreeSpent = 0;
    const lineItems = (cats || []).map(c => {
      const monthly = c.monthly_amount_cents / 100;
      if (c.category_type === 'sinking_fund') annualTotal       += monthly * 12;
      if (c.category_type === 'fixed_cost')   fixedMonthlyTotal += monthly;
      if (c.category_type === 'envelope')     guiltFreeSpent    += monthly;
      const section = TYPE_TO_SECTION[c.category_type] || 'guilt_free';
      // Annual items expose annual amount so AnnualBudgetStep displays correctly
      const displayAmount = section === 'annual'
        ? (c.annual_target_cents || monthly * 12 * 100) / 100
        : monthly;
      return {
        ...c,
        name: c.name,
        category: c.name,
        amount: displayAmount,
        monthly_amount: monthly,
        annual_amount: (c.annual_target_cents || 0) / 100,
        section,
      };
    });

    const guiltFreeCapAmount = monthlyIncome - fixedMonthlyTotal - (annualTotal / 12);
    const guiltFreeSurplus   = guiltFreeCapAmount - guiltFreeSpent;

    res.json({ lineItems, monthlyIncome, annualTotal, fixedMonthlyTotal, guiltFreeCapAmount, guiltFreeSpent, guiltFreeSurplus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/budget/:section
router.get('/:section', async (req, res) => {
  try {
    const category_type = SECTION_TO_TYPE[req.params.section];
    if (!category_type) return res.status(400).json({ error: 'Invalid section' });

    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', req.userId)
      .eq('category_type', category_type)
      .eq('is_active', true)
      .eq('is_auto_injected', false)   // auto-injected entries are read-only; don't show in edit forms
      .order('sort_order');

    if (error) throw error;
    res.json((data || []).map(c => {
      // Annual step shows annual amounts; other steps show monthly amounts
      const displayAmount = req.params.section === 'annual'
        ? (c.annual_target_cents || c.monthly_amount_cents * 12) / 100
        : c.monthly_amount_cents / 100;
      return { ...c, category: c.name, amount: displayAmount, section: req.params.section };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budget/batch — replace all items for a section
router.post('/batch', async (req, res) => {
  try {
    const { section, items } = req.body;
    const category_type = SECTION_TO_TYPE[section];
    if (!category_type) return res.status(400).json({ error: 'Invalid section' });

    // Never delete auto-injected entries (owned by assets/liabilities modules)
    await supabase.from('budget_categories').delete()
      .eq('user_id', req.userId).eq('category_type', category_type).eq('is_auto_injected', false);

    if (items && items.length > 0) {
      const inserts = items.map((item, i) => {
        const rawAmount = parseFloat(item.amount) || 0;
        // For sinking funds (annual), the user enters the ANNUAL amount.
        // Store monthly equivalent = annual / 12. Also persist the annual target.
        const monthly_amount_cents = section === 'annual'
          ? Math.round((rawAmount / 12) * 100)
          : Math.round(rawAmount * 100);
        const annual_target_cents  = section === 'annual'
          ? Math.round(rawAmount * 100)
          : null;
        return {
          user_id: req.userId,
          name: item.name || item.category,
          category_type,
          monthly_amount_cents,
          annual_target_cents,
          sort_order: item.sort_order ?? i,
          is_active: true,
        };
      });
      const { error } = await supabase.from('budget_categories').insert(inserts);
      if (error) throw error;
    }

    const { data, error: fetchErr } = await supabase
      .from('budget_categories').select('*')
      .eq('user_id', req.userId).eq('category_type', category_type).order('sort_order');
    if (fetchErr) throw fetchErr;

    res.json((data || []).map(c => ({ ...c, category: c.name, amount: c.monthly_amount_cents / 100, section })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
