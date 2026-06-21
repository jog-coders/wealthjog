import { useState } from 'react';
import { useVendorRules } from '../../hooks/useVendorRules';
import toast from 'react-hot-toast';

export default function VendorRulesManager({ categories }) {
  const { rules, loading, addRule, deleteRule, seedDefaults } = useVendorRules();
  const [pattern, setPattern] = useState('');
  const [catId, setCatId]     = useState('');

  const envelopes = (categories || []).filter(c => c.category_type !== 'sinking_fund');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!pattern || !catId) return;
    const { error } = await addRule({ pattern, category_id: catId, priority: 5 });
    if (!error) { setPattern(''); setCatId(''); }
  };

  const handleSeed = async () => {
    const { error } = await seedDefaults();
    if (!error) toast.success('Default rules seeded');
  };

  const S = {
    card:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:20 },
    header: { padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' },
    input:  { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius:8, padding:'8px 12px', color: 'var(--text-1)', fontSize:13, outline:'none' },
    btn:    { borderRadius:8, padding:'8px 14px', fontWeight:600, fontSize:13, cursor:'pointer', border:'none' },
    th:     { padding:'9px 14px', color: 'var(--text-2)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:.5, background: 'var(--bg-elevated)' },
    td:     { padding:'10px 14px', fontSize:13, color: 'var(--text-1)', borderTop:'1px solid var(--border)' },
  };

  return (
    <div style={S.card}>
      <div style={S.header}>
        <div>
          <p style={{ color:'#F4F4F5', fontWeight:700, fontSize:14, margin:0 }}>Vendor Auto-Categorization Rules</p>
          <p style={{ color: 'var(--text-2)', fontSize:12, margin:'3px 0 0' }}>Substring patterns matched against vendor names on import (case-insensitive)</p>
        </div>
        <button style={{ ...S.btn, background:'var(--bg-elevated)', color: 'var(--text-2)', fontSize:12 }} onClick={handleSeed}>
          Seed Defaults
        </button>
      </div>

      {/* Add rule form */}
      <form style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }} onSubmit={handleAdd}>
        <div style={{ flex:'1 1 180px' }}>
          <p style={{ color: 'var(--text-2)', fontSize:11, fontWeight:600, marginBottom:5 }}>VENDOR PATTERN</p>
          <input style={{ ...S.input, width:'100%', boxSizing:'border-box' }} placeholder="e.g. costco gas" value={pattern} onChange={e => setPattern(e.target.value)} />
        </div>
        <div style={{ flex:'1 1 200px' }}>
          <p style={{ color: 'var(--text-2)', fontSize:11, fontWeight:600, marginBottom:5 }}>→ CATEGORY</p>
          <select style={{ ...S.input, width:'100%', boxSizing:'border-box' }} value={catId} onChange={e => setCatId(e.target.value)}>
            <option value="">Select category</option>
            {envelopes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="submit" style={{ ...S.btn, background:'#10B981', color:'#fff', alignSelf:'flex-end' }} disabled={!pattern || !catId}>
          Add Rule
        </button>
      </form>

      {/* Rules table */}
      {loading ? (
        <p style={{ color: 'var(--text-3)', padding:'20px', textAlign:'center', fontSize:13 }}>Loading…</p>
      ) : rules.length === 0 ? (
        <p style={{ color: 'var(--text-3)', padding:'30px', textAlign:'center', fontSize:13 }}>
          No rules yet. Click "Seed Defaults" to add the built-in patterns from the spec.
        </p>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={S.th}>Pattern</th>
              <th style={S.th}>→ Category</th>
              <th style={S.th}>Priority</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id}>
                <td style={S.td}><code style={{ background: 'var(--bg-elevated)', padding:'2px 6px', borderRadius:4, fontSize:12, color:'#A5F3FC' }}>{r.pattern}</code></td>
                <td style={S.td}>{r.budget_categories?.name || r.category_id}</td>
                <td style={{ ...S.td, color: 'var(--text-2)' }}>{r.priority}</td>
                <td style={S.td}>
                  <button
                    style={{ background:'transparent', border:'none', cursor:'pointer', color:'#F43F5E', fontSize:13 }}
                    onClick={() => deleteRule(r.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
