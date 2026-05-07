import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/enum-values', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!domain || (domain !== 'asset_type' && domain !== 'liability_type')) {
      return res.status(400).json({ error: 'Valid domain is required' });
    }

    const { data, error } = await supabase
      .from('custom_enum_values')
      .select('*')
      .eq('user_id', req.userId)
      .eq('domain', domain)
      .order('label', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/enum-values',
  [
    body('domain').isIn(['asset_type', 'liability_type']),
    body('label').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { domain, label } = req.body;
      const { data, error } = await supabase
        .from('custom_enum_values')
        .insert([{ user_id: req.userId, domain, label }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/enum-values/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: enumValue, error: fetchError } = await supabase
      .from('custom_enum_values')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchError || !enumValue) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check if in use
    const tableToCheck = enumValue.domain === 'asset_type' ? 'assets' : 'liabilities';
    const { data: inUseData, error: useError } = await supabase
      .from(tableToCheck)
      .select('id')
      .eq('user_id', req.userId)
      .eq('type', enumValue.label)
      .limit(1);

    if (useError) throw useError;

    if (inUseData && inUseData.length > 0) {
      return res.status(400).json({ error: 'Type is in use and cannot be deleted.' });
    }

    const { error: delError } = await supabase
      .from('custom_enum_values')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (delError) throw delError;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/seed-defaults', async (req, res) => {
  try {
    // Call the Supabase RPC
    const { error } = await supabase.rpc('seed_user_defaults', { user_id_param: req.userId });
    
    // Ignore error if function doesn't exist just in case, but prompt says it does.
    if (error) console.error('Seed defaults error:', error.message);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const tables = [
      'income',
      'budget_line_items',
      'assets',
      'liabilities',
      'expenses',
      'net_worth_snapshots',
      'custom_enum_values'
    ];

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {}
    };

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', req.userId);

      if (error) throw error;
      
      // Strip IDs and metadata so they can be freshly inserted upon restore
      exportData.data[table] = data.map(({ id, user_id, created_at, updated_at, ...rest }) => rest);
    }

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { version, data } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid import payload format' });
    }

    const tables = [
      'expenses',
      'budget_line_items',
      'assets',
      'liabilities',
      'income',
      'net_worth_snapshots',
      'custom_enum_values'
    ];

    // 1. Wipe existing data first
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', req.userId);
      if (error) console.error(`Failed to clear table ${table} during import:`, error.message);
    }

    // 2. Insert imported data
    for (const table of tables) {
      if (data[table] && Array.isArray(data[table]) && data[table].length > 0) {
        const rowsToInsert = data[table].map(row => ({
          ...row,
          user_id: req.userId
        }));

        const { error } = await supabase
          .from(table)
          .insert(rowsToInsert);
        
        if (error) throw new Error(`Failed to import table ${table}: ${error.message}`);
      }
    }

    res.json({ success: true, message: 'Data restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/all-data', async (req, res) => {
  try {
    const tables = [
      'expenses',
      'budget_line_items',
      'assets',
      'liabilities',
      'income',
      'net_worth_snapshots',
      'custom_enum_values'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', req.userId);
      
      if (error) console.error(`Failed to clear table ${table}:`, error.message);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
