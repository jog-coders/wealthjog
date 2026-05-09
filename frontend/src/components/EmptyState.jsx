export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div style={{
      textAlign: 'center', padding: '52px 24px',
      background: '#FFFFFF',
      border: '1.5px dashed #E5E7EB',
      borderRadius: 16, marginTop: 8,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(255,101,72,0.08)',
        border: '1px solid rgba(255,101,72,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6548" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7">
          <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</h3>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>{message}</p>
      {onAction && actionLabel && (
        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={onAction} className="btn-primary" style={{ padding: '9px 24px', fontSize: 13 }}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
