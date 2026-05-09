export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmDanger = true }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.3)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 18,
        padding: '28px 28px 22px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <div style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: confirmDanger ? 'rgba(239,68,68,0.08)' : 'rgba(5,150,105,0.08)',
            border: `1px solid ${confirmDanger ? 'rgba(239,68,68,0.2)' : 'rgba(5,150,105,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={confirmDanger ? '#EF4444' : '#059669'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.55 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ minWidth: 88, padding: '8px 18px' }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 100, padding: '9px 18px',
              borderRadius: 9999,
              border: `1px solid ${confirmDanger ? 'rgba(239,68,68,0.25)' : 'rgba(5,150,105,0.25)'}`,
              background: confirmDanger ? 'rgba(239,68,68,0.08)' : 'rgba(5,150,105,0.08)',
              color: confirmDanger ? '#EF4444' : '#059669',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
