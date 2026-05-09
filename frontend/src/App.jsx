import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useAppContext } from './context/AppContext';
import Navbar from './components/Navbar';

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
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
    <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ width: 30, height: 30, color: '#FF6548', animation: 'spin 0.9s linear infinite' }}
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

// ── Protected route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppContext();
  if (authLoading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7' }}>
      {/* Fixed top nav (64px tall) */}
      <Navbar />

      {/* Content area
          Desktop : pt-16 (64px) clears the fixed nav
          Mobile  : pt-16 (64px) clears top bar + pb-20 (80px) clears bottom tab bar */}
      <main className="pt-16 pb-6 md:pb-10 pb-[88px] md:pb-10">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0' }}>
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
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#111827',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            fontSize: 13,
          },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/budget"    element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
            <Route path="/assets"    element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
            <Route path="/rentals"   element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
            <Route path="/expenses"  element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
