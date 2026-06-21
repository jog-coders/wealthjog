import { useState } from 'react';
import { fmt } from '../../utils/formatCents';

const STATUS_STYLE = {
  categorized:   { bg:'rgba(16,185,129,.12)',  color:'#10B981', label:'Categorized' },
  uncategorized: { bg:'rgba(234,179,8,.14)',   color:'#EAB308', label:'Review Required' },
  excluded:      { bg:'rgba(113,113,122,.12)', color: 'var(--text-2)', label:'Excluded' },
};

export default function TransactionTable({ transactions, categories, onCategorize, onExclude, onDelete, onMortgageSplit, properties }) {
  const [editingId, setEditingId] = useState(null);
  const [editCat, setEditCat]     = useState('');
  const [editScheduleE, setEditScheduleE] = useState('');
  const [editProp, setEditProp]   = useState('');

  const envelopes = (categories || []).filter(c => c.category_type !== 'sinking_fund');

  const startEdit = (tx) => {
    setEditingId(tx.id);
    setEditCat(tx.category_id || '');
    setEditScheduleE(tx.schedule_e_cat || '');
    setEditProp(tx.property_id || '');
  };

  const saveEdit = async (tx) => {
    await onCategorize(tx.id, {
      category_id:    editCat    || null,
      schedule_e_cat: editScheduleE || null,
      property_id:    editProp   || null,
      status:         editCat ? 'categorized' : tx.status,
    });
    setEditingId(null);
  };

  const S = {
    th:   { padding:'10px 14px', color: 'var(--text-2)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap' },
    td:   { padding:'11px 14px', fontSize:13, color: 'var(--text-1)', borderTop:'1px solid var(--border)', verticalAlign:'middle' },
    badge: (status) => ({ display:'inline-block', padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:600, background: STATUS_STYLE[status]?.bg, color: STATUS_STYLE[status]?.color }),
    select: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius:6, padding:'5px 8px', color: 'var(--text-1)', fontSize:12, outline:'none' },
    iconBtn: { background:'transparent', border:'none', cursor:'pointer', color: 'var(--text-3)', padding:'3px 5px', borderRadius:4, fontSize:13, lineHeight:1 },
  };

  const IRS_CATS = [
    { value:'advertising',              label:'Advertising' },
    { value:'auto_and_travel',          label:'Auto & Travel' },
    { value:'cleaning_and_maintenance', label:'Cleaning & Maintenance' },
    { value:'commissions',              label:'Commissions' },
    { value:'insurance',                label:'Insurance' },
    { value:'legal_and_professional',   label:'Legal & Professional' },
    { value:'management_fees',          label:'Management Fees' },
    { value:'mortgage_interest',        label:'Mortgage Interest' },
    { value:'repairs',                  label:'Repairs' },
    { value:'supplies',                 label:'Supplies' },
    { value:'taxes',                    label:'Taxes' },
    { value:'utilities',                label:'Utilities' },
    { value:'hoa_fees',                 label:'HOA Fees' },
    { value:'principal_reduction',      label:'Principal Reduction' },
    { value:'gross_rental_income',      label:'Gross Rental Income' },
  ];

  if (!transactions.length) {
    return <p style={{ color: 'var(--text-3)', fontSize:14, textAlign:'center', padding:'40px 0' }}>No transactions found.</p>;
  }

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-elevated)' }}>
            <th style={S.th}>Date</th>
            <th style={S.th}>Vendor</th>
            <th style={S.th}>Amount</th>
            <th style={S.th}>Category</th>
            <th style={S.th}>Status</th>
            <th style={S.th}></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id} style={{ background: tx.status === 'uncategorized' ? 'rgba(234,179,8,.03)' : 'transparent' }}>
              <td style={{ ...S.td, color: 'var(--text-2)', fontFamily:'monospace', fontSize:12 }}>{tx.date}</td>
              <td style={S.td}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ color:'#F4F4F5', fontWeight: tx.status === 'uncategorized' ? 600 : 400 }}>{tx.vendor}</span>
                  {tx.properties && <span style={{ fontSize:11, color: 'var(--text-2)' }}>{tx.properties.property_name || (typeof tx.properties.address === 'string' ? tx.properties.address : tx.properties.address?.street)}</span>}
                  {tx.notes && <span style={{ fontSize:11, color: 'var(--text-3)' }}>{tx.notes}</span>}
                </div>
              </td>
              <td style={{ ...S.td, fontFamily:'monospace', color:'#10B981', fontWeight:600, whiteSpace:'nowrap' }}>{fmt(tx.amount_cents)}</td>

              {/* Category cell — inline edit when editing */}
              <td style={S.td}>
                {editingId === tx.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <select style={S.select} value={editCat} onChange={e => setEditCat(e.target.value)}>
                      <option value="">— Uncategorized —</option>
                      {envelopes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {(properties || []).length > 0 && (
                      <>
                        <select style={S.select} value={editProp} onChange={e => setEditProp(e.target.value)}>
                          <option value="">— No property —</option>
                          {properties.map(p => <option key={p.id} value={p.id}>{p.property_name || (typeof p.address === 'string' ? p.address : p.address?.street) || p.id}</option>)}
                        </select>
                        {editProp && (
                          <select style={S.select} value={editScheduleE} onChange={e => setEditScheduleE(e.target.value)}>
                            <option value="">— IRS Category —</option>
                            {IRS_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <span style={{ color: tx.budget_categories ? '#D4D4D8' : '#52525B' }}>
                    {tx.budget_categories?.name || <em style={{ color: 'var(--text-3)' }}>—</em>}
                  </span>
                )}
              </td>

              <td style={S.td}>
                <span style={S.badge(tx.status)}>{STATUS_STYLE[tx.status]?.label}</span>
              </td>

              <td style={{ ...S.td, whiteSpace:'nowrap' }}>
                {editingId === tx.id ? (
                  <>
                    <button style={{ ...S.iconBtn, color:'#10B981' }} onClick={() => saveEdit(tx)}>✓</button>
                    <button style={S.iconBtn} onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <button style={{ ...S.iconBtn, color: 'var(--text-2)' }} title="Edit" onClick={() => startEdit(tx)}>✎</button>
                    {tx.status !== 'excluded' && (
                      <button style={{ ...S.iconBtn, color: 'var(--text-2)' }} title="Exclude" onClick={() => onExclude(tx.id)}>⊘</button>
                    )}
                    {tx.property_id && !tx.is_mortgage_parent && (
                      <button style={{ ...S.iconBtn, color:'#818CF8' }} title="Split mortgage" onClick={() => onMortgageSplit(tx.id, tx.property_id)}>⌥</button>
                    )}
                    <button style={{ ...S.iconBtn, color:'#F43F5E' }} title="Delete" onClick={() => onDelete(tx.id)}>✕</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
