import { useState, useEffect } from 'react';
import { useBudget } from '../../hooks/useBudget';
import CurrencyInput from '../../components/CurrencyInput';
import RunningTotal from '../../components/RunningTotal';
import PercentBadge from '../../components/PercentBadge';
import toast from 'react-hot-toast';

export default function GuiltFreeStep({ onNext }) {
  const { summary, lineItems, saveSection } = useBudget();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (lineItems.guilt_free) {
      setItems(lineItems.guilt_free.map((item, index) => ({ ...item, localId: item.id || `temp-${index}` })));
    }
  }, [lineItems.guilt_free]);

  const guiltFreeCapAmount = summary.guiltFreeCapAmount || 0;
  const runningTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const diff = guiltFreeCapAmount - runningTotal;

  const handleAddItem = () => {
    setItems([...items, { localId: `temp-${Date.now()}`, category: '', amount: 0, sort_order: items.length }]);
  };

  const handleUpdateItem = (localId, field, value) => {
    setItems(items.map(item => item.localId === localId ? { ...item, [field]: value } : item));
  };

  const handleDeleteItem = (localId) => {
    setItems(items.filter(item => item.localId !== localId));
  };

  const handleSave = async () => {
    const payload = items.filter(i => i.category.trim() !== '').map((item, idx) => ({
      category: item.category.trim(),
      amount: item.amount,
      sort_order: idx
    }));

    await saveSection('guilt_free', payload);
    toast.success('Budget saved!');
    if (onNext) onNext();
  };

  let alertClass = '';
  let alertMessage = '';
  let alertIcon = null;

  if (diff > 0) {
    alertClass = 'bg-green-50 text-green-800 border-green-200';
    alertMessage = `You have $${diff.toFixed(2)} surplus.`;
    alertIcon = (
      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    );
  } else if (diff === 0) {
    alertClass = 'bg-primary-50 text-primary-800 border-blue-200';
    alertMessage = 'Budget perfectly balanced.';
    alertIcon = (
      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-3.857-3.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    );
  } else {
    alertClass = 'bg-red-50 text-red-800 border-red-200';
    alertMessage = `You are $${Math.abs(diff).toFixed(2)} over budget.`;
    alertIcon = (
      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">Guilt-Free Budget</h2>
        <button
          type="button"
          onClick={handleAddItem}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-primary-500 ring-1 ring-inset ring-primary-500 hover:bg-primary-50"
        >
          + Add Category
        </button>
      </div>

      <div className={`rounded-lg p-4 border ${alertClass}`}>
        <div className="flex">
          <div className="flex-shrink-0">{alertIcon}</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">{alertMessage}</h3>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/3">Category</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/3">Amount</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">% of Cap</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const percent = guiltFreeCapAmount > 0 ? ((Number(item.amount) || 0) / guiltFreeCapAmount) * 100 : 0;
              return (
                <tr key={item.localId}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => handleUpdateItem(item.localId, 'category', e.target.value)}
                      placeholder="e.g. Dining Out, Entertainment"
                      className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <CurrencyInput
                      value={item.amount}
                      onChange={(val) => handleUpdateItem(item.localId, 'amount', val)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <PercentBadge percent={percent} />
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button onClick={() => handleDeleteItem(item.localId)} className="text-red-600 hover:text-red-900">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <RunningTotal label="Guilt-Free Spending Total" amount={runningTotal} />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Save & Finish
        </button>
      </div>
    </div>
  );
}
