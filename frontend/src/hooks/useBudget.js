import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useBudget = () => {
  const { get, post } = useApi();
  const { session, refreshTrigger, refreshAll } = useAppContext();
  
  const [summary, setSummary] = useState({});
  const [lineItems, setLineItems] = useState({ annual: [], fixed_monthly: [], guilt_free: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error: fetchError } = await get('/api/budget/summary');
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setSummary({
        monthlyIncome: data.monthlyIncome || 0,
        annualTotal: data.annualTotal || 0,
        fixedMonthlyTotal: data.fixedMonthlyTotal || 0,
        guiltFreeCapAmount: data.guiltFreeCapAmount || 0,
        guiltFreeSpent: data.guiltFreeSpent || 0,
        guiltFreeSurplus: data.guiltFreeSurplus || 0
      });

      const items = data.lineItems || [];
      setLineItems({
        annual: items.filter(i => i.section === 'annual').sort((a,b) => a.sort_order - b.sort_order),
        fixed_monthly: items.filter(i => i.section === 'fixed_monthly').sort((a,b) => a.sort_order - b.sort_order),
        guilt_free: items.filter(i => i.section === 'guilt_free').sort((a,b) => a.sort_order - b.sort_order)
      });
    }
    setLoading(false);
  }, [session, get]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshTrigger]);

  const saveSection = async (section, items) => {
    const { error: postError } = await post('/api/budget/batch', { section, items });
    if (!postError) { await fetchSummary(); refreshAll(); }
    return { error: postError };
  };

  return { summary, lineItems, loading, error, saveSection, refresh: fetchSummary };
};
