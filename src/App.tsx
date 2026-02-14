// src/App.tsx
import {
  AppShell,
  Avatar,
  Burger,
  Flex,
  UnstyledButton,
  Text,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import NavbarLinks from "./layouts/NavbarLinks";
import generalRoutes from "./routes/generalRoutes";
import useAuthInitializer from "./hooks/useAuthInitializer";
import { useServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";
import { useSelector } from "react-redux";
import { RootState } from "./app/store";
import { useEffect, useRef } from "react";
import { CustomLoader } from "./components/customLoader/CustomLoader";
import { createSubscription } from "./services/subscriptionService";
import { registerSessionEventListeners } from "./utils/sessionNotifications";

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
  const { userId, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector((state: RootState) => state.organization.loading);
  const [opened, { toggle, close }] = useDisclosure(false);
  const hasRedirected = useRef(false);

  // Branding dinámico
  const color = organization?.branding?.primaryColor || "#DE739E";
  const logoUrl = organization?.branding?.logoUrl || "/logo-default.png";

  // Inicializa autenticación en el cliente
  useAuthInitializer();

  // Sistema de actualización automática del Service Worker
  const { currentVersion } = useServiceWorkerUpdate();

  // Log de versión para debugging
  useEffect(() => {
    if (currentVersion) {
      console.log(`📦 Versión de la app: ${currentVersion.buildDate}`);
    }
  }, [currentVersion]);

  // Redirigir a agenda en carga inicial si está autenticado
  useEffect(() => {
    if (isAuthenticated && location.pathname === "/" && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/gestionar-agenda", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

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
        applicationServerKey,
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

  // Loader mientras carga la organización/branding
  if (loading || !organization) {
    return (
      <CustomLoader
        loadingText={`Cargando ${organization?.name || "organización"}...`}
        logoUrl={organization?.branding?.logoUrl}
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

        <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>
          {isAuthenticated && organization?.membershipStatus === "trial" && (
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
          {isAuthenticated && organization?.membershipStatus === "past_due" && (
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
