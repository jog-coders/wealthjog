import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// ── Logo mark ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
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
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg>,
  },
  {
    path: '/budget', label: 'Budget',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    path: '/assets', label: 'Assets',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    path: '/expenses', label: 'Expenses',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  },
  {
    path: '/rentals', label: 'Rentals',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>,
  },
];

// ── Custom hook: responsive breakpoint ───────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(768);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Shadow on scroll
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';

  // ── Shared header style ──
  const headerStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: isMobile ? 56 : 64,
    zIndex: 100,
    background: '#F4F5F7',
    borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
    boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: '100%',
  };

  // ── Avatar circle ──
  const Avatar = () => (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'rgba(255,101,72,0.12)',
      border: '1.5px solid rgba(255,101,72,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#FF6548',
      flexShrink: 0, userSelect: 'none',
    }}>
      {initials}
    </div>
  );

  // ══════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar — logo left, avatar + burger right */}
        <header style={{ ...headerStyle, padding: '0 14px', justifyContent: 'space-between' }}>
          {/* Logo */}
          <NavLink
            to="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
          >
            <LogoMark size={26} />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
              Wealth<span style={{ color: '#FF6548' }}>JOG</span>
            </span>
          </NavLink>

          {/* Right: avatar + burger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar />
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              {menuOpen
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </header>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
              background: '#FFFFFF',
              borderBottom: '1px solid #E5E7EB',
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              padding: '10px 12px 14px',
            }}
          >
            <p style={{ margin: '0 0 8px 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Navigate
            </p>
            {NAV_ITEMS.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  padding: '11px 14px', borderRadius: 10, marginBottom: 3,
                  fontSize: 14.5, fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  color: isActive ? '#FF6548' : '#374151',
                  background: isActive ? 'rgba(255,101,72,0.08)' : 'transparent',
                })}
              >
                {label}
              </NavLink>
            ))}
            <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '11px 14px', borderRadius: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14.5, color: '#EF4444', textAlign: 'left',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        )}

        {/* Mobile bottom tab bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.97)',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {MOBILE_TABS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, padding: '7px 4px 6px',
                textDecoration: 'none',
                fontSize: 9.5, fontWeight: 600,
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

  // ══════════════════════════════════
  // DESKTOP LAYOUT
  // ══════════════════════════════════
  return (
    <>
      <header style={{ ...headerStyle, padding: '0 24px', justifyContent: 'space-between' }}>
        {/* Logo */}
        <NavLink
          to="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}
        >
          <LogoMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
            Wealth<span style={{ color: '#FF6548' }}>JOG</span>
          </span>
        </NavLink>

        {/* Center nav pills */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }} aria-label="Main navigation">
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'inline-flex', alignItems: 'center',
                padding: '6px 14px', borderRadius: 9999,
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                textDecoration: 'none', whiteSpace: 'nowrap',
                background: isActive ? '#FF6548' : 'transparent',
                color: isActive ? '#FFFFFF' : '#6B7280',
                boxShadow: isActive ? '0 2px 8px rgba(255,101,72,0.3)' : 'none',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: avatar + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Avatar />
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: 8, transition: 'color 0.15s', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>
    </>
  );
}
