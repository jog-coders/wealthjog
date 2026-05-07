import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const useApi = () => {
  const { session } = useAppContext();

  const request = useCallback(async (method, path, body = null) => {
    if (!session?.access_token) {
      return { data: null, error: 'No active session' };
    }

    try {
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
      };

      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const options = { method, headers };
      if (body) {
        options.body = body instanceof FormData ? body : JSON.stringify(body);
      }

      const response = await fetch(`${BASE_URL}${path}`, options);
      
      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return { data: null, error: 'Session expired' };
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.errors?.[0]?.msg || 'API Error';
        toast.error(errorMsg);
        return { data: null, error: errorMsg };
      }

      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        toast.success('Saved ✓');
      }

      return { data, error: null };
    } catch (err) {
      toast.error(err.message || 'Network Error');
      return { data: null, error: err.message };
    }
  }, [session?.access_token]);

  const get = useCallback((path) => request('GET', path), [request]);
  const post = useCallback((path, body) => request('POST', path, body), [request]);
  const put = useCallback((path, body) => request('PUT', path, body), [request]);
  const del = useCallback((path) => request('DELETE', path), [request]);

  return { get, post, put, del };
};
