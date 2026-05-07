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
      .from('liabilities')
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
      .from('liabilities')
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
    body('monthly_fixed_expense').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { name, type, institution, amount, date, monthly_fixed_expense } = req.body;
      
      const { data: liability, error: insertError } = await supabase
        .from('liabilities')
        .insert([{ user_id: req.userId, name, type, institution, amount, date: date || null, monthly_fixed_expense: monthly_fixed_expense || null }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (monthly_fixed_expense > 0) {
        await supabase
          .from('budget_line_items')
          .insert([{
            user_id: req.userId,
            section: 'fixed_monthly',
            is_auto_injected: true,
            source_id: liability.id,
            source_type: 'liability',
            category: `${liability.name} — Payment`,
            amount: monthly_fixed_expense
          }]);
      }

      await maybeSnapshot(req.userId);
      res.json(liability);
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
    body('monthly_fixed_expense').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 })
  ],
  validate,
  async (req, res) => {
    try {
      const { name, type, institution, amount, date, monthly_fixed_expense } = req.body;
      const liabilityId = req.params.id;

      const { data: liability, error: updateError } = await supabase
        .from('liabilities')
        .update({ name, type, institution, amount, date: date || null, monthly_fixed_expense: monthly_fixed_expense || null, updated_at: new Date().toISOString() })
        .eq('id', liabilityId)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (monthly_fixed_expense > 0) {
        // Upsert budget line item
        const { data: existing } = await supabase
          .from('budget_line_items')
          .select('id')
          .eq('source_id', liabilityId)
          .eq('source_type', 'liability')
          .single();

        if (existing) {
          await supabase
            .from('budget_line_items')
            .update({
              category: `${liability.name} — Payment`,
              amount: monthly_fixed_expense
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('budget_line_items')
            .insert([{
              user_id: req.userId,
              section: 'fixed_monthly',
              is_auto_injected: true,
              source_id: liability.id,
              source_type: 'liability',
              category: `${liability.name} — Payment`,
              amount: monthly_fixed_expense
            }]);
        }
      } else {
        // Delete if null/0
        await supabase
          .from('budget_line_items')
          .delete()
          .eq('source_id', liabilityId)
          .eq('source_type', 'liability');
      }

      await maybeSnapshot(req.userId);
      res.json(liability);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const liabilityId = req.params.id;
    
    const { error: deleteError } = await supabase
      .from('liabilities')
      .delete()
      .eq('id', liabilityId)
      .eq('user_id', req.userId);

    if (deleteError) throw deleteError;

    await supabase
      .from('budget_line_items')
      .delete()
      .eq('source_id', liabilityId)
      .eq('source_type', 'liability');

    await maybeSnapshot(req.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
