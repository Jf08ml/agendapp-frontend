import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, refreshTokenSuccess } from "../features/auth/sliceAuth";
import { refreshToken } from "../services/authService";
import { checkCurrentSession } from "../services/sessionService";
import { AppDispatch, RootState } from "../app/store";

const PUBLIC_PATHS = ["/login", "/login-admin", "/planes", "/servicios-precios", "/"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

/**
 * Detecta proactivamente cuando el token de sesión expira o fue revocada.
 * Cubre escenarios que el interceptor de axios no cubre (porque dependen de
 * que salga una request "real" para que llegue un 401):
 * 1. Usuario idle sin hacer requests → el token expira sin que llegue un 401
 * 2. PWA en segundo plano → al regresar al foco el token ya expiró
 * 3. Sesión revocada desde el gestor de sesiones (SessionsTab, otro dispositivo)
 *    mientras el JWT sigue vigente dentro de sus 7 días naturales — nada más
 *    lo delata hasta que se dispare una request protegida
 *
 * Antes de hacer logout, intenta renovar silenciosamente el token.
 * El backend acepta tokens expirados hasta 30 días desde su emisión.
 */
export function useSessionExpiry() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isCheckingRevocationRef = useRef(false);
  // Ref para que el intervalo (armado una sola vez por ciclo de auth) siempre
  // lea el organizationId más reciente y no quede pegado al valor (a veces
  // null) que tenía en el render donde se creó el efecto.
  const organizationIdRef = useRef(organizationId);
  useEffect(() => {
    organizationIdRef.current = organizationId;
  }, [organizationId]);

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

  // Ping liviano contra /sessions/current. Si la sesión fue revocada, el 401
  // ya lo resuelve el interceptor de axios (intenta /refresh, que también
  // rechaza sesiones revocadas, y hace forceLogout) — acá solo hace falta
  // ignorar el resultado nulo. Si el token es legacy (sin `sid`, emitido antes
  // del gestor de sesiones), dispara un refresh real una sola vez para
  // engancharlo, en vez de esperar hasta 7 días a que expire naturalmente.
  const checkRevocation = async () => {
    if (hasExpiredRef.current || isCheckingRevocationRef.current) return;
    const organizationId = organizationIdRef.current;
    if (!organizationId) return;

    isCheckingRevocationRef.current = true;
    try {
      const result = await checkCurrentSession(organizationId);
      if (result && !result.hasSid) {
        const token = localStorage.getItem("app_token");
        if (token) {
          const refreshed = await refreshToken(token);
          if (refreshed?.token) {
            dispatch(
              refreshTokenSuccess({ token: refreshed.token, expiresAt: refreshed.expiresAt })
            );
          }
        }
      }
    } finally {
      isCheckingRevocationRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    hasExpiredRef.current = false;
    isRefreshingRef.current = false;

    checkExpiry();
    checkRevocation();

    intervalRef.current = setInterval(() => {
      checkExpiry();
      checkRevocation();
    }, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExpiry();
        checkRevocation();
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
