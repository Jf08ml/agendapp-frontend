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
import { MdInstallMobile, MdSystemUpdateAlt } from "react-icons/md";
import { IconRefresh, IconRobot } from "@tabler/icons-react";
import { FaSignOutAlt, FaUserShield } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../app/store";
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
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }
  window.location.reload();
}

interface FooterProps {
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export default function Footer({ chatOpen = false, onToggleChat }: FooterProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [appVersion, setAppVersion] = useState<Version | null>(null);
  const [clearing, setClearing] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const organization = useSelector((s: RootState) => s.organization.organization);

  const { name, branding } = organization || {};
  const planLimits = (organization as any)?.planLimits;
  const agentName = organization?.aiAssistantName || "Roxi";
  const showAgenditBranding = planLimits?.brandingVisible === true;
  const footerColor = branding?.primaryColor || branding?.themeColor || "#1C3461";
  const logoUrl = branding?.logoUrl || "/logo-default.png";
  const textColor = branding?.footerTextColor || "#E2E8F0";

  const { updateAvailable, applyUpdate } =
    useServiceWorkerUpdate();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch("/version.json?_=" + Date.now());
        const version: Version = await response.json();
        setAppVersion(version);
      } catch {
        // silencioso
      }
    };
    void fetchVersion();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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

  const handleClearCache = () => {
    if (!confirm("Esto limpiará la caché y recargará la página. ¿Continuar?")) return;
    setClearing(true);
    void clearSiteData();
  };

  return (
    <Box
      component="footer"
      style={{
        height: "100%",
        background: `linear-gradient(0deg, rgba(0,0,0,0.08), rgba(0,0,0,0.08)), ${footerColor}`,
        color: textColor,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
      }}
    >
      <Group
        justify="space-between"
        align="center"
        wrap="nowrap"
        gap="xs"
        px="sm"
        style={{ height: "100%" }}
      >
        {/* IZQUIERDA: logo + nombre + copyright + links legales */}
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 auto" }}>
          <Avatar
            src={logoUrl}
            alt={name || "Logo"}
            size={22}
            radius="md"
            styles={{
              root: { background: "#fff", borderRadius: 6, flexShrink: 0 },
              image: { objectFit: "contain" },
            }}
          />
          <Text
            fz="xs"
            fw={600}
            style={{ color: textColor, lineHeight: 1, whiteSpace: "nowrap" }}
          >
            © {name || "Organización"}
          </Text>

          {appVersion && (
            <Text
              fz={rem(9)}
              style={{ color: textColor, opacity: 0.55, lineHeight: 1, whiteSpace: "nowrap" }}
              visibleFrom="sm"
            >
              v{appVersion.buildDate}
            </Text>
          )}

          {showAgenditBranding && (
            <Text
              fz={rem(9)}
              style={{ color: textColor, opacity: 0.6, lineHeight: 1, whiteSpace: "nowrap" }}
              visibleFrom="sm"
            >
              · Creado con AgenditApp
            </Text>
          )}
        </Group>

        {/* CENTRO: agente IA + botones PWA */}
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Botón del agente IA admin — solo cuando está autenticado */}
          {isAuthenticated && onToggleChat && (
            <Tooltip label="Asistente IA administrador" withArrow>
              <Button
                onClick={onToggleChat}
                size="compact-xs"
                leftSection={<IconRobot size={12} />}
                style={{
                  background: chatOpen ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                  color: chatOpen ? footerColor : textColor,
                  border: `1px solid ${chatOpen ? "transparent" : "rgba(255,255,255,0.25)"}`,
                  height: rem(22),
                  paddingInline: rem(8),
                  fontSize: rem(11),
                  fontWeight: 600,
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {agentName}
              </Button>
            </Tooltip>
          )}

          {deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              size="xs"
              leftSection={<MdInstallMobile size={13} />}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                color: textColor,
                border: `1px solid rgba(255,255,255,0.2)`,
                height: rem(28),
                paddingInline: rem(10),
              }}
            >
              Instalar app
            </Button>
          )}

          {updateAvailable && (
            <Button
              onClick={applyUpdate}
              size="xs"
              leftSection={<MdSystemUpdateAlt size={13} />}
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                color: textColor,
                border: `1px solid rgba(255,255,255,0.2)`,
                height: rem(28),
                paddingInline: rem(10),
              }}
            >
              Actualizar
            </Button>
          )}

          <Tooltip label="Limpiar caché del sitio" withArrow>
            <ActionIcon
              variant="subtle"
              onClick={handleClearCache}
              loading={clearing}
              radius="xl"
              style={{ color: textColor }}
              aria-label="Limpiar caché"
            >
              <IconRefresh size={17} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* DERECHA: auth */}
        <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>

          {/* Auth button */}
          <Tooltip
            label={isAuthenticated ? "Cerrar sesión" : "Acceso staff"}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              aria-label={isAuthenticated ? "Cerrar sesión" : "Acceso staff"}
              onClick={handleAuthAction}
              radius="xl"
              style={{ color: textColor }}
            >
              {isAuthenticated ? (
                <FaSignOutAlt size={15} />
              ) : (
                <FaUserShield size={15} />
              )}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );
}
