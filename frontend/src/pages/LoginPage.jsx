import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function LogoMark({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="44" fill="#1A3A2A" />
      <line x1="8"  y1="33" x2="23" y2="33" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="5"  y1="44" x2="23" y2="44" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="8"  y1="55" x2="23" y2="55" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="#C9972B" strokeWidth="4.5" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="#C9972B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
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
      background: '#F5F0E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
    }}>
      {/* Subtle background pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(26,58,42,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(201,151,43,0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <LogoMark size={58} />
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <h1 style={{ fontSize: 27, fontWeight: 800, color: '#1A2820', letterSpacing: '-0.03em', margin: 0 }}>
              Wealth<span style={{ color: '#1A6B4A' }}>JOG</span>
            </h1>
            <p style={{ marginTop: 6, fontSize: 12.5, color: '#9EB5A6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Every dollar has a direction
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E4DDD2',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 8px 32px rgba(26,58,42,0.12)',
        }}>
          {/* Top accent line */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #1A3A2A, #C9972B)', borderRadius: '3px 3px 0 0', margin: '-36px -32px 28px', position: 'relative', top: 0 }} />

          <p style={{ fontSize: 13, fontWeight: 600, color: '#5C7A68', marginBottom: 22, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#C0392B' }}>
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#C8C0B2' }}>
          Access by invitation only
        </p>
      </div>
    </div>
  );
}
