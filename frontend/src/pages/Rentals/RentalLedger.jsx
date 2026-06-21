import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRentalLedger } from '../../hooks/useRentals';
import { formatCurrency } from '../../utils/formatCurrency';
import { PlusIcon, TrashIcon, PencilIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';

const SCHEDULE_E_OPTIONS = [
  { value: '',                        label: 'Uncategorized' },
  { value: 'advertising',             label: 'Advertising' },
  { value: 'auto_and_travel',         label: 'Auto & Travel' },
  { value: 'cleaning_and_maintenance',label: 'Cleaning & Maint.' },
  { value: 'commissions',             label: 'Commissions' },
  { value: 'insurance',               label: 'Insurance' },
  { value: 'legal_and_professional',  label: 'Legal & Professional' },
  { value: 'management_fees',         label: 'Management Fees' },
  { value: 'mortgage_interest',       label: 'Mortgage Interest' },
  { value: 'other_interest',          label: 'Other Interest' },
  { value: 'repairs',                 label: 'Repairs' },
  { value: 'supplies',                label: 'Supplies' },
  { value: 'taxes',                   label: 'Taxes' },
  { value: 'utilities',               label: 'Utilities' },
  { value: 'hoa_fees',                label: 'HOA Fees' },
  { value: 'principal_reduction',     label: 'Principal Reduction' },
  { value: 'gross_rental_income',     label: 'Rental Income' },
];

const BADGE_COLORS = {
  advertising:              'bg-purple-100 text-purple-700',
  auto_and_travel:          'bg-blue-100 text-blue-700',
  cleaning_and_maintenance: 'bg-teal-100 text-teal-700',
  commissions:              'bg-indigo-100 text-indigo-700',
  insurance:                'bg-cyan-100 text-cyan-700',
  legal_and_professional:   'bg-violet-100 text-violet-700',
  management_fees:          'bg-orange-100 text-orange-700',
  mortgage_interest:        'bg-rose-100 text-rose-700',
  other_interest:           'bg-pink-100 text-pink-700',
  repairs:                  'bg-amber-100 text-amber-700',
  supplies:                 'bg-lime-100 text-lime-700',
  taxes:                    'bg-red-100 text-red-700',
  utilities:                'bg-sky-100 text-sky-700',
  hoa_fees:                 'bg-emerald-100 text-emerald-700',
  principal_reduction:      'bg-gray-100 text-gray-600',
  gross_rental_income:      'bg-green-100 text-green-700',
};

const FORM_INIT = {
  date:           new Date().toISOString().split('T')[0],
  type:           'expense', // 'expense' | 'income'
  vendor:         '',
  ref_number:     '',
  schedule_e_cat: '',
  amount:         0,
  notes:          '',
};

export default function RentalLedger({ propertyId, propertyName, allRentals = [], onImportCsv }) {
  const { ledger, loading, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry } = useRentalLedger(propertyId);
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm]               = useState(FORM_INIT);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Running totals
  const totals = ledger.reduce((acc, t) => {
    if (t.amount_cents > 0) acc.expenses += t.amount_cents;
    else                     acc.income   += Math.abs(t.amount_cents);
    return acc;
  }, { income: 0, expenses: 0 });
  const net = totals.income - totals.expenses;

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...FORM_INIT, date: new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      date:           item.date || '',
      type:           item.amount_cents <= 0 ? 'income' : 'expense',
      vendor:         item.vendor || '',
      ref_number:     item.notes?.startsWith('Ref: ') ? item.notes.slice(5) : '',
      schedule_e_cat: item.schedule_e_cat || '',
      amount:         Math.abs(item.amount_cents) / 100,
      notes:          item.notes?.startsWith('Ref: ') ? '' : (item.notes || ''),
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendor || !form.date) return;
    const amount_cents = form.type === 'income'
      ? -Math.round((form.amount || 0) * 100)
      :  Math.round((form.amount || 0) * 100);

    const notes = [
      form.ref_number ? `Ref: ${form.ref_number}` : '',
      form.notes,
    ].filter(Boolean).join(' | ') || null;

    const payload = {
      date:           form.date,
      vendor:         form.vendor,
      amount:         amount_cents / 100,
      schedule_e_cat: form.schedule_e_cat || null,
      notes,
    };

    if (editItem) {
      await updateLedgerEntry(editItem.id, payload);
    } else {
      await addLedgerEntry(payload);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Running totals */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-500">Income </span>
            <span className="font-semibold text-green-600">{formatCurrency(totals.income / 100)}</span>
          </div>
          <div>
            <span className="text-gray-500">Expenses </span>
            <span className="font-semibold text-red-600">{formatCurrency(totals.expenses / 100)}</span>
          </div>
          <div>
            <span className="text-gray-500">Net </span>
            <span className={`font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(net / 100)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {onImportCsv && (
            <button type="button"
              onClick={onImportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <ArrowUpTrayIcon className="w-4 h-4" /> Import CSV
            </button>
          )}
          <button type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <PlusIcon className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Add / Edit modal — rendered via portal so position:fixed is always viewport-relative */}
      {isFormOpen && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}
          onClick={e => e.target === e.currentTarget && setIsFormOpen(false)}
        >
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 28, width: '100%', maxWidth: 560,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                  {editItem ? 'Edit Transaction' : 'New Transaction'}
                </h2>
                {propertyName && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                    Property: <span style={{ color: '#00D28E', fontWeight: 600 }}>{propertyName}</span>
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }}>
                  <option value="expense">Expense</option>
                  <option value="income">Income / Reimbursement</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Description *</label>
                <input type="text" value={form.vendor} onChange={e => setForm(f => ({...f, vendor: e.target.value}))}
                  placeholder="e.g. Water & Sewer, Lock Repair…"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Amount *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 13 }}>$</span>
                  <input type="number" step="0.01" min="0" value={form.amount || ''} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))}
                    placeholder="0.00"
                    style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 26px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Ref # (Check / Zelle)</label>
                <input type="text" value={form.ref_number} onChange={e => setForm(f => ({...f, ref_number: e.target.value}))}
                  placeholder="Check 4847"
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>IRS Schedule E Category</label>
                <select value={form.schedule_e_cat} onChange={e => setForm(f => ({...f, schedule_e_cat: e.target.value}))}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }}>
                  {SCHEDULE_E_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button type="button" onClick={() => setIsFormOpen(false)}
                style={{ padding: '9px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSave}
                style={{ padding: '9px 24px', borderRadius: 9999, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#00D28E', border: 'none', color: '#0F172A' }}>
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Inline loading indicator — does NOT unmount the rest of the component */}
      {loading && (
        <div className="py-2 text-center text-xs text-gray-400 animate-pulse">Refreshing…</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule E</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {ledger.map(item => {
              const isIncome  = item.amount_cents <= 0;
              const absAmount = Math.abs(item.amount_cents) / 100;
              const refNote   = item.notes?.startsWith('Ref: ') ? item.notes.slice(5) : '';
              const catLabel  = SCHEDULE_E_OPTIONS.find(o => o.value === item.schedule_e_cat)?.label || '';
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{item.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">{refNote || '—'}</td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs">
                    <div className="font-medium truncate">{item.vendor}</div>
                    {item.notes && !item.notes.startsWith('Ref: ') && (
                      <div className="text-xs text-gray-400 truncate">{item.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {catLabel ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[item.schedule_e_cat] || 'bg-gray-100 text-gray-600'}`}>
                        {catLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(absAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600 mr-3" title="Edit">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ledger.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm">
            No transactions yet. Add entries manually or import a CSV.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Transaction"
        message="Remove this transaction from the ledger?"
        onConfirm={async () => { await deleteLedgerEntry(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
