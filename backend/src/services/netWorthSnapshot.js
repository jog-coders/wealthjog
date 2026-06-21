// netWorthSnapshot.js — updated to use balance_sheet_accounts + month_snapshots
import { supabase } from '../supabaseClient.js';

export const maybeSnapshot = async (userId) => {
  // No-op: net worth is now derived live from v_net_worth view.
  // Month snapshots are written explicitly via POST /api/snapshots/close.
};
