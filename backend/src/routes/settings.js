import express from 'express';
import { body } from 'express-validator';
import { supabase } from '../supabaseClient.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// ── Lookup values — user-managed lists for asset types, liability types, institutions ──

const ASSET_TYPE_DEFAULTS = [
  { label: 'Checking',     value: 'checking' },
  { label: 'Savings',      value: 'savings' },
  { label: '401(k)',        value: 'investment_401k' },
  { label: 'IRA',           value: 'investment_ira' },
  { label: 'Brokerage',     value: 'investment_brokerage' },
  { label: 'Real Estate',   value: 'real_estate' },
];
const LIABILITY_TYPE_DEFAULTS = [
  { label: 'Mortgage',        value: 'mortgage_liability' },
  { label: 'Credit Card',     value: 'credit_card_liability' },
  { label: 'Other Liability', value: 'other_liability' },
];

// GET /api/settings/lookup-values?domain=asset_type|liability_type|institution
router.get('/lookup-values', async (req, res) => {
  try {
    const { domain } = req.query;
    if (!['asset_type', 'liability_type', 'institution'].includes(domain)) {
      return res.status(400).json({ error: 'Invalid domain' });
    }
    let { data, error } = await supabase
      .from('user_lookup_values')
      .select('*')
      .eq('user_id', req.userId)
      .eq('domain', domain)
      .order('sort_order')
      .order('created_at');

    if (error) throw error;

    // Auto-seed defaults for type domains on first access
    if ((!data || data.length === 0) && domain !== 'institution') {
      const defaults = domain === 'asset_type' ? ASSET_TYPE_DEFAULTS : LIABILITY_TYPE_DEFAULTS;
      const inserts = defaults.map((d, i) => ({
        user_id: req.userId, domain, label: d.label, value: d.value, sort_order: i,
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from('user_lookup_values').insert(inserts).select();
      if (insertErr) throw insertErr;
      data = inserted;
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/lookup-values
router.post('/lookup-values', async (req, res) => {
  try {
    const { domain, label, value } = req.body;
    if (!['asset_type', 'liability_type', 'institution'].includes(domain)) {
      return res.status(400).json({ error: 'Invalid domain' });
    }
    if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });
    const finalValue = domain === 'institution' ? label.trim() : (value || label.trim());

    const { data, error } = await supabase
      .from('user_lookup_values')
      .insert({ user_id: req.userId, domain, label: label.trim(), value: finalValue, sort_order: 999 })
      .select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/lookup-values/:id
router.put('/lookup-values/:id', async (req, res) => {
  try {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });

    const { data, error } = await supabase
      .from('user_lookup_values')
      .update({ label: label.trim() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select().single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/lookup-values/:id
router.delete('/lookup-values/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_lookup_values')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Legacy enum-values — now delegates to user_lookup_values ─────────────────

router.get('/enum-values', async (req, res) => {
  try {
    const { domain } = req.query;
    if (domain !== 'institution') return res.json([]);

    const { data, error } = await supabase
      .from('user_lookup_values')
      .select('*')
      .eq('user_id', req.userId)
      .eq('domain', 'institution')
      .order('sort_order').order('created_at');

    if (error) throw error;
    res.json((data || []).map(r => ({ id: r.id, domain: 'institution', label: r.label })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/enum-values', async (req, res) => res.json({ success: true }));
router.delete('/enum-values/:id', async (req, res) => res.json({ success: true }));

// ── Seed defaults ─────────────────────────────────────────────────────────────

router.post('/seed-defaults', async (req, res) => {
  try {
    const { error } = await supabase.rpc('seed_vendor_rules', { p_user_id: req.userId });
    if (error) console.error('Seed defaults error:', error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Export all user data ───────────────────────────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const modulesParam = req.query.modules || 'budget,ledger,rentals,balance_sheet';
    const activeModules = modulesParam.split(',').map(m => m.trim().toLowerCase());

    const allTables = [
      'properties',
      'property_snapshots',
      'income_sources',
      'budget_categories',
      'balance_sheet_accounts',
      'transactions',
      'month_snapshots',
      'vendor_rules',
      'user_lookup_values',
    ];

    const rawData = {};
    for (const table of allTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', req.userId);

      if (error) throw error;
      rawData[table] = data || [];
    }

    // Apply cascading rules based on unselected modules

    // 1. If rentals not selected
    if (!activeModules.includes('rentals')) {
      rawData.properties = [];
      rawData.property_snapshots = [];
      rawData.budget_categories = rawData.budget_categories.filter(c => !c.is_auto_injected);
      rawData.income_sources = rawData.income_sources.filter(i => i.source_type !== 'rental' && !i.linked_property_id);
      rawData.balance_sheet_accounts = rawData.balance_sheet_accounts.filter(a => !a.linked_property_id);
      rawData.transactions = rawData.transactions.filter(t => !t.property_id);
    }

    // 2. If budget not selected
    if (!activeModules.includes('budget')) {
      rawData.budget_categories = [];
      rawData.income_sources = [];
      rawData.month_snapshots = [];
      // Strip category_id from transactions to prevent foreign key errors
      rawData.transactions = rawData.transactions.map(t => ({ ...t, category_id: null }));
    }

    // 3. If ledger not selected
    if (!activeModules.includes('ledger')) {
      rawData.transactions = [];
      rawData.vendor_rules = [];
    }

    // 4. If balance_sheet not selected
    if (!activeModules.includes('balance_sheet')) {
      rawData.balance_sheet_accounts = [];
      rawData.user_lookup_values = [];
    }

    // Clean user_ids and timestamps from output data, but keep primary keys to preserve relations
    const exportData = {
      version: 3,
      exportDate: new Date().toISOString(),
      modules: activeModules,
      data: {}
    };

    for (const table of allTables) {
      exportData.data[table] = rawData[table].map(({ user_id, created_at, updated_at, ...rest }) => rest);
    }

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Import / restore ──────────────────────────────────────────────────────────

router.post('/import', async (req, res) => {
  try {
    const { data, modules } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid import payload format' });
    }

    const activeModules = modules || ['budget', 'ledger', 'rentals', 'balance_sheet'];

    // Validation: Check data validity for selected modules
    for (const m of activeModules) {
      if (m === 'budget' && (!data.budget_categories || !data.income_sources)) {
        return res.status(400).json({ error: 'Selected backup file is missing Budget data models' });
      }
      if (m === 'ledger' && (!data.transactions || !data.vendor_rules)) {
        return res.status(400).json({ error: 'Selected backup file is missing Ledger/Transactions data models' });
      }
      if (m === 'rentals' && (!data.properties || !data.property_snapshots)) {
        return res.status(400).json({ error: 'Selected backup file is missing Rental properties data models' });
      }
      if (m === 'balance_sheet' && (!data.balance_sheet_accounts || !data.user_lookup_values)) {
        return res.status(400).json({ error: 'Selected backup file is missing Balance Sheet data models' });
      }
    }

    // ── Selective Deletion Phase (children before parents) ──
    if (activeModules.includes('rentals')) {
      const { error } = await supabase.from('property_snapshots').delete().eq('user_id', req.userId);
      if (error) console.error('Error clearing property_snapshots:', error.message);
      const { error: error2 } = await supabase.from('properties').delete().eq('user_id', req.userId);
      if (error2) console.error('Error clearing properties:', error2.message);
    }
    if (activeModules.includes('ledger')) {
      const { error } = await supabase.from('transactions').delete().eq('user_id', req.userId);
      if (error) console.error('Error clearing transactions:', error.message);
      const { error: error2 } = await supabase.from('vendor_rules').delete().eq('user_id', req.userId);
      if (error2) console.error('Error clearing vendor_rules:', error2.message);
    }
    if (activeModules.includes('budget')) {
      const { error } = await supabase.from('budget_categories').delete().eq('user_id', req.userId).eq('is_auto_injected', false).is('linked_property_id', null);
      if (error) console.error('Error clearing budget_categories:', error.message);
      const { error: error2 } = await supabase.from('income_sources').delete().eq('user_id', req.userId).neq('source_type', 'rental').is('linked_property_id', null);
      if (error2) console.error('Error clearing income_sources:', error2.message);
      const { error: error3 } = await supabase.from('month_snapshots').delete().eq('user_id', req.userId);
      if (error3) console.error('Error clearing month_snapshots:', error3.message);
    }
    if (activeModules.includes('balance_sheet')) {
      const { error } = await supabase.from('balance_sheet_accounts').delete().eq('user_id', req.userId).is('linked_property_id', null);
      if (error) console.error('Error clearing balance_sheet_accounts:', error.message);
      const { error: error2 } = await supabase.from('user_lookup_values').delete().eq('user_id', req.userId);
      if (error2) console.error('Error clearing user_lookup_values:', error2.message);
    }

    // ── Fetch existing references ──
    const { data: dbProps } = await supabase.from('properties').select('id').eq('user_id', req.userId);
    const { data: dbCats } = await supabase.from('budget_categories').select('id').eq('user_id', req.userId);

    const existingPropIds = new Set((dbProps || []).map(p => p.id));
    const existingCatIds = new Set((dbCats || []).map(c => c.id));

    const finalPropIds = activeModules.includes('rentals')
      ? new Set((data.properties || []).map(p => p.id))
      : existingPropIds;

    const finalCatIds = activeModules.includes('budget')
      ? new Set([...(data.budget_categories || []).map(c => c.id), ...existingCatIds])
      : existingCatIds;

    // ── Selective Insertion Phase (parents before children) ──

    // 1. Properties
    if (activeModules.includes('rentals') && data.properties?.length > 0) {
      const inserts = data.properties.map(row => ({ ...row, user_id: req.userId }));
      const { error } = await supabase.from('properties').insert(inserts);
      if (error) throw new Error(`Failed to import properties: ${error.message}`);
    }

    // 2. Budget Categories
    if (activeModules.includes('budget') && data.budget_categories?.length > 0) {
      let filtered = data.budget_categories;
      if (!activeModules.includes('rentals') && finalPropIds.size === 0) {
        filtered = filtered.filter(c => !c.is_auto_injected && !c.linked_property_id);
      }
      const inserts = filtered.map(row => {
        const clean = { ...row, user_id: req.userId };
        if (clean.linked_property_id && !finalPropIds.has(clean.linked_property_id)) {
          clean.linked_property_id = null;
        }
        return clean;
      });
      if (inserts.length > 0) {
        const { error } = await supabase.from('budget_categories').insert(inserts);
        if (error) throw new Error(`Failed to import budget_categories: ${error.message}`);
      }
    }

    // 3. Balance Sheet Accounts
    if (activeModules.includes('balance_sheet') && data.balance_sheet_accounts?.length > 0) {
      const inserts = data.balance_sheet_accounts.map(row => {
        const clean = { ...row, user_id: req.userId };
        if (clean.linked_property_id && !finalPropIds.has(clean.linked_property_id)) {
          clean.linked_property_id = null;
        }
        return clean;
      });
      if (inserts.length > 0) {
        const { error } = await supabase.from('balance_sheet_accounts').insert(inserts);
        if (error) throw new Error(`Failed to import balance_sheet_accounts: ${error.message}`);
      }
    }

    // 4. Income Sources
    if (activeModules.includes('budget') && data.income_sources?.length > 0) {
      let filtered = data.income_sources;
      if (!activeModules.includes('rentals') && finalPropIds.size === 0) {
        filtered = filtered.filter(i => i.source_type !== 'rental');
      }
      const inserts = filtered.map(row => {
        const clean = { ...row, user_id: req.userId };
        if (clean.linked_property_id && !finalPropIds.has(clean.linked_property_id)) {
          clean.linked_property_id = null;
        }
        return clean;
      });
      if (inserts.length > 0) {
        const { error } = await supabase.from('income_sources').insert(inserts);
        if (error) throw new Error(`Failed to import income_sources: ${error.message}`);
      }
    }

    // 5. Month Snapshots
    if (activeModules.includes('budget') && data.month_snapshots?.length > 0) {
      const inserts = data.month_snapshots.map(row => ({ ...row, user_id: req.userId }));
      const { error } = await supabase.from('month_snapshots').insert(inserts);
      if (error) throw new Error(`Failed to import month_snapshots: ${error.message}`);
    }

    // 6. Vendor Rules
    if (activeModules.includes('ledger') && data.vendor_rules?.length > 0) {
      const inserts = data.vendor_rules.map(row => ({ ...row, user_id: req.userId }));
      const { error } = await supabase.from('vendor_rules').insert(inserts);
      if (error) throw new Error(`Failed to import vendor_rules: ${error.message}`);
    }

    // 7. User Lookup Values
    if (activeModules.includes('balance_sheet') && data.user_lookup_values?.length > 0) {
      const inserts = data.user_lookup_values.map(row => ({ ...row, user_id: req.userId }));
      const { error } = await supabase.from('user_lookup_values').insert(inserts);
      if (error) throw new Error(`Failed to import user_lookup_values: ${error.message}`);
    }

    // 8. Property Snapshots
    if (activeModules.includes('rentals') && data.property_snapshots?.length > 0) {
      const filtered = data.property_snapshots.filter(s => finalPropIds.has(s.property_id));
      const inserts = filtered.map(row => ({ ...row, user_id: req.userId }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('property_snapshots').insert(inserts);
        if (error) throw new Error(`Failed to import property_snapshots: ${error.message}`);
      }
    }

    // 9. Transactions
    if (activeModules.includes('ledger') && data.transactions?.length > 0) {
      const inserts = data.transactions.map(row => {
        const clean = { ...row, user_id: req.userId };
        if (clean.property_id && !finalPropIds.has(clean.property_id)) {
          clean.property_id = null;
        }
        if (clean.category_id && !finalCatIds.has(clean.category_id)) {
          clean.category_id = null;
        }
        return clean;
      });
      if (inserts.length > 0) {
        const { error } = await supabase.from('transactions').insert(inserts);
        if (error) throw new Error(`Failed to import transactions: ${error.message}`);
      }
    }

    res.json({ success: true, message: 'Data restored successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Delete all user data ───────────────────────────────────────────────────────

router.delete('/all-data', async (req, res) => {
  try {
    const tables = [
      'property_snapshots',
      'transactions',
      'properties',
      'budget_categories',
      'balance_sheet_accounts',
      'income_sources',
      'month_snapshots',
      'vendor_rules',
      'user_lookup_values',
      'rental_ledger',
      'rental_financial_history',
      'rental_properties',
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

// ── Family Sharing ────────────────────────────────────────────────────────────

router.get('/family-members', async (req, res) => {
  try {
    const headId = req.actualUserId ?? req.userId;

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_head_id', headId);

    if (error) throw error;

    const memberDetails = await Promise.all(
      (data || []).map(async (row) => {
        const { data: { user } } = await supabase.auth.admin.getUserById(row.id);
        return { id: row.id, email: user?.email ?? '(unknown)' };
      })
    );

    res.json(memberDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invite-family',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const headId = req.userId;
      const siteUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

      let invitedUserId = null;
      let alreadyExisted = false;

      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/accept-invite`
      });

      if (inviteError) {
        const isExisting = inviteError.message?.toLowerCase().includes('already') || inviteError.status === 422;
        if (!isExisting) throw inviteError;

        const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;

        const existingUser = users.find(u => u.email === email);
        if (!existingUser) {
          return res.status(404).json({ error: `Could not find user with email ${email}` });
        }

        invitedUserId = existingUser.id;
        alreadyExisted = true;
      } else {
        invitedUserId = inviteData.user?.id;
        if (!invitedUserId) throw new Error('Invite succeeded but returned no user ID');
      }

      if (invitedUserId === headId) {
        return res.status(400).json({ error: 'You cannot add yourself as a family member.' });
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: invitedUserId, family_head_id: headId }, { onConflict: 'id' });

      if (profileError) throw profileError;

      const message = alreadyExisted
        ? `${email} already has an account — they've been linked to your household. They can sign in normally.`
        : `Invitation sent to ${email}`;

      res.json({ success: true, message, alreadyExisted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/family-members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const headId = req.userId;

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('family_head_id')
      .eq('id', memberId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!profile || profile.family_head_id !== headId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ family_head_id: null })
      .eq('id', memberId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
