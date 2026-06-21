import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// GET /api/schedule-e?year=2026&property_id=...
// Returns aggregated Schedule E data from v_schedule_e_summary view.
router.get('/', async (req, res) => {
  try {
    const { year, property_id } = req.query;
    const taxYear = year || new Date().getFullYear().toString();

    let query = supabase
      .from('v_schedule_e_summary')
      .select('*')
      .eq('user_id', req.userId)
      .eq('tax_year', `${taxYear}-01-01`);

    if (property_id) query = query.eq('property_address', property_id);

    const { data, error } = await query;
    if (error) throw error;

    // Pivot: group by property, then by IRS category
    const byProperty = {};
    for (const row of data) {
      if (!byProperty[row.property_address]) {
        byProperty[row.property_address] = {
          property: row.property_address,
          categories: {},
          gross_income_cents: 0,
          total_expenses_cents: 0,
          net_cents: 0,
        };
      }
      const p = byProperty[row.property_address];
      p.categories[row.schedule_e_cat] = {
        total_cents: row.total_cents,
        tx_count: row.tx_count,
      };
      if (row.schedule_e_cat === 'gross_rental_income') {
        p.gross_income_cents += row.total_cents;
      } else if (row.schedule_e_cat !== 'principal_reduction') {
        p.total_expenses_cents += row.total_cents;
      }
    }

    // Compute net taxable income per property
    for (const p of Object.values(byProperty)) {
      p.net_cents = p.gross_income_cents - p.total_expenses_cents;
    }

    res.json({
      tax_year: taxYear,
      properties: Object.values(byProperty),
      raw: data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule-e/raw?year=2026&property_id=...
// Raw transaction list for CSV export
router.get('/raw', async (req, res) => {
  try {
    const { year, property_id } = req.query;
    const taxYear = year || new Date().getFullYear().toString();

    let query = supabase
      .from('transactions')
      .select('date, vendor, amount_cents, schedule_e_cat, notes, properties(address)')
      .eq('user_id', req.userId)
      .not('schedule_e_cat', 'is', null)
      .neq('status', 'excluded')
      .gte('date', `${taxYear}-01-01`)
      .lte('date', `${taxYear}-12-31`)
      .order('date', { ascending: true });

    if (property_id) query = query.eq('property_id', property_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
