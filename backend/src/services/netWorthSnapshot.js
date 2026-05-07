import { supabase } from '../supabaseClient.js';
import { getLatestEntries } from '../utils/latestEntries.js';

export const maybeSnapshot = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Sum assets.amount for userId
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('amount, name, date, created_at')
      .eq('user_id', userId);

    if (assetsError) throw assetsError;
    const latestAssets = getLatestEntries(assetsData);
    const totalAssets = latestAssets.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // 2. Sum liabilities.amount for userId
    const { data: liabilitiesData, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('amount, name, date, created_at')
      .eq('user_id', userId);

    if (liabilitiesError) throw liabilitiesError;
    const latestLiabilities = getLatestEntries(liabilitiesData);
    const totalLiabilities = latestLiabilities.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const netWorth = totalAssets - totalLiabilities;

    // 3. Upsert into net_worth_snapshots
    // Assuming we check if one exists today first, or rely on a unique constraint.
    // The prompt says "One snapshot per user per calendar day maximum."
    // We will do a select first, then update or insert.
    const { data: existing } = await supabase
      .from('net_worth_snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('snapshot_date', today)
      .single();

    if (existing) {
      await supabase
        .from('net_worth_snapshots')
        .update({
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('net_worth_snapshots')
        .insert([{
          user_id: userId,
          snapshot_date: today,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth
        }]);
    }
  } catch (error) {
    console.error('Error in maybeSnapshot:', error);
  }
};
