import { useState, useRef } from 'react';
import { parseCSV } from '../../utils/csvParser';
import { fmt } from '../../utils/formatCents';
import toast from 'react-hot-toast';

export default function CsvImportModal({ onImport, onClose, importing }) {
  const [parsed, setParsed]         = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [parseErrors, setParseErrors] = useState([]);
  const [storedFile, setStoredFile] = useState(null); // keep the File object so import always works
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    setStoredFile(file); // store for use in handleImport
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result, { sourceName: file.name });
      setParsed(result);
      setParseErrors(result.errors || []);
    };
    reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!parsed?.rows?.length) return;
    const file = storedFile || fileRef.current?.files[0];
    if (!file) { toast.error('File reference lost — please re-select the file'); return; }
    await onImport(file);
  };

  const S = {
    overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    modal:    { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', padding:28 },
    title:    { fontSize:17, fontWeight:700, color: 'var(--text-1)', marginBottom:20 },
    dropzone: { border:`2px dashed ${dragOver ? '#10B981' : 'var(--border)'}`, borderRadius:12, padding:40, textAlign:'center', cursor:'pointer', transition:'border-color .2s', background: dragOver ? 'rgba(16,185,129,.05)' : 'transparent' },
    btn:      { borderRadius:8, padding:'9px 18px', fontWeight:600, fontSize:13, cursor:'pointer', border:'none' },
    row:      { display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' },
    badge:    { display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:600 },
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.title}>Import CSV Transactions</div>

        {/* Drop zone */}
        {!parsed && (
          <div
            style={S.dropzone}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
            <svg style={{ width:36, height:36, color: 'var(--text-3)', margin:'0 auto 12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p style={{ color: 'var(--text-2)', fontSize:14 }}>Drop your bank CSV here or <span style={{ color:'#10B981' }}>browse</span></p>
            <p style={{ color: 'var(--text-3)', fontSize:12, marginTop:6 }}>Date, Vendor/Description, and Amount columns are auto-detected</p>
          </div>
        )}

        {/* Preview */}
        {parsed && (
          <>
            {parseErrors.length > 0 && (
              <div style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)', borderRadius:8, padding:12, marginBottom:16 }}>
                <p style={{ color:'#F43F5E', fontSize:12, fontWeight:600, marginBottom:4 }}>Parse warnings</p>
                {parseErrors.slice(0, 5).map((e, i) => (
                  <p key={i} style={{ color:'#FDA4AF', fontSize:11 }}>{e}</p>
                ))}
                {parseErrors.length > 5 && <p style={{ color:'#FDA4AF', fontSize:11 }}>…and {parseErrors.length - 5} more</p>}
              </div>
            )}

            <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ ...S.badge, background:'rgba(16,185,129,.12)', color:'#10B981' }}>{parsed.rows.length} rows ready</span>
              <button style={{ background:'transparent', border:'none', color: 'var(--text-2)', fontSize:12, cursor:'pointer' }} onClick={() => { setParsed(null); setParseErrors([]); }}>
                ← Choose different file
              </button>
            </div>

            {/* Sample preview table */}
            <div style={{ overflowX:'auto', borderRadius:8, border: '1px solid var(--border)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['Date', 'Vendor', 'Amount'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', color: 'var(--text-2)', textAlign:'left', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 6).map((r, i) => (
                    <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'7px 12px', color: 'var(--text-1)' }}>{r.date}</td>
                      <td style={{ padding:'7px 12px', color: 'var(--text-1)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.vendor}</td>
                      <td style={{ padding:'7px 12px', color: r.amount_cents < 0 ? '#38BDF8' : '#10B981', fontFamily:'monospace' }}>{fmt(r.amount_cents)}</td>
                    </tr>
                  ))}
                  {parsed.rows.length > 6 && (
                    <tr style={{ borderTop:'1px solid var(--border)' }}>
                      <td colSpan={3} style={{ padding:'7px 12px', color: 'var(--text-3)', fontSize:11 }}>…and {parsed.rows.length - 6} more rows</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={S.row}>
          <button style={{ ...S.btn, background:'var(--bg-elevated)', color: 'var(--text-2)' }} onClick={onClose}>Cancel</button>
          {parsed?.rows?.length > 0 && (
            <button
              style={{ ...S.btn, background:'#10B981', color:'#fff', opacity: importing ? .6 : 1 }}
              disabled={importing}
              onClick={handleImport}
            >
              {importing ? 'Importing…' : `Import ${parsed.rows.length} Transactions`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
