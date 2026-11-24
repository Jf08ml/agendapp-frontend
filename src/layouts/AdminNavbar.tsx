// Barra lateral del panel (rediseño, AdminNav): marca del negocio arriba y cinco
// grupos por tarea. La estructura y los permisos salen de adminNavigation.ts.
import { Anchor, Avatar, Box, Group, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { allNavLinks, findActiveLink, type NavGroup } from "./adminNavigation";
import { NAV_ICONS, orgInitials } from "./navIcons";

/** Logo del negocio (32px) o sus iniciales en un círculo de marca. */
export function OrgMark({ size = 32, onBrand = false }: { size?: number; onBrand?: boolean }) {
  const organization = useSelector((s: RootState) => s.organization.organization);
  const logoUrl = organization?.branding?.logoUrl;
  return (
    <Avatar
      src={logoUrl || undefined}
      alt={organization?.name}
      size={size}
      radius="xl"
      styles={{
        // Sobre la barra de marca las iniciales van invertidas para no desaparecer.
        root: { background: logoUrl ? "transparent" : onBrand ? "var(--on-brand)" : "var(--brand)", flexShrink: 0 },
        placeholder: { color: onBrand ? "var(--brand)" : "var(--on-brand)", fontSize: 12, fontWeight: 600 },
        image: { objectFit: "cover" },
      }}
    >
      {orgInitials(organization?.name)}
    </Avatar>
  );
}

const eyebrow = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ink-subtle)",
};

interface AdminNavbarProps {
  groups: NavGroup[];
  /** Se llama al elegir un enlace (cierra el menú «Más» en móvil). */
  onNavigate?: () => void;
  /** En el menú «Más» del móvil la marca ya está en el header. */
  showBrand?: boolean;
  /** Contadores por clave de ítem (p. ej. reservas por confirmar). */
  badges?: Partial<Record<string, string | null>>;
  /** Barra lateral en el color del negocio (texto en var(--on-brand)). */
  onBrand?: boolean;
}

export default function AdminNavbar({ groups, onNavigate, showBrand = true, badges, onBrand = false }: AdminNavbarProps) {
  const location = useLocation();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const activeTo = useMemo(
    () => findActiveLink(allNavLinks(groups), location.pathname, location.search),
    [groups, location.pathname, location.search]
  );

  return (
    <Stack gap="md" h="100%" style={{ minHeight: 0 }} className={onBrand ? "ag-nav-brand" : undefined}>
      {showBrand && (
        <Group gap="sm" wrap="nowrap" px="xs" style={{ flexShrink: 0 }}>
          <OrgMark onBrand={onBrand} />
          <Text fw={600} fz={15} c={onBrand ? "inherit" : "var(--ink)"} truncate>
            {organization?.name}
          </Text>
        </Group>
      )}

      <ScrollArea type="auto" scrollbars="y" style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
        <Stack gap="md">
          {groups.map((group) => (
            <Box key={group.title} component="nav" aria-label={group.title}>
              <Text style={eyebrow} px="sm" pb={6} className="ag-nav-eyebrow">
                {group.title}
              </Text>
              <Stack gap={2}>
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const icon = <Icon size={20} stroke={1.75} />;
                  const childActive = item.links.some((l) => l.to === activeTo);

                  if (item.links.length === 1) {
                    const link = item.links[0];
                    return (
                      <NavLink
                        key={item.key}
                        component={Link}
                        to={link.to}
                        label={item.label}
                        leftSection={icon}
                        rightSection={
                          badges?.[item.key] ? (
                            <span className="ag-badge ag-badge--warning" style={{ height: 20, padding: "0 7px", fontSize: 11 }} aria-label={`${badges[item.key]} por confirmar`}>
                              {badges[item.key]}
                            </span>
                          ) : undefined
                        }
                        active={childActive}
                        aria-current={childActive ? "page" : undefined}
                        onClick={onNavigate}
                        h={38}
                      />
                    );
                  }

                  return (
                    <NavLink
                      key={`${item.key}-${childActive ? "open" : "closed"}`}
                      label={item.label}
                      leftSection={icon}
                      defaultOpened={childActive}
                      h={38}
                      styles={{ label: { color: childActive ? "var(--ink)" : undefined, fontWeight: childActive ? 600 : 500 } }}
                    >
                      {item.links.map((link) => {
                        const active = link.to === activeTo;
                        return (
                          <NavLink
                            key={link.to}
                            component={Link}
                            to={link.to}
                            label={link.label}
                            active={active}
                            aria-current={active ? "page" : undefined}
                            onClick={onNavigate}
                            h={34}
                          />
                        );
                      })}
                    </NavLink>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      </ScrollArea>

      <Text fz="xs" c="var(--ink-subtle)" px="sm" style={{ flexShrink: 0 }} className="ag-nav-powered">
        Impulsado por{" "}
        <Anchor
          href="https://www.agenditapp.com?utm_source=app-dashboard&utm_medium=referral&utm_campaign=powered-by"
          target="_blank"
          rel="noopener noreferrer"
          fz="xs"
          fw={600}
          c="var(--platform)"
        >
          AgenditApp
        </Anchor>
      </Text>
    </Stack>
  );
}
