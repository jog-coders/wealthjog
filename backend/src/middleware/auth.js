import { supabase } from '../supabaseClient.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Family Sharing: resolve the effective user ID.
    // If this user is delegated to a "family head", use the head's ID for all data queries.
    // This allows family members to transparently share the same data pool.
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_head_id')
      .eq('id', user.id)
      .maybeSingle();

    req.userId = profile?.family_head_id ?? user.id;
    req.actualUserId = user.id; // retain actual ID for invite logic
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Failed to authenticate' });
  }
};
