import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';
import { toMonthly, toAnnual, toBiweekly } from '../utils/normalize.js';
import { maybeSnapshot } from '../services/netWorthSnapshot.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    let biweeklyTotal = 0;
    let monthlyTotal = 0;
    let annualTotal = 0;

    data.forEach(item => {
      biweeklyTotal += toBiweekly(item.amount, item.frequency);
      monthlyTotal += toMonthly(item.amount, item.frequency);
      annualTotal += toAnnual(item.amount, item.frequency);
    });

    res.json({
      data,
      totals: { biweeklyTotal, monthlyTotal, annualTotal }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['Salary', 'Rental', 'Other Income']),
    body('frequency').isIn(['Biweekly', 'Monthly', 'Annual']),
    body('amount').isFloat({ min: 0 }),
    body('gross_income').isFloat({ min: 0 }),
    body('retirement_savings').isFloat({ min: 0 }),
    body('other_deductions').isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { name, description, type, frequency, amount, gross_income, retirement_savings, other_deductions } = req.body;
      const { data, error } = await supabase
        .from('income')
        .insert([{ user_id: req.userId, name, description, type, frequency, amount, gross_income, retirement_savings, other_deductions }])
        .select()
        .single();

      if (error) throw error;
      
      await maybeSnapshot(req.userId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id',
  [
    body('name').notEmpty(),
    body('type').isIn(['Salary', 'Rental', 'Other Income']),
    body('frequency').isIn(['Biweekly', 'Monthly', 'Annual']),
    body('amount').isFloat({ min: 0 }),
    body('gross_income').isFloat({ min: 0 }),
    body('retirement_savings').isFloat({ min: 0 }),
    body('other_deductions').isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      // Verify ownership implicit by user_id filter
      const { data, error } = await supabase
        .from('income')
        .update({
          name: req.body.name,
          description: req.body.description,
          type: req.body.type,
          frequency: req.body.frequency,
          amount: req.body.amount,
          gross_income: req.body.gross_income,
          retirement_savings: req.body.retirement_savings,
          other_deductions: req.body.other_deductions,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      
      await maybeSnapshot(req.userId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    
    await maybeSnapshot(req.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
