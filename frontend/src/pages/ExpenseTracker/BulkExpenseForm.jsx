import { useState, useRef } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { useBudget } from '../../hooks/useBudget';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function BulkExpenseForm({ onSuccess }) {
  const { createBulkExpenses } = useExpenses();
  const { lineItems } = useBudget();
  const fileInputRef = useRef(null);
  
  const today = new Date().toISOString().split('T')[0];
  const [rows, setRows] = useState([{ id: Date.now(), date: today, vendor: '', category: '', amount: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge and deduplicate categories from annual and guilt_free
  const annualCats = lineItems.annual ? lineItems.annual.map(i => i.category).filter(Boolean) : [];
  const guiltFreeCats = lineItems.guilt_free ? lineItems.guilt_free.map(i => i.category).filter(Boolean) : [];
  const allCategories = [...new Set([...annualCats, ...guiltFreeCats])].sort((a, b) => a.localeCompare(b));

  const addRow = () => {
    setRows([...rows, { id: Date.now(), date: today, vendor: '', category: '', amount: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const parseCSV = (csvText) => {
    // Basic CSV parser to handle quotes
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    // Check if first line is header
    const firstLine = lines[0].toLowerCase();
    const isHeader = firstLine.includes('posted date') || firstLine.includes('payee');
    const dataLines = isHeader ? lines.slice(1) : lines;

    const parsedRows = dataLines.map((line, index) => {
      // Regex to split by comma but ignore commas inside quotes
      const rowRegex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
      const values = [];
      let match;
      while ((match = rowRegex.exec(line)) !== null) {
        values.push(match[1] !== undefined ? match[1] : match[2]);
      }
      
      // Expected format: Posted Date, Reference Number, Payee, Address, Amount
      if (values.length >= 5) {
        const rawDate = values[0]?.trim();
        const vendor = values[2]?.trim();
        const rawAmount = values[4]?.trim();

        // Convert MM/DD/YYYY to YYYY-MM-DD
        let formattedDate = today;
        if (rawDate && /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
          const [m, d, y] = rawDate.split('/');
          formattedDate = `${y}-${m}-${d}`;
        }

        // Parse amount and take absolute value
        let amount = 0;
        if (rawAmount) {
          const num = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
          if (!isNaN(num)) {
            amount = Math.abs(num);
          }
        }

        return {
          id: Date.now() + index,
          date: formattedDate,
          vendor: vendor || '',
          category: '', // Leave category empty for manual selection
          amount: amount || ''
        };
      }
      return null;
    }).filter(Boolean);

    return parsedRows;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      const newRows = parseCSV(csvText);
      if (newRows.length > 0) {
        setRows(newRows);
        toast.success(`Loaded ${newRows.length} rows from CSV. Please assign categories.`);
      } else {
        toast.error('Could not parse any rows from the file.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    // Validate rows
    const validRows = [];
    const invalidRows = [];

    rows.forEach((row, idx) => {
      const amount = parseFloat(row.amount);
      if (row.date && row.vendor && row.category && !isNaN(amount) && amount > 0) {
        validRows.push({
          date: row.date,
          vendor: row.vendor,
          budget_category: row.category,
          amount: amount
        });
      } else {
        invalidRows.push(idx + 1);
      }
    });

    if (validRows.length === 0) {
      toast.error('No valid rows to save. Please fill all required fields.');
      return;
    }

    if (invalidRows.length > 0) {
      const confirm = window.confirm(`${invalidRows.length} row(s) are incomplete (Rows: ${invalidRows.join(', ')}). Proceed saving only valid rows?`);
      if (!confirm) return;
    }

    setIsSubmitting(true);
    const { error } = await createBulkExpenses(validRows);
    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to save expenses: ' + error.message);
    } else {
      toast.success(`Successfully saved ${validRows.length} expenses.`);
      setRows([{ id: Date.now(), date: today, vendor: '', category: '', amount: '' }]);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <p className="text-sm text-gray-500">
          Enter multiple expenses manually or upload a bank statement CSV.
        </p>
        <div>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="-ml-0.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            Upload CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Date *</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vendor *</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category *</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount *</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap py-2 pl-4 pr-3 sm:pl-0">
                  <input 
                    type="date" 
                    value={row.date} 
                    onChange={e => updateRow(row.id, 'date', e.target.value)} 
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 px-2"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <input 
                    type="text" 
                    placeholder="Vendor name"
                    value={row.vendor} 
                    onChange={e => updateRow(row.id, 'vendor', e.target.value)} 
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 px-2"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <select 
                    value={row.category} 
                    onChange={e => updateRow(row.id, 'category', e.target.value)} 
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 px-2 bg-white ${!row.category ? 'text-gray-500' : ''}`}
                  >
                    <option value="">Select...</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={e => updateRow(row.id, 'amount', e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 px-2"
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    disabled={rows.length === 1}
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <PlusIcon className="-ml-0.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          Add Row
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save All Valid Rows'}
        </button>
      </div>
    </div>
  );
}
