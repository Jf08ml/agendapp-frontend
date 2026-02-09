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
} from "@mantine/core";
import { ReactNode } from "react";

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface CardsLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  enableOnlineBooking?: boolean;
}

export function CardsLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  enableOnlineBooking = true,
}: CardsLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${
          theme.colors[theme.primaryColor][0]
        } 0%, ${theme.white} 100%)`,
      }}
    >
      <Container size="md" py="xl">
        {/* Hero Section */}
        <Paper
          withBorder
          radius="xl"
          p={{ base: "md", sm: "xl" }}
          mb={{ base: "lg", sm: "xl" }}
          style={{ backgroundColor: theme.white }}
        >
          <Stack gap="md" align="center">
            <Title
              ta="center"
              fw={800}
              fz={{ base: rem(20), sm: rem(26), md: rem(32) }}
              c={theme.colors[theme.primaryColor][7]}
            >
              {welcomeTitle}
            </Title>

            <Text
              ta="center"
              c={theme.colors.gray[6]}
              fz={{ base: "sm", sm: "md" }}
              style={{ lineHeight: 1.6, maxWidth: 460 }}
            >
              {welcomeDescription}
            </Text>
          </Stack>
        </Paper>

        {/* Features Grid */}
        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 2 }}
          spacing={{ base: "md", sm: "lg" }}
        >
          {features.map((f) => (
            <Card
              key={f.link}
              component={Link}
              to={f.link}
              shadow="md"
              radius="lg"
              withBorder
              p={{ base: "md", sm: "xl" }}
              style={{
                transition: "all 200ms ease",
                backgroundColor: theme.white,
                height: "100%",
              }}
              className="cards-card"
            >
              <Stack align="center" ta="center">
                <Box
                  style={{
                    width: rem(64),
                    height: rem(64),
                    borderRadius: rem(16),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: primary, // color fuerte
                    color: theme.white, // ícono blanco para contraste
                    boxShadow: `0 4px 12px ${primary}30`,
                  }}
                >
                  {f.icon}
                </Box>

                <div>
                  <Title
                    order={3}
                    fw={700}
                    fz={{ base: rem(16), sm: rem(18), md: rem(20) }}
                    mb="xs"
                    c={theme.colors.gray[9]}
                  >
                    {f.title}
                  </Title>
                </div>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .cards-card:hover {
              transform: scale(1.02);
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
            }
            .cards-card:focus-visible {
              transform: scale(1.02);
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
              outline: 2px solid ${primary};
              outline-offset: 2px;
            }
          }
        `}
      </style>
    </Box>
  );
}
