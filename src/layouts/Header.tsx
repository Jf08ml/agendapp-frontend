import { Text, Box, Group, ActionIcon } from "@mantine/core";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

const Header = () => {
  const [menuOpened] = useState(false);

  const organization = useSelector((state: RootState) => state.organization.organization);
  const { name, facebookUrl, instagramUrl, whatsappUrl, tiktokUrl } = organization || {};

  return (
    <Box
      component="header"
      p="0.5rem 0"
      style={{
        width: "100%",
      }}
    >
      <Group justify="space-between" px="sm" style={{ flexWrap: "wrap" }}>
        <Text
          size="xl"
          fw={900}
          variant="gradient"
          gradient={{ from: "#DE739E", to: "#FFF5F7", deg: 182 }}
        >
          <Link to="/" style={{ textDecoration: "none", color: "white" }}>
            {name}
          </Link>
        </Text>

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

        <Group
          gap="xs"
          className="social-icons"
          style={{
            marginTop: menuOpened ? "1rem" : "0",
            justifyContent: "center",
          }}
        >
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon radius="xl" size="md" variant="light" color="blue">
                <FaFacebook />
              </ActionIcon>
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon radius="xl" size="md" variant="light" color="pink">
                <FaInstagram />
              </ActionIcon>
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon radius="xl" size="md" variant="light" color="green">
                <FaWhatsapp />
              </ActionIcon>
            </a>
          )}
          {tiktokUrl && (
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer">
              <ActionIcon radius="xl" size="md" variant="light" color="teal">
                <FaTiktok />
              </ActionIcon>
            </a>
          )}
        </Group>
      </Group>
    </Box>
  );
};

export default Header;
