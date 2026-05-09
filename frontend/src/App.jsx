import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';

// ── Lazy-loaded pages (code-splitting) ──────────────────────────────────────
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const BudgetPage       = lazy(() => import('./pages/Budget/BudgetPage'));
const AssetsPage       = lazy(() => import('./pages/AssetsLiabilities/AssetsLiabilitiesPage'));
const ExpensePage      = lazy(() => import('./pages/ExpenseTracker/ExpenseTrackerPage'));
const DashboardPage    = lazy(() => import('./pages/Dashboard/DashboardPage'));
const SettingsPage     = lazy(() => import('./pages/Settings/SettingsPage'));
const RentalsPage      = lazy(() => import('./pages/Rentals/RentalsPage'));

// ── Page loader ──────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 32, height: 32, color: '#00D4A8', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

// ── Mobile bottom tab bar ────────────────────────────────────────────────────
const MOBILE_TABS = [
  { path: '/dashboard', label: 'Dashboard', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="3" width="4" height="18"/></svg>
  )},
  { path: '/budget', label: 'Budget', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 10h20M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
  )},
  { path: '/assets', label: 'Assets', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 9l9-6 9 6"/><path d="M5 14c0 1.657 1.343 3 3 3s3-1.343 3-3L8 9l-3 5zM13 14c0 1.657 1.343 3 3 3s3-1.343 3-3l-3-5-3 5z"/></svg>
  )},
  { path: '/expenses', label: 'Expenses', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>
  )},
  { path: '/rentals', label: 'Rentals', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10l9-7 9 7M4 10v11M20 10v11M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"/></svg>
  )},
];

function BottomTabBar() {
  const location = useLocation();
  const publicRoutes = ['/login', '/accept-invite'];
  if (publicRoutes.includes(location.pathname)) return null;

  return (
    <>
      {/* spacer so content isn't hidden behind the bar */}
      <div style={{ height: 64 }} className="md:hidden" aria-hidden="true" />
      <nav
        aria-label="Mobile tab navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(15,22,41,0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
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
              textDecoration: 'none', fontSize: 9, fontWeight: 500,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              color: isActive ? '#00D4A8' : '#4D5870',
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

// ── Protected route wrapper ──────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppContext();
  if (authLoading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0E1A' }}>
      {/* Sidebar (fixed — takes 240px on desktop) */}
      <Navbar />
      {/* Spacer for the fixed sidebar on desktop */}
      <div style={{ width: 240, flexShrink: 0 }} className="hidden md:block" />
      {/* Main content */}
      <main style={{ flex: 1, minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Top spacer for mobile header */}
        <div style={{ height: 56 }} className="md:hidden" />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/accept-invite"  element={<AcceptInvitePage />} />
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />
            <Route path="/budget"         element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
            <Route path="/assets"         element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
            <Route path="/rentals"        element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
            <Route path="/expenses"       element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
            <Route path="/dashboard"      element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/settings"       element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
          <BottomTabBar />
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;


