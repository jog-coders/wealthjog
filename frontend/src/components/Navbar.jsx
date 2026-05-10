import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="44" fill="#00D28E" />
      <line x1="8"  y1="33" x2="23" y2="33" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="5"  y1="44" x2="23" y2="44" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="8"  y1="55" x2="23" y2="55" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    path: '/dashboard', label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg>,
  },
  {
    path: '/budget', label: 'Budget',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    path: '/assets', label: 'Assets',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    path: '/expenses', label: 'Expenses',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>,
  },
  {
    path: '/rentals', label: 'Real Estate',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>,
  },
  {
    path: '/settings', label: 'Settings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

const MOBILE_TABS = NAV_ITEMS.slice(0, 5); // Exclude Settings from bottom bar

// ── Breakpoint hook ───────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const h = (e) => setMobile(e.matches);
    mq.addEventListener('change', h);
    setMobile(mq.matches);
    return () => mq.removeEventListener('change', h);
  }, [bp]);
  return mobile;
}

// ── Sidebar (Desktop) ─────────────────────────────────────────────────────────
function Sidebar({ user, onSignOut }) {
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';
  const email    = user?.email || '';

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 240, zIndex: 60,
      background: '#0B1120',
      borderRight: '1px solid #1E293B',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <LogoMark size={30} />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.025em' }}>
          Wealth<span style={{ color: '#00D28E' }}>JOG</span>
        </span>
      </div>

      {/* Nav divider */}
      <div style={{ height: 1, background: '#1E293B', margin: '0 16px 12px' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 10px' }} aria-label="Sidebar navigation">
        <p style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Menu
        </p>
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              fontSize: 13.5, fontWeight: isActive ? 600 : 400,
              textDecoration: 'none', marginBottom: 2,
              color: isActive ? '#00D28E' : '#94A3B8',
              background: isActive ? 'rgba(0,210,142,0.10)' : 'transparent',
              boxShadow: isActive ? 'inset 2px 0 0 #00D28E' : 'none',
              transition: 'all 0.15s',
            })}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px 20px', borderTop: '1px solid #1E293B', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,210,142,0.15)',
            border: '1.5px solid rgba(0,210,142,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#00D28E', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email.split('@')[0]}
            </p>
            <p style={{ fontSize: 10, color: '#64748B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Mobile top bar ────────────────────────────────────────────────────────────
function MobileTopBar({ user, menuOpen, onToggleMenu }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 60,
      background: '#0B1120',
      borderBottom: scrolled ? '1px solid #1E293B' : '1px solid transparent',
      boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 14px', boxSizing: 'border-box', width: '100%', maxWidth: '100vw',
    }}>
      <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
        <LogoMark size={24} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.025em' }}>
          Wealth<span style={{ color: '#00D28E' }}>JOG</span>
        </span>
      </NavLink>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,210,142,0.15)', border: '1.5px solid rgba(0,210,142,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#00D28E',
        }}>{initials}</div>
        <button
          onClick={onToggleMenu}
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, display: 'flex' }}
        >
          {menuOpen
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </div>
    </header>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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

  // ── Desktop: vertical sidebar ──
  if (!isMobile) {
    return <Sidebar user={user} onSignOut={handleSignOut} />;
  }

  // ── Mobile ──
  return (
    <>
      <MobileTopBar user={user} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(o => !o)} />

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 58, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div
            ref={menuRef}
            style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 59,
              background: '#0B1120',
              borderBottom: '1px solid #1E293B',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              padding: '10px 12px 16px',
            }}
          >
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 6px 8px', margin: 0 }}>
              Navigate
            </p>
            {NAV_ITEMS.map(({ path, label, icon }) => (
              <NavLink
                key={path}
                to={path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  color: isActive ? '#00D28E' : '#94A3B8',
                  background: isActive ? 'rgba(0,210,142,0.10)' : 'transparent',
                  boxShadow: isActive ? 'inset 2px 0 0 #00D28E' : 'none',
                })}
              >
                {icon}
                {label}
              </NavLink>
            ))}
            <div style={{ height: 1, background: '#1E293B', margin: '8px 0' }} />
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, color: '#EF4444',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}

      {/* Mobile bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
        background: 'rgba(11,17,32,0.97)',
        borderTop: '1px solid #1E293B',
        backdropFilter: 'blur(12px)',
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
              textDecoration: 'none', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              color: isActive ? '#00D28E' : '#475569',
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
