import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// DB enum values that are valid for each type domain
const ASSET_BASE_TYPES = [
  { value: 'checking',             label: 'Checking' },
  { value: 'savings',              label: 'Savings' },
  { value: 'investment_401k',      label: '401(k)' },
  { value: 'investment_ira',       label: 'IRA' },
  { value: 'investment_brokerage', label: 'Brokerage' },
  { value: 'real_estate',          label: 'Real Estate' },
];
const LIABILITY_BASE_TYPES = [
  { value: 'mortgage_liability',    label: 'Mortgage' },
  { value: 'credit_card_liability', label: 'Credit Card' },
  { value: 'other_liability',       label: 'Other Liability' },
];

export default function LookupManager({ domain, title, description }) {
  const { get, post, put, del } = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [addLabel, setAddLabel] = useState('');
  const [addValue, setAddValue] = useState('');  // only for type domains
  const [showAdd, setShowAdd] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const isTypeDomain = domain === 'asset_type' || domain === 'liability_type';
  const baseTypes = domain === 'asset_type' ? ASSET_BASE_TYPES : LIABILITY_BASE_TYPES;

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await get(`/api/settings/lookup-values?domain=${domain}`);
    if (data) setItems(data);
    setLoading(false);
  }, [domain, get]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (!addLabel.trim()) return;
    if (isTypeDomain && !addValue) { toast.error('Select a base type'); return; }
    const payload = { domain, label: addLabel.trim(), ...(isTypeDomain ? { value: addValue } : {}) };
    const { error } = await post('/api/settings/lookup-values', payload);
    if (!error) {
      setAddLabel(''); setAddValue(''); setShowAdd(false);
      fetch();
      toast.success('Added');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const handleEditSave = async (id) => {
    if (!editLabel.trim()) return;
    const { error } = await put(`/api/settings/lookup-values/${id}`, { label: editLabel.trim() });
    if (!error) {
      setEditingId(null);
      setItems(prev => prev.map(i => i.id === id ? { ...i, label: editLabel.trim() } : i));
      toast.success('Updated');
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Remove "${label}"?`)) return;
    const { error } = await del(`/api/settings/lookup-values/${id}`);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Removed');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
          {!showAdd && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
            >
              <PlusIcon className="w-4 h-4" /> Add
            </button>
          )}
        </div>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}

        {/* Add form */}
        {showAdd && (
          <div className="mb-4 flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {domain === 'institution' ? 'Institution Name' : 'Display Label'}
              </label>
              <input
                type="text"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={domain === 'institution' ? 'e.g. Chase, Vanguard…' : 'e.g. HSA, 529 Plan…'}
                className="block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-1.5 border"
                autoFocus
              />
            </div>
            {isTypeDomain && (
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Maps to (DB type)</label>
                <select
                  value={addValue}
                  onChange={e => setAddValue(e.target.value)}
                  className="block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-1.5 border bg-white"
                >
                  <option value="">Select base type…</option>
                  {baseTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-600"
              >
                <CheckIcon className="w-4 h-4" /> Save
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setAddLabel(''); setAddValue(''); }}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                <XMarkIcon className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No entries yet. Click Add to get started.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
            {items.map(item => (
              <li key={item.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(item.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="block flex-1 max-w-xs rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-1 border"
                      autoFocus
                    />
                    <button onClick={() => handleEditSave(item.id)} className="text-primary-600 hover:text-primary-800">
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{item.label}</span>
                      {isTypeDomain && (
                        <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.value}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit label"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.label)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
