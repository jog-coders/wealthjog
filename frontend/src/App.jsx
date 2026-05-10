import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';

const SIDEBAR_W = 240;

const LoginPage        = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const BudgetPage       = lazy(() => import('./pages/Budget/BudgetPage'));
const AssetsPage       = lazy(() => import('./pages/AssetsLiabilities/AssetsLiabilitiesPage'));
const ExpensePage      = lazy(() => import('./pages/ExpenseTracker/ExpenseTrackerPage'));
const DashboardPage    = lazy(() => import('./pages/Dashboard/DashboardPage'));
const SettingsPage     = lazy(() => import('./pages/Settings/SettingsPage'));
const RentalsPage      = lazy(() => import('./pages/Rentals/RentalsPage'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 32, height: 32, color: '#00D28E', animation: 'spin 0.9s linear infinite' }}
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.12 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

// Responsive: sidebar on desktop, top+bottom bar on mobile
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

function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppContext();
  const isMobile = useIsMobile(768);

  if (authLoading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', width: '100%', overflowX: 'hidden' }}>
      {/* Sidebar (desktop) / Top+Bottom bar (mobile) */}
      <Navbar />

      {/* Main content */}
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
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E293B',
            color: '#F8FAFC',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#00D28E', secondary: '#0F172A' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0F172A' } },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/budget"    element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
            <Route path="/assets"    element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
            <Route path="/expenses"  element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
            <Route path="/rentals"   element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
