import { Link } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Box,
  SimpleGrid,
  useMantineTheme,
  rem,
  Center,
  Anchor,
} from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { BiCalendar } from "react-icons/bi";
import { FaIdeal } from "react-icons/fa";
import { GiPriceTag } from "react-icons/gi";
import { GrLocation } from "react-icons/gr";

function FeatureCard({
  to,
  title,
  icon,
}: {
  to: string;
  title: string;
  icon: React.ReactNode;
}) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  return (
    <Card
      component={Link}
      to={to}
      withBorder
      radius="xl"
      p="md"
      aria-label={title}
      tabIndex={0}
      shadow="sm"
      style={{
        transition:
          "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = theme.shadows.md)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = theme.shadows.sm)}
      // Accesibilidad teclado
      onFocus={(e) => (e.currentTarget.style.boxShadow = theme.shadows.md)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = theme.shadows.sm)}
      // Reduce motion: evita scale si el usuario lo pide
      className="feature-card"
    >
      <Group align="center" gap="md" wrap="nowrap">
        <Box
          aria-hidden
          style={{
            borderRadius: 999,
            padding: rem(12),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: rem(56),
            minHeight: rem(56),
          }}
        >
          {icon}
        </Box>

        <Text size="lg" fw={700} c={primary} style={{ letterSpacing: 0.2 }}>
          {title}
        </Text>
      </Group>
    </Card>
  );
}

export default function Home() {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const allFeatures = [
    {
      title: "Reserva en línea",
      icon: <BiCalendar size={28} color={primary} />,
      link: "/online-reservation",
    },
    {
      title: "Nuestros Servicios",
      icon: <GiPriceTag size={28} color={primary} />,
      link: "/servicios-precios",
    },
    {
      title: "Plan de fidelidad",
      icon: <FaIdeal size={28} color={primary} />,
      link: "/search-client",
      show: organization?.showLoyaltyProgram ?? true,
    },
    {
      title: "Ubicación",
      icon: <GrLocation size={28} color={primary} />,
      link: "/location",
    },
  ];

  const features = allFeatures.filter((f) => f.show !== false);

  return (
    <Container size="sm" py="xl">
      <Title ta="center" fw={900} mb="xs" c={primary}>
        {organization?.welcomeTitle || "¡Hola! Bienvenido"}
      </Title>
      <Text ta="center" c="dimmed" mb="lg">
        {organization?.welcomeDescription ||
          "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨"}
      </Text>

      <SimpleGrid
        cols={{ base: 1, sm: 2 }}
        spacing="md"
        // un poco más de espacio en vertical en mobile
        verticalSpacing="lg"
      >
        {features.map((f) => (
          <FeatureCard key={f.link} to={f.link} title={f.title} icon={f.icon} />
        ))}
      </SimpleGrid>

      <Box mt={50} mb="xl">
        <Center>
          <Anchor
            href="https://www.agenditapp.com?utm_source=app-dashboard&utm_medium=referral&utm_campaign=powered-by"
            target="_blank"
            c="dimmed" 
            size="xs" 
            underline="hover" 
          >
            Plataforma impulsada por{" "}
            <Text
              span
              fw={800} 
              c={primary} 
            >
              AgenditApp
            </Text>
          </Anchor>
        </Center>
      </Box>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .feature-card:hover { transform: translateY(-2px) scale(1.01); }
            .feature-card:focus-visible { transform: translateY(-2px) scale(1.01); outline: none; }
          }
        `}
      </style>
    </Container>
  );
}
