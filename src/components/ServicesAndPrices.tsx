import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AspectRatio,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Image,
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
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../app/store"; // Ajusta tu import
import { formatCurrency } from "../utils/formatCurrency";
import {
  getServicesByOrganizationId,
  Service,
} from "../services/serviceService"; // Ajusta tu import
import { BiImage, BiSearch, BiX, BiTime, BiStar } from "react-icons/bi";

// ---------------- Utils ----------------

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
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

  // Búsqueda libre por nombre/descripción — corta transversalmente las
  // categorías, así que cuando hay texto se muestra como grilla plana.
  const filteredServices = useMemo(() => {
    const q = normalize(query);
    if (!q) return services;
    return services.filter(
      (s) => normalize(s.name).includes(q) || normalize(s.description || "").includes(q)
    );
  }, [services, query]);

  // Destacados: sección principal, siempre primero si hay alguno. Sin límite
  // de items — a diferencia del landing, esta página ES el catálogo completo.
  const featuredServices = useMemo(() => services.filter((s) => s.featured), [services]);

  // Resto del catálogo agrupado por categoría/tipo, en secciones de acordeón
  // (todas abiertas por defecto, el visitante puede colapsar las que no le
  // interesen) — excluye los que ya aparecen en Destacados para no repetirlos.
  const categorySections = useMemo(() => {
    const featuredIds = new Set(featuredServices.map((s) => s._id));
    const byType = new Map<string, Service[]>();
    services.forEach((s) => {
      if (featuredIds.has(s._id)) return;
      const type = s.type || "Otros";
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(s);
    });
    return Array.from(byType.entries())
      .map(([type, list]) => ({ type, services: list }))
      .sort((a, b) => b.services.length - a.services.length);
  }, [services, featuredServices]);

  // Une Destacados + categorías en una sola lista para el acordeón.
  const serviceSections = useMemo(() => {
    const list: { key: string; title: string; services: Service[]; featured?: boolean }[] = [];
    if (featuredServices.length > 0) {
      list.push({ key: "featured", title: "Destacados", services: featuredServices, featured: true });
    }
    categorySections.forEach((s) => {
      list.push({ key: s.type, title: s.type, services: s.services });
    });
    return list;
  }, [featuredServices, categorySections]);

  // Render Loading
  if (loading) {
    return (
      <Container size="xl" py="md">
        <Group mb="lg">
          <Skeleton height={40} width={200} radius="xl" />
          <Skeleton height={40} width="100%" radius="xl" />
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 2, md: 3, lg: 4 }} spacing="md">
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
        />
      </Stack>

      {/* --- Resultados --- */}
      {query ? (
        // Buscando: grilla plana con lo que matchea (cruza categorías)
        filteredServices.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No encontramos servicios con esa búsqueda.
          </Text>
        ) : (
          <ServiceCardsGrid services={filteredServices} primaryColor={primary} />
        )
      ) : services.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay servicios disponibles.
        </Text>
      ) : (
        // Sin búsqueda: catálogo completo agrupado por categoría, en acordeón
        <Accordion
          multiple
          defaultValue={serviceSections.map((s) => s.key)}
          chevronPosition="right"
          styles={{
            item: {
              border: "none",
              borderBottom: `1px solid ${theme.colors.gray[2]}`,
            },
            control: { padding: 0 },
            label: { paddingBlock: rem(14) },
            content: { padding: 0, paddingBottom: rem(20) },
          }}
        >
          {serviceSections.map((section) => (
            <Accordion.Item key={section.key} value={section.key}>
              <Accordion.Control>
                <Group gap={6} wrap="nowrap">
                  {section.featured && (
                    <BiStar size={18} color={theme.colors.yellow[6]} style={{ flexShrink: 0 }} />
                  )}
                  <Title order={4} fw={600} c={theme.colors.gray[9]}>
                    {section.title}
                  </Title>
                  <Text fz="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {section.services.length}
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <ServiceCardsGrid services={section.services} primaryColor={primary} />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Container>
  );
};

// ---------------- Grilla de tarjetas ----------------
// Compartida entre los resultados de búsqueda (plana) y cada sección del
// acordeón, para no duplicar el marcado de la grilla.
const ServiceCardsGrid = ({
  services,
  primaryColor,
}: {
  services: Service[];
  primaryColor: string;
}) => (
  <SimpleGrid cols={{ base: 2, sm: 2, md: 3, lg: 4 }} spacing="lg" mb="xl">
    {services.map((service) => (
      <ServiceCard key={service._id} service={service} primaryColor={primaryColor} />
    ))}
  </SimpleGrid>
);

// ---------------- Componente Tarjeta Individual ----------------
const ServiceCard = ({
  service,
  primaryColor,
}: {
  service: Service;
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
        transition: "transform 0.2s, box-shadow 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      className="service-card-hover"
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
      <Card.Section style={{ position: "relative" }}>
        <AspectRatio ratio={4 / 3}>
          {image ? (
            <Image src={image} fit="cover" alt={service.name} />
          ) : (
            <Center bg="gray.1">
              <BiImage size={32} color="gray" style={{ opacity: 0.5 }} />
            </Center>
          )}
        </AspectRatio>
        {service.featured && (
          <Badge
            variant="filled"
            color="yellow"
            size="sm"
            style={{ position: "absolute", top: 8, left: 8 }}
          >
            ⭐ Destacado
          </Badge>
        )}
      </Card.Section>

      {/* Sección Contenido */}
      <Stack p="sm" gap={6} style={{ flex: 1 }}>
        <Text fw={600} fz="sm" lineClamp={2} style={{ lineHeight: 1.2 }}>
          {service.name}
        </Text>

        <Group justify="space-between" align="center" gap={6}>
          {!service.hidePrice ? (
            <Text fw={700} fz="sm" c={service.price === 0 ? "green" : primaryColor}>
              {service.price === 0 ? "Gratis" : formatCurrency(service.price, organization?.currency || "COP")}
            </Text>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              Consultar
            </Text>
          )}
          <Group gap={4} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
            <BiTime size={12} color="var(--mantine-color-gray-5)" />
            <Text fz="xs" c="dimmed">
              {service.duration} min
            </Text>
          </Group>
        </Group>

        <Stack gap={6} mt="auto" pt={4}>
          <Button
            component={Link}
            to={`/servicio/${service._id}`}
            state={{ backTo: "/servicios-precios" }}
            size="xs"
            variant="default"
            fullWidth
          >
            Ver más
          </Button>
          {organization?.enableOnlineBooking !== false && (
            <Button
              component={Link}
              to={`/online-reservation?serviceId=${service._id}`}
              size="xs"
              variant="light"
              color={primaryColor}
              fullWidth
            >
              Reservar ahora
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

export default ServicesAndPrices;
