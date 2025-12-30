import { Link } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Paper,
  Box,
  Stack,
  useMantineTheme,
  rem,
  Group,
  Button,
} from "@mantine/core";
import { ReactNode } from "react";

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface MinimalLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
}

export function MinimalLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
}: MinimalLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  const showStoreButton = organizationId === "6730cbcdee1f12ea45bfc6bb";

  return (
    <Box>
      <Container size="sm" py={{ base: 48, sm: 80 }}>
        {/* Hero Section */}
        <Stack gap="md" mb={{ base: 40, sm: 60 }}>
          <Title
            ta="center"
            fw={900}
            c={theme.colors.gray[9]}
            fz={{ base: rem(24), sm: rem(30), md: rem(36), lg: rem(42) }}
          >
            {welcomeTitle}
          </Title>

          <Text
            ta="center"
            c={theme.colors.gray[6]}
            fz={{ base: "sm", sm: "md", md: "lg" }}
            style={{
              lineHeight: 1.7,
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            {welcomeDescription}
          </Text>
        </Stack>

        {/* Features List */}
        <Stack gap="md">
          {features.map((f) => (
            <Paper
              key={f.link}
              component={Link}
              to={f.link}
              withBorder
              radius="lg"
              p={{ base: "md", sm: "lg", md: "xl" }}
              style={{
                transition: "all 150ms ease",
                borderColor: theme.colors.gray[2],
                cursor: "pointer",
                boxShadow: `0 0 2px ${theme.colors[theme.primaryColor][6]}`,
              }}
              className="minimal-card"
            >
              <Group gap="md" align="center" wrap="nowrap">
                <Box
                  style={{
                    width: rem(40),
                    height: rem(40),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: primary,
                  }}
                >
                  {f.icon}
                </Box>
                <Text
                  fw={600}
                  c={theme.colors.gray[9]}
                  fz={{ base: "sm", sm: "md", md: "lg" }}
                >
                  {f.title}
                </Text>
              </Group>
            </Paper>
          ))}
        </Stack>

        {showStoreButton && (
          <Group justify="center" mt="xl">
            <Button
              component="a"
              href="https://store.galaxiaglamour.com/catalogo"
              target="_blank"
              radius="xl"
              size="md"
              variant="gradient"
              gradient={{
                from: theme.colors[theme.primaryColor][6],
                to: theme.colors[theme.primaryColor][4],
                deg: 45,
              }}
              style={{ fontWeight: 600 }}
            >
              🛍️ Tienda de insumos de pestañas
            </Button>
          </Group>
        )}
      </Container>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .minimal-card:hover {
              border-color: ${primary} !important;
              transform: translateX(6px);
            }
            .minimal-card:focus-visible {
              border-color: ${primary} !important;
              transform: translateX(6px);
              outline: 2px solid ${primary};
              outline-offset: 2px;
            }
          }
        `}
      </style>
    </Box>
  );
}
