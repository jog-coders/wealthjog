import { useState } from 'react';
import { useIncome } from '../../hooks/useIncome';
import { formatCurrency } from '../../utils/formatCurrency';
import CurrencyInput from '../../components/CurrencyInput';
import RunningTotal from '../../components/RunningTotal';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function IncomeStep({ onNext }) {
  const { income, totals, createIncome, updateIncome, deleteIncome } = useIncome();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Salary');
  const [frequency, setFrequency] = useState('Monthly');
  
  const [grossIncome, setGrossIncome] = useState(0);
  const [retirementSavings, setRetirementSavings] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [amount, setAmount] = useState(0); // This represents Net Income

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('Salary');
    setFrequency('Monthly');
    setGrossIncome(0);
    setRetirementSavings(0);
    setOtherDeductions(0);
    setAmount(0);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setName(item.name);
    setDescription(item.description || '');
    setType(item.type);
    setFrequency(item.frequency);
    setGrossIncome(item.gross_income || 0);
    setRetirementSavings(item.retirement_savings || 0);
    setOtherDeductions(item.other_deductions || 0);
    setAmount(item.amount || 0);
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleGrossChange = (val) => {
    setGrossIncome(val);
    setAmount(val - retirementSavings - otherDeductions);
  };

  const handleRetirementChange = (val) => {
    setRetirementSavings(val);
    setAmount(grossIncome - val - otherDeductions);
  };

  const handleOtherDeductionsChange = (val) => {
    setOtherDeductions(val);
    setAmount(grossIncome - retirementSavings - val);
  };

  const handleNetChange = (val) => {
    setAmount(val);
    setOtherDeductions(grossIncome - val - retirementSavings);
  };

  const handleSave = async () => {
    if (!name || amount < 0) return;
    
    const payload = { 
      name, 
      description, 
      type, 
      frequency, 
      amount,
      gross_income: grossIncome,
      retirement_savings: retirementSavings,
      other_deductions: otherDeductions
    };
    
    if (editingId) {
      await updateIncome(editingId, payload);
    } else {
      await createIncome(payload);
    }
    resetForm();
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteIncome(itemToDelete);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">Income Stream</h2>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Add Income
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                <option value="Salary">Salary</option>
                <option value="Rental">Rental</option>
                <option value="Other Income">Other Income</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white">
                <option value="Biweekly">Biweekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-600">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border bg-white" />
            </div>
            
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-600">Gross Income</label>
              <div className="mt-1">
                <CurrencyInput value={grossIncome} onChange={handleGrossChange} />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-600">Retirement Savings</label>
              <div className="mt-1">
                <CurrencyInput value={retirementSavings} onChange={handleRetirementChange} />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-600">Other Deductions</label>
              <div className="mt-1">
                <CurrencyInput value={otherDeductions} onChange={handleOtherDeductionsChange} />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-600">Net Income</label>
              <div className="mt-1">
                <CurrencyInput value={amount} onChange={handleNetChange} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button type="button" onClick={resetForm} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600">Save</button>
          </div>
        </div>
      )}

      {income.length === 0 ? (
        <EmptyState title="No income sources" message="Add your salary or other income sources to get started." />
      ) : (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden md:table-cell">Type</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden sm:table-cell">Frequency</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell">Gross</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell">Retirement</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 hidden lg:table-cell">Deductions</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-bold text-gray-900">Net Income</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {income.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {item.name}
                    {item.description && <span className="block text-xs font-normal text-gray-500">{item.description}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden md:table-cell">{item.type}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">{item.frequency}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatCurrency(item.gross_income || 0)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatCurrency(item.retirement_savings || 0)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatCurrency(item.other_deductions || 0)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                    <button onClick={() => handleEdit(item)} className="text-primary-500 hover:text-primary-800">Edit</button>
                    <button onClick={() => confirmDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <RunningTotal label="Biweekly Net Total" amount={totals.biweeklyTotal} />
        <RunningTotal label="Monthly Net Total" amount={totals.monthlyTotal} />
        <RunningTotal label="Annual Net Total" amount={totals.annualTotal} />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Next: Annual Budget &rarr;
        </button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Income"
        message="Are you sure you want to delete this income? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
