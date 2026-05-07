import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';
import { getLatestEntries } from '../utils/latestEntries';

export const useAssets = () => {
  const { get, post, put, del } = useApi();
  const { session, refreshTrigger } = useAppContext();
  
  const [fullLedger, setFullLedger] = useState([]);
  const [currentAssets, setCurrentAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchAssets = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    let path = '/api/assets';
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
      setCurrentAssets(getLatestEntries(sortedData));
    }

    const { data: totalData } = await get('/api/assets/total');
    if (totalData) {
      setTotal(totalData.totalAmount || 0);
    }
    setLoading(false);
  }, [session, search, typeFilter, get]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, refreshTrigger]);

  const createAsset = async (payload) => {
    const { error: postError } = await post('/api/assets', payload);
    if (!postError) await fetchAssets();
    return { error: postError };
  };

  const updateAsset = async (id, payload) => {
    const { error: putError } = await put(`/api/assets/${id}`, payload);
    if (!putError) await fetchAssets();
    return { error: putError };
  };

  const deleteAsset = async (id) => {
    const { error: delError } = await del(`/api/assets/${id}`);
    if (!delError) await fetchAssets();
    return { error: delError };
  };

  return { fullLedger, currentAssets, total, loading, error, search, setSearch, typeFilter, setTypeFilter, createAsset, updateAsset, deleteAsset, refresh: fetchAssets };
};
