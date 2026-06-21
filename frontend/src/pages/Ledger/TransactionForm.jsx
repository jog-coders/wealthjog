import { useState } from 'react';
import { floatToCents } from '../../utils/formatCents';

export default function TransactionForm({ categories, properties, onSave, onClose }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    amount: '',
    category_id: '',
    property_id: '',
    notes: '',
  });

  const S = {
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    modal:   { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:480, padding:28 },
    label:   { display:'block', fontSize:12, fontWeight:600, color: 'var(--text-2)', marginBottom:5 },
    input:   { width:'100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius:8, padding:'9px 12px', color: 'var(--text-1)', fontSize:14, boxSizing:'border-box', outline:'none' },
    row:     { display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' },
    btn:     { borderRadius:8, padding:'9px 18px', fontWeight:600, fontSize:13, cursor:'pointer', border:'none' },
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({
      date:        form.date,
      vendor:      form.vendor,
      amount_cents: floatToCents(form.amount),
      category_id: form.category_id || null,
      property_id: form.property_id || null,
      notes:       form.notes || null,
    });
  };

  const envelopes = categories.filter(c => c.category_type !== 'sinking_fund');

  return (
    <div style={S.overlay} onClick={onClose}>
      <form style={S.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ fontSize:17, fontWeight:700, color: 'var(--text-1)', marginBottom:20 }}>Add Transaction</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={S.label}>Date</label>
            <input style={S.input} type="date" value={form.date} onChange={set('date')} required />
          </div>
          <div>
            <label style={S.label}>Amount ($)</label>
            <input style={S.input} type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={set('amount')} required />
          </div>
        </div>

        <div style={{ marginTop:14 }}>
          <label style={S.label}>Vendor / Description</label>
          <input style={S.input} type="text" placeholder="e.g. Costco" value={form.vendor} onChange={set('vendor')} required />
        </div>

        <div style={{ marginTop:14 }}>
          <label style={S.label}>Budget Category</label>
          <select style={S.input} value={form.category_id} onChange={set('category_id')}>
            <option value="">— Uncategorized —</option>
            {envelopes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {properties?.length > 0 && (
          <div style={{ marginTop:14 }}>
            <label style={S.label}>Rental Property (if applicable)</label>
            <select style={S.input} value={form.property_id} onChange={set('property_id')}>
              <option value="">— Personal expense —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginTop:14 }}>
          <label style={S.label}>Notes (optional)</label>
          <input style={S.input} type="text" placeholder="" value={form.notes} onChange={set('notes')} />
        </div>

        <div style={S.row}>
          <button type="button" style={{ ...S.btn, background:'var(--bg-elevated)', color: 'var(--text-2)' }} onClick={onClose}>Cancel</button>
          <button type="submit" style={{ ...S.btn, background:'#10B981', color:'#fff' }}>Add Transaction</button>
        </div>
      </form>
    </div>
  );
}
