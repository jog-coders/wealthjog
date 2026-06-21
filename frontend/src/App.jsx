import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';

const SIDEBAR_W = 240;

// Lazy-load pages — they mount once and stay mounted
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const BudgetPage       = lazy(() => import('./pages/Budget/BudgetPage'));
const AssetsPage       = lazy(() => import('./pages/AssetsLiabilities/AssetsLiabilitiesPage'));
const DashboardPage    = lazy(() => import('./pages/Dashboard/DashboardPage'));
const SettingsPage     = lazy(() => import('./pages/Settings/SettingsPage'));
const RentalsPage      = lazy(() => import('./pages/Rentals/RentalsPage'));
const LedgerPage       = lazy(() => import('./pages/Ledger/LedgerPage'));
const TaxStudioPage    = lazy(() => import('./pages/TaxStudio/TaxStudioPage'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 32, height: 32, color: '#00D28E', animation: 'spin 0.9s linear infinite' }}
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.12 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

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

/**
 * KeepAliveRoutes — renders every page once and keeps them mounted.
 * Only the active route is visible (display: block); others are hidden (display: none).
 * This preserves all form state across tab switches without needing sessionStorage.
 */
const ROUTES = [
  { path: '/dashboard', Component: DashboardPage },
  { path: '/budget',    Component: BudgetPage },
  { path: '/assets',    Component: AssetsPage },
{ path: '/rentals',   Component: RentalsPage },
  { path: '/ledger',    Component: LedgerPage },
  { path: '/tax',       Component: TaxStudioPage },
  { path: '/settings',  Component: SettingsPage },
];

function KeepAliveRoutes() {
  const location = useLocation();
  const isMobile = useIsMobile(768);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', width: '100%', overflowX: 'hidden' }}>
      <Navbar />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        paddingTop: isMobile ? 56 : 0,
        paddingBottom: isMobile ? 80 : 0,
        width: '100%',
        overflowX: 'hidden',
        minHeight: '100vh',
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: isMobile ? '20px 14px' : '32px 32px',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {ROUTES.map(({ path, Component }) => (
            <div
              key={path}
              style={{ display: location.pathname === path ? 'block' : 'none' }}
            >
              <Suspense fallback={<PageLoader />}>
                <Component />
              </Suspense>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { session, authLoading } = useAppContext();

  if (authLoading) return <PageLoader />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"         element={!session ? <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> : <Navigate to="/dashboard" replace />} />
      <Route path="/accept-invite" element={<Suspense fallback={<PageLoader />}><AcceptInvitePage /></Suspense>} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Redirect old /expenses to /ledger */}
      <Route path="/expenses" element={<Navigate to="/ledger" replace />} />

      {/* Protected app — all pages kept mounted, switched via CSS */}
      {session ? (
        <Route path="/*" element={<KeepAliveRoutes />} />
      ) : (
        <Route path="/*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-1)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#00D28E', secondary: '#0F172A' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0F172A' } },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
