/**
 * CsvImportWizard
 * Parses the RPM / property-management CSV format client-side, matches each
 * row's "Location" to one of the user's saved properties, lets the user review
 * and adjust, then bulk-imports via POST /api/rentals/import.
 *
 * CSV columns expected:  Date, Ref #, Location, Details, Amount
 * Amount convention:     negative ($-122.84) = expense,  positive = income
 */
import { useState, useRef, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { CloudArrowUpIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ── IRS Schedule-E auto-mapping ───────────────────────────────────────────────
const SCHEDULE_E_OPTIONS = [
  { value: '',                       label: 'Uncategorized' },
  { value: 'advertising',            label: 'Advertising' },
  { value: 'auto_and_travel',        label: 'Auto & Travel' },
  { value: 'cleaning_and_maintenance',label: 'Cleaning & Maintenance' },
  { value: 'commissions',            label: 'Commissions' },
  { value: 'insurance',              label: 'Insurance' },
  { value: 'legal_and_professional', label: 'Legal & Professional' },
  { value: 'management_fees',        label: 'Management Fees' },
  { value: 'mortgage_interest',      label: 'Mortgage Interest' },
  { value: 'other_interest',         label: 'Other Interest' },
  { value: 'repairs',                label: 'Repairs' },
  { value: 'supplies',               label: 'Supplies' },
  { value: 'taxes',                  label: 'Taxes' },
  { value: 'utilities',              label: 'Utilities' },
  { value: 'hoa_fees',               label: 'HOA Fees' },
  { value: 'principal_reduction',    label: 'Principal Reduction' },
  { value: 'gross_rental_income',    label: 'Gross Rental Income' },
];

const KEYWORD_MAP = [
  { re: /utilit/i,      cat: 'utilities' },
  { re: /repair/i,      cat: 'repairs' },
  { re: /mainten/i,     cat: 'cleaning_and_maintenance' },
  { re: /clean/i,       cat: 'cleaning_and_maintenance' },
  { re: /tax/i,         cat: 'taxes' },
  { re: /insur/i,       cat: 'insurance' },
  { re: /legal|attorney|prof/i, cat: 'legal_and_professional' },
  { re: /manag|pm fee/i,cat: 'management_fees' },
  { re: /adverti/i,     cat: 'advertising' },
  { re: /hoa/i,         cat: 'hoa_fees' },
  { re: /suppli/i,      cat: 'supplies' },
  { re: /travel|mileage/i, cat: 'auto_and_travel' },
  { re: /commission/i,  cat: 'commissions' },
  { re: /reimburse/i,   cat: 'utilities' }, // utility reimbursements
];

function inferCategory(details) {
  for (const { re, cat } of KEYWORD_MAP) {
    if (re.test(details)) return cat;
  }
  return '';
}

// ── CSV parsing ───────────────────────────────────────────────────────────────
function parseAmount(raw = '') {
  // Remove $, commas, spaces; keep sign
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '');
  return parseFloat(cleaned) || 0;
}

function parseDate(raw = '') {
  // MM/DD/YYYY → YYYY-MM-DD
  const [m, d, y] = raw.trim().split('/');
  if (!m || !d || !y) return raw.trim();
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function parseDetails(raw = '') {
  // "Category:Description-extra" or "Category-description"
  const colonIdx = raw.indexOf(':');
  if (colonIdx > -1) {
    const category = raw.slice(0, colonIdx).trim();
    const rest     = raw.slice(colonIdx + 1).split('-')[0].trim();
    return { vendor: rest || category, rawCategory: category };
  }
  // no colon — take text before first `-`
  const dashIdx = raw.indexOf('-');
  const vendor  = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw.trim();
  return { vendor: vendor || raw.trim(), rawCategory: raw.trim() };
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const cells = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] || '').trim().replace(/^"|"$/g, '')]));
  }).filter(r => r['Date'] && r['Amount']);
}

// ── Property fuzzy match ──────────────────────────────────────────────────────
function matchProperty(location, rentals) {
  if (!location) return null;
  const loc = location.toLowerCase().trim();
  return rentals.find(r => {
    const name = (r.property_name || '').toLowerCase();
    const street = (r.address?.street || r.address || '').toLowerCase();
    return name.includes(loc) || loc.includes(name) ||
           street.includes(loc) || loc.includes(street) ||
           // match on street number + name fragment
           (loc.split(' ').length >= 2 && (street.startsWith(loc.split(' ')[0]) || name.startsWith(loc.split(' ')[0])));
  }) || null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CsvImportWizard({ rentals, onClose, onImported }) {
  const { post } = useApi();
  const fileRef = useRef();
  const [step, setStep]     = useState('upload'); // 'upload' | 'review' | 'importing'
  const [rows, setRows]     = useState([]);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = parseCsv(e.target.result);
      const parsed = raw.map((r, idx) => {
        const csvAmount = parseAmount(r['Amount']);
        // CSV sign convention: negative = expense, positive = income
        // DB convention: positive = expense (outflow), negative = income
        const amount_cents = Math.round(-csvAmount * 100);
        const { vendor, rawCategory } = parseDetails(r['Details'] || '');
        const schedule_e_cat = inferCategory(r['Details'] || rawCategory);
        const matchedProp = matchProperty(r['Location'], rentals);
        return {
          _id:           idx,
          date:          parseDate(r['Date']),
          ref_number:    r['Ref #'] || '',
          location:      r['Location'] || '',
          vendor,
          details_raw:   r['Details'] || '',
          amount_cents,
          schedule_e_cat,
          property_id:   matchedProp?.id || '',
          property_name: matchedProp?.property_name || '',
          _unmatched:    !matchedProp,
        };
      });
      setRows(parsed);
      setStep('review');
    };
    reader.readAsText(file);
  }, [rentals]);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const updateRow = (idx, patch) => {
    setRows(prev => prev.map(r => r._id === idx ? { ...r, ...patch } : r));
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.property_id);
    if (valid.length === 0) { toast.error('No rows with a matched property'); return; }
    setStep('importing');
    const { data, error } = await post('/api/rentals/import', {
      rows: valid.map(r => ({
        property_id:   r.property_id,
        date:          r.date,
        vendor:        r.vendor || r.details_raw,
        notes:         r.ref_number ? `Ref: ${r.ref_number}` : null,
        amount_cents:  r.amount_cents,
        schedule_e_cat: r.schedule_e_cat || null,
      })),
    });
    if (!error) {
      toast.success(`Imported ${data.imported} transaction${data.imported !== 1 ? 's' : ''}`);
      onImported?.();
      onClose();
    } else {
      setStep('review');
    }
  };

  const unmatched = rows.filter(r => r._unmatched).length;
  const skipped   = rows.filter(r => !r.property_id).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Rental Transactions</h2>
            <p className="text-sm text-gray-500 mt-0.5">CSV format: Date, Ref #, Location, Details, Amount</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => fileRef.current.click()}
            >
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base font-medium text-gray-700">Drop your CSV file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {(step === 'review' || step === 'importing') && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{fileName}</span>
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{rows.length} rows parsed</span>
                {unmatched > 0 && (
                  <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {unmatched} location{unmatched > 1 ? 's' : ''} unmatched — assign manually or they'll be skipped
                  </span>
                )}
                {skipped > 0 && skipped !== unmatched && (
                  <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full">{skipped} will be skipped</span>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Schedule E</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map(row => (
                      <tr key={row._id} className={row._unmatched && !row.property_id ? 'bg-amber-50/40' : ''}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{row.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400 text-xs">{row.ref_number || '—'}</td>

                        {/* Property selector */}
                        <td className="px-3 py-2 min-w-[180px]">
                          <select
                            value={row.property_id}
                            onChange={e => updateRow(row._id, {
                              property_id:   e.target.value,
                              property_name: rentals.find(r => r.id === e.target.value)?.property_name || '',
                              _unmatched:    !e.target.value,
                            })}
                            className={`w-full rounded-lg border text-xs px-2 py-1 ${!row.property_id ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                          >
                            <option value="">— assign property —</option>
                            {rentals.map(r => (
                              <option key={r.id} value={r.id}>{r.property_name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2 max-w-[240px]">
                          <input
                            type="text"
                            value={row.vendor}
                            onChange={e => updateRow(row._id, { vendor: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 text-xs px-2 py-1"
                          />
                          {row.details_raw !== row.vendor && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate" title={row.details_raw}>{row.details_raw}</div>
                          )}
                        </td>

                        {/* Schedule E */}
                        <td className="px-3 py-2 min-w-[180px]">
                          <select
                            value={row.schedule_e_cat}
                            onChange={e => updateRow(row._id, { schedule_e_cat: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-white text-xs px-2 py-1"
                          >
                            {SCHEDULE_E_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Amount */}
                        <td className={`px-3 py-2 whitespace-nowrap text-right font-medium text-sm ${row.amount_cents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {row.amount_cents > 0 ? '-' : '+'}${(Math.abs(row.amount_cents) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'upload' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => { setStep('upload'); setRows([]); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              ← Change File
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {rows.length - skipped} of {rows.length} rows will be imported
              </span>
              <button
                onClick={handleImport}
                disabled={step === 'importing' || rows.every(r => !r.property_id)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'importing' ? (
                  <>Importing…</>
                ) : (
                  <><CheckIcon className="w-4 h-4" /> Import {rows.length - skipped} Transactions</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
