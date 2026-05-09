import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="44" cy="44" r="44" fill="rgba(201,151,43,0.15)" />
      <line x1="8"  y1="33" x2="23" y2="33" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="5"  y1="44" x2="23" y2="44" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="8"  y1="55" x2="23" y2="55" stroke="#C9972B" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="#C9972B" strokeWidth="4.5" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="#C9972B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    path: '/dashboard', label: 'Dashboard',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg>,
  },
  {
    path: '/budget', label: 'Budget',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    path: '/assets', label: 'Assets',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    path: '/expenses', label: 'Expenses',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  },
  {
    path: '/rentals', label: 'Real Estate',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>,
  },
  {
    path: '/settings', label: 'Settings',
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 50,
        background: '#1A3A2A',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }} className="md:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em' }}>
            Wealth<span style={{ color: '#C9972B' }}>JOG</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 8px', color: '#9EB5A6', cursor: 'pointer', lineHeight: 1 }}
        >
          {mobileOpen
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </header>

      {/* Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.5)', zIndex: 48, backdropFilter: 'blur(3px)' }}
          className="md:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          position: 'fixed', top: 0, left: 0,
          width: 240, height: '100vh',
          background: '#1A3A2A',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
          zIndex: 49, overflowY: 'auto', overflowX: 'hidden',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
        className={`${mobileOpen ? '' : 'max-md:hidden'}`}
      >
        {/* Logo area */}
        <div style={{ padding: '28px 22px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <LogoMark size={36} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F5F0E8', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                Wealth<span style={{ color: '#C9972B' }}>JOG</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(201,151,43,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                Every dollar has a direction
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px 10px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 2 }} aria-label="Main navigation">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 13px',
                borderRadius: 9,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#C9972B' : 'rgba(200,222,206,0.65)',
                background: isActive ? 'rgba(201,151,43,0.12)' : 'transparent',
                borderLeft: isActive ? '2.5px solid #C9972B' : '2.5px solid transparent',
                transition: 'all 0.14s',
                letterSpacing: '0.01em',
              })}
            >
              <span style={{ opacity: 0.85, flexShrink: 0 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 16px' }} />

        {/* User footer */}
        <div style={{ padding: '10px 14px 24px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 33, height: 33, borderRadius: '50%',
              background: 'rgba(201,151,43,0.2)',
              border: '1.5px solid rgba(201,151,43,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#C9972B', flexShrink: 0, letterSpacing: '0.04em',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(200,222,206,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,222,206,0.35)', padding: 4, borderRadius: 6, transition: 'color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(200,222,206,0.35)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
