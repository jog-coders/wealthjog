import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function LogoMark({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="44" fill="#1D9E75" />
      <line x1="8" y1="33" x2="23" y2="33" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="5" y1="44" x2="23" y2="44" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="8" y1="55" x2="23" y2="55" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="white" strokeWidth="4.8" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
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
    if (session) {
      navigate('/dashboard', { replace: true });
    }
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
        } catch (e) {
          console.error('Failed to seed defaults', e);
        }
      }
      setLoading(false);
      navigate('/budget');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8F6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <LogoMark size={52} />
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Wealth<span className="text-primary-500">JOG</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400 tracking-wide">Every dollar has a direction</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">

          <p className="text-sm font-semibold text-gray-700 mb-5">
            Sign in to your account
          </p>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 mt-1"
            >
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
