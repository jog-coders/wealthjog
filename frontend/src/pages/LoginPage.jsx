import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function LogoMark({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="44" fill="#00D4A8" fillOpacity="0.12" />
      <circle cx="44" cy="44" r="44" stroke="#00D4A8" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="8"  y1="33" x2="23" y2="33" stroke="#00D4A8" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="5"  y1="44" x2="23" y2="44" stroke="#00D4A8" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="8"  y1="55" x2="23" y2="55" stroke="#00D4A8" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="#00D4A8" strokeWidth="4.5" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="#00D4A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
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
      background: '#0A0E1A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '25%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,212,168,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(77,159,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <LogoMark size={56} />
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F0F4FF', letterSpacing: '-0.03em', margin: 0 }}>
              Wealth<span style={{ color: '#00D4A8' }}>JOG</span>
            </h1>
            <p style={{ marginTop: 6, fontSize: 13, color: '#4D5870', letterSpacing: '0.04em' }}>
              Every dollar has a direction
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#0F1629',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Card shine */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,212,168,0.3), transparent)', pointerEvents: 'none' }} />

          <p style={{ fontSize: 14, fontWeight: 600, color: '#8892A4', marginBottom: 24, letterSpacing: '0.02em' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF4D6A' }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: 4, padding: '13px', fontSize: 14 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#2A3550' }}>
          Access by invitation only
        </p>
      </div>
    </div>
  );
}
