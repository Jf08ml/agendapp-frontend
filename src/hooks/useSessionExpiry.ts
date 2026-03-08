import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExpiredSession = (pathname: string) => {
    if (isPublicPath(pathname)) return;

    // Limpiar estado de Redux y localStorage
    dispatch(logout());

    // Notificar para que el listener en App.tsx muestre la notificación
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

  const checkExpiry = (pathname: string) => {
    const token = localStorage.getItem("app_token");
    if (!token) return; // No hay sesión activa

    const expiresAtStr = localStorage.getItem("app_token_expires_at");
    if (!expiresAtStr) return; // Sin fecha de expiración → no podemos verificar

    const expiresAt = new Date(expiresAtStr).getTime();
    if (Date.now() >= expiresAt) {
      handleExpiredSession(pathname);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const pathname = location.pathname;

    // Verificar inmediatamente (cubre el caso de PWA que regresa al foco con token expirado)
    checkExpiry(pathname);

    // Revisar cada 60 segundos (cubre usuario idle)
    intervalRef.current = setInterval(() => {
      checkExpiry(location.pathname);
    }, 60_000);

    // Revisar al regresar al foco (tab/PWA)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExpiry(location.pathname);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
