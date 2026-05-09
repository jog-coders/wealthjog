import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

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

// States this page can be in
const STATE = {
  LOADING: 'loading',       // Exchanging token from URL
  SET_PASSWORD: 'set_password', // Token OK, user must set a password
  ERROR: 'error',           // Token invalid / expired
};

export default function AcceptInvitePage() {
  const [pageState, setPageState] = useState(STATE.LOADING);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase appends the invite token in the URL hash:
    // #access_token=...&refresh_token=...&type=invite
    // The JS client processes hash fragments automatically when getSession() is called,
    // but we also need to handle the `code` query param for PKCE flows.
    const handleInvite = async () => {
      // Try to get an existing session from the URL hash (implicit flow)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        // User is authenticated via the invite token — let them set a password
        setPageState(STATE.SET_PASSWORD);
        return;
      }

      // Also check for PKCE `code` query param
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchErr) {
          setPageState(STATE.SET_PASSWORD);
          return;
        }
        setErrorMsg(exchErr.message);
        setPageState(STATE.ERROR);
        return;
      }

      // No token at all
      setErrorMsg('This invite link is invalid or has already been used. Please ask to be re-invited.');
      setPageState(STATE.ERROR);
    };

    handleInvite();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    // Seed defaults for new user, then go to dashboard
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/settings/seed-defaults`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      }
    } catch (_) { /* non-fatal */ }

    navigate('/dashboard', { replace: true });
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

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {pageState === STATE.LOADING && (
            <div className="flex flex-col items-center gap-3 py-4">
              <svg className="animate-spin h-7 w-7 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500">Verifying your invite…</p>
            </div>
          )}

          {pageState === STATE.ERROR && (
            <div className="text-center py-2">
              <p className="text-sm font-semibold text-gray-700 mb-3">Invite Link Problem</p>
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-5">
                {errorMsg}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          )}

          {pageState === STATE.SET_PASSWORD && (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-1">Welcome to WealthJOG 🎉</p>
              <p className="text-xs text-gray-400 mb-6">You've been invited! Please set a password to secure your account.</p>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {errorMsg && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="new-password" className="form-label">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 mt-1"
                >
                  {submitting ? 'Setting up account…' : 'Set Password & Enter'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
