import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useDashboard = () => {
  const { get } = useApi();
  const { session, refreshTrigger } = useAppContext();
  
  const [netWorthSnapshot, setNetWorthSnapshot] = useState({});
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [expenseVsBudget, setExpenseVsBudget] = useState([]);
  const [monthlySpend, setMonthlySpend] = useState([]);
  const [annualTracking, setAnnualTracking] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [periodMonths, setPeriodMonths] = useState('6'); // 3, 6, 12, all

  const fetchDashboard = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const [snapRes, histRes, expVsBudRes, moSpendRes, annTrackRes] = await Promise.all([
      get('/api/dashboard/net-worth-snapshot'),
      get(`/api/dashboard/net-worth-history?months=${periodMonths}`),
      get('/api/dashboard/expense-vs-budget'),
      get(`/api/dashboard/monthly-spend?months=${periodMonths}`),
      get('/api/dashboard/annual-budget-vs-actual')
    ]);

    if (snapRes.data) setNetWorthSnapshot(snapRes.data);
    if (histRes.data) setNetWorthHistory(histRes.data);
    if (expVsBudRes.data) setExpenseVsBudget(expVsBudRes.data);
    if (moSpendRes.data) setMonthlySpend(moSpendRes.data);
    if (annTrackRes.data) setAnnualTracking(annTrackRes.data);

    setLoading(false);
  }, [session, periodMonths, get]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, refreshTrigger]);

  return {
    netWorthSnapshot,
    netWorthHistory,
    expenseVsBudget,
    monthlySpend,
    annualTracking,
    loading,
    periodMonths,
    setPeriodMonths,
    refresh: fetchDashboard
  };
};
