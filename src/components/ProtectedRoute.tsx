import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { RootState } from "../app/store"; 

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const organization = useSelector((state: RootState) => state.organization.organization);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login-admin" />;
  }

  // Redirigir a my-membership si el servicio está bloqueado
  if (organization?.hasAccessBlocked && location.pathname !== "/my-membership") {
    return <Navigate to="/my-membership" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
