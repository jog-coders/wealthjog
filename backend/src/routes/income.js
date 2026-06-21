// income.js — now uses income_sources table (new schema)
import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Convert any frequency's amount to monthly cents for storage
function toMonthlyCents(amount, frequency) {
  const n = parseFloat(amount) || 0;
  if (frequency === 'Annual')   return Math.round((n / 12) * 100);
  if (frequency === 'Biweekly') return Math.round(n * 2.17 * 100);
  return Math.round(n * 100); // Monthly (default)
}

// Convert stored monthly cents back to the display frequency
function toDisplayAmount(monthly_amount_cents, frequency) {
  const monthly = monthly_amount_cents / 100;
  if (frequency === 'Annual')   return parseFloat((monthly * 12).toFixed(2));
  if (frequency === 'Biweekly') return parseFloat((monthly / 2.17).toFixed(2));
  return parseFloat(monthly.toFixed(2));
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const monthly = (data || []).reduce((s, r) => s + r.monthly_amount_cents, 0) / 100;

    res.json({
      data: (data || []).map(r => ({
        ...r,
        frequency: r.frequency || 'Monthly',
        type: r.source_type,
        // Return amount in the row's own frequency so the UI displays it correctly
        amount: toDisplayAmount(r.monthly_amount_cents, r.frequency || 'Monthly'),
        gross_income: r.gross_income_cents != null ? r.gross_income_cents / 100 : 0,
        retirement_savings: r.retirement_savings_cents != null ? r.retirement_savings_cents / 100 : 0,
        other_deductions: r.other_deductions_cents != null ? r.other_deductions_cents / 100 : 0,
      })),
      totals: {
        monthlyTotal:   monthly,
        biweeklyTotal:  parseFloat((monthly / 2.17).toFixed(2)),
        annualTotal:    parseFloat((monthly * 12).toFixed(2)),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',
  [body('name').notEmpty(), body('amount').isFloat({ min: 0 })],
  validate,
  async (req, res) => {
    try {
      const { name, amount, frequency = 'Monthly', source_type,
              gross_income, retirement_savings, other_deductions, description } = req.body;

      const { data, error } = await supabase
        .from('income_sources')
        .insert([{
          user_id: req.userId,
          name,
          frequency,
          monthly_amount_cents: toMonthlyCents(amount, frequency),
          source_type: source_type || 'salary',
          description: description || null,
          gross_income_cents: gross_income ? Math.round(gross_income * 100) : null,
          retirement_savings_cents: retirement_savings ? Math.round(retirement_savings * 100) : null,
          other_deductions_cents: other_deductions ? Math.round(other_deductions * 100) : null,
        }])
        .select().single();

      if (error) throw error;
      res.json({
        ...data,
        frequency: data.frequency || 'Monthly',
        amount: toDisplayAmount(data.monthly_amount_cents, data.frequency || 'Monthly'),
        type: data.source_type,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id',
  [body('name').notEmpty(), body('amount').isFloat({ min: 0 })],
  validate,
  async (req, res) => {
    try {
      const { name, amount, frequency = 'Monthly', source_type,
              gross_income, retirement_savings, other_deductions, description } = req.body;

      const { data, error } = await supabase
        .from('income_sources')
        .update({
          name,
          frequency,
          monthly_amount_cents: toMonthlyCents(amount, frequency),
          source_type: source_type || 'salary',
          description: description || null,
          gross_income_cents: gross_income != null ? Math.round(gross_income * 100) : null,
          retirement_savings_cents: retirement_savings != null ? Math.round(retirement_savings * 100) : null,
          other_deductions_cents: other_deductions != null ? Math.round(other_deductions * 100) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.id).eq('user_id', req.userId)
        .select().single();

      if (error) throw error;
      res.json({
        ...data,
        frequency: data.frequency || 'Monthly',
        amount: toDisplayAmount(data.monthly_amount_cents, data.frequency || 'Monthly'),
        type: data.source_type,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('income_sources').delete()
      .eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
