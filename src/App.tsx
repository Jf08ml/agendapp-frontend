// src/App.tsx
import {
  AppShell,
  Avatar,
  Burger,
  Flex,
  UnstyledButton,
  Text,
  Anchor,
  Drawer,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconRobot, IconX } from "@tabler/icons-react";
import ChatPanel from "./chatbot/ChatPanel";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import NavbarLinks from "./layouts/NavbarLinks";
import generalRoutes from "./routes/generalRoutes";
import useAuthInitializer from "./hooks/useAuthInitializer";
import { useSessionExpiry } from "./hooks/useSessionExpiry";
import { useServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "./app/store";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { CustomLoader } from "./components/customLoader/CustomLoader";
import { createSubscription } from "./services/subscriptionService";
import { registerSessionEventListeners } from "./utils/sessionNotifications";
import { extractTenantFromHost } from "./utils/domainUtils";
import { loginSuccess } from "./features/auth/sliceAuth";
import { clearOrganization, fetchOrganizationConfig } from "./features/organization/sliceOrganization";

import NotificationsMenu from "./layouts/NotificationsMenu";

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
  const [opened, { toggle, close }] = useDisclosure(false);
  const [chatOpen, { open: openChat, toggle: toggleChat, close: closeChat }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [chatAutoStart, setChatAutoStart] = useState(false);
  const isSuperadmin = role === "superadmin";

  // ── FAB draggable ────────────────────────────────────────────────────────
  const FAB_SIZE = 56;
  // null = usar posición CSS por defecto (bottom/right); objeto = usuario arrastró
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const s = localStorage.getItem("agendit_fab_pos");
      if (s) {
        const pos = JSON.parse(s);
        // Clamp al viewport actual por si cambió el tamaño de pantalla
        return {
          x: Math.min(Math.max(pos.x, 0), window.innerWidth - FAB_SIZE),
          y: Math.min(Math.max(pos.y, 0), window.innerHeight - FAB_SIZE),
        };
      }
    } catch {}
    return null;
  });
  const fabPosRef = useRef(fabPos);
  const [fabDragging, setFabDragging] = useState(false);

  const handleFabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const startMx = e.clientX;
    const startMy = e.clientY;
    // Usar posición actual del DOM en lugar del estado (maneja tanto null como posición guardada)
    const startEx = rect.left;
    const startEy = rect.top;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startMx;
      const dy = ev.clientY - startMy;
      if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        moved = true;
        setFabDragging(true);
      }
      if (!moved) return;
      const next = {
        x: Math.min(Math.max(startEx + dx, 0), window.innerWidth - FAB_SIZE),
        y: Math.min(Math.max(startEy + dy, 0), window.innerHeight - FAB_SIZE),
      };
      fabPosRef.current = next;
      setFabPos(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setFabDragging(false);
      if (!moved) {
        toggleChat();
      } else {
        try { localStorage.setItem("agendit_fab_pos", JSON.stringify(fabPosRef.current)); } catch {}
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [toggleChat]);

  const handleChatInvalidate = useCallback((invalidates: string[]) => {
    if (invalidates.includes("organization")) {
      dispatch(fetchOrganizationConfig());
    }
  }, [dispatch]);

  // Abrir chat automáticamente cuando viene de ?asistente=onboarding
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("asistente") === "onboarding" && isAuthenticated && !isSuperadmin) {
      openChat();
      setChatAutoStart(true);
      // Limpiar el param de la URL sin recargar
      const clean = location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [location.search, isAuthenticated, isSuperadmin, openChat]);
  const hasRedirected = useRef(false);
  const domainInfo = useMemo(() => extractTenantFromHost(), []);
  const isSignupDomain = domainInfo.type === "signup";
  // Las rutas /superadmin* no necesitan org (ni antes de login ni después)
  const isSuperadminPath = location.pathname.startsWith("/superadmin");
  const isSignupPath = location.pathname === "/signup";
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

  // Branding dinámico
  const color = organization?.branding?.primaryColor || "#1C3461";
  const logoUrl = organization?.branding?.logoUrl || "/logo-default.png";

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
  if (!isSignupDomain && !isSuperadmin && !isSuperadminPath && !isSignupPath && !organization) {
    return (
      <CustomLoader
        loadingText="Cargando organización..."
      />
    );
  }

  return (
    <>
      <Analytics />

      <AppShell
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { desktop: !opened, mobile: !opened },
        }}
        header={{ height: 50 }}
        footer={{ height: 30 }}
        styles={{ footer: { borderTop: "none" } }}
      >
        <AppShell.Header bg={color}>
          <Flex align="center" style={{ height: 50 }}>
            <Burger
              opened={opened}
              onClick={toggle}
              size="md"
              color="white"
              onMouseEnter={() => opened || toggle()}
            />
            {/* Logo + badge + menú de notificaciones */}
            <NotificationsMenu
              target={
                <UnstyledButton
                  aria-label="Abrir notificaciones"
                  style={{ lineHeight: 0 }}
                >
                  <Avatar
                    src={logoUrl}
                    alt={organization?.name}
                    size={36}
                    radius="xl"
                    styles={{ image: { objectFit: "cover" } }}
                  />
                </UnstyledButton>
              }
              showBadgeOnTarget
              dropdownWidth={400}
            />
            {/* Nombre dinámico y contenido extra del Header */}
            <Header organization={organization} />
          </Flex>
        </AppShell.Header>

        <AppShell.Navbar
          p="md"
          bg={color}
          onMouseLeave={() => opened && close()}
        >
          <NavbarLinks closeNavbar={close} />
          <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
            <Text size="xs" ta="center" c="white" style={{ opacity: 0.8 }}>
              Powered by{" "}
              <Anchor
                href="https://www.agenditapp.com?utm_source=app-dashboard&utm_medium=referral&utm_campaign=powered-by"
                target="_blank"
                rel="noopener noreferrer"
                c="white"
                fw={700}
                style={{ textDecoration: "underline" }}
              >
                AgenditApp
              </Anchor>
            </Text>
          </div>
        </AppShell.Navbar>

        {/* Panel del asistente IA — Drawer unificado para desktop y mobile */}
        {isAuthenticated && !isSuperadmin && (
          <Drawer
            opened={chatOpen}
            onClose={closeChat}
            position="right"
            size={isMobile ? "100%" : 380}
            withCloseButton={false}
            padding={0}
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

        <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>
          {/* Banner de sesión de soporte (impersonación activa) */}
          {isImpersonating && isAuthenticated && (
            <div
              style={{
                background: "#1A1A2E",
                borderBottom: "2px solid #E040FB",
                padding: "8px 16px",
                textAlign: "center",
                fontSize: "14px",
                color: "#E040FB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <span>🛠️ Sesión de soporte técnico activa — estás operando como admin de <strong>{organization?.name || "esta organización"}</strong></span>
              <button
                onClick={handleReturnToSuperadmin}
                style={{
                  background: "#E040FB",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                Volver al panel de superadmin
              </button>
            </div>
          )}
          {isAuthenticated && !isImpersonating && organization?.membershipStatus === "trial" && (
            <div
              style={{
                background: "#E3F2FD",
                borderBottom: "1px solid #90CAF9",
                padding: "8px 16px",
                textAlign: "center",
                fontSize: "14px",
                color: "#1565C0",
                cursor: "pointer",
              }}
              onClick={() => navigate("/my-membership")}
            >
              Estás en período de prueba gratuita.{" "}
              <strong>Conoce nuestros planes</strong> para seguir usando la plataforma.
            </div>
          )}
          {isAuthenticated && !isImpersonating && organization?.membershipStatus === "past_due" && (
            <div
              style={{
                background: "#FFF3CD",
                borderBottom: "1px solid #FFEEBA",
                padding: "8px 16px",
                textAlign: "center",
                fontSize: "14px",
                color: "#856404",
                cursor: "pointer",
              }}
              onClick={() => navigate("/my-membership")}
            >
              Tu plan ha vencido. Solo puedes consultar tus datos.{" "}
              <strong>Renueva ahora</strong> para recuperar el acceso completo.
            </div>
          )}
          <Routes>
            {generalRoutes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </AppShell.Main>

        <AppShell.Footer>
          <Footer />
        </AppShell.Footer>
      </AppShell>

      {/* FAB — Botón flotante arrastrable del asistente IA */}
      {isAuthenticated && !isSuperadmin && (
        <Tooltip label={chatOpen ? "Cerrar asistente" : "Asistente IA"} withArrow disabled={fabDragging}>
          <ActionIcon
            onPointerDown={handleFabPointerDown}
            size={FAB_SIZE}
            radius="xl"
            aria-label="Abrir asistente IA"
            style={{
              position: "fixed",
              // Sin arrastrar: bottom/right con safe-area para iOS
              // Arrastrado: top/left con valor exacto en px
              ...(fabPos
                ? { left: fabPos.x, top: fabPos.y }
                : { bottom: "calc(48px + env(safe-area-inset-bottom, 0px))", right: 24 }
              ),
              zIndex: 300,
              background: chatOpen ? "#333" : color,
              boxShadow: chatOpen
                ? "0 4px 16px rgba(0,0,0,0.3)"
                : `0 4px 20px ${color}80`,
              transition: "background 0.2s, box-shadow 0.2s",
              cursor: fabDragging ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {chatOpen ? <IconX size={24} color="white" /> : <IconRobot size={26} color="white" />}
          </ActionIcon>
        </Tooltip>
      )}

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
