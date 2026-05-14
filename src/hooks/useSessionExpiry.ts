import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, refreshTokenSuccess } from "../features/auth/sliceAuth";
import { refreshToken } from "../services/authService";
import { AppDispatch, RootState } from "../app/store";

const PUBLIC_PATHS = ["/login", "/login-admin", "/planes", "/servicios-precios", "/"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

/**
 * Detecta proactivamente cuando el token de sesión expira.
 * Cubre dos escenarios que el interceptor de axios no cubre:
 * 1. Usuario idle sin hacer requests → el token expira sin que llegue un 401
 * 2. PWA en segundo plano → al regresar al foco el token ya expiró
 *
 * Antes de hacer logout, intenta renovar silenciosamente el token.
 * El backend acepta tokens expirados hasta 30 días desde su emisión.
 */
export function useSessionExpiry() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const handleExpiredSession = () => {
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

  const tryRefreshOrExpire = async () => {
    if (hasExpiredRef.current || isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    const token = localStorage.getItem("app_token");
    if (!token) {
      handleExpiredSession();
      isRefreshingRef.current = false;
      return;
    }

    // Verificar si el token está dentro de los 30 días renovables
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const issuedAt = payload.iat * 1000;
      const maxRenewable = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - issuedAt > maxRenewable) {
        handleExpiredSession();
        isRefreshingRef.current = false;
        return;
      }
    } catch {
      handleExpiredSession();
      isRefreshingRef.current = false;
      return;
    }

    const result = await refreshToken(token);
    if (result?.token) {
      dispatch(refreshTokenSuccess({ token: result.token, expiresAt: result.expiresAt }));
      hasExpiredRef.current = false;
    } else {
      handleExpiredSession();
    }
    isRefreshingRef.current = false;
  };

  const checkExpiry = () => {
    const token = localStorage.getItem("app_token");
    if (!token) return;

    const expiresAtStr = localStorage.getItem("app_token_expires_at");
    if (!expiresAtStr) return;

    const expiresAt = new Date(expiresAtStr).getTime();
    if (Date.now() >= expiresAt) {
      tryRefreshOrExpire();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    hasExpiredRef.current = false;
    isRefreshingRef.current = false;

    checkExpiry();

    intervalRef.current = setInterval(checkExpiry, 60_000);

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
