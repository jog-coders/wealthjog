import { useState } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { useBudget } from '../../hooks/useBudget';
import CurrencyInput from '../../components/CurrencyInput';

export default function ExpenseForm() {
  const { createExpense } = useExpenses();
  const { lineItems } = useBudget();
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);

  // Merge and deduplicate categories from annual and guilt_free
  const annualCats = lineItems.annual ? lineItems.annual.map(i => i.category).filter(Boolean) : [];
  const guiltFreeCats = lineItems.guilt_free ? lineItems.guilt_free.map(i => i.category).filter(Boolean) : [];
  
  const allCategories = [...new Set([...annualCats, ...guiltFreeCats])].sort((a, b) => a.localeCompare(b));

  const handleSubmit = async () => {
    if (!vendor || !category || amount <= 0 || !date) return;
    
    const { error } = await createExpense({ date, vendor, budget_category: category, amount });
    if (!error) {
      setVendor('');
      setAmount(0);
      // Keep date and category for easy multi-entry
    }
  };

  return (
    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 items-end">
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3" 
        />
      </div>
      
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-600 mb-1">Vendor *</label>
        <input 
          type="text" 
          value={vendor} 
          onChange={e => setVendor(e.target.value)} 
          className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3" 
        />
      </div>
      
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-600 mb-1">Category *</label>
        <select 
          value={category} 
          onChange={e => setCategory(e.target.value)} 
          className="block w-full rounded-lg border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 px-3 bg-white"
        >
          <option value="">Select...</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-600 mb-1">Amount *</label>
        <CurrencyInput value={amount} onChange={setAmount} />
      </div>

      <div className="sm:col-span-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full inline-flex justify-center rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          Add Expense
        </button>
      </div>
    </div>
  );
}
