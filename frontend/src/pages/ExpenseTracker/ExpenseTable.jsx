import { useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { useBudget } from '../../hooks/useBudget';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/formatCurrency';

export default function ExpenseTable() {
  const { expenses, monthFilter, setMonthFilter, updateExpense, deleteExpense } = useExpenses();
  const { lineItems } = useBudget();
  
  const [editingId, setEditingId] = useState(null);
  
  const [editDate, setEditDate] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState(0);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const annualCats = lineItems.annual ? lineItems.annual.map(i => i.category).filter(Boolean) : [];
  const guiltFreeCats = lineItems.guilt_free ? lineItems.guilt_free.map(i => i.category).filter(Boolean) : [];
  const allCategories = [...new Set([...annualCats, ...guiltFreeCats])].sort((a, b) => a.localeCompare(b));

  const handleEdit = (item) => {
    setEditDate(item.date);
    setEditVendor(item.vendor);
    setEditCategory(item.budget_category);
    setEditAmount(item.amount);
    setEditingId(item.id);
  };

  const handleSave = async (id) => {
    if (!editVendor || !editCategory || editAmount < 0 || !editDate) return;
    
    await updateExpense(id, { date: editDate, vendor: editVendor, budget_category: editCategory, amount: editAmount });
    setEditingId(null);
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteExpense(itemToDelete);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <input 
          type="month" 
          value={monthFilter} 
          onChange={e => setMonthFilter(e.target.value)} 
          className="block w-48 rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3"
          placeholder="Filter by month"
        />
        {monthFilter && (
          <button onClick={() => setMonthFilter('')} className="ml-2 text-sm text-gray-500 hover:text-gray-700">Clear</button>
        )}
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vendor</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {expenses.map((item) => (
              <tr key={item.id}>
                {editingId === item.id ? (
                  <>
                    <td className="whitespace-nowrap py-2 pl-4 pr-3 sm:pl-6">
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="block w-full rounded border-gray-200 px-2 py-1 text-sm border" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <input type="text" value={editVendor} onChange={e => setEditVendor(e.target.value)} className="block w-full rounded border-gray-200 px-2 py-1 text-sm border" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="block w-full rounded border-gray-200 px-2 py-1 text-sm border bg-white">
                        <option value="">Select...</option>
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <CurrencyInput value={editAmount} onChange={setEditAmount} />
                    </td>
                    <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                      <button onClick={() => handleSave(item.id)} className="text-green-600 hover:text-green-900">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{item.date}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.vendor}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {item.budget_category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium">{formatCurrency(item.amount)}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                      <button onClick={() => handleEdit(item)} className="text-primary-500 hover:text-primary-800">Edit</button>
                      <button onClick={() => confirmDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="5" className="py-4 text-center text-sm text-gray-500">No expenses found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
