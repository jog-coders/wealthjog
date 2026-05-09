export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmDanger = true }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(26,40,32,0.35)', backdropFilter: 'blur(4px)' }} />
      {/* Dialog */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#FFFFFF',
        border: '1px solid #E4DDD2',
        borderRadius: 16,
        padding: '28px 28px 24px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 16px 48px rgba(26,58,42,0.18)',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: confirmDanger ? '#C0392B' : '#1A6B4A', borderRadius: '16px 16px 0 0' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <div style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: confirmDanger ? 'rgba(192,57,43,0.09)' : 'rgba(26,107,74,0.09)',
            border: `1px solid ${confirmDanger ? 'rgba(192,57,43,0.2)' : 'rgba(26,107,74,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={confirmDanger ? '#C0392B' : '#1A6B4A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1A2820' }}>{title}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#5C7A68', lineHeight: 1.55 }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ minWidth: 88 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 100,
              padding: '9px 18px',
              borderRadius: 10,
              border: `1px solid ${confirmDanger ? 'rgba(192,57,43,0.25)' : 'rgba(26,107,74,0.25)'}`,
              background: confirmDanger ? 'rgba(192,57,43,0.09)' : 'rgba(26,107,74,0.09)',
              color: confirmDanger ? '#C0392B' : '#1A6B4A',
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
