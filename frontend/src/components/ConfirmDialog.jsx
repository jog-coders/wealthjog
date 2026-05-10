export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmDanger = true }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: 18, padding: '28px 28px 22px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <div style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: confirmDanger ? 'rgba(239,68,68,0.10)' : 'rgba(0,210,142,0.10)',
            border: `1px solid ${confirmDanger ? 'rgba(239,68,68,0.25)' : 'rgba(0,210,142,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={confirmDanger ? '#EF4444' : '#00D28E'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>{title}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94A3B8', lineHeight: 1.55 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ minWidth: 88, padding: '8px 18px', fontSize: 13 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 100, padding: '9px 18px', borderRadius: 9999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: confirmDanger ? 'rgba(239,68,68,0.12)' : 'rgba(0,210,142,0.12)',
              color: confirmDanger ? '#EF4444' : '#00D28E',
              border: `1px solid ${confirmDanger ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,142,0.3)'}`,
              transition: 'all 0.15s',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
