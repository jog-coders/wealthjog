import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// GET /api/vendor-rules
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_rules')
      .select('*, budget_categories(id, name)')
      .eq('user_id', req.userId)
      .order('priority', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor-rules
router.post('/',
  [
    body('pattern').notEmpty().trim(),
    body('category_id').isUUID(),
    body('priority').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { pattern, category_id, priority = 5 } = req.body;
      const { data, error } = await supabase
        .from('vendor_rules')
        .insert([{ user_id: req.userId, pattern: pattern.toLowerCase(), category_id, priority }])
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/vendor-rules/:id
router.put('/:id',
  [
    body('pattern').optional().notEmpty().trim(),
    body('category_id').optional().isUUID(),
    body('priority').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const updates = {};
      if (req.body.pattern)     updates.pattern     = req.body.pattern.toLowerCase();
      if (req.body.category_id) updates.category_id = req.body.category_id;
      if (req.body.priority !== undefined) updates.priority = req.body.priority;

      const { data, error } = await supabase
        .from('vendor_rules')
        .update(updates)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/vendor-rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor-rules/seed  — insert spec defaults for user
router.post('/seed', async (req, res) => {
  try {
    const { error } = await supabase.rpc('seed_vendor_rules', { p_user_id: req.userId });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
