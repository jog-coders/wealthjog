import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useVendorRules = () => {
  const { get, post, put, del } = useApi();
  const { session } = useAppContext();
  const userId = session?.user?.id ?? null;
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await get('/api/vendor-rules');
    if (data) setRules(data);
    setLoading(false);
  }, [userId, get]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = async (rule) => {
    const { data, error } = await post('/api/vendor-rules', rule);
    if (!error) setRules(prev => [data, ...prev]);
    return { data, error };
  };

  const updateRule = async (id, updates) => {
    const { data, error } = await put(`/api/vendor-rules/${id}`, updates);
    if (!error) setRules(prev => prev.map(r => r.id === id ? data : r));
    return { data, error };
  };

  const deleteRule = async (id) => {
    const { error } = await del(`/api/vendor-rules/${id}`);
    if (!error) setRules(prev => prev.filter(r => r.id !== id));
    return { error };
  };

  const seedDefaults = async () => {
    const { error } = await post('/api/vendor-rules/seed', {});
    if (!error) await fetchRules();
    return { error };
  };

  return { rules, loading, addRule, updateRule, deleteRule, seedDefaults, refresh: fetchRules };
};
