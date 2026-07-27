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
  Group,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
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
  enableOnlineBooking?: boolean;
}

export function ModernLayout({
  features,
  welcomeTitle,
  welcomeDescription,
}: ModernLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  return (
    <Box style={{ minHeight: "100vh", backgroundColor: theme.colors.gray[0] }}>
      <Container size="sm" py={{ base: rem(48), sm: rem(72) }}>
        {/* Hero */}
        <Stack gap="sm" align="center" mb={{ base: rem(40), sm: rem(56) }} style={{ textAlign: "center" }}>
          <Title
            fw={700}
            fz={{ base: rem(26), sm: rem(34), md: rem(40) }}
            c={theme.colors.gray[9]}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {welcomeTitle}
          </Title>

          <Text
            c={theme.colors.gray[6]}
            fz={{ base: "sm", sm: "md", md: "lg" }}
            fw={400}
            style={{ lineHeight: 1.6, maxWidth: 480 }}
          >
            {welcomeDescription}
          </Text>
        </Stack>

        {/* Features Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
          {features.map((f) => (
            <Card
              key={f.link}
              component={Link}
              to={f.link}
              withBorder
              radius="lg"
              p="lg"
              style={{
                transition: "all 200ms ease",
                backgroundColor: theme.white,
                borderColor: theme.colors.gray[2],
              }}
              className="feature-card"
            >
              <Group gap="md" align="center" wrap="nowrap">
                <Box
                  style={{
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: rem(52),
                    height: rem(52),
                    backgroundColor: primary,
                    color: theme.white,
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </Box>

                <Text
                  size="lg"
                  fw={600}
                  c={theme.colors.gray[9]}
                  style={{ letterSpacing: "-0.01em", lineHeight: 1.25, flex: 1 }}
                >
                  {f.title}
                </Text>

                <IconArrowRight
                  size={18}
                  className="card-arrow"
                  style={{ color: theme.colors.gray[4], flexShrink: 0, transition: "all 200ms ease" }}
                />
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .feature-card:hover, .feature-card:focus-visible {
              transform: translateY(-3px);
              border-color: ${theme.colors[theme.primaryColor][3]} !important;
              box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06) !important;
            }
            .feature-card:hover .card-arrow, .feature-card:focus-visible .card-arrow {
              transform: translateX(3px);
              color: ${primary};
            }
            .feature-card:focus-visible { outline: 2px solid ${primary}; outline-offset: 2px; }
          }
        `}
      </style>
    </Box>
  );
}
