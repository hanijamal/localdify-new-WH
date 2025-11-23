



import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Bookings from './pages/dashboard/Bookings';
import Revenue from './pages/dashboard/Revenue';
import Templates from './pages/dashboard/Templates';
// FIX: Changed to a named import as 'Integrations' is not a default export.
import { Integrations } from './pages/dashboard/Integrations';
import PublicBookingPage from './pages/PublicBookingPage';
import PublicBookingRouter from './pages/PublicBookingRouter';
import ProtectedRoute from './components/ProtectedRoute';
import ConfirmationRequired from './pages/ConfirmationRequired';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import RedirectPage from './pages/RedirectPage';
import EmailConfirmedPage from './pages/EmailConfirmedPage';
import CancelBookingPage from './pages/CancelBookingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Support from './pages/dashboard/Support';
import TicketDetail from './pages/dashboard/TicketDetail';
import AdminSupport from './pages/admin/Support';
import AdminTicketDetail from './pages/admin/TicketDetail';
import TrialEnded from './pages/TrialEnded';
import AdminSettings from './pages/admin/AdminSettings';
import Billing from './pages/dashboard/Billing';
import AdminRevenue from './pages/admin/AdminRevenue';
import SettingsLayout from './pages/dashboard/SettingsLayout';
import Settings from './pages/dashboard/Settings';
import ManageStaff from './pages/dashboard/ManageStaff';
import ManageServices from './pages/dashboard/ManageServices';
import ManageLocations from './pages/dashboard/ManageLocations';
import AdminPlans from './pages/admin/AdminPlans';
import AdminPages from './pages/admin/Pages';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import GenericPage from './pages/GenericPage';
import CustomDomainRouter from './pages/CustomDomainRouter';
import CustomDomainTester from './pages/CustomDomainTester';

const App: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect - Check for custom domain first */}
      <Route path="/" element={<CustomDomainRouter />} />
      <Route path="/home" element={<Home />} />

      {/* Group for public-facing routes */}
      <Route element={<Outlet />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirmation-required" element={<ConfirmationRequired />} />
        <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/b/:businessSlug" element={<PublicBookingRouter />} />
        <Route path="/b/:businessSlug/:locationSlug" element={<PublicBookingPage />} />
        <Route path="/confirm-booking" element={<Navigate to="/login" replace />} /> {/* Handled by webhook now */}
        <Route path="/cancel-booking" element={<CancelBookingPage />} />
        <Route path="/to/:shortCode" element={<RedirectPage />} />
        <Route path="/trial-ended" element={<TrialEnded />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/p/:slug" element={<GenericPage />} />
        <Route path="/test-domain" element={<CustomDomainTester />} />
      </Route>

      {/* User Dashboard routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Dashboard />} />
        <Route path="clients" element={<Bookings />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<Settings />} />
          <Route path="staff" element={<ManageStaff />} />
          <Route path="services" element={<ManageServices />} />
          <Route path="locations" element={<ManageLocations />} />
        </Route>
        <Route path="templates" element={<Templates />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="support" element={<Support />} />
        <Route path="support/:ticketId" element={<TicketDetail />} />
        <Route path="billing" element={<Billing />} />
      </Route>

      {/* Admin Panel routes */}
      <Route element={<Outlet />}>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="support/:ticketId" element={<AdminTicketDetail />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;