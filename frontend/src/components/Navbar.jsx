import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

// ─── WealthJOG Logo Mark ────────────────────────────────────────────────────
function LogoMark({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="44" cy="44" r="44" fill="#1D9E75" />
      <line x1="8" y1="33" x2="23" y2="33" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="5" y1="44" x2="23" y2="44" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="8" y1="55" x2="23" y2="55" stroke="white" strokeWidth="3.8" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="27" y1="61" x2="64" y2="25" stroke="white" strokeWidth="4.8" strokeLinecap="round" markerEnd="url(#wjArrow)" />
      <polyline points="45,25 64,25 64,44" fill="none" stroke="white" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <marker id="wjArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

// ─── Nav Icons ───────────────────────────────────────────────────────────────
const icons = {
  Budget: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  'Assets & Liabilities': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 9l9-6 9 6" />
      <path d="M5 14c0 1.657 1.343 3 3 3s3-1.343 3-3L8 9l-3 5zM13 14c0 1.657 1.343 3 3 3s3-1.343 3-3l-3-5-3 5z" />
    </svg>
  ),
  'Expense Tracker': (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </svg>
  ),
  Dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="6" width="4" height="15" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  ),
  Settings: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const TABS = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Budget', path: '/budget' },
  { name: 'Assets & Liabilities', path: '/assets' },
  { name: 'Expense Tracker', path: '/expenses' },
  { name: 'Settings', path: '/settings' },
];

// ─── Main Navbar ─────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Shadow on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  return (
    <>
      {/* ── Scoped styles ── */}
      <style>{`
        .wj-nav {
          position: sticky; top: 0; z-index: 50;
          background: #085041;
          border-bottom: 1px solid rgba(29,158,117,0.25);
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          transition: box-shadow 0.2s;
        }
        .wj-nav.scrolled { box-shadow: 0 2px 24px rgba(4,52,44,0.5); }
        .wj-bar { height: 2px; background: linear-gradient(90deg,#1D9E75,#5DCAA5 50%,transparent); opacity: 0.5; }

        /* inner */
        .wj-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 6px; }

        /* logo */
        .wj-logo { display: flex; align-items: center; gap: 11px; text-decoration: none; flex-shrink: 0; margin-right: 8px; opacity: 1; transition: opacity 0.15s; }
        .wj-logo:hover { opacity: 0.85; }
        .wj-logo-text { display: flex; flex-direction: column; line-height: 1; gap: 3px; }
        .wj-logo-name { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; color: #9FE1CB; }
        .wj-logo-name span { color: #ffffff; }
        .wj-logo-tag  { font-size: 9.5px; font-weight: 400; letter-spacing: 0.07em; text-transform: uppercase; color: #5DCAA5; white-space: nowrap; }

        /* desktop links */
        .wj-links { display: flex; align-items: center; gap: 2px; flex: 1; justify-content: center; }
        .wj-link  { display: flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 8px; text-decoration: none; font-size: 12.5px; font-weight: 500; color: rgba(159,225,203,0.65); letter-spacing: 0.01em; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .wj-link:hover  { background: rgba(29,158,117,0.15); color: #9FE1CB; }
        .wj-link.active { background: rgba(29,158,117,0.22); color: #ffffff; }
        .wj-link-icon   { display: flex; align-items: center; color: rgba(93,202,165,0.55); transition: color 0.15s; }
        .wj-link:hover .wj-link-icon  { color: #5DCAA5; }
        .wj-link.active .wj-link-icon { color: #5DCAA5; }

        /* user section */
        .wj-user   { display: flex; align-items: center; gap: 9px; flex-shrink: 0; margin-left: 6px; }
        .wj-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(29,158,117,0.3); border: 1.5px solid rgba(93,202,165,0.45); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #9FE1CB; letter-spacing: 0.05em; flex-shrink: 0; }
        .wj-email  { font-size: 11.5px; color: rgba(159,225,203,0.55); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wj-signout { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(93,202,165,0.28); background: transparent; color: rgba(159,225,203,0.65); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: inherit; }
        .wj-signout:hover { background: rgba(29,158,117,0.18); border-color: rgba(93,202,165,0.55); color: #9FE1CB; }

        /* hamburger */
        .wj-burger { display: none; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(93,202,165,0.25); background: transparent; color: #9FE1CB; cursor: pointer; transition: background 0.15s; margin-left: auto; flex-shrink: 0; font-family: inherit; }
        .wj-burger:hover { background: rgba(29,158,117,0.18); }

        /* drawer */
        .wj-drawer { position: fixed; top: 66px; left: 0; width: 272px; height: calc(100vh - 66px); background: #063a2f; border-right: 1px solid rgba(29,158,117,0.2); z-index: 49; display: flex; flex-direction: column; padding: 10px 0 0; transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); overflow-y: auto; font-family: inherit; }
        .wj-drawer.open { transform: translateX(0); }
        .wj-drawer-link { display: flex; align-items: center; gap: 10px; padding: 13px 22px; text-decoration: none; font-size: 13.5px; font-weight: 500; color: rgba(159,225,203,0.65); border-left: 2.5px solid transparent; transition: all 0.15s; }
        .wj-drawer-link:hover  { background: rgba(29,158,117,0.1); color: #9FE1CB; }
        .wj-drawer-link.active { background: rgba(29,158,117,0.18); color: #ffffff; border-left-color: #1D9E75; }
        .wj-drawer-link.active .wj-link-icon { color: #5DCAA5; }
        .wj-drawer-footer { margin-top: auto; padding: 16px 22px; border-top: 1px solid rgba(29,158,117,0.18); display: flex; align-items: center; gap: 11px; }
        .wj-drawer-avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(29,158,117,0.3); border: 1.5px solid rgba(93,202,165,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #9FE1CB; flex-shrink: 0; }
        .wj-drawer-info  { display: flex; flex-direction: column; gap: 5px; overflow: hidden; min-width: 0; }
        .wj-drawer-email { font-size: 11.5px; color: rgba(159,225,203,0.55); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wj-drawer-out   { display: flex; align-items: center; gap: 4px; background: transparent; border: none; color: rgba(159,225,203,0.55); font-size: 12px; font-weight: 500; cursor: pointer; padding: 0; transition: color 0.15s; font-family: inherit; }
        .wj-drawer-out:hover { color: #9FE1CB; }

        /* overlay */
        .wj-overlay { position: fixed; inset: 0; top: 66px; background: rgba(4,52,44,0.55); z-index: 48; backdrop-filter: blur(2px); }

        /* responsive */
        @media (max-width: 1024px) {
          .wj-link-label { display: none; }
          .wj-link { padding: 8px; }
          .wj-email { display: none; }
        }
        @media (max-width: 768px) {
          .wj-links  { display: none; }
          .wj-user   { display: none; }
          .wj-burger { display: flex; }
        }
        @media (max-width: 400px) {
          .wj-logo-tag { display: none; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className={`wj-nav${scrolled ? ' scrolled' : ''}`} role="banner">
        <div className="wj-inner">

          {/* Logo */}
          <NavLink to="/budget" className="wj-logo" aria-label="WealthJOG — home">
            <LogoMark size={36} />
            <div className="wj-logo-text">
              <span className="wj-logo-name">
                Wealth<span>JOG</span>
              </span>
              <span className="wj-logo-tag">Every dollar has a direction</span>
            </div>
          </NavLink>

          {/* Desktop links */}
          <nav className="wj-links" aria-label="Main navigation">
            {TABS.map(({ name, path }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `wj-link${isActive ? ' active' : ''}`}
              >
                <span className="wj-link-icon" aria-hidden="true">{icons[name]}</span>
                <span className="wj-link-label">{name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="wj-user">
            <div className="wj-avatar" title={user?.email}>{initials}</div>
            <span className="wj-email">{user?.email}</span>
            <button className="wj-signout" onClick={handleSignOut} aria-label="Sign out">
              <SignOutIcon />
              Sign out
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="wj-burger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Brand bar */}
        <div className="wj-bar" aria-hidden="true" />
      </header>

      {/* ── Mobile drawer ── */}
      <div className={`wj-drawer${mobileOpen ? ' open' : ''}`} aria-hidden={!mobileOpen}>
        <nav aria-label="Mobile navigation">
          {TABS.map(({ name, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `wj-drawer-link${isActive ? ' active' : ''}`}
            >
              <span className="wj-link-icon" aria-hidden="true">{icons[name]}</span>
              {name}
            </NavLink>
          ))}
        </nav>

        <div className="wj-drawer-footer">
          <div className="wj-drawer-avatar">{initials}</div>
          <div className="wj-drawer-info">
            <span className="wj-drawer-email">{user?.email}</span>
            <button className="wj-drawer-out" onClick={handleSignOut}>
              <SignOutIcon /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="wj-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
    </>
  );
}

// ─── Small icon helpers ───────────────────────────────────────────────────────
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
