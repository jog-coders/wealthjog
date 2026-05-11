import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useIncome = () => {
  const { get, post, put, del } = useApi();
  const { session, refreshTrigger, refreshAll } = useAppContext();
  
  const [income, setIncome] = useState([]);
  const [totals, setTotals] = useState({ biweeklyTotal: 0, monthlyTotal: 0, annualTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncome = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error: fetchError } = await get('/api/income');
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setIncome(data.data || []);
      setTotals(data.totals || { biweeklyTotal: 0, monthlyTotal: 0, annualTotal: 0 });
    }
    setLoading(false);
  }, [session, get]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome, refreshTrigger]);

  const createIncome = async (payload) => {
    const { error: postError } = await post('/api/income', payload);
    if (!postError) { await fetchIncome(); refreshAll(); }
    return { error: postError };
  };

  const updateIncome = async (id, payload) => {
    const { error: putError } = await put(`/api/income/${id}`, payload);
    if (!putError) { await fetchIncome(); refreshAll(); }
    return { error: putError };
  };

  const deleteIncome = async (id) => {
    const { error: delError } = await del(`/api/income/${id}`);
    if (!delError) { await fetchIncome(); refreshAll(); }
    return { error: delError };
  };

  return { income, totals, loading, error, createIncome, updateIncome, deleteIncome, refresh: fetchIncome };
};
