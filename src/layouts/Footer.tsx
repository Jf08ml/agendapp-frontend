// src/layouts/Footer.tsx
import { useEffect, useState } from "react";
import {
  Text,
  Group,
  ActionIcon,
  Button,
  Tooltip,
  Box,
  useMantineTheme,
  rem,
  Avatar,
} from "@mantine/core";
import { FaUserShield, FaSignOutAlt } from "react-icons/fa";
import { MdInstallMobile } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../app/store";
import { logout } from "../features/auth/sliceAuth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Footer() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const theme = useMantineTheme();
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
        {/* IZQUIERDA: marca */}
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
          <Text size="xs" fw={600} style={{ color: textColor }}>
            © {name || "Organización"}
          </Text>
        </Group>

        {/* CENTRO: CTA PWA (sólo si hay prompt) */}
        {deferredPrompt ? (
          <Button
            size="xs"
            variant="white"
            leftSection={<MdInstallMobile size={14} />}
            onClick={handleInstallClick}
            styles={{
              root: {
                color: theme.colors.dark[7],
                height: rem(28),
                paddingInline: rem(10),
              },
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
