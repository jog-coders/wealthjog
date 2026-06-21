/**
 * InstitutionSelect
 * Always renders a <select> dropdown populated from /api/settings/lookup-values?domain=institution.
 * When the user picks "Enter manually…" (or the current value isn't in the saved list),
 * a text input appears below so they can type a custom name.
 */
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const MANUAL_SENTINEL = '__manual__';

export default function InstitutionSelect({ value, onChange, className = '' }) {
  const { get } = useApi();
  const [options, setOptions] = useState([]);
  const [manual, setManual] = useState(false);

  const load = useCallback(() => {
    get('/api/settings/lookup-values?domain=institution').then(({ data }) => {
      setOptions(data || []);
    });
  }, [get]);

  useEffect(() => { load(); }, [load]);

  // If current value isn't blank and isn't in the saved list → switch to manual mode
  useEffect(() => {
    if (value && options.length > 0 && !options.some(o => o.label === value || o.value === value)) {
      setManual(true);
    }
  }, [value, options]);

  const handleSelectChange = (e) => {
    if (e.target.value === MANUAL_SENTINEL) {
      setManual(true);
      onChange('');
    } else {
      setManual(false);
      onChange(e.target.value);
    }
  };

  const selectValue = manual
    ? MANUAL_SENTINEL
    : (options.some(o => o.label === value || o.value === value) ? value : '');

  const inputCls = `mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white ${className}`;

  return (
    <div>
      <select value={selectValue} onChange={handleSelectChange} className={inputCls}>
        <option value="">Select institution…</option>
        {options.map(o => (
          <option key={o.id} value={o.label}>{o.label}</option>
        ))}
        <option disabled>──────────</option>
        <option value={MANUAL_SENTINEL}>Enter manually…</option>
      </select>

      {manual && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type institution name"
          className="mt-2 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
          autoFocus
        />
      )}
    </div>
  );
}
