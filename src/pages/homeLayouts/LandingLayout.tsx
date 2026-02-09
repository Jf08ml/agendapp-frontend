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
  Badge,
  Grid,
  Group,
  Button,
  Divider,
} from "@mantine/core";
import { ReactNode, useEffect, useState } from "react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { formatCurrency } from "../../utils/formatCurrency";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface LandingLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

export function LandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
  enableOnlineBooking = true,
}: LandingLayoutProps) {
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const org = useSelector(selectOrganization);

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
            <Text ta="center" c="dimmed">
              Cargando servicios...
            </Text>
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
                          <Text
                            size="xl"
                            fw={700}
                            c={theme.colors[theme.primaryColor][6]}
                          >
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
                          <Text
                            fw={700}
                            fz="lg"
                            c={theme.colors.gray[9]}
                            lineClamp={2}
                            mb="xs"
                          >
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
                                {formatCurrency(service.price, org?.currency || "COP")}
                              </Text>
                            )}
                            <Text size="xs" c="dimmed">
                              {service.duration} min
                            </Text>
                          </div>
                          {enableOnlineBooking && (
                            <Button
                              component={Link}
                              to="/online-reservation"
                              size="sm"
                              variant="light"
                              color={theme.primaryColor}
                            >
                              Reservar
                            </Button>
                          )}
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Text ta="center" c="dimmed">
              No hay servicios disponibles
            </Text>
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

            <SimpleGrid
              cols={{
                base: 1,
                sm: 2,
                md: features.length >= 3 ? 3 : 2,
              }}
              spacing="lg"
            >
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

                    <Text size="xl" fw={700} c={theme.colors.gray[9]} ta="center">
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
