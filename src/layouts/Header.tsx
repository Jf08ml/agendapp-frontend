import {
  Text,
  Box,
  Group,
  Menu,
  SimpleGrid,
  Anchor,
  Skeleton,
  rem,
  Tooltip,
  ActionIcon,
  Button,
} from "@mantine/core";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { IconCalendar } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { Organization } from "../services/organizationService";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

type Props = { organization: Organization | null };

export default function Header({ organization }: Props) {
  const isXS = useMediaQuery("(max-width: 428px)");

  const { isAuthenticated, role } = useSelector((s: RootState) => s.auth);
  const isSuperadmin = role === "superadmin";

  const { name, facebookUrl, instagramUrl, whatsappUrl, tiktokUrl, branding, enableOnlineBooking } =
    organization || {};

  const textColor = branding?.footerTextColor || "white";

  const navLinks = useMemo(
    () => [
      { label: "Nuestros Servicios", to: "/servicios-precios" },
      ...(organization?.showLoyaltyProgram !== false
        ? [{ label: "Plan de fidelidad", to: "/search-client" }]
        : []),
    ],
    [organization?.showLoyaltyProgram]
  );

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

  return (
    <Box component="header" px="xs" w="100%" h="100%">
      <Group justify="space-between" wrap="nowrap" gap="xs" h="100%" align="center">
        {/* Izquierda: nombre de la organización */}
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: "0 1 auto" }}>
          <Anchor
            component={Link}
            to="/"
            underline="never"
            style={{ display: "inline-block", minWidth: 0 }}
          >
            {name ? (
              <Text
                fw={600}
                fz="sm"
                style={{
                  color: textColor,
                  textShadow: "0 1px 2px rgba(0,0,0,.35)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: rem(200),
                }}
              >
                {name}
              </Text>
            ) : (
              <Skeleton width={130} height={18} radius="sm" />
            )}
          </Anchor>
        </Group>

        {/* Centro: nav links (solo desktop ≥ md) */}
        <Group gap={4} visibleFrom="md" style={{ flex: "0 0 auto" }}>
          {navLinks.map((l) => (
            <Anchor
              key={l.to}
              component={Link}
              to={l.to}
              underline="never"
              fz="sm"
              fw={500}
              style={{
                color: textColor,
                opacity: 0.75,
                padding: "6px 12px",
                borderRadius: rem(6),
                transition: "opacity 0.15s ease, background 0.15s ease",
                textShadow: "0 1px 2px rgba(0,0,0,.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.75";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {l.label}
            </Anchor>
          ))}
        </Group>

        {/* Derecha: Reservar + redes */}
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Botón Reservar — solo público y cuando enableOnlineBooking */}
          {!isAuthenticated && !isSuperadmin && enableOnlineBooking && (
            <Button
              component={Link}
              to="/online-reservation"
              size="xs"
              radius="md"
              visibleFrom="sm"
              leftSection={<IconCalendar size={12} />}
              style={{
                backgroundColor: textColor,
                color: branding?.primaryColor || "#1C3461",
                border: "none",
                fontWeight: 600,
                height: rem(30),
                paddingInline: rem(12),
                fontSize: rem(12),
              }}
            >
              Reservar
            </Button>
          )}

          {/* Redes — menú compacto en XS */}
          {isXS && socials.length > 0 ? (
            <Menu shadow="md" width={200} position="bottom-end" withArrow>
              <Menu.Target>
                <Box style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <SimpleGrid cols={2} spacing={3} style={{ width: 28, height: 28 }}>
                    {socials.slice(0, 4).map(({ key, Icon }) => (
                      <Icon key={key} size={13} color={textColor} />
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
            <Group gap={2} visibleFrom="sm" wrap="nowrap">
              {socials.map(({ key, url, Icon, label }) => (
                <Tooltip key={key} label={label} withArrow>
                  <ActionIcon
                    component="a"
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    radius="xl"
                    size="sm"
                    variant="subtle"
                    styles={{ root: { color: textColor, background: "transparent" } }}
                    aria-label={label}
                  >
                    <Icon size={14} />
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          )}
        </Group>
      </Group>
    </Box>
  );
}
