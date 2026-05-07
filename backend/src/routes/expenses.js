import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { month, category } = req.query;
    
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (category) query = query.eq('budget_category', category);

    const { data, error } = await query;
    if (error) throw error;

    // Filter by month in memory since Supabase date filtering can be tricky with string dates
    // YYYY-MM format
    let filteredData = data;
    if (month) {
      filteredData = data.filter(item => item.date && item.date.startsWith(month));
    }

    res.json(filteredData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/',
  [
    body('vendor').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('date').isISO8601(),
    body('budget_category').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { vendor, amount, date, budget_category } = req.body;
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ user_id: req.userId, vendor, amount, date, budget_category }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/bulk',
  [
    body().isArray().withMessage('Request body must be an array of expenses'),
    body('*.vendor').notEmpty().withMessage('Vendor is required for all rows'),
    body('*.amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('*.date').isISO8601().withMessage('Valid date is required'),
    body('*.budget_category').notEmpty().withMessage('Budget category is required')
  ],
  validate,
  async (req, res) => {
    try {
      const expenses = req.body.map(exp => ({
        user_id: req.userId,
        vendor: exp.vendor,
        amount: exp.amount,
        date: exp.date,
        budget_category: exp.budget_category
      }));

      const { data, error } = await supabase
        .from('expenses')
        .insert(expenses)
        .select();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id',
  [
    body('vendor').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('date').isISO8601(),
    body('budget_category').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { vendor, amount, date, budget_category } = req.body;
      
      const { data, error } = await supabase
        .from('expenses')
        .update({ vendor, amount, date, budget_category, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/overspend/alerts', async (req, res) => {
  try {
    // 1. Get all expenses
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', req.userId);

    if (expError) throw expError;

    // 2. Get all budget items
    const { data: budgetItems, error: budError } = await supabase
      .from('budget_line_items')
      .select('*')
      .eq('user_id', req.userId);

    if (budError) throw budError;

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    const alerts = [];
    
    // Group expenses by category
    const categories = [...new Set(expenses.map(e => e.budget_category))];

    categories.forEach(category => {
      if (!category) return;

      const categoryExpenses = expenses.filter(e => e.budget_category === category);
      
      const annualSpent = categoryExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const monthlySpent = categoryExpenses
        .filter(e => e.date && e.date.startsWith(currentMonth))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Find budget for this category
      const annualBudgetItem = budgetItems.find(b => b.category === category && b.section === 'annual');
      const guiltFreeBudgetItem = budgetItems.find(b => b.category === category && b.section === 'guilt_free');

      const annualBudget = annualBudgetItem ? (Number(annualBudgetItem.amount) || 0) : 0;
      
      let monthlyBudget = 0;
      if (guiltFreeBudgetItem) {
        monthlyBudget = Number(guiltFreeBudgetItem.amount) || 0;
      } else if (annualBudgetItem) {
        monthlyBudget = annualBudget / 12;
      }

      if (monthlyBudget > 0 && monthlySpent > monthlyBudget) {
        alerts.push({
          category,
          type: 'monthly',
          budget: monthlyBudget,
          spent: monthlySpent,
          over: monthlySpent - monthlyBudget
        });
      }

      if (annualBudget > 0 && annualSpent > annualBudget) {
        // Prevent double alerting if we already alerted monthly and it's a guilt free item?
        // Actually, prompt says return all where spent > budget.
        alerts.push({
          category,
          type: 'annual',
          budget: annualBudget,
          spent: annualSpent,
          over: annualSpent - annualBudget
        });
      }
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
