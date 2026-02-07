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
  Progress,
} from "@mantine/core";
import { FaUserShield, FaSignOutAlt } from "react-icons/fa";
import { MdInstallMobile } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../app/store";
import { logout } from "../features/auth/sliceAuth";
import useTokenExpiry from "../hooks/useTokenExpiry";
import { formatTimeRemaining } from "../utils/sessionNotifications";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Version {
  version: string;
  timestamp: number;
  buildDate: string;
}

export default function Footer() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [appVersion, setAppVersion] = useState<Version | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );

  const { name, branding } = organization || {};
  const footerColor =
    branding?.primaryColor || branding?.themeColor || "#DE739E";
  const logoUrl = branding?.logoUrl || "/logo-default.png";
  const textColor = branding?.footerTextColor || "#E2E8F0";

  // Estado del token
  const tokenExpiry = useTokenExpiry();

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
    await deferredPrompt.userChoice; // opcional: puedes revisar outcome aquí
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

  // Calcular porcentaje de progreso del token
  const calculateTokenProgress = () => {
    if (!tokenExpiry.timeRemaining) return 100;
    const totalTime = 7 * 24 * 60 * 60 * 1000; // 7 días
    const progress = (tokenExpiry.timeRemaining / totalTime) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  // Determinar color de la barra de progreso
  const getProgressColor = () => {
    const progress = calculateTokenProgress();
    if (progress > 50) return "green";
    if (progress > 20) return "yellow";
    return "red";
  };

  return (
    <Box
      component="footer"
      // Fondo sólido con un leve overlay para profundidad
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

        {/* CENTRO: Info de sesión o CTA PWA */}
        {isAuthenticated && tokenExpiry.timeRemaining ? (
          <Tooltip
            label={`Sesión vence en ${formatTimeRemaining(tokenExpiry.timeRemaining)}`}
            withArrow
          >
            <Box style={{ flex: 1, maxWidth: 150 }}>
              <Text size="7px" opacity={0.8} style={{ color: textColor, marginBottom: 3 }}>
                SESIÓN ACTIVA
              </Text>
              <Progress
                value={calculateTokenProgress()}
                size={6}
                color={getProgressColor()}
                radius="xs"
              />
            </Box>
          </Tooltip>
        ) : deferredPrompt ? (
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
        ) : (
          <span /> // Mantiene el layout en 3 columnas aunque no haya CTA
        )}

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
