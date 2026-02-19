import React from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { RootState } from "../app/store"; 

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const role = useSelector((state: RootState) => state.auth.role);
  const organization = useSelector((state: RootState) => state.organization.organization);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login-admin" />;
  }

  // Superadmin de plataforma: redirigir a lista de orgs, no a páginas de org
  if (role === "superadmin") {
    return <Navigate to="/superadmin/orgs" replace />;
  }

  // Redirigir a my-membership si el acceso está bloqueado (suspended/cancelled)
  // past_due NO redirige: puede consultar datos (read-only), banner se muestra en App.tsx
  const blockedStatuses = ["suspended", "cancelled"];
  const isMembershipBlocked =
    organization?.hasAccessBlocked ||
    blockedStatuses.includes(organization?.membershipStatus || "");

  if (isMembershipBlocked && location.pathname !== "/my-membership") {
    return <Navigate to="/my-membership" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
