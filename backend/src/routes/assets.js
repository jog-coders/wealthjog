import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';
import { maybeSnapshot } from '../services/netWorthSnapshot.js';
import { getLatestEntries } from '../utils/latestEntries.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    
    let query = supabase
      .from('assets')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true });

    if (search) query = query.ilike('name', `%${search}%`);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/total', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('amount, name, date, created_at')
      .eq('user_id', req.userId);

    if (error) throw error;
    
    const latestData = getLatestEntries(data);
    const totalAmount = latestData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    res.json({ totalAmount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/',
  [
    body('name').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('date').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('monthly_fixed_savings').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { name, type, institution, amount, date, monthly_fixed_savings } = req.body;
      
      const { data: asset, error: insertError } = await supabase
        .from('assets')
        .insert([{ user_id: req.userId, name, type, institution, amount, date: date || null, monthly_fixed_savings: monthly_fixed_savings || null }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (monthly_fixed_savings > 0) {
        await supabase
          .from('budget_line_items')
          .insert([{
            user_id: req.userId,
            section: 'fixed_monthly',
            is_auto_injected: true,
            source_id: asset.id,
            source_type: 'asset',
            category: `${asset.name} — Savings`,
            amount: monthly_fixed_savings
          }]);
      }

      await maybeSnapshot(req.userId);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put('/:id',
  [
    body('name').notEmpty(),
    body('amount').isFloat({ min: 0 }),
    body('date').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('monthly_fixed_savings').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { name, type, institution, amount, date, monthly_fixed_savings } = req.body;
      const assetId = req.params.id;

      const { data: asset, error: updateError } = await supabase
        .from('assets')
        .update({ name, type, institution, amount, date: date || null, monthly_fixed_savings: monthly_fixed_savings || null, updated_at: new Date().toISOString() })
        .eq('id', assetId)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (monthly_fixed_savings > 0) {
        // Upsert budget line item
        const { data: existing } = await supabase
          .from('budget_line_items')
          .select('id')
          .eq('source_id', assetId)
          .eq('source_type', 'asset')
          .single();

        if (existing) {
          await supabase
            .from('budget_line_items')
            .update({
              category: `${asset.name} — Savings`,
              amount: monthly_fixed_savings
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('budget_line_items')
            .insert([{
              user_id: req.userId,
              section: 'fixed_monthly',
              is_auto_injected: true,
              source_id: asset.id,
              source_type: 'asset',
              category: `${asset.name} — Savings`,
              amount: monthly_fixed_savings
            }]);
        }
      } else {
        // Delete if null/0
        await supabase
          .from('budget_line_items')
          .delete()
          .eq('source_id', assetId)
          .eq('source_type', 'asset');
      }

      await maybeSnapshot(req.userId);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const assetId = req.params.id;
    
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', req.userId);

    if (deleteError) throw deleteError;

    await supabase
      .from('budget_line_items')
      .delete()
      .eq('source_id', assetId)
      .eq('source_type', 'asset');

    await maybeSnapshot(req.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
