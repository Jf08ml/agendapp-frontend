// src/layouts/Footer.tsx
import { useEffect, useState } from "react";
import {
  Text,
  Group,
  ActionIcon,
  Button,
  Tooltip,
  Box,
  rem,
  Avatar,
} from "@mantine/core";
import { FaUserShield, FaSignOutAlt } from "react-icons/fa";
import { MdInstallMobile, MdSystemUpdateAlt } from "react-icons/md";
import { IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../app/store";
import { logout } from "../features/auth/sliceAuth";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Version {
  version: string;
  timestamp: number;
  buildDate: string;
}

async function clearSiteData() {
  // Desregistrar todos los Service Workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  // Limpiar todas las caches del Cache API
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }
  // Recargar desde el servidor
  window.location.reload();
}

export default function Footer() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [appVersion, setAppVersion] = useState<Version | null>(null);
  const [clearing, setClearing] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );

  const { name, branding } = organization || {};
  const footerColor =
    branding?.primaryColor || branding?.themeColor || "#1C3461";
  const logoUrl = branding?.logoUrl || "/logo-default.png";
  const textColor = branding?.footerTextColor || "#E2E8F0";

  const {
    updateAvailable,
    applyUpdate,
    checkForUpdates,
    isUpdateSupported,
  } = useServiceWorkerUpdate();

  // Obtener versión de la app
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/version.json?_=' + Date.now());
        const version: Version = await response.json();
        setAppVersion(version);
      } catch (error) {
        console.error('Error fetching version:', error);
      }
    };
    void fetchVersion();
  }, []);

  // Captura del evento PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      dispatch(logout());
      navigate("/");
    } else {
      navigate("/login-admin");
    }
  };

  const handleCheckUpdates = () => {
    void checkForUpdates();
  };

  const handleClearCache = () => {
    if (!confirm("Esto limpiará la caché y recargará la página. ¿Continuar?")) return;
    setClearing(true);
    void clearSiteData();
  };

  return (
    <Box
      component="footer"
      style={{
        background: `linear-gradient(0deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06)), ${footerColor}`,
        color: textColor,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        {/* IZQUIERDA: marca y versión */}
        <Group gap="xs" wrap="nowrap" pl="xs">
          {logoUrl && (
            <Avatar
              src={logoUrl}
              alt={name || "Logo"}
              size={22}
              radius="md"
              styles={{
                root: {
                  background: "#fff",
                  borderRadius: 6,
                },
                image: {
                  objectFit: "contain",
                },
              }}
            />
          )}
          <Box>
            <Text size="xs" fw={600} style={{ color: textColor, lineHeight: 1.2 }}>
              © {name || "Organización"}
            </Text>
            {appVersion && (
              <Text size="9px" opacity={0.7} style={{ color: textColor, lineHeight: 1 }}>
                v{appVersion.buildDate}
              </Text>
            )}
          </Box>
        </Group>

        {/* CENTRO: instalación PWA, actualización o limpiar caché */}
        <Group gap={6} wrap="nowrap">
          {deferredPrompt ? (
            <Button
              onClick={handleInstallClick}
              size="xs"
              leftSection={<MdInstallMobile size={14} />}
              style={{
                backgroundColor: footerColor,
                color: textColor,
                border: `1px solid rgba(255,255,255,0.2)`,
                height: rem(28),
                paddingInline: rem(10),
              }}
            >
              Instalar app
            </Button>
          ) : null}

          {isUpdateSupported ? (
            updateAvailable ? (
              <Button
                onClick={applyUpdate}
                size="xs"
                leftSection={<MdSystemUpdateAlt size={14} />}
                style={{
                  backgroundColor: footerColor,
                  color: textColor,
                  border: `1px solid rgba(255,255,255,0.2)`,
                  height: rem(28),
                  paddingInline: rem(10),
                }}
              >
                Actualizar ahora
              </Button>
            ) : (
              <Tooltip label="Buscar actualizaciones" withArrow>
                <ActionIcon
                  variant="subtle"
                  onClick={handleCheckUpdates}
                  radius="xl"
                  style={{ color: textColor }}
                  aria-label="Buscar actualizaciones"
                >
                  <MdSystemUpdateAlt size={18} />
                </ActionIcon>
              </Tooltip>
            )
          ) : null}

          <Tooltip label="Limpiar caché del sitio" withArrow>
            <ActionIcon
              variant="subtle"
              onClick={handleClearCache}
              loading={clearing}
              radius="xl"
              style={{ color: textColor }}
              aria-label="Limpiar caché"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* DERECHA: acción auth */}
        <Tooltip
          label={isAuthenticated ? "Cerrar sesión" : "Entrar al panel"}
          withArrow
        >
          <ActionIcon
            variant="subtle"
            aria-label={isAuthenticated ? "Cerrar sesión" : "Entrar"}
            onClick={handleAuthAction}
            radius="xl"
            style={{ color: textColor }}
          >
            {isAuthenticated ? (
              <FaSignOutAlt size={18} />
            ) : (
              <FaUserShield size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}
