import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function LogoMark({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="44" fill="#FF6548" />
      <line x1="8"  y1="33" x2="23" y2="33" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="5"  y1="44" x2="23" y2="44" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="8"  y1="55" x2="23" y2="55" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { session } = useAppContext();

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true });
  }, [session, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/settings/seed-defaults`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
        } catch (e) { console.error('Failed to seed defaults', e); }
      }
      setLoading(false);
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F4F5F7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <LogoMark size={56} />
          <h1 style={{ margin: '16px 0 6px', fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>
            Wealth<span style={{ color: '#FF6548' }}>JOG</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', letterSpacing: '0.03em' }}>
            Every dollar has a direction
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <p style={{ margin: '0 0 22px', fontSize: 13, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444' }}>
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="form-input" />
            </div>
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="form-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: '100%', marginTop: 4, padding: '13px', fontSize: 14 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#D1D5DB' }}>
          Access by invitation only
        </p>
      </div>
    </div>
  );
}
