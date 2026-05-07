import express from 'express';
import { supabase } from '../supabaseClient.js';
import { toMonthly } from '../utils/normalize.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const { data: budgetItems, error: budgetError } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId);

    if (budgetError) throw budgetError;

    const { data: incomeItems, error: incomeError } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', req.userId);

    if (incomeError) throw incomeError;

    let monthlyIncome = 0;
    incomeItems.forEach(item => {
      monthlyIncome += toMonthly(item.amount, item.frequency);
    });

    let annualTotal = 0;
    let fixedMonthlyTotal = 0;
    let guiltFreeSpent = 0;

    budgetItems.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.section === 'annual') annualTotal += amt;
      if (item.section === 'fixed_monthly') fixedMonthlyTotal += amt;
      if (item.section === 'guilt_free') guiltFreeSpent += amt;
    });

    // Include the implicit annualTotal/12 row in fixedMonthlyTotal
    fixedMonthlyTotal += (annualTotal / 12);

    const guiltFreeCapAmount = monthlyIncome - fixedMonthlyTotal;
    const guiltFreeSurplus = guiltFreeCapAmount - guiltFreeSpent;

    res.json({
      lineItems: budgetItems,
      monthlyIncome,
      annualTotal,
      fixedMonthlyTotal,
      guiltFreeCapAmount,
      guiltFreeSpent,
      guiltFreeSurplus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:section', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId)
      .eq('section', req.params.section)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { section, items } = req.body;
    
    // In a single operation: DELETE existing for user+section WHERE is_auto_injected = false
    const { error: deleteError } = await supabase
      .from('budget_line_items')
      .delete()
      .eq('user_id', req.userId)
      .eq('section', section)
      .eq('is_auto_injected', false);

    if (deleteError) throw deleteError;

    if (items && items.length > 0) {
      const insertData = items.map(item => ({
        user_id: req.userId,
        section,
        category: item.category,
        amount: item.amount,
        sort_order: item.sort_order,
        is_auto_injected: false
      }));

      const { error: insertError } = await supabase
        .from('budget_line_items')
        .insert(insertData);

      if (insertError) throw insertError;
    }

    // Return the full updated list for that section
    const { data: updatedList, error: fetchError } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId)
      .eq('section', section)
      .order('sort_order', { ascending: true });
      
    if (fetchError) throw fetchError;
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
