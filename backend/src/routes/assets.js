// assets.js — now uses balance_sheet_accounts (asset classes only)
import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const ASSET_CLASSES = ['checking','savings','investment_401k','investment_ira','investment_brokerage','real_estate'];

/**
 * Sync a Fixed Monthly Savings budget entry for an asset.
 * If monthlyCents > 0 → upsert (delete existing + insert fresh).
 * If monthlyCents == 0 → remove any existing auto-injected entry for this account.
 */
async function syncAssetBudgetEntry(userId, accountName, monthlyCents) {
  // Always remove the old entry first (clean slate)
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
      .in('account_class', ASSET_CLASSES)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (search) query = query.ilike('name', `%${search}%`);
    if (type)   query = query.eq('account_class', type);

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map(r => ({
      ...r,
      amount: r.current_balance_cents / 100,
      type: r.account_class,
      current_value: r.current_balance_cents / 100,
      monthly_fixed_savings: (r.monthly_payment_cents || 0) / 100,
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
      .in('account_class', ASSET_CLASSES)
      .eq('is_active', true);

    if (error) throw error;
    const totalAmount = (data || []).reduce((s, r) => s + r.current_balance_cents, 0) / 100;
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
      const { name, type, institution, amount, monthly_fixed_savings, date } = req.body;
      const account_class = ASSET_CLASSES.includes(type) ? type : 'checking';
      const monthly_payment_cents = Math.round((parseFloat(monthly_fixed_savings) || 0) * 100);

      const { data, error } = await supabase
        .from('balance_sheet_accounts')
        .insert([{ user_id: req.userId, name, account_class, institution,
          current_balance_cents: Math.round((parseFloat(amount) || 0) * 100),
          monthly_payment_cents,
          date: date || null }])
        .select().single();

      if (error) throw error;

      await syncAssetBudgetEntry(req.userId, name, monthly_payment_cents);

      res.json({ ...data, amount: data.current_balance_cents / 100, type: data.account_class, monthly_fixed_savings: data.monthly_payment_cents / 100 });
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
      const { name, type, institution, amount, monthly_fixed_savings, date } = req.body;
      const account_class = ASSET_CLASSES.includes(type) ? type : 'checking';
      const monthly_payment_cents = Math.round((parseFloat(monthly_fixed_savings) || 0) * 100);

      const { data, error } = await supabase
        .from('balance_sheet_accounts')
        .update({ name, account_class, institution,
          current_balance_cents: Math.round((parseFloat(amount) || 0) * 100),
          monthly_payment_cents,
          date: date || null,
          updated_at: new Date().toISOString() })
        .eq('id', req.params.id).eq('user_id', req.userId)
        .select().single();

      if (error) throw error;

      await syncAssetBudgetEntry(req.userId, name, monthly_payment_cents);

      res.json({ ...data, amount: data.current_balance_cents / 100, type: data.account_class, monthly_fixed_savings: data.monthly_payment_cents / 100 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    // Fetch name before deleting so we can remove the auto-injected budget entry
    const { data: account } = await supabase
      .from('balance_sheet_accounts').select('name').eq('id', req.params.id).eq('user_id', req.userId).single();

    const { error } = await supabase.from('balance_sheet_accounts').delete()
      .eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;

    if (account?.name) {
      await syncAssetBudgetEntry(req.userId, account.name, 0);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
