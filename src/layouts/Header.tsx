import {
  Text,
  Box,
  Group,
  ActionIcon,
  Menu,
  Flex,
  SimpleGrid,
} from "@mantine/core";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useMediaQuery } from "@mantine/hooks";
import NotificationsMenu from "./NotificationsMenu";
import { Organization } from "../services/organizationService";

const Header = ({ organization }: { organization: Organization | null }) => {
  const isVerySmallScreen = useMediaQuery("(max-width: 428px)");
  const [menuOpened] = useState(false);

  // const organization = useSelector(
  //   (state: RootState) => state.organization.organization
  // );
  const auth = useSelector((state: RootState) => state.auth);

  const { name, facebookUrl, instagramUrl, whatsappUrl, tiktokUrl } =
    organization || {};

  return (
    <Box
      component="header"
      px="xs"
      style={{
        width: "100%",
      }}
    >
      <Group justify="space-between" style={{ flexWrap: "wrap" }}>
        <Flex gap="xs">
          <Text
            size="xl"
            fw={900}
            style={{
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Link to="/" style={{ textDecoration: "none", color: "white" }}>
              {name}
            </Link>
          </Text>
          {auth.isAuthenticated && <NotificationsMenu />}
        </Flex>

        <Group
          gap="xl"
          className="menu-links"
          style={{
            display: menuOpened ? "flex" : "none",
            alignItems: "center",
          }}
        >
          <Text c="white" fw={600}>
            <Link
              to="/servicios-precios"
              style={{ textDecoration: "none", color: "white" }}
            >
              Precios y servicios
            </Link>
          </Text>
          <Text c="white" fw={600}>
            <Link to="/" style={{ textDecoration: "none", color: "white" }}>
              Plan de fidelidad
            </Link>
          </Text>
        </Group>

        {/* Redes Sociales */}
        {isVerySmallScreen ? (
          // Mostrar menú en pantallas muy pequeñas
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Box
                style={{
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  padding: "0.5rem",
                  borderRadius: "8px",
                }}
              >
                <SimpleGrid
                  cols={2}
                  spacing={4}
                  style={{ width: 36, height: 36 }}
                >
                  {facebookUrl && <FaFacebook color="#1877f3" size={18} />}
                  {instagramUrl && <FaInstagram color="#e1306c" size={18} />}
                  {whatsappUrl && <FaWhatsapp color="#25D366" size={18} />}
                  {tiktokUrl && <FaTiktok color="#000" size={18} />}
                </SimpleGrid>
              </Box>
            </Menu.Target>
            <Menu.Dropdown>
              {facebookUrl && (
                <Menu.Item
                  leftSection={<FaFacebook />}
                  component="a"
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </Menu.Item>
              )}
              {instagramUrl && (
                <Menu.Item
                  leftSection={<FaInstagram />}
                  component="a"
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </Menu.Item>
              )}
              {whatsappUrl && (
                <Menu.Item
                  leftSection={<FaWhatsapp />}
                  component="a"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </Menu.Item>
              )}
              {tiktokUrl && (
                <Menu.Item
                  leftSection={<FaTiktok />}
                  component="a"
                  href={tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TikTok
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        ) : (
          // Mostrar íconos normalmente en pantallas más grandes
          <Group
            gap="xs"
            className="social-icons"
            style={{
              justifyContent: "center",
            }}
          >
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <ActionIcon radius="xl" size="md" variant="filled" color="blue">
                  <FaFacebook />
                </ActionIcon>
              </a>
            )}
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <ActionIcon radius="xl" size="md" variant="filled" color="pink">
                  <FaInstagram />
                </ActionIcon>
              </a>
            )}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <ActionIcon
                  radius="xl"
                  size="md"
                  variant="filled"
                  color="green"
                >
                  <FaWhatsapp />
                </ActionIcon>
              </a>
            )}
            {tiktokUrl && (
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer">
                <ActionIcon
                  radius="xl"
                  size="md"
                  variant="filled"
                  color="black"
                >
                  <FaTiktok />
                </ActionIcon>
              </a>
            )}
          </Group>
        )}
      </Group>
    </Box>
  );
};

export default Header;
