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
  welcomeDescription
}: CardsLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: theme.white }}>
      <Container size="md" py={{ base: rem(40), sm: rem(64) }}>
        {/* Hero */}
        <Stack gap="sm" align="center" mb={{ base: "lg", sm: "xl" }} style={{ textAlign: "center" }}>
          <Title
            fw={700}
            fz={{ base: rem(22), sm: rem(28), md: rem(34) }}
            c={theme.colors.gray[9]}
            style={{ letterSpacing: "-0.02em" }}
          >
            {welcomeTitle}
          </Title>

          <Text
            c={theme.colors.gray[6]}
            fz={{ base: "sm", sm: "md" }}
            style={{ lineHeight: 1.6, maxWidth: 460 }}
          >
            {welcomeDescription}
          </Text>
        </Stack>

        {/* Features Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 2 }} spacing={{ base: "md", sm: "lg" }}>
          {features.map((f) => (
            <Card
              key={f.link}
              component={Link}
              to={f.link}
              radius="lg"
              withBorder
              p={{ base: "lg", sm: "xl" }}
              style={{
                transition: "all 200ms ease",
                backgroundColor: theme.white,
                borderColor: theme.colors.gray[2],
              }}
              className="cards-card"
            >
              <Stack align="center" ta="center" gap="sm">
                <Box
                  style={{
                    width: rem(60),
                    height: rem(60),
                    borderRadius: rem(16),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: primary,
                    color: theme.white,
                  }}
                >
                  {f.icon}
                </Box>

                <Title
                  order={3}
                  fw={600}
                  fz={{ base: rem(15), sm: rem(17), md: rem(18) }}
                  c={theme.colors.gray[9]}
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.title}
                </Title>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .cards-card:hover, .cards-card:focus-visible {
              transform: translateY(-4px);
              border-color: ${theme.colors[theme.primaryColor][3]} !important;
              box-shadow: 0 12px 28px rgba(0, 0, 0, 0.07) !important;
            }
            .cards-card:focus-visible { outline: 2px solid ${primary}; outline-offset: 2px; }
          }
        `}
      </style>
    </Box>
  );
}
