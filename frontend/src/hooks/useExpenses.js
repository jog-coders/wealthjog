import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useExpenses = () => {
  const { get, post, put, del } = useApi();
  const { session } = useAppContext();
  const userId = session?.user?.id ?? null;
  
  const [expenses, setExpenses] = useState([]);
  const [overspendAlerts, setOverspendAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [monthFilter, setMonthFilter] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    let path = '/api/expenses';
    if (monthFilter) {
      path += `?month=${monthFilter}`;
    }

    const { data, error: fetchError } = await get(path);
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setExpenses(data || []);
    }

    const { data: alertsData } = await get('/api/expenses/overspend/alerts');
    if (alertsData) {
      setOverspendAlerts(alertsData || []);
    }

    setLoading(false);
  }, [userId, monthFilter, get]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (payload) => {
    const { error: postError } = await post('/api/expenses', payload);
    if (!postError)
    return { error: postError };
  };

  const createBulkExpenses = async (payloadArray) => {
    const { error: postError } = await post('/api/expenses/bulk', payloadArray);
    if (!postError)
    return { error: postError };
  };

  const updateExpense = async (id, payload) => {
    const { error: putError } = await put(`/api/expenses/${id}`, payload);
    if (!putError)
    return { error: putError };
  };

  const deleteExpense = async (id) => {
    const { error: delError } = await del(`/api/expenses/${id}`);
    if (!delError)
    return { error: delError };
  };

  return { 
    expenses, 
    overspendAlerts, 
    loading, 
    error, 
    monthFilter, 
    setMonthFilter, 
    createExpense, 
    createBulkExpenses,
    updateExpense, 
    deleteExpense, 
    refresh: fetchExpenses 
  };
};
