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
  const blankRow = () => ({ id: Date.now(), date: today, vendor: '', category: '', suggestedCategory: '', amount: '' });
  const [rows, setRows] = useState([blankRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge and deduplicate categories from annual and guilt_free
  const annualCats = lineItems.annual ? lineItems.annual.map(i => i.category).filter(Boolean) : [];
  const guiltFreeCats = lineItems.guilt_free ? lineItems.guilt_free.map(i => i.category).filter(Boolean) : [];
  const allCategories = [...new Set([...annualCats, ...guiltFreeCats])].sort((a, b) => a.localeCompare(b));

  const addRow = () => {
    setRows([...rows, blankRow()]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // --- CSV parsing -------------------------------------------------------

  // Lowercase header aliases. Order matters for `preferFirstAlias` lookups:
  // for `date`, "transaction date" beats "posted date" when both are present.
  const HEADER_ALIASES = {
    date: ['transaction date', 'trans date', 'date', 'posted date'],
    vendor: ['description', 'payee', 'merchant', 'vendor', 'name'],
    amount: ['debit', 'amount', 'withdrawal'],
    credit: ['credit', 'deposit'],
    category: ['category'],
  };

  // Split a CSV line, honoring "" escaped quotes inside quoted fields.
  const splitCsvLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(v => v.trim());
  };

  // Find the column index for a field. With preferFirstAlias the aliases are
  // tried in declaration order; otherwise we scan headers left-to-right.
  const findColumn = (headers, aliases, { preferFirstAlias = false } = {}) => {
    if (preferFirstAlias) {
      for (const alias of aliases) {
        const idx = headers.indexOf(alias);
        if (idx !== -1) return idx;
      }
      return -1;
    }
    for (let i = 0; i < headers.length; i++) {
      if (aliases.includes(headers[i])) return i;
    }
    return -1;
  };

  // Convert a date string to YYYY-MM-DD. Returns null if unrecognized.
  // `hint` is 'mdy' (default, US bank statements) or 'dmy'.
  const parseDate = (raw, hint = 'mdy') => {
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // ISO already
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let [, a, b, y] = m;
      if (y.length === 2) y = '20' + y;
      const pad = (s) => s.padStart(2, '0');
      return hint === 'dmy' ? `${y}-${pad(b)}-${pad(a)}` : `${y}-${pad(a)}-${pad(b)}`;
    }
    return null;
  };

  // Infer DMY vs MDY from a handful of sample dates: any first-component > 12
  // proves the file is DMY.
  const detectDateHint = (samples) => {
    for (const s of samples) {
      const m = s && s.match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/);
      if (m && parseInt(m[1], 10) > 12) return 'dmy';
    }
    return 'mdy';
  };

  const parseCSV = (csvText) => {
    const cleaned = csvText.replace(/^﻿/, ''); // strip BOM
    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return { rows: [], error: 'CSV is empty or has no data rows.' };
    }

    const headerCells = splitCsvLine(lines[0]).map(h => h.toLowerCase());

    const dateCol = findColumn(headerCells, HEADER_ALIASES.date, { preferFirstAlias: true });
    const vendorCol = findColumn(headerCells, HEADER_ALIASES.vendor);
    const amountCol = findColumn(headerCells, HEADER_ALIASES.amount, { preferFirstAlias: true });
    const creditCol = findColumn(headerCells, HEADER_ALIASES.credit);
    const categoryCol = findColumn(headerCells, HEADER_ALIASES.category);

    const missing = [];
    if (dateCol === -1) missing.push('Date');
    if (vendorCol === -1) missing.push('Vendor/Description');
    if (amountCol === -1) missing.push('Amount/Debit');
    if (missing.length) {
      return {
        rows: [],
        error: `Missing column(s): ${missing.join(', ')}. Found: ${headerCells.join(', ')}`,
      };
    }

    // Sample first 5 data rows to choose date format.
    const sampleDates = lines.slice(1, 6)
      .map(l => splitCsvLine(l)[dateCol])
      .filter(Boolean);
    const dateHint = detectDateHint(sampleDates);

    // Case-insensitive lookup of user's budget categories.
    const budgetCatIndex = new Map(allCategories.map(c => [c.toLowerCase(), c]));

    let skippedCredits = 0;
    const rows = [];
    lines.slice(1).forEach((line, index) => {
      const cells = splitCsvLine(line);

      const rawDate = cells[dateCol]?.trim();
      const vendor = cells[vendorCol]?.trim() || '';
      const rawDebit = cells[amountCol]?.trim();
      const rawCredit = creditCol !== -1 ? cells[creditCol]?.trim() : '';
      const rawCategory = categoryCol !== -1 ? cells[categoryCol]?.trim() : '';

      // Skip refunds/payments when Debit and Credit are separate columns.
      if (creditCol !== -1 && amountCol !== creditCol && !rawDebit && rawCredit) {
        skippedCredits += 1;
        return;
      }

      let amount = 0;
      if (rawDebit) {
        const num = parseFloat(rawDebit.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num)) amount = Math.abs(num);
      }
      if (!amount) return; // skip blank-amount rows

      const formattedDate = parseDate(rawDate, dateHint) || today;

      let category = '';
      let suggestedCategory = '';
      if (rawCategory) {
        const match = budgetCatIndex.get(rawCategory.toLowerCase());
        if (match) category = match;
        else suggestedCategory = rawCategory;
      }

      rows.push({
        id: Date.now() + index,
        date: formattedDate,
        vendor,
        category,
        suggestedCategory,
        amount,
      });
    });

    return {
      rows,
      skippedCredits,
      detected: {
        date: headerCells[dateCol],
        vendor: headerCells[vendorCol],
        amount: headerCells[amountCol],
        credit: creditCol !== -1 ? headerCells[creditCol] : null,
        category: categoryCol !== -1 ? headerCells[categoryCol] : null,
        dateHint,
      },
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target.result;
      const result = parseCSV(csvText);

      if (result.error) {
        toast.error(result.error, { duration: 6000 });
      } else if (result.rows.length === 0) {
        toast.error('No importable rows found in this file.');
      } else {
        setRows(result.rows);
        const { date, vendor, amount } = result.detected;
        const detail = `Detected: Date="${date}", Vendor="${vendor}", Amount="${amount}"`;
        const skipped = result.skippedCredits
          ? ` Skipped ${result.skippedCredits} credit/refund row(s).`
          : '';
        toast.success(`Loaded ${result.rows.length} rows.${skipped} ${detail}`, { duration: 6000 });
      }
    };
    reader.readAsText(file);
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
      setRows([blankRow()]);
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
                    title={row.suggestedCategory ? `Bank suggested: ${row.suggestedCategory}` : undefined}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 px-2 bg-white ${!row.category ? 'text-gray-500' : ''}`}
                  >
                    <option value="">
                      {row.suggestedCategory ? `Select... (bank: ${row.suggestedCategory})` : 'Select...'}
                    </option>
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
