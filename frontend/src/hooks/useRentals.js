import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';

export const useRentals = () => {
  const { get, post, put, del } = useApi();
  const { session, refreshTrigger } = useAppContext();
  
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRentals = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await get('/api/rentals');
    if (data) setRentals(data);
    setLoading(false);
  }, [session, get]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals, refreshTrigger]);

  const createRental = async (payload) => {
    const { data, error } = await post('/api/rentals', payload);
    if (!error) await fetchRentals();
    return { data, error };
  };

  const updateRental = async (id, payload) => {
    const { data, error } = await put(`/api/rentals/${id}`, payload);
    if (!error) await fetchRentals();
    return { data, error };
  };

  const deleteRental = async (id) => {
    const { error } = await del(`/api/rentals/${id}`);
    if (!error) await fetchRentals();
    return { error };
  };

  return { rentals, loading, createRental, updateRental, deleteRental, refresh: fetchRentals };
};

export const useRentalLedger = (rentalId) => {
  const { get, post, put, del } = useApi();
  const { session } = useAppContext();
  
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLedger = useCallback(async () => {
    if (!session || !rentalId) return;
    setLoading(true);
    const { data } = await get(`/api/rentals/${rentalId}/ledger`);
    if (data) setLedger(data);
    setLoading(false);
  }, [session, rentalId, get]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const addLedgerEntry = async (payload) => {
    const { data, error } = await post(`/api/rentals/${rentalId}/ledger`, payload);
    if (!error) await fetchLedger();
    return { data, error };
  };

  const updateLedgerEntry = async (id, payload) => {
    const { data, error } = await put(`/api/rentals/${rentalId}/ledger/${id}`, payload);
    if (!error) await fetchLedger();
    return { data, error };
  };

  const deleteLedgerEntry = async (id) => {
    const { error } = await del(`/api/rentals/${rentalId}/ledger/${id}`);
    if (!error) await fetchLedger();
    return { error };
  };

  return { ledger, loading, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, refresh: fetchLedger };
};

export const useRentalHistory = (rentalId) => {
  const { get, post, put, del } = useApi();
  const { session } = useAppContext();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!session || !rentalId) return;
    setLoading(true);
    const { data } = await get(`/api/rentals/${rentalId}/history`);
    if (data) setHistory(data);
    setLoading(false);
  }, [session, rentalId, get]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addHistoryEntry = async (payload) => {
    const { data, error } = await post(`/api/rentals/${rentalId}/history`, payload);
    if (!error) await fetchHistory();
    return { data, error };
  };

  const updateHistoryEntry = async (id, payload) => {
    const { data, error } = await put(`/api/rentals/${rentalId}/history/${id}`, payload);
    if (!error) await fetchHistory();
    return { data, error };
  };

  const deleteHistoryEntry = async (id) => {
    const { error } = await del(`/api/rentals/${rentalId}/history/${id}`);
    if (!error) await fetchHistory();
    return { error };
  };

  return { history, loading, addHistoryEntry, updateHistoryEntry, deleteHistoryEntry, refresh: fetchHistory };
};
