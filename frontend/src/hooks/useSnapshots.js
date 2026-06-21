import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useSnapshots = () => {
  const { get, post } = useApi();
  const { session } = useAppContext();
  const userId = session?.user?.id ?? null;
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await get('/api/snapshots');
    if (data) setSnapshots(data);
    setLoading(false);
  }, [userId, get]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  // period: JS Date object or "YYYY-MM-01" string
  const closeMonth = async (period) => {
    setClosing(true);
    const periodStr = typeof period === 'string'
      ? period
      : `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await post('/api/snapshots/close', { period: periodStr });
    if (!error) {
      setSnapshots(prev => [data, ...prev]);
    }
    setClosing(false);
    return { data, error };
  };

  const isMonthClosed = (date) => {
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    return snapshots.some(s => s.period === period);
  };

  return { snapshots, loading, closing, closeMonth, isMonthClosed, refresh: fetchSnapshots };
};
