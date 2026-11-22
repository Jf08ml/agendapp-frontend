// src/layouts/Footer.tsx
// Pie de la web pública (rediseño): neutro (surface + line), sin color de marca.
// El panel no tiene footer: su versión, PWA y cerrar sesión están en el menú de
// usuario (layouts/UserMenu.tsx).
import { Text, Group, ActionIcon, Button, Tooltip, Box, Anchor } from "@mantine/core";
import {
  IconDeviceMobileDown,
  IconDownload,
  IconLogin2,
  IconLogout,
  IconRefresh,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../app/store";
import { logout } from "../features/auth/sliceAuth";
import { usePwaActions } from "../hooks/usePwaActions";

export default function Footer() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const organization = useSelector((s: RootState) => s.organization.organization);

  const name = organization?.name || "AgenditApp";
  const showAgenditBranding = organization?.planLimits?.brandingVisible === true;

  const { canInstall, install, updateAvailable, applyUpdate, clearing, clearCache } = usePwaActions();

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
      h="100%"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--line)",
        color: "var(--ink-muted)",
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs" px="md" h="100%">
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fz="xs" fw={500} c="var(--ink-muted)" truncate>
            © {name}
          </Text>
          {showAgenditBranding && (
            <Text fz="xs" c="var(--ink-subtle)" visibleFrom="sm" style={{ whiteSpace: "nowrap" }}>
              · Impulsado por{" "}
              <Anchor
                href="https://www.agenditapp.com?utm_source=app-public&utm_medium=referral&utm_campaign=powered-by"
                target="_blank"
                rel="noopener noreferrer"
                fz="xs"
                c="var(--platform)"
              >
                AgenditApp
              </Anchor>
            </Text>
          )}
        </Group>

        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {canInstall && (
            <Button size="compact-xs" variant="default" leftSection={<IconDeviceMobileDown size={13} />} onClick={install}>
              Instalar app
            </Button>
          )}
          {updateAvailable && (
            <Button size="compact-xs" variant="default" leftSection={<IconDownload size={13} />} onClick={applyUpdate}>
              Actualizar
            </Button>
          )}
          <Tooltip label="Limpiar caché del sitio" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={clearCache}
              loading={clearing}
              aria-label="Limpiar caché"
            >
              <IconRefresh size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={isAuthenticated ? "Cerrar sesión" : "Acceso para el equipo"} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={isAuthenticated ? "Cerrar sesión" : "Acceso para el equipo"}
              onClick={handleAuthAction}
            >
              {isAuthenticated ? <IconLogout size={15} /> : <IconLogin2 size={15} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );
}
