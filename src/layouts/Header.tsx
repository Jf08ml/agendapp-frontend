/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Text,
  Box,
  Group,
  ActionIcon,
  Menu,
  SimpleGrid,
  Anchor,
  Tooltip,
  Skeleton,
  rem,
  Indicator,
} from "@mantine/core";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp, FaBell } from "react-icons/fa";
import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useMediaQuery } from "@mantine/hooks";
// import NotificationsMenu from "./NotificationsMenu";
import { Organization } from "../services/organizationService";
import { getMembershipNotifications } from "../services/membershipService";

type Props = { organization: Organization | null };

export default function Header({ organization }: Props) {
  const isXS = useMediaQuery("(max-width: 428px)");
  const auth = useSelector((state: RootState) => state.auth);
  const orgState = useSelector((state: RootState) => state.organization);
  const [unreadCount, setUnreadCount] = useState(0);

  const { name, facebookUrl, instagramUrl, whatsappUrl, tiktokUrl } =
    organization || {};

  // Cargar notificaciones de membresía si está autenticado
  useEffect(() => {
    if (auth.isAuthenticated && orgState.organization?._id) {
      loadNotifications();
    }
  }, [auth.isAuthenticated, orgState.organization?._id]);

  const loadNotifications = async () => {
    try {
      if (!orgState.organization?._id) return;
      const notifications = await getMembershipNotifications(orgState.organization._id);
      const unread = notifications.filter((n: any) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading membership notifications:", error);
    }
  };

  // Links del centro (solo desktop). Agrega/edita a tu gusto:
  const navLinks = useMemo(
    () => [
      { label: "Nuestros Servicios", to: "/servicios-precios" },
      ...(organization?.showLoyaltyProgram !== false
        ? [{ label: "Plan de fidelidad", to: "/search-client" }]
        : []),
    ],
    [organization?.showLoyaltyProgram]
  );

  // Redes (se renderizan dinámicamente según existan URLs)
  const socials = useMemo(
    () =>
      [
        {
          key: "facebook",
          url: facebookUrl,
          Icon: FaFacebook,
          label: "Facebook",
        },
        {
          key: "instagram",
          url: instagramUrl,
          Icon: FaInstagram,
          label: "Instagram",
        },
        {
          key: "whatsapp",
          url: whatsappUrl,
          Icon: FaWhatsapp,
          label: "WhatsApp",
        },
        { key: "tiktok", url: tiktokUrl, Icon: FaTiktok, label: "TikTok" },
      ].filter((s) => !!s.url),
    [facebookUrl, instagramUrl, whatsappUrl, tiktokUrl]
  );

  return (
    <Box component="header" px="xs" w="100%">
      <Group justify="space-between" wrap="nowrap" gap="md">
        {/* Izquierda: Branding + notificaciones (si autenticado) */}
        <Group gap="sm" wrap="nowrap">
          <Text
            size="lg"
            fw={900}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.35)" }}
          >
            <Anchor
              component={Link}
              to="/"
              underline="never"
              c="white"
              style={{ display: "inline-block", maxWidth: rem(280) }}
            >
              {/* Truncado elegante del nombre */}
              {name ? (
                <span style={{ color: 'inherit' }}>
                  {name}
                </span>
              ) : (
                <Skeleton width={160} height={20} radius="sm" />
              )}
            </Anchor>
          </Text>

          {/* Notificaciones de membresía */}
          {auth.isAuthenticated && (
            <Tooltip label="Notificaciones de Membresía" withArrow>
              <Indicator
                inline
                label={unreadCount > 0 ? unreadCount : undefined}
                size={16}
                color="red"
                disabled={unreadCount === 0}
              >
                <ActionIcon
                  component={Link}
                  to="/membership-notifications"
                  radius="xl"
                  size="md"
                  variant="subtle"
                  styles={{
                    root: {
                      color: "white",
                      background: "transparent",
                    },
                  }}
                  aria-label="Notificaciones de membresía"
                >
                  <FaBell size={18} />
                </ActionIcon>
              </Indicator>
            </Tooltip>
          )}
        </Group>

        {/* Centro: Links (solo ≥ sm). Oculte en mobile porque ya tienes el Burger en AppShell */}
        <Group gap="lg" visibleFrom="sm">
          {navLinks.map((l) => (
            <Anchor
              key={l.to}
              component={Link}
              to={l.to}
              c="white"
              fw={600}
              underline="never"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,.25)" }}
            >
              {l.label}
            </Anchor>
          ))}
        </Group>

        {/* Derecha: Redes sociales (menu compacto en XS) */}
        {isXS ? (
          <Menu shadow="md" width={200} position="bottom-end" withArrow>
            <Menu.Target>
              <Box>
                <SimpleGrid
                  cols={2}
                  spacing={4}
                  style={{ width: 36, height: 36 }}
                >
                  {socials.slice(0, 4).map(({ key, Icon }) => (
                    <Icon key={key} size={18} color="#fff" />
                  ))}
                </SimpleGrid>
              </Box>
            </Menu.Target>
            <Menu.Dropdown>
              {socials.map(({ key, url, Icon, label }) => (
                <Menu.Item
                  key={key}
                  leftSection={<Icon size={16} />}
                  component="a"
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Group gap="xs" wrap="nowrap">
            {socials.map(({ key, url, Icon, label }) => (
              <Tooltip key={key} label={label} withArrow>
                <ActionIcon
                  component="a"
                  href={url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  radius="xl"
                  size="md"
                  variant="subtle"
                  // Monocromo para verse pro sobre el header de color
                  styles={{
                    root: {
                      color: "white",
                      background: "transparent",
                    },
                  }}
                  aria-label={label}
                >
                  <Icon size={18} />
                </ActionIcon>
              </Tooltip>
            ))}
          </Group>
        )}
      </Group>
    </Box>
  );
}
