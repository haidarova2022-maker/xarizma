import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from './stores/auth-store';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import CalendarSimplePage from './pages/Calendar/CalendarSimplePage';
import BookingsPage from './pages/Bookings/BookingsPage';
import BranchesPage from './pages/Branches/BranchesPage';
import RoomsPage from './pages/Rooms/RoomsPage';
import PricingPage from './pages/Pricing/PricingPage';
import UsersPage from './pages/Users/UsersPage';
import PromoCodesPage from './pages/PromoCodes/PromoCodesPage';
import PackagesPage from './pages/Packages/PackagesPage';
import WaitlistPage from './pages/Waitlist/WaitlistPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import EmptySlotsPage from './pages/EmptySlots/EmptySlotsPage';
import SourceAnalyticsPage from './pages/Analytics/SourceAnalyticsPage';
import ManagerReportPage from './pages/Analytics/ManagerReportPage';
import RoomAnalyticsPage from './pages/Analytics/RoomAnalyticsPage';
import CancellationsPage from './pages/Analytics/CancellationsPage';

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
                <Route path="/calendar-simple" element={<CalendarSimplePage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/empty-slots" element={<EmptySlotsPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/promo-codes" element={<PromoCodesPage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/analytics/sources" element={<SourceAnalyticsPage />} />
                <Route path="/analytics/managers" element={<ManagerReportPage />} />
                <Route path="/analytics/rooms" element={<RoomAnalyticsPage />} />
                <Route path="/analytics/cancellations" element={<CancellationsPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
