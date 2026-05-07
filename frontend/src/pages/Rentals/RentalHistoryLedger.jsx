import { useState } from 'react';
import { useRentalHistory } from '../../hooks/useRentals';
import { formatCurrency } from '../../utils/formatCurrency';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function RentalHistoryLedger({ propertyId }) {
  const { history, loading, addHistoryEntry, updateHistoryEntry, deleteHistoryEntry } = useRentalHistory(propertyId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Financial Value Ledger</h3>
          <p className="text-sm text-gray-500">Track the history of the property's value, rent, and management fees. The latest entry automatically syncs to your main dashboard and integrated budget.</p>
        </div>
        <button onClick={() => { setEditItem(null); setIsFormOpen(true); }} className="btn-secondary text-sm flex items-center whitespace-nowrap">
          <PlusIcon className="h-4 w-4 mr-1" /> New Snapshot
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PM Fees / Mo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mortgage Bal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((item, index) => (
              <tr key={item.id} className={index === 0 ? 'bg-green-50/20' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {item.date} {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Active</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(item.market_value)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">{formatCurrency(item.monthly_rent)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(item.pm_fees)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(item.mortgage_balance)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.notes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => { setEditItem(item); setIsFormOpen(true); }} className="text-primary-600 hover:text-primary-900 mr-3">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteHistoryEntry(item.id)} className="text-red-600 hover:text-red-900">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <div className="py-8 text-center text-gray-500 text-sm">No historical data recorded. Add your first snapshot!</div>
        )}
      </div>

      {isFormOpen && (
        <HistoryForm 
          item={editItem} 
          onClose={() => setIsFormOpen(false)} 
          onSubmit={async (data) => {
            if (editItem) await updateHistoryEntry(editItem.id, data);
            else await addHistoryEntry(data);
            setIsFormOpen(false);
          }} 
        />
      )}
    </div>
  );
}

function HistoryForm({ item, onClose, onSubmit }) {
  const [formData, setFormData] = useState(item || {
    date: new Date().toISOString().split('T')[0],
    market_value: 0,
    monthly_rent: 0,
    pm_fees: 0,
    mortgage_balance: 0,
    notes: ''
  });

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">{item ? 'Edit Snapshot' : 'New Snapshot'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400">&times;</button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Valuation Date</label>
          <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Market Value</label>
          <input required type="number" step="0.01" value={formData.market_value} onChange={e => setFormData({...formData, market_value: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Monthly Rent</label>
            <input required type="number" step="0.01" value={formData.monthly_rent} onChange={e => setFormData({...formData, monthly_rent: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">PM Fees / Mo</label>
            <input required type="number" step="0.01" value={formData.pm_fees} onChange={e => setFormData({...formData, pm_fees: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Mortgage Balance (Liability)</label>
          <input required type="number" step="0.01" value={formData.mortgage_balance} onChange={e => setFormData({...formData, mortgage_balance: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes (Appraisal info, rent increase, etc.)</label>
          <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save Snapshot</button>
        </div>
      </form>
    </div>
  );
}
