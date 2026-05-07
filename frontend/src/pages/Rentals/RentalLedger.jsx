import { useState } from 'react';
import { useRentalLedger } from '../../hooks/useRentals';
import { formatCurrency } from '../../utils/formatCurrency';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function RentalLedger({ propertyId }) {
  const { ledger, loading, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry } = useRentalLedger(propertyId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading ledger...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Transaction Ledger</h3>
        <button onClick={() => { setEditItem(null); setIsFormOpen(true); }} className="btn-secondary text-sm flex items-center">
          <PlusIcon className="h-4 w-4 mr-1" /> Add Entry
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ledger.map(item => (
              <tr key={item.id} className={item.is_automated ? 'bg-blue-50/30' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.category}
                  {item.is_automated && <span className="ml-2 text-xs text-blue-500">(Auto)</span>}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${item.type === 'Income' ? 'text-green-600' : 'text-gray-900'}`}>
                  {item.type === 'Expense' ? '-' : ''}{formatCurrency(item.amount)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.notes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => { setEditItem(item); setIsFormOpen(true); }} className="text-primary-600 hover:text-primary-900 mr-3">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteLedgerEntry(item.id)} className="text-red-600 hover:text-red-900">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">No transactions found.</div>
        )}
      </div>

      {isFormOpen && (
        <LedgerForm 
          item={editItem} 
          onClose={() => setIsFormOpen(false)} 
          onSubmit={async (data) => {
            if (editItem) await updateLedgerEntry(editItem.id, data);
            else await addLedgerEntry(data);
            setIsFormOpen(false);
          }} 
        />
      )}
    </div>
  );
}

function LedgerForm({ item, onClose, onSubmit }) {
  const [formData, setFormData] = useState(item || {
    date: new Date().toISOString().split('T')[0],
    type: 'Expense',
    category: 'Repairs',
    amount: 0,
    notes: ''
  });

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">{item ? 'Edit Entry' : 'Add Entry'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400">&times;</button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
              <option>Income</option>
              <option>Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input required type="text" list="ledger-cats" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
            <datalist id="ledger-cats">
              <option value="Rent" />
              <option value="Mortgage" />
              <option value="PM Fees" />
              <option value="Repairs" />
              <option value="Taxes" />
              <option value="Insurance" />
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
