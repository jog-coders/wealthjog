// CSV Parser — detects column positions by header name, normalises rows.
// Returns { headers, rows: [{ date, vendor, amount_cents }], errors }

const DATE_ALIASES     = ['date', 'transaction date', 'posted date', 'trans date', 'posting date'];
const POSTED_ALIASES   = ['posted date', 'posting date', 'post date'];
const VENDOR_ALIASES   = ['description', 'details', 'vendor', 'merchant', 'payee', 'name', 'memo'];
const AMOUNT_ALIASES   = ['amount', 'debit', 'charge', 'transaction amount', 'withdrawal'];
const DEBIT_ALIASES    = ['debit', 'charge', 'withdrawal', 'spent'];
const CREDIT_ALIASES   = ['credit', 'deposit', 'payment', 'refund'];
const CATEGORY_ALIASES = ['category', 'category name', 'type', 'expense type', 'expense category'];
const ACCOUNT_ALIASES  = ['card no.', 'card no', 'account', 'account number', 'last4'];

function findCol(headers, aliases) {
  const norm = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = norm.findIndex(h => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCsvLine(line) {
  const result = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && quoted && next === '"') {
      value += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      result.push(value);
      value = '';
    } else {
      value += ch;
    }
  }

  result.push(value);
  return result.map(c => c.trim());
}

function parseMoney(raw) {
  if (raw == null || raw === '') return null;
  // Strip currency symbols, commas, parentheses (negatives)
  const text = String(raw).trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text);
  const cleaned = text.replace(/[$,\s]/g, '').replace(/[()]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function parseAmount({ amountRaw, debitRaw, creditRaw }) {
  const debit = parseMoney(debitRaw);
  const credit = parseMoney(creditRaw);

  if (debit !== null && debit !== 0) return Math.round(Math.abs(debit) * 100);
  if (credit !== null && credit !== 0) return -Math.round(Math.abs(credit) * 100);

  const amount = parseMoney(amountRaw);
  if (amount === null) return null;
  return Math.round(amount * 100);
}

function parseDate(raw) {
  if (!raw) return null;
  // Try various common formats
  const cleaned = raw.trim();
  // MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // Try native Date parse as fallback
  const d = new Date(cleaned);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return null;
}

function hashString(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function parseCSV(text, options = {}) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], errors: ['File is empty or has no data rows'] };

  // Parse header row
  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

  const dateCol     = findCol(headers, DATE_ALIASES);
  const postedCol   = findCol(headers, POSTED_ALIASES);
  const vendorCol   = findCol(headers, VENDOR_ALIASES);
  const amountCol   = findCol(headers, AMOUNT_ALIASES);
  const debitCol    = findCol(headers, DEBIT_ALIASES);
  const creditCol   = findCol(headers, CREDIT_ALIASES);
  const categoryCol = findCol(headers, CATEGORY_ALIASES); // optional
  const accountCol  = findCol(headers, ACCOUNT_ALIASES);  // optional

  const missing = [];
  if (dateCol   === -1) missing.push('date column');
  if (vendorCol === -1) missing.push('vendor/description column');
  if (amountCol === -1 && debitCol === -1 && creditCol === -1) missing.push('amount/debit/credit column');

  if (missing.length > 0) {
    return {
      headers,
      rows: [],
      errors: [`Could not auto-detect: ${missing.join(', ')}. Please check your CSV headers.`],
      detectedCols: { dateCol, postedCol, vendorCol, amountCol, debitCol, creditCol, categoryCol, accountCol },
    };
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const clean = parseCsvLine(lines[i]).map(c => String(c || '').replace(/^"|"$/g, '').trim());

    const date         = parseDate(clean[dateCol]);
    const posted_date  = postedCol !== -1 ? parseDate(clean[postedCol]) : null;
    const vendor       = clean[vendorCol] || '';
    const amount_cents = parseAmount({
      amountRaw: amountCol !== -1 ? clean[amountCol] : '',
      debitRaw: debitCol !== -1 ? clean[debitCol] : '',
      creditRaw: creditCol !== -1 ? clean[creditCol] : '',
    });

    if (!date)         { errors.push(`Row ${i + 1}: invalid date "${clean[dateCol]}"`); continue; }
    if (!vendor)       { errors.push(`Row ${i + 1}: empty vendor`); continue; }
    if (amount_cents === null) { errors.push(`Row ${i + 1}: invalid amount "${clean[amountCol]}"`); continue; }
    if (amount_cents === 0)   continue; // skip zero-amount rows silently

    const category_name = categoryCol !== -1 ? (clean[categoryCol] || '') : '';
    const account_hint = accountCol !== -1 ? (clean[accountCol] || '') : '';
    const sourceName = options.sourceName || 'csv';
    const fingerprint = [
      sourceName,
      i,
      date,
      posted_date || '',
      account_hint,
      vendor.toLowerCase(),
      amount_cents,
      category_name.toLowerCase(),
      lines[i],
    ].join('|');

    rows.push({
      date,
      posted_date,
      vendor,
      amount_cents,
      category_name,
      account_hint,
      import_source: 'csv',
      external_id: `csv:${hashString(fingerprint)}`,
    });
  }

  return { headers, rows, errors, detectedCols: { dateCol, postedCol, vendorCol, amountCol, debitCol, creditCol, categoryCol, accountCol } };
}
