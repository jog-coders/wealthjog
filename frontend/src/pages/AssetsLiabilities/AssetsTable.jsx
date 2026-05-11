import { useState, useEffect, Fragment } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useApi } from '../../hooks/useApi';
import CurrencyInput from '../../components/CurrencyInput';
import RunningTotal from '../../components/RunningTotal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/formatCurrency';
import EmptyState from '../../components/EmptyState';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';

// ── Focused Update Balance modal ──────────────────────────────────────────
function UpdateBalanceModal({ item, onClose, onSave }) {
  const [amount, setAmount]   = useState(0);
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid balance greater than $0.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: saveError } = await onSave({ amount, date });
    setSaving(false);
    if (saveError) {
      setError(typeof saveError === 'string' ? saveError : saveError.message || 'Failed to save. Please try again.');
    } else {
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>Update Balance</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B' }}>{item.name} · {item.type || 'Asset'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Current value */}
        <div style={{ padding: '12px 20px', background: 'rgba(0,210,142,0.06)', borderBottom: '1px solid #0F172A' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>Current balance</p>
          <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: '#00D28E' }}>{formatCurrency(item.amount)}</p>
        </div>

        {/* Form */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#F87171' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>New Balance *</label>
            <CurrencyInput value={amount} onChange={setAmount} placeholder="Enter new balance" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>As of Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ display: 'block', width: '100%', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#0F172A', color: '#F8FAFC', border: '1.5px solid #334155', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'transparent', border: '1.5px solid #334155', color: '#94A3B8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: saving ? '#00B87D' : '#00D28E', border: 'none', color: '#0F172A', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? 'Saving…' : 'Save Balance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetsTable() {
  const { currentAssets, fullLedger, total, search, setSearch, typeFilter, setTypeFilter, createAsset, updateAsset, deleteAsset } = useAssets();
  const { get } = useApi();
  
  const [updateBalanceItem, setUpdateBalanceItem] = useState(null);

  const handleUpdateBalance = (item) => {
    setUpdateBalanceItem(item);
  };

  const [types, setTypes] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [monthlyFixedSavings, setMonthlyFixedSavings] = useState(0);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    get('/api/settings/enum-values?domain=asset_type').then(({ data }) => {
      if (data) setTypes(data);
    });
  }, [get]);

  const resetForm = () => {
    setName(''); setType(''); setInstitution('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0); setMonthlyFixedSavings(0);
    setIsAdding(false); setEditingId(null);
  };

  const handleEdit = (item) => {
    setName(item.name); setType(item.type);
    setInstitution(item.institution || '');
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setAmount(item.amount);
    setMonthlyFixedSavings(item.monthly_fixed_savings || 0);
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!name) return;
    if (!editingId && amount <= 0) return;
    if (editingId && amount < 0) return;
    const payload = { name, type, institution, date, amount, monthly_fixed_savings: monthlyFixedSavings > 0 ? monthlyFixedSavings : null };
    if (editingId) {
      await updateAsset(editingId, payload);
    } else {
      await createAsset(payload);
    }
    resetForm();
  };

  const confirmDelete = (id) => { setItemToDelete(id); setDeleteConfirmOpen(true); };
  const handleDelete = async () => {
    if (itemToDelete) await deleteAsset(itemToDelete);
    setDeleteConfirmOpen(false); setItemToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3 bg-white"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
          </select>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            + Add Asset
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          {/* Mode banner */}
          <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, background: isUpdatingBalance ? 'rgba(255,101,72,0.07)' : 'rgba(5,150,105,0.07)', border: `1px solid ${isUpdatingBalance ? 'rgba(255,101,72,0.2)' : 'rgba(5,150,105,0.2)'}`, fontSize: 13, fontWeight: 600, color: isUpdatingBalance ? '#FF6548' : '#059669' }}>
            {isUpdatingBalance ? `📊 Updating balance for: ${name}` : '➕ Add New Asset'}
          </div>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                <option value="">Select type</option>
                {types.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Institution</label>
              <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Current Amount *</label>
              <div className="mt-1">
                <CurrencyInput value={amount} onChange={setAmount} />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-600">Monthly Fixed Savings</label>
              <div className="mt-1">
                <CurrencyInput value={monthlyFixedSavings} onChange={setMonthlyFixedSavings} />
              </div>
              <p className="mt-1 text-xs text-gray-500">Automatically added to Fixed Monthly Costs in the Budget tab.</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button type="button" onClick={resetForm} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600">Save</button>
          </div>
        </div>
      )}

      {currentAssets.length === 0 ? (
        <EmptyState title="No assets added" message="Track your cash, investments, and property." />
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Institution</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Amount</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Monthly Savings</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentAssets.map((item) => (
                <Fragment key={item.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 flex items-center gap-2 cursor-pointer" onClick={() => toggleRow(item.name)}>
                      {expandedRows[item.name] ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                      )}
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.type}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.institution}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.date ? item.date : '-'}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.monthly_fixed_savings ? formatCurrency(item.monthly_fixed_savings) : '-'}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                      {item.is_auto_injected ? (
                        <span className="text-xs text-gray-400 italic">Managed by module</span>
                      ) : (
                        <button onClick={() => handleUpdateBalance(item)} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                          <PlusIcon className="w-4 h-4" />
                          Update Balance
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedRows[item.name] && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-gray-100">
                        <div className="bg-gray-50 py-3 pl-12 pr-6">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historical Ledger</h4>
                          <div className="bg-white rounded border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {fullLedger.filter(l => l.name === item.name).map(ledgerItem => (
                                  <tr key={ledgerItem.id}>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">{ledgerItem.date || '-'}</td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{formatCurrency(ledgerItem.amount)}</td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm text-right space-x-3">
                                      {ledgerItem.is_auto_injected ? (
                                        <span className="text-xs text-gray-400 italic">Locked</span>
                                      ) : (
                                        <>
                                          <button onClick={() => handleEdit(ledgerItem)} className="text-primary-500 hover:text-primary-800 text-xs">Edit</button>
                                          <button onClick={() => confirmDelete(ledgerItem.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunningTotal label="Total Assets" amount={total} />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Asset"
        message="Are you sure you want to delete this asset? If it has a monthly saving amount, it will be removed from your budget."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Update Balance modal */}
      {updateBalanceItem && (
        <UpdateBalanceModal
          item={updateBalanceItem}
          onClose={() => setUpdateBalanceItem(null)}
          onSave={async ({ amount, date }) => {
            const result = await createAsset({
              name:        updateBalanceItem.name,
              type:        updateBalanceItem.type,
              institution: updateBalanceItem.institution || '',
              amount,
              date,
              monthly_fixed_savings: updateBalanceItem.monthly_fixed_savings || null,
            });
            return result; // { error } or {}
          }}
        />
      )}
    </div>
  );
}
