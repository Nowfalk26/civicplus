import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('CITIZEN' | 'OFFICER' | 'ADMIN' | 'EMPLOYEE')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useStore();
  const location = useLocation();

  if (!user) {
    const isOfficerRoute = location.pathname.startsWith('/officer');
    const isControllerRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/controller');
    const isEmployeeRoute = location.pathname.startsWith('/employee');
    const targetLogin = isOfficerRoute
      ? '/officer/login'
      : isControllerRoute
      ? '/controller/login'
      : isEmployeeRoute
      ? '/officer/login'
      : '/civic/login';

    return <Navigate to={targetLogin} state={{ from: location }} replace />;
  }

  // Officer approval and first-login password gate
  if (user.role === 'OFFICER') {
    const isApproved =
      user.approvalStatus === 'APPROVED' ||
      user.isApproved === true ||
      (!user.isBanned && user.approvalStatus !== 'PENDING' && user.approvalStatus !== 'REJECTED');

    if (!isApproved) {
      return <Navigate to="/officer/login" state={{ from: location, unapproved: true }} replace />;
    }

    // Force first-time password setup before entering main officer portal
    if (
      user.needsPasswordChange &&
      location.pathname.startsWith('/officer') &&
      location.pathname !== '/officer/set-password'
    ) {
      return <Navigate to="/officer/set-password" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective default home
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'OFFICER') return <Navigate to="/officer/dashboard" replace />;
    if (user.role === 'EMPLOYEE') return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return <>{children}</>;
};
