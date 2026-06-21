/**
 * useDraft — persists form state to sessionStorage so it survives
 * React Router unmounts (tab switches). Cleared automatically on save.
 *
 * Usage:
 *   const [form, setForm, clearDraft] = useDraft('income-form', { name: '', amount: 0 });
 *   // update a field:  setForm(f => ({ ...f, name: 'Salary' }))
 *   // after save:      clearDraft()
 */
import { useState, useCallback } from 'react';

const PREFIX = 'wj_draft:';

export function useDraft(key, initial) {
  const storageKey = PREFIX + key;

  const [state, setState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [storageKey]
  );

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(storageKey); } catch {}
    setState(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return [state, set, clear];
}
