export default function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 16px' }}>
      <svg style={{ width: 22, height: 22, color: '#1A6B4A', flexShrink: 0, animation: 'spin 1s linear infinite' }}
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.85 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span style={{ fontSize: 13, color: '#9EB5A6' }}>{message}</span>
    </div>
  );
}
