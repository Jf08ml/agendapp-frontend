// src/layouts/Header.tsx
// Header de la web pública (rediseño, LandingNegocio): neutro (--surface) con el
// logo del negocio, los enlaces públicos y un único botón «Reservar». Los
// enlaces son los que antes salían en la sección «Explora» del menú lateral,
// con las mismas condiciones. Sin organización (app.agenditapp.com, superadmin)
// muestra el nombre de la plataforma.
import {
  ActionIcon,
  Anchor,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { IconCalendarEvent, IconLayoutDashboard, IconLogin2 } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/sliceAuth";
import { usePwaActions } from "../hooks/usePwaActions";
import { Organization } from "../services/organizationService";
import { AppDispatch, RootState } from "../app/store";
import { SantaHat } from "../components/seasonal/ChristmasDecorations";
import { orgInitials } from "./navIcons";

type Props = {
  organization: Organization | null;
  /** Gorro navideño sobre el logo (solo páginas de clientes en temporada). */
  showChristmas?: boolean;
  /** Sin organización: pantallas de la plataforma (registro, superadmin). */
  platform?: boolean;
};

type PublicLink = { label: string; to: string; visible: boolean };

function buildPublicLinks(organization: Organization | null): PublicLink[] {
  const limits = organization?.planLimits;
  const onlineBooking = organization?.enableOnlineBooking ?? true;
  const classBooking = organization?.enableClassBooking ?? false;
  return [
    { label: "Servicios", to: "/servicios-precios", visible: true },
    { label: "Clases", to: "/reservar-clase", visible: classBooking },
    {
      label: "Paquetes",
      to: "/comprar-paquete",
      visible:
        limits?.servicePackages !== false &&
        (!!organization?.mpCollect?.connected || (organization?.paymentMethods?.length ?? 0) > 0),
    },
    { label: "Tienda", to: "/tienda", visible: organization?.storeEnabled === true },
    { label: "Mis reservas", to: "/mis-reservas", visible: onlineBooking || classBooking },
    { label: "Plan de fidelidad", to: "/search-client", visible: organization?.showLoyaltyProgram ?? true },
  ].filter((l) => l.visible);
}

export default function Header({ organization, showChristmas = false, platform = false }: Props) {
  const location = useLocation();
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] = useDisclosure(false);
  const { isAuthenticated, role } = useSelector((s: RootState) => s.auth);
  const isSuperadmin = role === "superadmin";
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { canInstall, install, updateAvailable, applyUpdate, clearing, clearCache } = usePwaActions();

  // Antes en el pie fijo: entrar como equipo o cerrar sesión.
  const handleAuthAction = () => {
    closeMenu();
    if (isAuthenticated) {
      dispatch(logout());
      navigate("/");
    } else {
      navigate("/login-admin");
    }
  };

  const { name, facebookUrl, instagramUrl, whatsappUrl, tiktokUrl, branding } = organization || {};
  const enableOnlineBooking = organization?.enableOnlineBooking ?? true;
  const logoUrl = branding?.logoUrl;

  const links = useMemo(() => (platform ? [] : buildPublicLinks(organization)), [organization, platform]);

  const socials = useMemo(
    () =>
      [
        { key: "facebook", url: facebookUrl, Icon: FaFacebook, label: "Facebook" },
        { key: "instagram", url: instagramUrl, Icon: FaInstagram, label: "Instagram" },
        { key: "whatsapp", url: whatsappUrl, Icon: FaWhatsapp, label: "WhatsApp" },
        { key: "tiktok", url: tiktokUrl, Icon: FaTiktok, label: "TikTok" },
      ].filter((s) => !!s.url),
    [facebookUrl, instagramUrl, whatsappUrl, tiktokUrl]
  );

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);
  // Plantilla Academia: el CTA del header es «Reservar clase».
  const academy = organization?.homeLayout === "academy" && !!organization?.enableClassBooking;
  const reserveTo = academy ? "/reservar-clase" : "/online-reservation";
  const showReserve = !platform && (academy || enableOnlineBooking) && location.pathname !== reserveTo;
  const showPanelLink = isAuthenticated && !isSuperadmin && !platform;

  const initials = orgInitials(name);

  const brandMark = platform ? (
    <Text fw={600} fz={15} c="var(--platform)">
      AgenditApp
    </Text>
  ) : (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <SantaHat show={showChristmas}>
        <Avatar
          src={logoUrl || undefined}
          alt={name}
          size={32}
          radius="xl"
          styles={{
            // Header en el color del negocio: las iniciales van invertidas.
            root: { background: logoUrl ? "transparent" : "var(--on-brand)", flexShrink: 0 },
            placeholder: { color: "var(--brand)", fontSize: 12, fontWeight: 600 },
            image: { objectFit: "cover" },
          }}
        >
          {initials}
        </Avatar>
      </SantaHat>
      {name ? (
        <Text fw={600} fz={15} c="inherit" truncate maw={220}>
          {name}
        </Text>
      ) : (
        <Skeleton width={130} height={18} radius="sm" />
      )}
    </Group>
  );

  return (
    <Box
      component="header"
      h="100%"
      px={{ base: "md", md: "xl" }}
      // Web del negocio: header en su color (ag-brandbar). Plataforma: neutro.
      className={platform ? undefined : "ag-brandbar"}
      style={platform ? { background: "var(--surface)", borderBottom: "1px solid var(--line)" } : undefined}
    >
      <Group justify="space-between" wrap="nowrap" gap="md" h="100%">
        {/* c="inherit": el nombre toma el color de la barra (on-brand), no el de los enlaces (brand-text, que sobre la marca casi no se ve). */}
        <Anchor component={Link} to="/" underline="never" c="inherit" style={{ minWidth: 0 }}>
          {brandMark}
        </Anchor>

        <Group gap="lg" wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Enlaces (escritorio ancho) */}
          <Group gap="lg" visibleFrom="lg" wrap="nowrap">
            {links.map((l) => (
              <Anchor
                key={l.to}
                component={Link}
                to={l.to}
                underline="never"
                fz="sm"
                fw={isActive(l.to) ? 600 : 500}
                c="inherit"
                style={{ opacity: isActive(l.to) ? 1 : 0.82 }}
              >
                {l.label}
              </Anchor>
            ))}
          </Group>

          <Group gap="xs" wrap="nowrap">
            {showPanelLink && (
              <Button
                component={Link}
                to="/gestionar-agenda"
                variant="default"
                leftSection={<IconLayoutDashboard size={16} />}
                visibleFrom="sm"
              >
                Ir al panel
              </Button>
            )}
            {showReserve && (
              <Button
                component={Link}
                to={reserveTo}
                leftSection={<IconCalendarEvent size={16} />}
              >
                {academy ? "Reservar clase" : "Reservar"}
              </Button>
            )}

            {/* Menú (cuando los enlaces no caben): enlaces, redes, app y acceso del
                equipo. Reemplaza el pie fijo que tenía la web pública. */}
            <Box hiddenFrom="lg">
              <Burger opened={menuOpened} onClick={toggleMenu} size="sm" aria-label="Abrir menú" />
            </Box>
            {/* Escritorio ancho: los enlaces se ven; queda solo un acceso discreto del equipo */}
            {!platform && !isAuthenticated && (
              <Tooltip label="Acceso para el equipo" withArrow>
                <ActionIcon
                  component={Link}
                  to="/login-admin"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Acceso para el equipo"
                  visibleFrom="lg"
                >
                  <IconLogin2 size={18} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Group>

      <Drawer opened={menuOpened} onClose={closeMenu} position="right" size={300} title={name || "Menú"} hiddenFrom="lg">
        <Stack gap={4}>
          {showPanelLink && (
            <UnstyledButton component={Link} to="/gestionar-agenda" onClick={closeMenu} py="xs" fw={600}>
              Ir al panel
            </UnstyledButton>
          )}
          {links.map((l) => (
            <UnstyledButton
              key={l.to}
              component={Link}
              to={l.to}
              onClick={closeMenu}
              py="xs"
              fw={isActive(l.to) ? 600 : 500}
              c={isActive(l.to) ? "var(--brand-text)" : "var(--ink)"}
            >
              {l.label}
            </UnstyledButton>
          ))}
          {socials.length > 0 && (
            <Group gap="xs" mt="md">
              {socials.map(({ key, url, Icon, label }) => (
                <ActionIcon
                  key={key}
                  component="a"
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="lg"
                  aria-label={label}
                >
                  <Icon size={16} />
                </ActionIcon>
              ))}
            </Group>
          )}

          <Divider my="md" color="var(--line)" />

          {canInstall && (
            <UnstyledButton onClick={() => { closeMenu(); void install(); }} py={6} fz="sm" c="var(--ink-muted)">
              Instalar app
            </UnstyledButton>
          )}
          {updateAvailable && (
            <UnstyledButton onClick={applyUpdate} py={6} fz="sm" c="var(--ink-muted)">
              Actualizar app
            </UnstyledButton>
          )}
          <UnstyledButton onClick={clearCache} disabled={clearing} py={6} fz="sm" c="var(--ink-muted)">
            Limpiar caché del sitio
          </UnstyledButton>
          <UnstyledButton onClick={handleAuthAction} py={6} fz="sm" c="var(--ink-muted)">
            {isAuthenticated ? "Cerrar sesión" : "Acceso para el equipo"}
          </UnstyledButton>

          {organization?.planLimits?.brandingVisible === true && (
            <Text fz="xs" c="var(--ink-subtle)" mt="md">
              Impulsado por{" "}
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
        </Stack>
      </Drawer>
    </Box>
  );
}
            {/* Menú (móvil y escritorio angosto) */}
