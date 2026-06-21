import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useAppContext } from '../context/AppContext';
import { fmt } from '../utils/formatCents';

// IRS label map for display
const IRS_LABELS = {
  advertising:              'Advertising',
  auto_and_travel:          'Auto & Travel',
  cleaning_and_maintenance: 'Cleaning & Maintenance',
  commissions:              'Commissions',
  insurance:                'Insurance',
  legal_and_professional:   'Legal & Professional Fees',
  management_fees:          'Management Fees',
  mortgage_interest:        'Mortgage Interest',
  other_interest:           'Other Interest',
  repairs:                  'Repairs',
  supplies:                 'Supplies',
  taxes:                    'Taxes (Property/Local)',
  utilities:                'Utilities',
  hoa_fees:                 'HOA / Condo Fees',
  principal_reduction:      'Principal Reduction (non-deductible)',
  gross_rental_income:      'Gross Rental Income',
};

export const IRS_CATEGORIES = Object.entries(IRS_LABELS).map(([value, label]) => ({ value, label }));

export const useScheduleE = (year) => {
  const { get } = useApi();
  const { session } = useAppContext();
  const userId = session?.user?.id ?? null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const taxYear = year || new Date().getFullYear();

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: d } = await get(`/api/schedule-e?year=${taxYear}`);
    if (d) setData(d);
    setLoading(false);
  }, [userId, get, taxYear]);

  useEffect(() => { fetch(); }, [fetch]);

  // Export summary as CSV
  const exportCsv = async () => {
    const { data: raw } = await get(`/api/schedule-e/raw?year=${taxYear}`);
    if (!raw) return;

    const headers = ['Date', 'Property', 'Vendor', 'IRS Category', 'Amount', 'Notes'];
    const rows = raw.map(r => [
      r.date,
      r.properties?.address || '',
      `"${(r.vendor || '').replace(/"/g, '""')}"`,
      IRS_LABELS[r.schedule_e_cat] || r.schedule_e_cat,
      fmt(r.amount_cents),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Schedule_E_${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { data, loading, exportCsv, refresh: fetch, irsLabels: IRS_LABELS };
};
