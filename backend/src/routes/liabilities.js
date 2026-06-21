// liabilities.js — now uses balance_sheet_accounts (liability classes only)
import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const LIABILITY_CLASSES = ['mortgage_liability','credit_card_liability','other_liability'];

async function syncLiabilityBudgetEntry(userId, accountName, monthlyCents) {
  await supabase
    .from('budget_categories')
    .delete()
    .eq('user_id', userId)
    .eq('name', accountName)
    .eq('is_auto_injected', true);

  if (monthlyCents > 0) {
    await supabase.from('budget_categories').insert({
      user_id: userId,
      name: accountName,
      category_type: 'fixed_cost',
      monthly_amount_cents: monthlyCents,
      is_auto_injected: true,
      sort_order: 9999,
      is_active: true,
    });
  }
}

router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = supabase
      .from('balance_sheet_accounts')
      .select('*')
      .eq('user_id', req.userId)
      .in('account_class', LIABILITY_CLASSES)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (search) query = query.ilike('name', `%${search}%`);
    if (type)   query = query.eq('account_class', type);

    const { data, error } = await query;
    if (error) throw error;

    // Liabilities stored as negative cents — return positive amount for display
    res.json((data || []).map(r => ({
      ...r,
      amount: Math.abs(r.current_balance_cents) / 100,
      type: r.account_class,
      monthly_fixed_expense: (r.monthly_payment_cents || 0) / 100,
      date: r.date || r.created_at?.split('T')[0] || null,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/total', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('balance_sheet_accounts')
      .select('current_balance_cents')
      .eq('user_id', req.userId)
      .in('account_class', LIABILITY_CLASSES)
      .eq('is_active', true);

    if (error) throw error;
    const totalAmount = (data || []).reduce((s, r) => s + Math.abs(r.current_balance_cents), 0) / 100;
    res.json({ totalAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',
  [body('name').notEmpty(), body('amount').isFloat({ min: 0 })],
  validate,
  async (req, res) => {
    try {
      const { name, type, institution, amount, monthly_fixed_expense, date } = req.body;
      const account_class = LIABILITY_CLASSES.includes(type) ? type : 'other_liability';
      const monthly_payment_cents = Math.round((parseFloat(monthly_fixed_expense) || 0) * 100);

      const { data, error } = await supabase
        .from('balance_sheet_accounts')
        .insert([{ user_id: req.userId, name, account_class, institution,
          current_balance_cents: -Math.round((parseFloat(amount) || 0) * 100),
          monthly_payment_cents,
          date: date || null }])
        .select().single();

      if (error) throw error;

      await syncLiabilityBudgetEntry(req.userId, name, monthly_payment_cents);

      res.json({ ...data, amount: Math.abs(data.current_balance_cents) / 100, type: data.account_class, monthly_fixed_expense: data.monthly_payment_cents / 100 });
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
      const { name, type, institution, amount, monthly_fixed_expense, date } = req.body;
      const account_class = LIABILITY_CLASSES.includes(type) ? type : 'other_liability';
      const monthly_payment_cents = Math.round((parseFloat(monthly_fixed_expense) || 0) * 100);

      const { data, error } = await supabase
        .from('balance_sheet_accounts')
        .update({ name, account_class, institution,
          current_balance_cents: -Math.round((parseFloat(amount) || 0) * 100),
          monthly_payment_cents,
          date: date || null,
          updated_at: new Date().toISOString() })
        .eq('id', req.params.id).eq('user_id', req.userId)
        .select().single();

      if (error) throw error;

      await syncLiabilityBudgetEntry(req.userId, name, monthly_payment_cents);

      res.json({ ...data, amount: Math.abs(data.current_balance_cents) / 100, type: data.account_class, monthly_fixed_expense: data.monthly_payment_cents / 100 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { data: account } = await supabase
      .from('balance_sheet_accounts').select('name').eq('id', req.params.id).eq('user_id', req.userId).single();

    const { error } = await supabase.from('balance_sheet_accounts').delete()
      .eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;

    if (account?.name) {
      await syncLiabilityBudgetEntry(req.userId, account.name, 0);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
