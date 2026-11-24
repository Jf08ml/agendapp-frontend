// src/App.tsx
import { Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import ChatPanel from "./chatbot/ChatPanel";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import AdminShell from "./layouts/AdminShell";
import PublicShell from "./layouts/PublicShell";
import { isAdminPath } from "./layouts/adminNavigation";
import generalRoutes from "./routes/generalRoutes";
import useAuthInitializer from "./hooks/useAuthInitializer";
import { useSessionExpiry } from "./hooks/useSessionExpiry";
import { useServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "./app/store";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { createSubscription } from "./services/subscriptionService";
import { registerSessionEventListeners } from "./utils/sessionNotifications";
import { extractTenantFromHost } from "./utils/domainUtils";
import { loginSuccess } from "./features/auth/sliceAuth";
import {
  clearOrganization,
  fetchOrganizationConfig,
  ORG_CONFIG_LOAD_FAILED,
  ORG_CONFIG_NOT_FOUND,
} from "./features/organization/sliceOrganization";
import { IconShieldCheck } from "@tabler/icons-react";
import OrgLoadError from "./components/OrgLoadError";
import OrgLoadingSkeleton from "./components/OrgLoadingSkeleton";
import SuperadminShell from "./layouts/SuperadminShell";
import { isSuperadminPanelPath } from "./layouts/superadminNavigation";

import { ChristmasDecorations } from "./components/seasonal/ChristmasDecorations";
import {
  CHRISTMAS_PREVIEW_KEY,
  resolveChristmasPreview,
  shouldShowChristmas,
} from "./utils/seasonalTheme";

// 🎄 ?preview=navidad — solo en desarrollo (import.meta.env.DEV), nunca en producción.
function readChristmasPreview(search: string): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const { preview, store } = resolveChristmasPreview(
      search,
      sessionStorage.getItem(CHRISTMAS_PREVIEW_KEY)
    );
    if (store === "set") sessionStorage.setItem(CHRISTMAS_PREVIEW_KEY, "1");
    if (store === "clear") sessionStorage.removeItem(CHRISTMAS_PREVIEW_KEY);
    return preview;
  } catch {
    return false;
  }
}

// Función para convertir la clave VAPID de base64url a Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { userId, isAuthenticated, role } = useSelector(
    (state: RootState) => state.auth
  );
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgLoading = useSelector((state: RootState) => state.organization.loading);
  const orgError = useSelector((state: RootState) => state.organization.error);
  const [chatOpen, { open: openChat, toggle: toggleChat, close: closeChat }] = useDisclosure(false);
  // const isMobile = useMediaQuery("(max-width: 768px)");
  const [chatAutoStart, setChatAutoStart] = useState(false);
  const isSuperadmin = role === "superadmin";

  const handleChatInvalidate = useCallback((invalidates: string[]) => {
    if (invalidates.includes("organization")) {
      dispatch(fetchOrganizationConfig());
    }
  }, [dispatch]);

  // Abrir chat automáticamente cuando viene de ?asistente=onboarding
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("asistente") === "onboarding" && isAuthenticated && !isSuperadmin) {
      // Persistir el flag antes de limpiar la URL: ProtectedRoute lo usa para no
      // rebotar al wizard mientras el onboarding IA está en curso
      sessionStorage.setItem("ai_onboarding_active", "1");
      openChat();
      setChatAutoStart(true);
      // Limpiar el param de la URL sin recargar
      const clean = location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [location.search, location.pathname, isAuthenticated, isSuperadmin, openChat]);
  const hasRedirected = useRef(false);
  const domainInfo = useMemo(() => extractTenantFromHost(), []);
  const isSignupDomain = domainInfo.type === "signup";
  // Las rutas /superadmin* no necesitan org (ni antes de login ni después)
  const isSuperadminPath = location.pathname.startsWith("/superadmin");
  const isSignupPath = location.pathname === "/signup";
  // La pantalla de retorno del pago de reserva es tenant-agnóstica (solo usa el
  // ?ref para el polling). MP puede redirigir a un dominio no registrado como
  // org (p. ej. un túnel de dev), así que no debe quedar bloqueada por el loader.
  const isReservationPaymentPath = location.pathname === "/reserva/pago";
  const isImpersonating = localStorage.getItem("sa_is_impersonating") === "true";

  const handleReturnToSuperadmin = useCallback(() => {
    try {
      const raw = localStorage.getItem("sa_backup");
      if (raw) {
        const backup = JSON.parse(raw) as { token: string; userId: string; expiresAt?: string };
        if (backup.token) {
          dispatch(
            loginSuccess({
              token: backup.token,
              userId: backup.userId,
              role: "superadmin",
              organizationId: "",
              permissions: [],
              expiresAt: backup.expiresAt ?? undefined,
            })
          );
          dispatch(clearOrganization());
        }
      }
    } finally {
      localStorage.removeItem("sa_backup");
      localStorage.removeItem("sa_is_impersonating");
      localStorage.removeItem("app_dev_slug");
    }
    navigate("/superadmin/orgs", { replace: true });
  }, [dispatch, navigate]);

  // 🎄 Tema navideño: solo páginas de clientes, solo en temporada (1 dic – 6 ene)
  const christmasPreview = readChristmasPreview(location.search);
  const showChristmas = shouldShowChristmas({
    seasonalTheme: organization?.seasonalTheme,
    pathname: location.pathname,
    now: new Date(),
    timeZone: organization?.timezone,
    preview: christmasPreview,
  });

  // Inicializa autenticación en el cliente
  useAuthInitializer();

  // Detecta proactivamente sesión expirada (idle + PWA en segundo plano)
  useSessionExpiry();

  // Sistema de actualización automática del Service Worker
  const { currentVersion } = useServiceWorkerUpdate();

  // Log de versión para debugging
  useEffect(() => {
    if (currentVersion) {
      console.log(`📦 Versión de la app: ${currentVersion.buildDate}`);
    }
  }, [currentVersion]);

  // Redirigir a agenda en carga inicial si está autenticado (no aplica para superadmin)
  useEffect(() => {
    if (isAuthenticated && !isSuperadmin && location.pathname === "/" && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/gestionar-agenda", { replace: true });
    }
    if (isAuthenticated && isSuperadmin && location.pathname === "/" && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/superadmin/orgs", { replace: true });
    }
  }, [isAuthenticated, isSuperadmin, location.pathname, navigate]);

  // Escuchar eventos de membresía y sesión
  useEffect(() => {
    const cleanup = registerSessionEventListeners();
    return cleanup;
  }, []);

  // 🔔 Notificaciones push (con guards para Instagram / Telegram / FB in-app)
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (!isAuthenticated || !userId) return;

      const ua = navigator.userAgent || "";
      const isInAppBrowser = /Instagram|Telegram|FBAN|FBAV|FB_IAB/i.test(ua);

      // En navegadores embebidos no intentamos usar push
      if (isInAppBrowser) {
        return;
      }

      // Verificar que existan las APIs antes de usarlas
      const hasNotification = typeof Notification !== "undefined";
      const hasServiceWorker = "serviceWorker" in navigator;
      const hasPushManager = "PushManager" in window;

      if (!hasNotification || !hasServiceWorker || !hasPushManager) {
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      
      // Convertir la clave VAPID a Uint8Array
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("La clave VAPID no está configurada");
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      await createSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh ?? "",
          auth: subscription.toJSON().keys?.auth ?? "",
        },
        userId,
      });
    };

    void requestNotificationPermission();
  }, [isAuthenticated, userId]);

  // Loader mientras carga la organización/branding (no aplica para signup domain, superadmin ni rutas /superadmin*)
  if (!isSignupDomain && !isSuperadmin && !isSuperadminPath && !isSignupPath && !isReservationPaymentPath && !organization) {
    // Si la carga por dominio falló, mostrar el motivo con reintento en vez del
    // loader infinito.
    if (!orgLoading && (orgError === ORG_CONFIG_NOT_FOUND || orgError === ORG_CONFIG_LOAD_FAILED)) {
      return (
        <OrgLoadError
          notFound={orgError === ORG_CONFIG_NOT_FOUND}
          onRetry={() => dispatch(fetchOrganizationConfig())}
        />
      );
    }
    return <OrgLoadingSkeleton />;
  }

  const routes = (
    <Routes>
      {generalRoutes.map((route, index) => (
        <Route key={index} path={route.path} element={<route.component />} />
      ))}
    </Routes>
  );

  // Panel: con sesión (no superadmin) y en una ruta de administración. Todo lo
  // demás (web del negocio, reserva, tienda…) usa el shell público, también si
  // quien navega tiene sesión. Registro y superadmin: shell de plataforma.
  const useAdminShell = isAuthenticated && !isSuperadmin && isAdminPath(location.pathname);
  const isPlatformScreen = isSuperadmin || isSuperadminPath || (isSignupDomain && !organization);
  // Superadmin con sesión: su propio shell con la navegación de plataforma.
  const useSuperadminShell = isAuthenticated && isSuperadmin && isSuperadminPanelPath(location.pathname);

  // Banners del panel: sesión de soporte y estado de la membresía
  const banners = (
    <>
      {isImpersonating && (
        // Modo soporte (rediseño): barra de plataforma, no del negocio.
        <div
          role="status"
          style={{
            background: "var(--platform)",
            color: "#fff",
            padding: "8px 16px",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconShieldCheck size={18} />
            Estás en modo soporte como admin de <strong>{organization?.name || "este negocio"}</strong>
          </span>
          <button
            type="button"
            onClick={handleReturnToSuperadmin}
            style={{
              background: "#fff",
              color: "var(--platform)",
              border: "none",
              borderRadius: 6,
              padding: "4px 12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Volver a la plataforma
          </button>
        </div>
      )}
      {!isImpersonating && organization?.membershipStatus === "trial" && (
        <div
          style={{
            background: "var(--info-soft)",
            borderBottom: "1px solid var(--line)",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--ink)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/my-membership")}
        >
          Estás en período de prueba gratuita.{" "}
          <strong style={{ color: "var(--info)" }}>Conoce nuestros planes</strong> para seguir usando la plataforma.
        </div>
      )}
      {!isImpersonating && organization?.membershipStatus === "past_due" && (
        <div
          style={{
            background: "var(--warning-soft)",
            borderBottom: "1px solid var(--line)",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: "14px",
            color: "var(--ink)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/my-membership")}
        >
          Tu plan ha vencido. Solo puedes consultar tus datos.{" "}
          <strong style={{ color: "var(--warning)" }}>Renueva ahora</strong> para recuperar el acceso completo.
        </div>
      )}
    </>
  );

  return (
    <>
      <Analytics />


      {useSuperadminShell ? (
        <SuperadminShell>{routes}</SuperadminShell>
      ) : useAdminShell ? (
        <AdminShell banners={banners} chatOpen={chatOpen} onToggleChat={toggleChat}>
          {routes}
        </AdminShell>
      ) : (
        <PublicShell showChristmas={showChristmas} platform={isPlatformScreen}>
          {/* El banner de soporte sigue visible si el admin abre su web pública */}
          {isAuthenticated && isImpersonating && banners}
          {routes}
        </PublicShell>
      )}

      {/* Panel del asistente IA: fuera de los shells para no perder la
          conversación al pasar del panel a la web pública. */}
      {isAuthenticated && !isSuperadmin && (
        <Drawer
          opened={chatOpen}
          onClose={closeChat}
          position="right"
          size="100%"
          withCloseButton={false}
          padding={0}
          keepMounted
          styles={{ body: { height: "100%", overflow: "hidden", padding: 0 } }}
        >
          <ChatPanel
            onClose={closeChat}
            onInvalidate={handleChatInvalidate}
            autoStart={chatAutoStart}
            onAutoStartDone={() => setChatAutoStart(false)}
          />
        </Drawer>
      )}

      {showChristmas && <ChristmasDecorations />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
