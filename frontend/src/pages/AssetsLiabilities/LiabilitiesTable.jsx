import { useState, useEffect, Fragment } from 'react';
import { useLiabilities } from '../../hooks/useLiabilities';
import { useApi } from '../../hooks/useApi';
import CurrencyInput from '../../components/CurrencyInput';
import RunningTotal from '../../components/RunningTotal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/formatCurrency';
import EmptyState from '../../components/EmptyState';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function LiabilitiesTable() {
  const { currentLiabilities, fullLedger, total, search, setSearch, typeFilter, setTypeFilter, createLiability, updateLiability, deleteLiability } = useLiabilities();
  const { get } = useApi();
  
  const [types, setTypes] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [institution, setInstitution] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [monthlyFixedExpense, setMonthlyFixedExpense] = useState(0);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (name) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleUpdateBalance = (item) => {
    setName(item.name);
    setType(item.type);
    setInstitution(item.institution || '');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0); // Clear amount so they can enter the new one
    setMonthlyFixedExpense(item.monthly_fixed_expense || 0);
    setEditingId(null); // It's a new entry for the ledger!
    setIsAdding(true);
  };

  useEffect(() => {
    get('/api/settings/enum-values?domain=liability_type').then(({ data }) => {
      if (data) setTypes(data);
    });
  }, [get]);

  const resetForm = () => {
    setName('');
    setType('');
    setInstitution('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(0);
    setMonthlyFixedExpense(0);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setName(item.name);
    setType(item.type);
    setInstitution(item.institution || '');
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setAmount(item.amount);
    setMonthlyFixedExpense(item.monthly_fixed_expense || 0);
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!name || amount < 0) return;
    
    const payload = { 
      name, 
      type, 
      institution, 
      date,
      amount, 
      monthly_fixed_expense: monthlyFixedExpense > 0 ? monthlyFixedExpense : null 
    };
    
    if (editingId) {
      await updateLiability(editingId, payload);
    } else {
      await createLiability(payload);
    }
    resetForm();
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteLiability(itemToDelete);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search liabilities..."
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
            + Add Liability
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
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
              <label className="block text-sm font-medium text-gray-600">Monthly Fixed Expense</label>
              <div className="mt-1">
                <CurrencyInput value={monthlyFixedExpense} onChange={setMonthlyFixedExpense} />
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

      {currentLiabilities.length === 0 ? (
        <EmptyState title="No liabilities added" message="Track your mortgages, loans, and credit card debt." />
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
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Monthly Payment</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentLiabilities.map((item) => (
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
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.monthly_fixed_expense ? formatCurrency(item.monthly_fixed_expense) : '-'}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                      <button onClick={() => handleUpdateBalance(item)} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                        <PlusIcon className="w-4 h-4" />
                        Update Balance
                      </button>
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
                                      <button onClick={() => handleEdit(ledgerItem)} className="text-primary-500 hover:text-primary-800 text-xs">Edit</button>
                                      <button onClick={() => confirmDelete(ledgerItem.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
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

      <RunningTotal label="Total Liabilities" amount={total} />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Liability"
        message="Are you sure you want to delete this liability? If it has a monthly payment amount, it will be removed from your budget."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
