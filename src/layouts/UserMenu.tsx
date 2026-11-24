// Menú de usuario del panel (rediseño): lo que no es una tarea diaria.
// «Ver mi web», «Mi plan», Novedades e Historial (antes en el menú lateral) y
// lo que antes estaba en el footer: instalar/actualizar la app, limpiar caché,
// versión y cerrar sesión.
import { Avatar, Box, Indicator, Menu, Text, UnstyledButton } from "@mantine/core";
import {
  IconBell,
  IconCrown,
  IconDeviceMobileDown,
  IconDownload,
  IconExternalLink,
  IconLogout,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../app/store";
import { logout } from "../features/auth/sliceAuth";
import { usePwaActions } from "../hooks/usePwaActions";
import type { NavLeaf } from "./adminNavigation";

const LINK_ICONS: Record<string, typeof IconBell> = {
  "/my-membership": IconCrown,
  "/novedades": IconBell,
  "/historial-eliminaciones": IconShieldCheck,
};

const dot = (
  <Box
    component="span"
    aria-label="Hay novedades"
    style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", display: "inline-block" }}
  />
);

export default function UserMenu({ links }: { links: NavLeaf[] }) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const role = useSelector((s: RootState) => s.auth.role);
  const { canInstall, install, updateAvailable, applyUpdate, appVersion, clearCache } = usePwaActions();

  const hasDot = links.some((l) => l.dot);
  const initial = (organization?.name || role || "?").trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <Menu position="bottom-end" width={260} shadow="lg" withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label="Menú de usuario" style={{ lineHeight: 0 }}>
          <Indicator disabled={!hasDot} color="red" size={8} offset={3} withBorder>
            <Avatar size={32} radius="xl" styles={{ root: { background: "var(--surface-hover)" }, placeholder: { color: "var(--ink-muted)", fontSize: 12, fontWeight: 600 } }}>
              {initial}
            </Avatar>
          </Indicator>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {organization?.name && (
          <Menu.Label>
            <Text fz="sm" fw={600} c="var(--ink)" truncate>
              {organization.name}
            </Text>
          </Menu.Label>
        )}
        <Menu.Item component={Link} to="/" leftSection={<IconExternalLink size={16} />}>
          Ver mi web
        </Menu.Item>
        {links.map((l) => {
          const Icon = LINK_ICONS[l.to] ?? IconBell;
          return (
            <Menu.Item
              key={l.to}
              component={Link}
              to={l.to}
              leftSection={<Icon size={16} />}
              rightSection={l.dot ? dot : undefined}
            >
              {l.label}
            </Menu.Item>
          );
        })}

        <Menu.Divider />
        {canInstall && (
          <Menu.Item leftSection={<IconDeviceMobileDown size={16} />} onClick={install}>
            Instalar app
          </Menu.Item>
        )}
        {updateAvailable && (
          <Menu.Item leftSection={<IconDownload size={16} />} onClick={applyUpdate}>
            Actualizar app
          </Menu.Item>
        )}
        <Menu.Item leftSection={<IconRefresh size={16} />} onClick={clearCache}>
          Limpiar caché del sitio
        </Menu.Item>
        <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={handleLogout}>
          Cerrar sesión
        </Menu.Item>

        {appVersion && (
          <Menu.Label>
            <Text fz="xs" c="var(--ink-subtle)">
              Versión {appVersion.buildDate}
            </Text>
          </Menu.Label>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
