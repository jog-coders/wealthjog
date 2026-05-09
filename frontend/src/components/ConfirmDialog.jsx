export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', confirmDanger = true }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,20,0.75)', backdropFilter: 'blur(6px)' }}
      />
      {/* Dialog */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#0F1629',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '28px 28px 24px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Top shine line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,77,106,0.4), transparent)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,77,106,0.12)', border: '1px solid rgba(255,77,106,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F0F4FF' }}>{title}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8892A4', lineHeight: 1.5 }}>{message}</p>
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
              border: confirmDanger ? '1px solid rgba(255,77,106,0.35)' : '1px solid rgba(0,212,168,0.35)',
              background: confirmDanger ? 'rgba(255,77,106,0.15)' : 'rgba(0,212,168,0.15)',
              color: confirmDanger ? '#FF4D6A' : '#00D4A8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
