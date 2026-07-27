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
  Divider,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
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
  enableOnlineBooking?: boolean;
}

export function MinimalLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId
}: MinimalLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];

  const showStoreButton = organizationId === "6730cbcdee1f12ea45bfc6bb";

  return (
    <Box>
      <Container size="sm" py={{ base: 48, sm: 80 }}>
        {/* Hero Section */}
        <Stack gap="lg" mb={{ base: 40, sm: 60 }} align="center" style={{ textAlign: "center" }}>
          <Title
            fw={700}
            c={theme.colors.gray[9]}
            fz={{ base: rem(24), sm: rem(30), md: rem(36), lg: rem(40) }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {welcomeTitle}
          </Title>

          <Text
            c={theme.colors.gray[6]}
            fz={{ base: "sm", sm: "md", md: "lg" }}
            fw={400}
            style={{
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {welcomeDescription}
          </Text>

          <Divider w={40} size="sm" color={theme.colors.gray[3]} />
        </Stack>

        {/* Features List */}
        <Stack gap="sm">
          {features.map((f) => (
            <Paper
              key={f.link}
              component={Link}
              to={f.link}
              withBorder
              radius="md"
              p={{ base: "md", sm: "lg" }}
              style={{
                transition: "all 180ms ease",
                borderColor: theme.colors.gray[2],
                cursor: "pointer",
              }}
              className="minimal-card"
            >
              <Group gap="md" align="center" wrap="nowrap">
                <Box
                  style={{
                    width: rem(44),
                    height: rem(44),
                    borderRadius: rem(10),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: primary,
                    background: `${primary}12`,
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </Box>
                <Text
                  fw={500}
                  c={theme.colors.gray[9]}
                  fz={{ base: "sm", sm: "md", md: "lg" }}
                  style={{ flex: 1, letterSpacing: "-0.005em" }}
                >
                  {f.title}
                </Text>
                <IconArrowRight
                  size={18}
                  className="minimal-arrow"
                  style={{ color: theme.colors.gray[4], flexShrink: 0, transition: "all 180ms ease" }}
                />
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
            .minimal-card:hover, .minimal-card:focus-visible {
              border-color: ${primary} !important;
              background-color: ${theme.colors.gray[0]};
              transform: translateX(4px);
              box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            }
            .minimal-card:hover .minimal-arrow, .minimal-card:focus-visible .minimal-arrow {
              transform: translateX(3px);
              color: ${primary};
            }
            .minimal-card:focus-visible {
              outline: 2px solid ${primary};
              outline-offset: 2px;
            }
          }
        `}
      </style>
    </Box>
  );
}
