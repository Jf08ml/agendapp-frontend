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

  // Rutas permitidas incluso si el servicio está suspendido
  const allowedRoutesWhenSuspended = [
    "/my-membership",
    "/service-suspended",
  ];

  if (!isAuthenticated) {
    return <Navigate to="/login-admin" />;
  }

  // Verificar si la organización tiene el acceso bloqueado
  if (organization?.hasAccessBlocked) {
    // Permitir acceso solo a rutas específicas cuando está suspendido
    if (!allowedRoutesWhenSuspended.includes(location.pathname)) {
      return <Navigate to="/service-suspended" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
