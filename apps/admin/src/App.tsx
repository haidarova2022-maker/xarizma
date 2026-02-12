import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from './stores/auth-store';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import BookingsPage from './pages/Bookings/BookingsPage';
import BranchesPage from './pages/Branches/BranchesPage';
import RoomsPage from './pages/Rooms/RoomsPage';
import PricingPage from './pages/Pricing/PricingPage';
import UsersPage from './pages/Users/UsersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
