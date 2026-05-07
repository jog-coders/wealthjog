import { useState, useEffect } from 'react';
import { useBudget } from '../../hooks/useBudget';
import CurrencyInput from '../../components/CurrencyInput';
import PercentBadge from '../../components/PercentBadge';
import AutoInjectedRow from '../../components/AutoInjectedRow';

export default function FixedMonthlyStep({ onNext }) {
  const { summary, lineItems, saveSection } = useBudget();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (lineItems.fixed_monthly) {
      // Only keep user editable items for state
      const editableItems = lineItems.fixed_monthly.filter(i => !i.is_auto_injected);
      setItems(editableItems.map((item, index) => ({ ...item, localId: item.id || `temp-${index}` })));
    }
  }, [lineItems.fixed_monthly]);

  const autoInjectedItems = lineItems.fixed_monthly ? lineItems.fixed_monthly.filter(i => i.is_auto_injected) : [];

  const handleAddItem = () => {
    setItems([...items, { localId: `temp-${Date.now()}`, category: '', amount: 0, sort_order: items.length, is_auto_injected: false }]);
  };

  const handleUpdateItem = (localId, field, value) => {
    setItems(items.map(item => item.localId === localId ? { ...item, [field]: value } : item));
  };

  const handleDeleteItem = (localId) => {
    setItems(items.filter(item => item.localId !== localId));
  };

  const handleSaveAndContinue = async () => {
    const payload = items.filter(i => i.category.trim() !== '').map((item, idx) => ({
      category: item.category.trim(),
      amount: item.amount,
      sort_order: idx
    }));

    await saveSection('fixed_monthly', payload);
    onNext();
  };

  const monthlyIncome = summary.monthlyIncome || 0;
  const annualTotal = summary.annualTotal || 0;
  
  const annualMonthlyEquivalent = annualTotal / 12;
  const autoInjectedTotal = autoInjectedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const userItemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  const currentFixedTotal = annualMonthlyEquivalent + autoInjectedTotal + userItemsTotal;
  const guiltFreeTotal = monthlyIncome - currentFixedTotal;

  const isOverBudget = currentFixedTotal > monthlyIncome;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">Fixed Monthly Costs</h2>
      </div>

      {isOverBudget && (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Over Budget Warning</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Your fixed monthly costs exceed your monthly income. Please adjust your budget.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/3">Category</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/3">Amount</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">% of Income</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            
            {/* GROUP 1: Annual Budget equivalent */}
            <AutoInjectedRow 
              category="Annual Budget (Monthly)" 
              amount={annualMonthlyEquivalent} 
              percentOfTotal={monthlyIncome > 0 ? (annualMonthlyEquivalent / monthlyIncome) * 100 : 0} 
            />

            {/* GROUP 2: Auto-injected from assets/liabilities */}
            {autoInjectedItems.map((item) => (
              <AutoInjectedRow 
                key={item.id}
                category={item.category} 
                amount={item.amount} 
                percentOfTotal={monthlyIncome > 0 ? (Number(item.amount) / monthlyIncome) * 100 : 0} 
              />
            ))}

            {/* GROUP 3: User editable items */}
            {items.map((item) => {
              const percent = monthlyIncome > 0 ? ((Number(item.amount) || 0) / monthlyIncome) * 100 : 0;
              return (
                <tr key={item.localId}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => handleUpdateItem(item.localId, 'category', e.target.value)}
                      placeholder="e.g. Rent, Utilities"
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

            {/* LAST ROW: Guilt Free Total remaining */}
            <AutoInjectedRow 
              category="Total for Guilt-Free Budget" 
              amount={guiltFreeTotal} 
              percentOfTotal={monthlyIncome > 0 ? (guiltFreeTotal / monthlyIncome) * 100 : 0} 
              isTeal={true}
            />

          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleAddItem}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-primary-500 ring-1 ring-inset ring-primary-500 hover:bg-primary-50"
        >
          + Add Row
        </button>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={handleSaveAndContinue}
          className="inline-flex items-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Save & Continue &rarr;
        </button>
      </div>
    </div>
  );
}
