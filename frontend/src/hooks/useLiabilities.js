import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';
import { getLatestEntries } from '../utils/latestEntries';

export const useLiabilities = () => {
  const { get, post, put, del } = useApi();
  const { session, refreshTrigger, refreshAll } = useAppContext();
  
  const [fullLedger, setFullLedger] = useState([]);
  const [currentLiabilities, setCurrentLiabilities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLiabilities = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    let path = '/api/liabilities';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (typeFilter) params.append('type', typeFilter);
    if (params.toString()) path += `?${params.toString()}`;

    const { data, error: fetchError } = await get(path);
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      // Sort ledger descending by date
      const sortedData = (data || []).sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(a.created_at);
        const db = b.date ? new Date(b.date) : new Date(b.created_at);
        return db - da;
      });
      setFullLedger(sortedData);
      setCurrentLiabilities(getLatestEntries(sortedData));
    }

    const { data: totalData } = await get('/api/liabilities/total');
    if (totalData) {
      setTotal(totalData.totalAmount || 0);
    }
    setLoading(false);
  }, [session, search, typeFilter, get]);

  useEffect(() => {
    fetchLiabilities();
  }, [fetchLiabilities, refreshTrigger]);

  const createLiability = async (payload) => {
    const { error: postError } = await post('/api/liabilities', payload);
    if (!postError) { await fetchLiabilities(); refreshAll(); }
    return { error: postError };
  };

  const updateLiability = async (id, payload) => {
    const { error: putError } = await put(`/api/liabilities/${id}`, payload);
    if (!putError) { await fetchLiabilities(); refreshAll(); }
    return { error: putError };
  };

  const deleteLiability = async (id) => {
    const { error: delError } = await del(`/api/liabilities/${id}`);
    if (!delError) { await fetchLiabilities(); refreshAll(); }
    return { error: delError };
  };

  return { fullLedger, currentLiabilities, total, loading, error, search, setSearch, typeFilter, setTypeFilter, createLiability, updateLiability, deleteLiability, refresh: fetchLiabilities };
};
