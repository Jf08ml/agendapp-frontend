// Shell del panel (rediseño): barra lateral con los 5 grupos de AdminNav en
// escritorio, header neutro con campana de notificaciones y menú de usuario, y
// en móvil una barra inferior (Agenda, Clientes, Caja, WhatsApp, Más). Sin el
// footer fijo de 30px de antes.
import { AppShell, Box, Button, Drawer, Group, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconBell, IconRobot } from "@tabler/icons-react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { usePermissions } from "../hooks/usePermissions";
import { useAnnouncementBadge } from "../hooks/useAnnouncementBadge";
import CustomLoader from "../components/customLoader/CustomLoader";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import AdminNavbar, { OrgMark } from "./AdminNavbar";
import { NAV_ICONS } from "./navIcons";
import {
  allNavLinks,
  buildAdminNav,
  buildTabbar,
  buildUserMenuLinks,
  computeNavPermissions,
  findActiveLink,
} from "./adminNavigation";

// Mismo punto de corte que el `md` de Mantine (62em): por debajo, tabbar.
const DESKTOP_QUERY = "(min-width: 62em)";

interface AdminShellProps {
  children: ReactNode;
  /** Banners de sesión de soporte / membresía, encima del contenido. */
  banners?: ReactNode;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function AdminShell({ children, banners, chatOpen, onToggleChat }: AdminShellProps) {
  const location = useLocation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true, { getInitialValueInEffect: false });
  const [moreOpened, { open: openMore, close: closeMore }] = useDisclosure(false);

  const { hasPermission } = usePermissions();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const hasNewUpdates = useAnnouncementBadge();

  const can = useMemo(
    () => computeNavPermissions(hasPermission, organization?.planLimits),
    [hasPermission, organization?.planLimits]
  );
  const groups = useMemo(() => buildAdminNav(can), [can]);
  const userLinks = useMemo(() => buildUserMenuLinks(can, hasNewUpdates), [can, hasNewUpdates]);
  const tabs = useMemo(() => buildTabbar(can), [can]);
  const activeTo = findActiveLink(allNavLinks(groups), location.pathname, location.search);
  const tabActive = (to: string) => activeTo === to;
  const moreActive = !!activeTo && !tabs.some((t) => t.to === activeTo);

  const agentName = organization?.aiAssistantName || "Roxi";

  // Solo bloquea si aún no hay organización: un refetch en segundo plano
  // (loading con organización ya cargada) no debe desmontar el panel.
  if (!organization) return <CustomLoader loadingText="Cargando organización..." />;

  const MoreIcon = NAV_ICONS.more;

  return (
    <AppShell
      layout="alt"
      header={{ height: 60 }}
      navbar={{ width: 264, breakpoint: "md", collapsed: { mobile: true } }}
      footer={{ height: 60, collapsed: isDesktop }}
      styles={{
        main: { background: "var(--surface-muted)" },
        header: { background: "var(--surface)", borderBottom: "1px solid var(--line)" },
        navbar: { background: "var(--surface-raised)", borderRight: "1px solid var(--line)" },
        footer: { background: "var(--surface-raised)", borderTop: "1px solid var(--line)" },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px={{ base: "md", md: "lg" }} justify="space-between" wrap="nowrap" gap="sm">
          {/* Móvil: la marca va en el header (en escritorio está en la barra lateral) */}
          <Group gap="sm" wrap="nowrap" hiddenFrom="md" style={{ minWidth: 0 }}>
            <OrgMark />
            <Text fw={600} fz={15} c="var(--ink)" truncate>
              {organization.name}
            </Text>
          </Group>
          <Box visibleFrom="md" />

          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Button
              variant={chatOpen ? "light" : "default"}
              size="sm"
              leftSection={<IconRobot size={16} />}
              onClick={onToggleChat}
              aria-pressed={chatOpen}
              title="Asistente IA administrador"
            >
              <Text span fz="sm" fw={500} visibleFrom="xs">
                {agentName}
              </Text>
            </Button>
            <NotificationsMenu
              target={
                <Box
                  aria-label="Notificaciones"
                  style={{
                    width: 40,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "var(--radius-md)",
                    color: "var(--ink-muted)",
                  }}
                >
                  <IconBell size={20} stroke={1.75} />
                </Box>
              }
              showBadgeOnTarget
              dropdownWidth={400}
            />
            <UserMenu links={userLinks} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AdminNavbar groups={groups} />
      </AppShell.Navbar>

      <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>
        {banners}
        {children}
      </AppShell.Main>

      <AppShell.Footer hiddenFrom="md">
        <Box
          component="nav"
          aria-label="Panel"
          h="100%"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length + 1}, 1fr)`,
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {tabs.map((tab) => {
            const Icon = NAV_ICONS[tab.icon];
            const active = tabActive(tab.to);
            return (
              <UnstyledButton
                key={tab.key}
                component={Link}
                to={tab.to}
                aria-current={active ? "page" : undefined}
                style={tabStyle(active)}
              >
                <Icon size={22} stroke={1.75} />
                {tab.label}
              </UnstyledButton>
            );
          })}
          <UnstyledButton onClick={openMore} aria-haspopup="dialog" style={tabStyle(moreActive)}>
            <MoreIcon size={22} stroke={1.75} />
            Más
          </UnstyledButton>
        </Box>
      </AppShell.Footer>

      <Drawer
        opened={moreOpened}
        onClose={closeMore}
        position="bottom"
        size="85%"
        title="Menú"
        hiddenFrom="md"
        radius="lg"
        styles={{ body: { height: "calc(100% - 60px)" } }}
      >
        <AdminNavbar groups={groups} onNavigate={closeMore} showBrand={false} />
      </Drawer>
    </AppShell>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    fontSize: 11,
    lineHeight: "14px",
    fontWeight: 500,
    color: active ? "var(--brand-text)" : "var(--ink-muted)",
    textDecoration: "none",
  };
}
