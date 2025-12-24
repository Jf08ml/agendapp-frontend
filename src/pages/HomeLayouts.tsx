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
  Button,
  Badge,
  Divider,
  Grid,
} from "@mantine/core";
import { ReactNode, useEffect, useState } from "react";
import { getServicesByOrganizationId, Service } from "../services/serviceService";
import { formatCurrency } from "../utils/formatCurrency";

// ============= SHARED TYPES =============
interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface HomeLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
}

// ============= MODERN LAYOUT (Actual) =============
export function ModernLayout({
  features,
  welcomeTitle,
  welcomeDescription,
}: HomeLayoutProps) {
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

// ============= MINIMAL LAYOUT =============
export function MinimalLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
}: HomeLayoutProps) {
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

// ============= CARDS LAYOUT =============
export function CardsLayout({
  features,
  welcomeTitle,
  welcomeDescription,
}: HomeLayoutProps) {
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

// ============= LANDING LAYOUT (Nuevo - Tipo Landing Completo) =============
export function LandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
}: HomeLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopServices = async () => {
      if (!organizationId) return;
      
      try {
        const allServices = await getServicesByOrganizationId(organizationId);
        // Obtener solo los primeros 6 servicios activos, ordenados por precio descendente
        const topServices = allServices
          .filter((s) => s.isActive !== false)
          .sort((a, b) => b.price - a.price)
          .slice(0, 6);
        setServices(topServices);
      } catch (error) {
        console.error("Error cargando servicios:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTopServices();
  }, [organizationId]);

  return (
    <Box
      style={{
        minHeight: "100vh",
        backgroundColor: theme.white,
      }}
    >
      {/* Hero Section */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${theme.colors[theme.primaryColor][6]} 0%, ${theme.colors[theme.primaryColor][8]} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            filter: "blur(100px)",
          }}
        />
        
        <Container size="lg" py={{ base: 60, sm: 80, md: 100 }}>
          <Stack gap="xl" align="center" style={{ position: "relative", zIndex: 1 }}>
            <Title
              ta="center"
              fw={900}
              c="white"
              fz={{ base: rem(32), sm: rem(42), md: rem(52) }}
              style={{
                textShadow: "0 2px 20px rgba(0, 0, 0, 0.2)",
                lineHeight: 1.2,
              }}
            >
              {welcomeTitle}
            </Title>

            <Text
              ta="center"
              c="white"
              fz={{ base: "md", sm: "lg", md: "xl" }}
              fw={500}
              maw={700}
              style={{
                lineHeight: 1.6,
                textShadow: "0 1px 10px rgba(0, 0, 0, 0.1)",
                opacity: 0.95,
              }}
            >
              {welcomeDescription}
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Servicios Destacados */}
      <Container size="lg" py={{ base: 60, sm: 80 }}>
        <Stack gap="xl">
          <div>
            <Title
              ta="center"
              fw={800}
              c={theme.colors.gray[9]}
              fz={{ base: rem(28), sm: rem(36) }}
              mb="xs"
            >
              Nuestros Servicios
            </Title>
            <Text
              ta="center"
              c={theme.colors.gray[6]}
              fz={{ base: "md", sm: "lg" }}
              maw={600}
              mx="auto"
            >
              Descubre lo que tenemos para ti
            </Text>
          </div>

          {loading ? (
            <Text ta="center" c="dimmed">Cargando servicios...</Text>
          ) : services.length > 0 ? (
            <Grid>
              {services.map((service) => (
                <Grid.Col key={service._id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    shadow="sm"
                    padding={0}
                    radius="md"
                    withBorder
                    style={{
                      height: "100%",
                      transition: "all 200ms ease",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                    className="service-card"
                  >
                    <Stack gap={0} h="100%">
                      {/* Imagen del servicio */}
                      {service.images && service.images.length > 0 ? (
                        <Box
                          style={{
                            width: "100%",
                            height: "300px",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={service.images[0]}
                            alt={service.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <Badge
                            color={theme.primaryColor}
                            variant="filled"
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                            }}
                          >
                            {service.type}
                          </Badge>
                        </Box>
                      ) : (
                        <Box
                          style={{
                            width: "100%",
                            height: 200,
                            background: `linear-gradient(135deg, ${theme.colors[theme.primaryColor][1]} 0%, ${theme.colors[theme.primaryColor][3]} 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                          }}
                        >
                          <Text size="xl" fw={700} c={theme.colors[theme.primaryColor][6]}>
                            {service.name.charAt(0).toUpperCase()}
                          </Text>
                          <Badge
                            color={theme.primaryColor}
                            variant="filled"
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                            }}
                          >
                            {service.type}
                          </Badge>
                        </Box>
                      )}

                      {/* Contenido de la tarjeta */}
                      <Stack gap="md" p="lg" style={{ flex: 1 }}>
                        <div style={{ flex: 1 }}>
                          <Text fw={700} fz="lg" c={theme.colors.gray[9]} lineClamp={2} mb="xs">
                            {service.name}
                          </Text>
                          
                          {service.description && (
                            <Text size="sm" c="dimmed" lineClamp={3} mb="xs">
                              {service.description}
                            </Text>
                          )}
                        </div>

                        <Divider />

                        <Group justify="space-between" align="center">
                          <div>
                            {!service.hidePrice && (
                              <Text fw={700} fz="xl" c={primary}>
                                {formatCurrency(service.price)}
                              </Text>
                            )}
                            <Text size="xs" c="dimmed">
                              {service.duration} min
                            </Text>
                          </div>
                          <Button
                            component={Link}
                            to="/online-reservation"
                            size="sm"
                            variant="light"
                            color={theme.primaryColor}
                          >
                            Reservar
                          </Button>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Text ta="center" c="dimmed">No hay servicios disponibles</Text>
          )}

          <Group justify="center" mt="lg">
            <Button
              component={Link}
              to="/servicios-precios"
              size="lg"
              variant="outline"
              color={theme.primaryColor}
              radius="xl"
            >
              Ver Todos los Servicios
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* Acciones Rápidas */}
      <Box bg={theme.colors.gray[0]} py={{ base: 60, sm: 80 }}>
        <Container size="lg">
          <Stack gap="xl">
            <Title
              ta="center"
              fw={800}
              c={theme.colors.gray[9]}
              fz={{ base: rem(28), sm: rem(36) }}
            >
              ¿Qué deseas hacer?
            </Title>

            <SimpleGrid cols={{ base: 1, sm: 2, md: features.length >= 3 ? 3 : 2 }} spacing="lg">
              {features.map((f) => (
                <Card
                  key={f.link}
                  component={Link}
                  to={f.link}
                  withBorder
                  radius="lg"
                  p="xl"
                  shadow="sm"
                  style={{
                    transition: "all 200ms ease",
                    backgroundColor: theme.white,
                    borderColor: theme.colors.gray[3],
                  }}
                  className="action-card"
                >
                  <Stack align="center" gap="md">
                    <Box
                      style={{
                        width: rem(80),
                        height: rem(80),
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors[theme.primaryColor][6],
                        color: theme.white,
                        boxShadow: `0 4px 20px ${primary}40`,
                      }}
                    >
                      {f.icon}
                    </Box>

                    <Text
                      size="xl"
                      fw={700}
                      c={theme.colors.gray[9]}
                      ta="center"
                    >
                      {f.title}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <style>
        {`
          @media (prefers-reduced-motion: no-preference) {
            .service-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important;
            }
            .action-card:hover {
              transform: translateY(-8px);
              box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12) !important;
            }
            .action-card:focus-visible {
              transform: translateY(-8px);
              box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12) !important;
              outline: 2px solid ${primary};
              outline-offset: 2px;
            }
          }
        `}
      </style>
    </Box>
  );
}
