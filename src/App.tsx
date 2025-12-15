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
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import NavbarLinks from "./layouts/NavbarLinks";
import generalRoutes from "./routes/generalRoutes";
import useAuthInitializer from "./hooks/useAuthInitializer";
import { useSelector } from "react-redux";
import { RootState } from "./app/store";
import { useEffect, useState } from "react";
import { CustomLoader } from "./components/customLoader/CustomLoader";
import { createSubscription } from "./services/subscriptionService";
import NotificationsMenu from "./layouts/NotificationsMenu";
import { MembershipAlert } from "./components/MembershipAlert";
import { PaymentMethodsModal } from "./components/PaymentMethodsModal";
import { getCurrentMembership, Membership } from "./services/membershipService";

function App() {
  const { userId, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector((state: RootState) => state.organization.loading);
  const [opened, { toggle, close }] = useDisclosure(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(
    null
  );

  // Branding dinámico
  const color = organization?.branding?.primaryColor || "#DE739E";
  const logoUrl = organization?.branding?.logoUrl || "/logo-default.png";

  // Inicializa autenticación en el cliente
  useAuthInitializer();

  // Cargar membresía actual
  useEffect(() => {
    const loadMembership = async () => {
      if (organization?._id) {
        try {
          const membership = await getCurrentMembership(organization._id);
          setCurrentMembership(membership);
        } catch (error) {
          console.error("Error al cargar membresía:", error);
        }
      }
    };
    loadMembership();
  }, [organization?._id]);

  // Escuchar evento de membresía suspendida
  useEffect(() => {
    const handleMembershipSuspended = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.error("Membresía suspendida:", customEvent.detail);
      setPaymentModalOpened(true);
    };

    window.addEventListener("membership-suspended", handleMembershipSuspended);
    return () => {
      window.removeEventListener(
        "membership-suspended",
        handleMembershipSuspended
      );
    };
  }, []);

  // App.tsx
  useEffect(() => {
    const requestNotificationPermission = async () => {
      // 1) Chequear que el usuario esté autenticado
      if (!isAuthenticated || !userId) return;

      // 2) Detectar navegadores embebidos (Instagram, Telegram, Facebook, etc.)
      const ua = navigator.userAgent || "";
      const isInAppBrowser = /Instagram|Telegram|FBAN|FBAV|FB_IAB/i.test(ua);

      if (isInAppBrowser) {
        // En in-app browsers de iOS NO hay web push, así que salimos aquí
        return;
      }

      // 3) Verificar que existan las APIs antes de usarlas
      if (
        typeof Notification === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
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

  // Actualización automática de Service Worker
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isInAppBrowser = /Instagram|Telegram|FBAN|FBAV|FB_IAB/i.test(ua);

    if (!("serviceWorker" in navigator) || isInAppBrowser) {
      return;
    }

    navigator.serviceWorker.register("/custom-sw.js").then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker)
          installingWorker.onstatechange = () => {
            if (installingWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log("Nueva versión disponible. Actualizando...");
                window.location.reload();
              }
            }
          };
      };
    });
  }, []);

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
    <Router>
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
          {/* Alerta de membresía para usuarios autenticados */}
          {isAuthenticated && organization?._id && (
            <MembershipAlert
              organizationId={organization._id}
              onRenewClick={() => setPaymentModalOpened(true)}
            />
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

      {/* Modal de pago */}
      <PaymentMethodsModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        membership={currentMembership}
      />
    </Router>
  );
}

export default App;
