// Shell del superadmin (rediseño, paginas-superadmin.md): pantalla de
// plataforma (brand = platform). Navegación lateral con 6 secciones en dos
// grupos y, en la barra superior, el nombre de la sección con sus pestañas
// (cada pestaña es la ruta de siempre). En móvil la navegación abre en un panel.
import { AppShell, Box, Burger, Drawer, NavLink, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconChartBar,
  IconLogout,
  IconRobot,
  IconSpeakerphone,
  IconTag,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../features/auth/sliceAuth";
import { SUPERADMIN_NAV, findSuperadminLocation, type SaSection } from "./superadminNavigation";

const ICONS: Record<SaSection["key"], typeof IconChartBar> = {
  negocios: IconBuildingStore,
  ventas: IconTag,
  metricas: IconChartBar,
  novedades: IconSpeakerphone,
  whatsapp: IconBrandWhatsapp,
  chatbots: IconRobot,
};

const eyebrow = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ink-subtle)",
};

// La plataforma usa su propio azul como marca, nunca el de un negocio.
const PLATFORM_VARS = {
  "--brand": "var(--platform)",
  "--brand-text": "var(--platform)",
  "--mantine-primary-color-filled": "var(--platform)",
} as React.CSSProperties;

function SuperadminNavbar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const current = findSuperadminLocation(location.pathname);

  return (
    <Stack gap="md" h="100%" style={{ minHeight: 0 }}>
      <div style={{ padding: "0 10px", flexShrink: 0 }}>
        <div style={eyebrow}>Plataforma</div>
        <div style={{ font: "600 17px/24px var(--mantine-font-family)", color: "var(--platform)" }}>AgenditApp</div>
      </div>

      <ScrollArea type="auto" scrollbars="y" style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
        <Stack gap="md">
          {SUPERADMIN_NAV.map((group) => (
            <Box key={group.title} component="nav" aria-label={group.title}>
              <Text style={eyebrow} px="sm" pb={6}>
                {group.title}
              </Text>
              <Stack gap={2}>
                {group.sections.map((section) => {
                  const Icon = ICONS[section.key];
                  const active = current?.section.key === section.key;
                  return (
                    <NavLink
                      key={section.key}
                      component={Link}
                      to={section.to}
                      label={section.label}
                      leftSection={<Icon size={20} stroke={1.75} />}
                      active={active}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      h={38}
                    />
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      </ScrollArea>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, flexShrink: 0 }}>
        <div className="ag-subtle" style={{ padding: "0 10px 6px" }}>Sesión de superadmin</div>
        <UnstyledButton
          onClick={() => {
            dispatch(logout());
            navigate("/superadmin-login");
          }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: "var(--radius-md)", color: "var(--ink-muted)", fontSize: 14 }}
        >
          <IconLogout size={18} stroke={1.75} /> Cerrar sesión
        </UnstyledButton>
      </div>
    </Stack>
  );
}

export default function SuperadminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [navOpened, { toggle, close }] = useDisclosure(false);
  const current = findSuperadminLocation(location.pathname);
  const showTabs = !!current && current.section.tabs.length > 1;

  return (
    <div style={PLATFORM_VARS}>
      <AppShell
        layout="alt"
        header={{ height: 60 }}
        navbar={{ width: 240, breakpoint: "md", collapsed: { mobile: true } }}
        styles={{
          main: { background: "var(--surface-muted)" },
          header: { background: "var(--surface)", borderBottom: "1px solid var(--line)" },
          navbar: { background: "var(--surface-raised)", borderRight: "1px solid var(--line)" },
        }}
      >
        <AppShell.Header>
          <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 20, padding: "0 20px", minWidth: 0 }}>
            <Burger opened={navOpened} onClick={toggle} hiddenFrom="md" size="sm" aria-label="Abrir navegación" />
            <b style={{ fontSize: 16, flex: "none" }}>{current?.section.label ?? "Superadmin"}</b>
            {showTabs && (
              <nav className="ag-subtabs sa-toptabs" aria-label={`Pestañas de ${current!.section.label}`}>
                {current!.section.tabs.map((t) => (
                  <Link key={t.to} to={t.to} aria-current={current!.tab === t.to ? "page" : undefined}>
                    {t.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <style>{`
            .sa-toptabs { border-bottom: 0; align-self: stretch; align-items: stretch; min-width: 0; }
            .sa-toptabs a { padding: 0; margin: 0; border-bottom-width: 2px; height: 100%; }
          `}</style>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <SuperadminNavbar />
        </AppShell.Navbar>

        <AppShell.Main style={{ minHeight: "100vh" }}>{children}</AppShell.Main>

        <Drawer opened={navOpened} onClose={close} position="left" size={280} hiddenFrom="md" title=" " styles={{ body: { height: "calc(100% - 60px)" } }}>
          <SuperadminNavbar onNavigate={close} />
        </Drawer>
      </AppShell>
    </div>
  );
}
