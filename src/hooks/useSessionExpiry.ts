import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/sliceAuth";
import { AppDispatch, RootState } from "../app/store";

const PUBLIC_PATHS = ["/login", "/login-admin", "/planes", "/servicios-precios", "/"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

/**
 * Detecta proactivamente cuando el token de sesión expira.
 * Cubre dos escenarios que el interceptor de axios no cubre:
 * 1. Usuario idle sin hacer requests → el token expira sin que llegue un 401
 * 2. PWA en segundo plano → al regresar al foco el token ya expiró
 */
export function useSessionExpiry() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false); // evitar disparar múltiples veces

  const handleExpiredSession = () => {
    // Usar window.location para tener siempre el pathname actual (no stale closure)
    if (isPublicPath(window.location.pathname)) return;
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;

    dispatch(logout());

    window.dispatchEvent(
      new CustomEvent("session-expired", {
        detail: {
          message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          type: "token-expired",
        },
      })
    );

    setTimeout(() => {
      navigate("/login-admin", { replace: true });
    }, 2000);
  };

  const checkExpiry = () => {
    const token = localStorage.getItem("app_token");
    if (!token) return;

    const expiresAtStr = localStorage.getItem("app_token_expires_at");
    if (!expiresAtStr) return;

    const expiresAt = new Date(expiresAtStr).getTime();
    if (Date.now() >= expiresAt) {
      handleExpiredSession();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    hasExpiredRef.current = false;

    // Verificar inmediatamente (cubre PWA que regresa al foco con token expirado)
    checkExpiry();

    // Revisar cada 60 segundos (cubre usuario idle sin requests)
    intervalRef.current = setInterval(checkExpiry, 60_000);

    // Revisar al regresar al foco (tab o PWA en segundo plano)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkExpiry();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
