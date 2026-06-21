import { useState } from 'react';
import { useScheduleE } from '../../hooks/useScheduleE';
import { fmt } from '../../utils/formatCents';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// IRS category display order (income first, then deductible expenses, then non-deductible)
const IRS_ORDER = [
  'gross_rental_income',
  'advertising', 'auto_and_travel', 'cleaning_and_maintenance', 'commissions',
  'insurance', 'legal_and_professional', 'management_fees', 'mortgage_interest',
  'other_interest', 'repairs', 'supplies', 'taxes', 'utilities', 'hoa_fees',
  'principal_reduction',
];

const IRS_LABELS = {
  gross_rental_income:      'Gross Rental Income',
  advertising:              'Advertising',
  auto_and_travel:          'Auto & Travel',
  cleaning_and_maintenance: 'Cleaning & Maintenance',
  commissions:              'Commissions',
  insurance:                'Insurance',
  legal_and_professional:   'Legal & Professional Fees',
  management_fees:          'Management Fees',
  mortgage_interest:        'Mortgage Interest Paid to Banks',
  other_interest:           'Other Interest',
  repairs:                  'Repairs',
  supplies:                 'Supplies',
  taxes:                    'Taxes (Property/Local)',
  utilities:                'Utilities',
  hoa_fees:                 'HOA / Condo Fees',
  principal_reduction:      'Principal Reduction (non-deductible)',
};

function KpiCard({ label, value, color = '#10B981', note }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:12, padding:'18px 20px', flex:1, minWidth:160 }}>
      <p style={{ color: 'var(--text-2)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, margin:'0 0 6px' }}>{label}</p>
      <p style={{ color, fontFamily:'monospace', fontSize:22, fontWeight:800, margin:'0 0 4px' }}>{value}</p>
      {note && <p style={{ color: 'var(--text-3)', fontSize:11, margin:0 }}>{note}</p>}
    </div>
  );
}

export default function TaxStudioPage() {
  const [year, setYear]   = useState(CURRENT_YEAR);
  const [selProp, setSel] = useState('__all__');
  const { data, loading, exportCsv } = useScheduleE(year);

  const S = {
    btn:    { borderRadius:8, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', border:'none', display:'flex', alignItems:'center', gap:6 },
    select: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:8, padding:'7px 12px', color: 'var(--text-1)', fontSize:13, outline:'none' },
    card:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:12, overflow:'hidden' },
    th:     { padding:'10px 16px', color: 'var(--text-2)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap', background: 'var(--bg-elevated)' },
    td:     { padding:'11px 16px', fontSize:13, color: 'var(--text-1)', borderTop:'1px solid var(--border)' },
  };

  const allProperties = data?.properties || [];
  const visibleProps  = selProp === '__all__' ? allProperties : allProperties.filter(p => p.property === selProp);
  const propNames     = allProperties.map(p => p.property);

  // Portfolio totals across visible properties
  const totals = visibleProps.reduce((acc, p) => ({
    gross:    acc.gross    + (p.gross_income_cents || 0),
    expenses: acc.expenses + (p.total_expenses_cents || 0),
    net:      acc.net      + (p.net_cents || 0),
  }), { gross: 0, expenses: 0, net: 0 });

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#F4F4F5', margin:0 }}>Rental Tax Studio</h2>
          <p style={{ color: 'var(--text-2)', fontSize:13, margin:'4px 0 0' }}>IRS Schedule E · aligned reporting by property</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select style={S.select} value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>Tax Year {y}</option>)}
          </select>
          <button style={{ ...S.btn, background:'#10B981', color:'#fff' }} onClick={exportCsv}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Export Schedule E CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color: 'var(--text-3)', padding:60 }}>Loading tax data…</div>
      ) : (
        <>
          {/* KPI ribbon */}
          <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            <KpiCard label="Gross Rental Income"     value={fmt(totals.gross)}    color='#10B981' note={`${year} total`} />
            <KpiCard label="Total Deductible Expenses" value={fmt(totals.expenses)} color='#F43F5E' note="Operating expenses" />
            <KpiCard label="Net Taxable Income / Loss"  value={fmt(totals.net)}     color={totals.net >= 0 ? '#EAB308' : '#10B981'} note={totals.net < 0 ? 'Paper loss — may offset W2 income' : 'Taxable income'} />
          </div>

          {/* Property filter tabs */}
          {propNames.length > 1 && (
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              <button
                onClick={() => setSel('__all__')}
                style={{ ...S.btn, background: selProp === '__all__' ? '#10B981' : 'var(--bg-elevated)', color: selProp === '__all__' ? '#fff' : 'var(--text-2)', padding:'6px 14px', fontSize:12 }}
              >
                All Properties
              </button>
              {propNames.map(p => (
                <button
                  key={p}
                  onClick={() => setSel(p)}
                  style={{ ...S.btn, background: selProp === p ? '#10B981' : 'var(--bg-elevated)', color: selProp === p ? '#fff' : 'var(--text-2)', padding:'6px 14px', fontSize:12 }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Per-property Schedule E tables */}
          {visibleProps.length === 0 && (
            <div style={{ textAlign:'center', color: 'var(--text-3)', padding:60 }}>
              <p style={{ fontSize:14 }}>No Schedule E data for {year}.</p>
              <p style={{ fontSize:12, marginTop:6 }}>Tag rental transactions with IRS categories in the Ledger to populate this report.</p>
            </div>
          )}

          {visibleProps.map(prop => (
            <div key={prop.property} style={{ ...S.card, marginBottom:20 }}>
              {/* Property header */}
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ color:'#F4F4F5', fontWeight:700, fontSize:15, margin:0 }}>{prop.property}</p>
                  <p style={{ color: 'var(--text-2)', fontSize:12, margin:'3px 0 0' }}>Schedule E — Tax Year {year}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ color: prop.net_cents >= 0 ? '#EAB308' : '#10B981', fontFamily:'monospace', fontSize:16, fontWeight:700, margin:0 }}>
                    {fmt(Math.abs(prop.net_cents))} {prop.net_cents < 0 ? 'loss' : 'income'}
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize:11, margin:'2px 0 0' }}>net taxable</p>
                </div>
              </div>

              {/* IRS category table */}
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>IRS Schedule E Line Item</th>
                    <th style={{ ...S.th, textAlign:'right' }}>Total</th>
                    <th style={{ ...S.th, textAlign:'right' }}>Transactions</th>
                    <th style={{ ...S.th }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {IRS_ORDER.filter(cat => prop.categories[cat]).map(cat => {
                    const row = prop.categories[cat];
                    const isIncome    = cat === 'gross_rental_income';
                    const isNonDeduct = cat === 'principal_reduction';
                    return (
                      <tr key={cat}>
                        <td style={S.td}>{IRS_LABELS[cat]}</td>
                        <td style={{ ...S.td, textAlign:'right', fontFamily:'monospace', fontWeight:600, color: isIncome ? '#10B981' : isNonDeduct ? 'var(--text-2)' : '#F4F4F5' }}>
                          {fmt(row.total_cents)}
                        </td>
                        <td style={{ ...S.td, textAlign:'right', color: 'var(--text-2)' }}>{row.tx_count}</td>
                        <td style={S.td}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:999, fontWeight:600,
                            background: isIncome ? 'rgba(16,185,129,.12)' : isNonDeduct ? 'rgba(113,113,122,.12)' : 'rgba(244,63,94,.08)',
                            color:      isIncome ? '#10B981' : isNonDeduct ? 'var(--text-2)' : '#FDA4AF',
                          }}>
                            {isIncome ? 'Income' : isNonDeduct ? 'Balance Sheet' : 'Deductible'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Property subtotals */}
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--border)' }}>
                    <td style={{ ...S.td, fontWeight:700, color:'#F4F4F5' }}>Net Taxable Income / (Loss)</td>
                    <td style={{ ...S.td, textAlign:'right', fontFamily:'monospace', fontWeight:800, fontSize:15, color: prop.net_cents >= 0 ? '#EAB308' : '#10B981' }}>
                      {prop.net_cents < 0 ? `(${fmt(Math.abs(prop.net_cents))})` : fmt(prop.net_cents)}
                    </td>
                    <td colSpan={2} style={S.td}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          <p style={{ color:'var(--border)', fontSize:11, textAlign:'center', marginTop:8 }}>
            Schedule E report is for informational purposes only. Consult a CPA for tax filing.
          </p>
        </>
      )}
    </div>
  );
}
