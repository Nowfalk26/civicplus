import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('CITIZEN' | 'OFFICER' | 'ADMIN')[];
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
    const targetLogin = isOfficerRoute
      ? '/officer/login'
      : isControllerRoute
      ? '/controller/login'
      : '/civic/login';

    return <Navigate to={targetLogin} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective default home
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'OFFICER') return <Navigate to="/officer/dashboard" replace />;
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return <>{children}</>;
};
