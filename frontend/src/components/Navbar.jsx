import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 28 }) {
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

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/budget',    label: 'Budget' },
  { path: '/assets',    label: 'Assets' },
  { path: '/expenses',  label: 'Expenses' },
  { path: '/rentals',   label: 'Real Estate' },
  { path: '/settings',  label: 'Settings' },
];

const MOBILE_TABS = [
  {
    path: '/dashboard', label: 'Home',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg>,
  },
  {
    path: '/budget', label: 'Budget',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    path: '/assets', label: 'Assets',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    path: '/expenses', label: 'Expenses',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  },
  {
    path: '/rentals', label: 'Rentals',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>,
  },
];

// ── Top Navigation Bar ────────────────────────────────────────────────────────
export default function Navbar() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  return (
    <>
      {/* ── Top Nav Bar ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 50,
        background: '#F4F5F7',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <NavLink
          to="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}
        >
          <LogoMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
            Wealth<span style={{ color: '#FF6548' }}>JOG</span>
          </span>
        </NavLink>

        {/* Desktop center nav pills */}
        <nav
          style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center', padding: '0 16px' }}
          className="hidden md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'inline-flex', alignItems: 'center',
                padding: '6px 14px',
                borderRadius: 9999,
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                textDecoration: 'none', letterSpacing: '0.01em',
                background: isActive ? '#FF6548' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B7280',
                boxShadow: isActive ? '0 2px 8px rgba(255,101,72,0.3)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side: avatar + sign-out (desktop) + hamburger (mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,101,72,0.12)',
            border: '1.5px solid rgba(255,101,72,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#FF6548',
            letterSpacing: '0.04em', flexShrink: 0,
          }}>
            {initials}
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px', borderRadius: 8, transition: 'color 0.15s', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
            className="hidden md:block"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', borderRadius: 8, flexShrink: 0 }}
            className="md:hidden"
          >
            {mobileMenuOpen
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown menu ── */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(17,24,39,0.2)', backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', top: 64, left: 12, right: 12, zIndex: 49,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            {NAV_ITEMS.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  padding: '11px 14px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  color: isActive ? '#FF6548' : '#374151',
                  background: isActive ? 'rgba(255,101,72,0.08)' : 'transparent',
                  marginBottom: 2,
                })}
              >
                {label}
              </NavLink>
            ))}
            <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#EF4444', textAlign: 'left',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav
        aria-label="Mobile navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="md:hidden"
      >
        {MOBILE_TABS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, padding: '8px 4px',
              textDecoration: 'none', fontSize: 9.5, fontWeight: 500,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              color: isActive ? '#FF6548' : '#9CA3AF',
              transition: 'color 0.15s',
            })}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
