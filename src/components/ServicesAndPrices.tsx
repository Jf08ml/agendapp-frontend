/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Card,
  Container,
  Group,
  Image,
  Modal,
  Pill,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
  ActionIcon,
  rem,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../app/store"; // Ajusta tu import
import { formatCurrency } from "../utils/formatCurrency";
import {
  getServicesByOrganizationId,
  Service,
} from "../services/serviceService"; // Ajusta tu import
import { BiImage, BiSearch, BiX } from "react-icons/bi";

// ---------------- Utils ----------------

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const plainText = (html?: string) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ---------------- Componente Principal ----------------
const ServicesAndPrices: React.FC = () => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const primary = theme.primaryColor;

  // Estados
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [modalService, setModalService] = useState<Service | null>(null);

  // Redux
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgId = organization?._id as string | undefined;

  // Fetch Data
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        if (!orgId) return;
        const data = await getServicesByOrganizationId(orgId);
        setServices((data || []).filter((s) => s.isActive));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orgId]);

  // Lógica de Categorías y Filtros
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.type || "Otros"));
    return ["Todos", ...Array.from(set).sort()];
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = normalize(query);
    return services.filter((s) => {
      const matchQuery =
        !q ||
        normalize(s.name).includes(q) ||
        normalize(s.description || "").includes(q);

      const matchCategory =
        selectedCategory === "Todos" ||
        (s.type || "Otros") === selectedCategory;

      return matchQuery && matchCategory;
    });
  }, [services, query, selectedCategory]);

  // Render Loading
  if (loading) {
    return (
      <Container size="xl" py="md">
        <Group mb="lg">
          <Skeleton height={40} width={200} radius="xl" />
          <Skeleton height={40} width="100%" radius="xl" />
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="md">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={300} radius="md" />
          ))}
        </SimpleGrid>
      </Container>
    );
  }

  return (
    <Container size="xl" p={isMobile ? "xs" : "md"}>
      {/* --- Header Compacto --- */}
      <Stack gap="md" mb="xl">
        <Group justify="space-between" align="center">
          <Title order={3} fw={900} c={theme.colors[primary][9]}>
            Nuestros Servicios
          </Title>
          <Badge variant="light" size="lg" circle>
            {filteredServices.length}
          </Badge>
        </Group>

        {/* Barra de Filtros Unificada */}
        <Card withBorder shadow="sm" radius="lg" p="xs">
          <Group gap="sm" wrap={isMobile ? "wrap" : "nowrap"}>
            {/* Buscador */}
            <TextInput
              placeholder="Buscar servicio..."
              leftSection={<BiSearch size={16} />}
              rightSection={
                query && (
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => setQuery("")}
                  >
                    <BiX />
                  </ActionIcon>
                )
              }
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              radius="md"
              style={{ flex: isMobile ? "1 1 100%" : 1 }}
            />

            {/* Scroll horizontal de categorías */}
            <ScrollArea
              type="never"
              style={{ maxWidth: isMobile ? "100%" : "60%" }}
            >
              <Group gap={8} wrap="nowrap">
                {categories.map((cat) => (
                  <Pill
                    key={cat}
                    size="md"
                    style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    // --- CAMBIOS AQUÍ ---
                    // 1. Si está activo, usamos el tono 6 (el color "puro" o fuerte)
                    bg={
                      selectedCategory === cat
                        ? theme.colors[primary][6]
                        : undefined
                    }
                    // 2. Si está activo, el texto es BLANCO. Si no, dejamos el default.
                    c={selectedCategory === cat ? "white" : undefined}
                    // --------------------

                    fw={selectedCategory === cat ? 700 : 500}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Pill>
                ))}
              </Group>
            </ScrollArea>
          </Group>
        </Card>
      </Stack>

      {/* --- Grid de Tarjetas --- */}
      {filteredServices.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No encontramos servicios con esa búsqueda.
        </Text>
      ) : (
        <SimpleGrid
          cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4 }}
          spacing="lg"
          mb="xl"
        >
          {filteredServices.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              primaryColor={primary}
              onClick={() => setModalService(service)}
            />
          ))}
        </SimpleGrid>
      )}

      {/* --- Modal de Detalle (Simplificado) --- */}
      <Modal
        opened={!!modalService}
        onClose={() => setModalService(null)}
        title={
          <Text fw={700} lineClamp={1}>
            {modalService?.name}
          </Text>
        }
        centered
        size="md"
        radius="lg"
      >
        {modalService && (
          <Stack>
            {/* Carrusel o Imagen */}
            <Box bg="gray.1" style={{ borderRadius: 12, overflow: "hidden" }}>
              {modalService.images && modalService.images.length > 0 ? (
                <Carousel withIndicators loop height={250}>
                  {modalService.images.map((img, i) => (
                    <Carousel.Slide key={i}>
                      <Image src={img} height={250} fit="cover" />
                    </Carousel.Slide>
                  ))}
                </Carousel>
              ) : (
                <Stack align="center" justify="center" h={200} c="dimmed">
                  <BiImage size={40} />
                  <Text size="xs">Sin imagen</Text>
                </Stack>
              )}
            </Box>

            <Group justify="space-between" align="center">
              {!modalService.hidePrice && (
                <Text fz="xl" fw={800} c={modalService.price === 0 ? "green" : primary}>
                  {modalService.price === 0 ? "Gratis" : formatCurrency(modalService.price, organization?.currency || "COP")}
                </Text>
              )}
              {typeof (modalService as any).duration === "number" && (
                <Badge variant="outline" color="gray">
                  {(modalService as any).duration} min
                </Badge>
              )}
            </Group>

            <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
              {plainText(modalService.description)}
            </Text>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};

// ---------------- Componente Tarjeta Individual ----------------
const ServiceCard = ({
  service,
  onClick,
  primaryColor,
}: {
  service: Service;
  onClick: () => void;
  primaryColor: string;
}) => {
  const image = service.images?.[0];
  const organization = useSelector((state: RootState) => state.organization.organization);

  return (
    <Card
      shadow="sm"
      padding="none"
      radius="md"
      withBorder
      style={{
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClick}
      className="service-card-hover" // Puedes añadir CSS global para hover si gustas
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
      }}
    >
      {/* Sección Imagen */}
      <Card.Section>
        {image ? (
          <Image src={image} height={180} fit="cover" alt={service.name} />
        ) : (
          <Stack align="center" justify="center" h={180} bg="gray.1" gap={4}>
            <BiImage size={32} color="gray" style={{ opacity: 0.5 }} />
          </Stack>
        )}
      </Card.Section>

      {/* Sección Contenido */}
      <Stack p="md" gap="xs" justify="space-between" style={{ flex: 1 }}>
        <Box>
          <Group justify="space-between" align="start" wrap="nowrap" mb={4}>
            <Text fw={700} lineClamp={2} style={{ lineHeight: 1.2 }}>
              {service.name}
            </Text>
          </Group>

          <Text
            size="sm"
            c="dimmed"
            lineClamp={6}
            h={rem(140)}
            style={{ lineHeight: 1.5 }}
          >
            {plainText(service.description) || "Sin descripción disponible."}
          </Text>
        </Box>

        <Group justify="space-between" align="flex-end" mt="xs">
          {!service.hidePrice ? (
            <Text fw={800} size="lg" c={service.price === 0 ? "green" : primaryColor}>
              {service.price === 0 ? "Gratis" : formatCurrency(service.price, organization?.currency || "COP")}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              Consultar
            </Text>
          )}

          {/* Pequeño tag de categoría */}
          <Badge size="xs" variant="light" color="gray">
            {service.type || "General"}
          </Badge>
        </Group>
      </Stack>
    </Card>
  );
};

export default ServicesAndPrices;
