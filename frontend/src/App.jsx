import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useAppContext } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import BudgetPage from './pages/Budget/BudgetPage';
import AssetsLiabilitiesPage from './pages/AssetsLiabilities/AssetsLiabilitiesPage';
import ExpenseTrackerPage from './pages/ExpenseTracker/ExpenseTrackerPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import SettingsPage from './pages/Settings/SettingsPage';
import RentalsPage from './pages/Rentals/RentalsPage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
  const { session, authLoading } = useAppContext();
  
  if (authLoading) return (
    <div className="min-h-screen bg-[#F5F8F6] flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </div>
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-64px)]">
        {children}
      </main>
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/budget" element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><AssetsLiabilitiesPage /></ProtectedRoute>} />
          <Route path="/rentals" element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseTrackerPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
