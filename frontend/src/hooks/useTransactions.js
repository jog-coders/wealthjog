import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';
import { parseCSV } from '../utils/csvParser';

export const useTransactions = (filters = {}) => {
  const { get, post, patch, del } = useApi();
  const { session } = useAppContext();
  const userId = session?.user?.id ?? null;

  const [transactions, setTransactions] = useState([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.month)       params.set('month',       filters.month);
    if (filters.property_id) params.set('property_id', filters.property_id);
    if (filters.status)      params.set('status',      filters.status);
    if (filters.category_id) params.set('category_id', filters.category_id);
    const qs = params.toString();
    return `/api/transactions${qs ? `?${qs}` : ''}`;
  }, [filters.month, filters.property_id, filters.status, filters.category_id]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data }, { data: countData }] = await Promise.all([
      get(buildQuery()),
      get('/api/transactions/uncategorized-count'),
    ]);
    if (data) setTransactions(data);
    if (countData) setUncategorizedCount(countData.count);
    setLoading(false);
  }, [userId, get, buildQuery]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Manual entry ──────────────────────────────────────────────────────────
  const addManual = async (tx) => {
    const { data, error } = await post('/api/transactions', tx);
    if (!error) await fetchTransactions();
    return { data, error };
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const importCsv = async (file) => {
    setImporting(true);
    try {
      const text = await file.text();
      const { rows, errors } = parseCSV(text, { sourceName: file.name });
      if (rows.length === 0) {
        return { imported: 0, skipped: 0, uncategorized: 0, errors };
      }
      const { data, error } = await post('/api/transactions/bulk', { rows });
      if (!error) await fetchTransactions();
      return { imported: data?.imported || 0, skipped: data?.skipped || 0, uncategorized: data?.uncategorized || 0, errors };
    } finally {
      setImporting(false);
    }
  };

  // ── Categorize / update ───────────────────────────────────────────────────
  const categorize = async (txId, updates) => {
    const { data, error } = await patch(`/api/transactions/${txId}`, updates);
    if (!error) {
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, ...data } : t));
      if (updates.status === 'categorized' || updates.category_id) {
        setUncategorizedCount(c => Math.max(0, c - 1));
      }
    }
    return { data, error };
  };

  const exclude = (txId) => categorize(txId, { status: 'excluded' });

  // ── Delete ────────────────────────────────────────────────────────────────
  const remove = async (txId) => {
    const { error } = await del(`/api/transactions/${txId}`);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== txId));
    return { error };
  };

  // ── Mortgage split ────────────────────────────────────────────────────────
  const mortgageSplit = async (txId, propertyId) => {
    const { data, error } = await post(`/api/transactions/${txId}/mortgage-split`, { property_id: propertyId });
    if (!error) await fetchTransactions();
    return { data, error };
  };

  return {
    transactions,
    uncategorizedCount,
    loading,
    importing,
    error,
    addManual,
    importCsv,
    categorize,
    exclude,
    remove,
    mortgageSplit,
    refresh: fetchTransactions,
    // TODO: Integrate Plaid Link API handler down the road
    // plaidSync: async (accessToken) => { ... }
  };
};
