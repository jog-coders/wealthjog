export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div style={{
      textAlign: 'center', padding: '52px 24px',
      background: 'rgba(30,41,59,0.5)',
      border: '1.5px dashed #334155',
      borderRadius: 16, marginTop: 8,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(0,210,142,0.08)',
        border: '1px solid rgba(0,210,142,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00D28E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
          <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>{title}</h3>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B' }}>{message}</p>
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
