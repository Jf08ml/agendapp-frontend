// src/App.tsx
import { AppShell, Avatar, Burger, Flex, UnstyledButton, Text, Anchor } from "@mantine/core";
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
import { useEffect } from "react";
import { CustomLoader } from "./components/customLoader/CustomLoader";
import { createSubscription } from "./services/subscriptionService";
import NotificationsMenu from "./layouts/NotificationsMenu";

function App() {
  const { userId, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector((state: RootState) => state.organization.loading);
  const [opened, { toggle, close }] = useDisclosure(false);

  // Branding dinámico
  const color = organization?.branding?.primaryColor || "#DE739E";
  const logoUrl = organization?.branding?.logoUrl || "/logo-default.png";

  // Inicializa autenticación en el cliente
  useAuthInitializer();

  // Push notification setup (igual que antes)
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (isAuthenticated && userId) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          });

          // Enviar la suscripción al backend
          await createSubscription({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.toJSON().keys?.p256dh ?? "",
              auth: subscription.toJSON().keys?.auth ?? "",
            },
            userId,
          });
        }
      }
    };

    requestNotificationPermission();
  }, [isAuthenticated, userId]);

  // Actualización automática de Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
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
    }
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
    </Router>
  );
}

export default App;
