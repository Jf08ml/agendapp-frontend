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

  // Onboarding guiado por IA: ocurre sobre /gestionar-agenda con el chat abierto.
  // Mientras esté activo, no rebotar al wizard aunque el setup siga incompleto
  // (App.tsx limpia el query param, por eso también se persiste en sessionStorage).
  const aiOnboardingActive =
    new URLSearchParams(location.search).get("asistente") === "onboarding" ||
    sessionStorage.getItem("ai_onboarding_active") === "1";

  if (organization?.setupCompleted && sessionStorage.getItem("ai_onboarding_active")) {
    sessionStorage.removeItem("ai_onboarding_active");
  }

  // Si la org ya cargó y el setup inicial no está completo, forzar al wizard
  if (
    organization &&
    organization.setupCompleted === false &&
    location.pathname !== "/configuracion-inicial" &&
    !aiOnboardingActive
  ) {
    return <Navigate to="/configuracion-inicial" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
