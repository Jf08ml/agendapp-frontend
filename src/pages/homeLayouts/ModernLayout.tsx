import { Link } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Card,
  Box,
  SimpleGrid,
  useMantineTheme,
  rem,
  Stack,
  Paper,
  Group,
} from "@mantine/core";
import { ReactNode } from "react";

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface ModernLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
}

export function ModernLayout({
  features,
  welcomeTitle,
  welcomeDescription,
}: ModernLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const primaryLight = theme.colors[theme.primaryColor][0];

  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.gray[0],
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient - lado a lado del viewport */}
      <Box
        style={{
          position: "fixed",
          top: "20%",
          left: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: theme.colors[theme.primaryColor][1],
          filter: "blur(150px)",
          opacity: 0.4,
          zIndex: 0,
        }}
      />
      <Box
        style={{
          position: "fixed",
          top: "20%",
          right: -200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: theme.colors[theme.primaryColor][0],
          filter: "blur(150px)",
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <Container size="sm" py="xl" style={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <Paper
          radius="xl"
          p="sm"
          mb="xl"
          style={{ backgroundColor: "transparent", position: "relative" }}
        >
          <Stack gap="md" style={{ position: "relative", zIndex: 1 }}>
            <Title
              ta="center"
              fw={900}
              // tamaño responsive
              fz={{ base: rem(24), sm: rem(30), md: rem(36) }}
              c={theme.colors[theme.primaryColor][8]}
              style={{
                textShadow: `0 2px 4px ${theme.colors[theme.primaryColor][2]}`,
              }}
            >
              {welcomeTitle}
            </Title>

            <Text
              ta="center"
              c={theme.colors.gray[7]}
              // tamaño responsive
              fz={{ base: "sm", sm: "md", md: "lg" }}
              fw={500}
              style={{ lineHeight: 1.6, margin: "0 auto" }}
            >
              {welcomeDescription}
            </Text>
          </Stack>
        </Paper>

        {/* Features Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg">
          {features.map((f) => (
            <Card
              key={f.link}
              component={Link}
              to={f.link}
              withBorder
              radius="xl"
              p="lg"
              shadow="sm"
              style={{
                transition: "all 200ms ease",
                position: "relative",
                overflow: "hidden",
                backgroundColor: theme.white,
                borderColor: theme.colors.gray[3],
              }}
              className="feature-card"
            >
              <Box
                className="card-overlay"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${primaryLight} 0%, ${theme.white} 100%)`,
                  opacity: 0,
                  transition: "opacity 200ms ease",
                  pointerEvents: "none",
                }}
              />

              {/* CAMBIO: Usamos Group en lugar de Stack y añadimos align="center" */}
              <Group
                gap="md"
                align="center"
                wrap="nowrap"
                style={{ position: "relative", zIndex: 1 }}
              >
                <Box
                  style={{
                    borderRadius: "50%",
                    padding: rem(12), // Reduje un poco el padding si quieres que se vea más compacto
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: rem(64),
                    height: rem(64),
                    backgroundColor: theme.colors[theme.primaryColor][6],
                    boxShadow: `0 4px 16px ${primary}30`,
                    flexShrink: 0, // Evita que el icono se aplaste si el texto es largo
                  }}
                >
                  <Box
                    style={{
                      color: theme.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {f.icon}
                  </Box>
                </Box>

                <Text
                  size="lg"
                  fw={700}
                  c={theme.colors.gray[9]}
                  style={{ letterSpacing: 0.3, lineHeight: 1.2 }}
                >
                  {f.title}
                </Text>
              </Group>
              {/* Fin del Group */}
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .feature-card:hover { transform: translateY(-8px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12) !important; }
            .feature-card:hover .card-overlay { opacity: 1; }
            .feature-card:focus-visible { transform: translateY(-8px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12) !important; outline: 2px solid ${primary}; outline-offset: 2px; }
            .feature-card:active { transform: translateY(-4px); }
          }
        `}
      </style>
    </Box>
  );
}
