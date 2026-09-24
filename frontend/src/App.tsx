import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Dedicated Auth Portals
import { CivicLogin } from './pages/auth/CivicLogin';
import { OfficerLogin } from './pages/auth/OfficerLogin';
import { ControllerLogin } from './pages/auth/ControllerLogin';
import { EmployeeLogin } from './pages/auth/EmployeeLogin';
import { OfficerRequestAccess } from './pages/auth/OfficerRequestAccess';
import { OfficerSetPassword } from './pages/auth/OfficerSetPassword';

// Citizen Portal Pages
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { RouteReports } from './pages/citizen/RouteReports';
import { ReportProblem } from './pages/citizen/ReportProblem';
import { MyComplaints } from './pages/citizen/MyComplaints';
import { ComplaintDetail } from './pages/citizen/ComplaintDetail';
import { ComplaintTracking } from './pages/citizen/ComplaintTracking';
import { CitizenProfile } from './pages/citizen/CitizenProfile';

// Officer Portal Pages
import { OfficerDashboard } from './pages/officer/OfficerDashboard';
import { OfficerInbox } from './pages/officer/OfficerInbox';
import { OfficerAssign } from './pages/officer/OfficerAssign';
import { OfficerEmployees } from './pages/officer/OfficerEmployees';
import { OfficerReportAssignment } from './pages/officer/OfficerReportAssignment';
import { OfficerVerify } from './pages/officer/OfficerVerify';
import { OfficerAnalytics } from './pages/officer/OfficerAnalytics';
import { OfficerProfile } from './pages/officer/OfficerProfile';

// Employee Portal Pages
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';

// Admin Portal Pages (Controller)
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminFraud } from './pages/admin/AdminFraud';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminOfficerApprovals } from './pages/admin/AdminOfficerApprovals';
import { AdminProfileRequests } from './pages/admin/AdminProfileRequests';

import { StartupSplash } from './components/ui/StartupSplash';
import { BackendStatusBadge } from './components/ui/BackendStatusBadge';
import { useStore } from './store/useStore';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getEffectiveGoogleClientId } from './components/auth/GoogleOAuthModal';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  const { language } = useStore();
  const [googleClientId, setGoogleClientId] = React.useState(getEffectiveGoogleClientId);

  React.useEffect(() => {
    const handleUpdate = () => {
      setGoogleClientId(getEffectiveGoogleClientId());
    };
    window.addEventListener('civics_google_client_id_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('civics_google_client_id_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'ta') {
      document.body.classList.add('lang-ta');
      document.title = 'Civic+ | தமிழ்நாடு குடிமக்கள் குறைதீர்க்கும் தளம்';
    } else {
      document.body.classList.remove('lang-ta');
      document.title = 'Civic+ | Tamil Nadu Civic Complaint Platform';
    }
  }, [language]);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
      <StartupSplash />
      <BrowserRouter>
        <BackendStatusBadge />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0b1c30',
              color: '#ffffff',
              fontSize: '13px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
          }}
        />
        <Routes>
          <Route element={<AppLayout />}>
            {/* Public Entryway & Direct Portals */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/civic/login" element={<CivicLogin />} />
            <Route path="/officer/login" element={<OfficerLogin />} />
            <Route path="/officer/request-access" element={<OfficerRequestAccess />} />
            <Route
              path="/officer/set-password"
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <OfficerSetPassword />
                </ProtectedRoute>
              }
            />
            <Route path="/controller/login" element={<ControllerLogin />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/register" element={<Register />} />


            {/* Protected Civic Feature Direct Routes & Aliases */}
            <Route
              path="/add-report"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                  <ReportProblem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/civic-map"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />

            {/* Citizen Portal */}
            <Route
              path="/citizen/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/directions"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                  <RouteReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/route-reports"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                  <RouteReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/report"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                  <ReportProblem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/report-problem"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                  <ReportProblem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/complaints"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN']}>
                  <MyComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/complaints/:id"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN']}>
                  <ComplaintDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/complaints/:id/track"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN', 'EMPLOYEE']}>
                  <ComplaintTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/citizen/profile"
              element={
                <ProtectedRoute allowedRoles={['CITIZEN', 'OFFICER', 'ADMIN']}>
                  <CitizenProfile />
                </ProtectedRoute>
              }
            />

            {/* Officer Portal */}
            <Route
              path="/officer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/inbox"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerInbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/employees"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerEmployees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/assignments"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerReportAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/assign"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerReportAssignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/verify"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerVerify />
                </ProtectedRoute>
              }
            />

            {/* Employee Portal */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'OFFICER', 'ADMIN']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/analytics"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/profile"
              element={
                <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                  <OfficerProfile />
                </ProtectedRoute>
              }
            />

            {/* Control Portal (Admin / Controller) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/officer-approvals"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminOfficerApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile-requests"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminProfileRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fraud"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminFraud />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />


            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
