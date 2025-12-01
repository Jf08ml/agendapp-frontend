/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  Image,
  Loader,
  Modal,
  Pill,
  PillGroup,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Carousel } from "@mantine/carousel";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import {
  getServicesByOrganizationId,
  Service,
} from "../services/serviceService";
import { MdMotionPhotosOff } from "react-icons/md";
import { BiInfoCircle, BiSearch, BiX } from "react-icons/bi";

// ---------------- Utils ----------------
const formatCOP = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(n)
    : "";

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// Si la API algún día devuelve HTML en description, esto lo hace legible
const plainText = (html?: string) =>
  (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// -------------- Modal Detalle --------------
const ServiceDetailModal = ({
  opened,
  onClose,
  service,
  primary,
}: {
  opened: boolean;
  onClose: () => void;
  service: Service | null;
  primary: string;
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    size="lg"
    centered
    radius="lg"
    title={
      <Group gap="xs">
        <Text fw={800}>{service?.name}</Text>
        {service?.type && (
          <Badge variant="light" color={primary} radius="sm">
            {service.type}
          </Badge>
        )}
      </Group>
    }
  >
    {!service ? (
      <Flex align="center" justify="center" mih={220}>
        <Loader />
      </Flex>
    ) : (
      <Stack gap="md">
        {service.images?.length ? (
          <Carousel withIndicators height={340} loop>
            {service.images.map((img, i) => (
              <Carousel.Slide key={i}>
                <Box
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 340,
                    overflow: "hidden",
                    borderRadius: 16,
                    background: "#f5f6f7",
                  }}
                >
                  <Image
                    src={img}
                    alt={service.name}
                    fit="cover"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              </Carousel.Slide>
            ))}
          </Carousel>
        ) : (
          <Card withBorder radius="lg" p="xl" style={{ background: "#fafbfc" }}>
            <Flex direction="column" align="center" gap={6}>
              <MdMotionPhotosOff size={34} style={{ opacity: 0.5 }} />
              <Text c="dimmed" size="sm">
                No hay imágenes para este servicio
              </Text>
            </Flex>
          </Card>
        )}

        <Group justify="space-between" wrap="wrap">
          <Group gap="xs">
            <Badge size="lg" variant="dot" color={primary}>
              {formatCOP(service.price)}
            </Badge>

            {/* Usa `duration` (tu campo real) */}
            {typeof (service as any).duration === "number" && (
              <Badge variant="light" color="gray" radius="sm">
                {(service as any).duration} min
              </Badge>
            )}
          </Group>
        </Group>

        <Divider />
        <Text
          c="dimmed"
          size="sm"
          style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
        >
          {plainText(service.description) || "Sin descripción."}
        </Text>
      </Stack>
    )}
  </Modal>
);

// -------------- Vista Tarjetas --------------
function CardsView({
  services,
  onOpen,
  primary,
}: {
  services: Service[];
  onOpen: (s: Service) => void;
  primary: string;
}) {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  return (
    <SimpleGrid
      cols={isMobile ? 2 : { base: 2, sm: 2, md: 3 }}
      spacing={isMobile ? "sm" : "md"}
    >
      {services.map((s) => {
        const name = s.name;
        const price = formatCOP(s.price);
        const category = s.type || "Sin categoría";
        const img = s.images?.[0];

        return (
          <Card
            key={s._id}
            withBorder
            radius="lg"
            style={{ cursor: "pointer", overflow: "hidden" }}
            onClick={() => onOpen(s)}
            role="button"
            tabIndex={0}
          >
            {/* Header: categoría + info */}
            <Group justify="space-between" mb={isMobile ? 8 : 10}>
              <Badge
                variant="outline"
                color="gray"
                radius="sm"
                size={isMobile ? "xs" : "sm"}
              >
                {category}
              </Badge>
              <ActionIcon
                variant="subtle"
                color={primary}
                size={isMobile ? "sm" : "md"}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(s);
                }}
                aria-label={`Ver información de ${name}`}
              >
                <BiInfoCircle size={isMobile ? 16 : 18} />
              </ActionIcon>
            </Group>

            {/* Imagen en medio */}
            <Box
              style={{
                width: "100%",
                aspectRatio: isMobile ? "4/3" : "16/10",
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                background: "#f2f3f5",
                marginBottom: isMobile ? 8 : 10,
              }}
            >
              {img ? (
                <Image
                  src={img}
                  alt={name}
                  fit="cover"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Flex align="center" justify="center" h="100%" w="100%">
                  <MdMotionPhotosOff
                    size={isMobile ? 26 : 30}
                    style={{ opacity: 0.45 }}
                  />
                </Flex>
              )}
            </Box>

            {/* Footer: nombre + precio */}
            <Flex align="center" direction="column" gap="md">
              <Text
                fw={800}
                size={isMobile ? "sm" : "md"}
                lineClamp={2}
                pr="xs"
              >
                {name}
              </Text>
              <Badge variant="light" color={primary} size="lg">
                {price}
              </Badge>
            </Flex>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}

// -------------- Vista Lista (Accordion por categoría) --------------
function PriceListView({
  grouped,
  onOpen,
  primary,
}: {
  grouped: Record<string, Service[]>;
  onOpen: (s: Service) => void;
  primary: string;
}) {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const categories = Object.keys(grouped);
  if (categories.length === 0) {
    return <Text c="dimmed">No hay servicios para mostrar.</Text>;
  }

  return (
    <Accordion multiple chevronPosition="right" radius="md" variant="separated">
      {categories.map((cat) => (
        <Accordion.Item key={cat} value={cat}>
          <Accordion.Control>
            <Group justify="space-between" wrap="nowrap" w="100%">
              <Group gap="xs">
                <Text fw={800}>{cat || "Sin categoría"}</Text>
                <Badge variant="light" color="gray">
                  {grouped[cat].length}
                </Badge>
              </Group>
            </Group>
          </Accordion.Control>

          <Accordion.Panel>
            {isMobile ? (
              // ======== MOBILE: LISTA RESPONSIVE, SIN TRUNCAR ========
              <Stack gap="xs">
                {grouped[cat].map((s) => {
                  const img = s.images?.[0];

                  return (
                    <Box
                      key={s._id}
                      onClick={() => onOpen(s)}
                      role="button"
                      tabIndex={0}
                      style={{
                        border: "1px solid var(--mantine-color-gray-3)",
                        borderRadius: 12,
                        padding: "10px",
                        cursor: "pointer",
                        background: "var(--mantine-color-body)",
                      }}
                    >
                      {/* Grid 3 columnas: miniatura | contenido | precio/info */}
                      <Box
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px 1fr auto",
                          gap: 10,
                          alignItems: "start",
                        }}
                      >
                        {/* Miniatura */}
                        <Box
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "#f2f3f5",
                            position: "relative",
                          }}
                        >
                          {img ? (
                            <Image
                              src={img}
                              alt={s.name}
                              fit="cover"
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Flex align="center" justify="center" h="100%">
                              <MdMotionPhotosOff
                                size={22}
                                style={{ opacity: 0.5 }}
                              />
                            </Flex>
                          )}
                        </Box>

                        {/* Contenido: nombre + descripción (sin truncar) */}
                        <Box style={{ minWidth: 0 }}>
                          <Text
                            fw={800}
                            size="sm"
                            style={{ wordBreak: "break-word" }}
                          >
                            {s.name}
                          </Text>

                          {/* Si quieres limpiar HTML potencial, usa plainText(s.description) */}
                          <Text
                            c="dimmed"
                            size="sm"
                            mt={4}
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              lineHeight: 1.45,
                            }}
                          >
                            {plainText(s.description) || "Sin descripción"}
                          </Text>
                        </Box>

                        {/* Precio + info (columna derecha) */}
                        <Flex
                          direction="column"
                          align="flex-end"
                          justify="space-between"
                          style={{ minWidth: 70 }}
                          gap={6}
                        >
                          <ActionIcon
                            variant="subtle"
                            color={primary}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpen(s);
                            }}
                            aria-label={`Ver información de ${s.name}`}
                          >
                            <BiInfoCircle size={16} />
                          </ActionIcon>
                          <Badge variant="light" color={primary} size="sm">
                            {formatCOP(s.price)}
                          </Badge>
                          {typeof (s as any).duration === "number" && (
                            <Badge
                              variant="light"
                              color="gray"
                              radius="sm"
                              size="xs"
                            >
                              {(s as any).duration} min
                            </Badge>
                          )}
                        </Flex>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              // ======== DESKTOP/TABLET: TABLA =========
              <ScrollArea.Autosize mah={420}>
                <Table
                  highlightOnHover
                  verticalSpacing="sm"
                  horizontalSpacing="md"
                  withRowBorders={false}
                >
                  <Table.Tbody>
                    {grouped[cat].map((s) => (
                      <Table.Tr key={s._id}>
                        <Table.Td width="55%">
                          <Flex align="center">
                            <Text fw={700}>{s.name} - </Text>
                            {typeof (s as any).duration === "number" && (
                              <Badge
                                variant="light"
                                color="gray"
                                radius="sm"
                                size="xs"
                              >
                                {(s as any).duration} min
                              </Badge>
                            )}
                          </Flex>
                          {/* sin truncar en desktop también */}
                          <Text
                            size="sm"
                            c="dimmed"
                            style={{ whiteSpace: "normal" }}
                          >
                            {plainText(s.description) || "Sin descripción"}
                          </Text>
                        </Table.Td>
                        <Table.Td width="20%">
                          <Badge size="lg" variant="dot" color={primary}>
                            {formatCOP(s.price)}
                          </Badge>
                        </Table.Td>
                        <Table.Td width="25%" style={{ textAlign: "right" }}>
                          <Button
                            size="xs"
                            variant="light"
                            color={primary}
                            leftSection={<BiInfoCircle size={14} />}
                            onClick={() => onOpen(s)}
                          >
                            Ver información
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

// -------------- Componente principal --------------
const ServicesAndPrices: React.FC = () => {
  const theme = useMantineTheme();
  const primary = theme.primaryColor;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>("__all__");
  const [order, setOrder] = useState<"price-asc" | "price-desc" | "name-asc">(
    "price-asc"
  );
  const [view, setView] = useState<"lista" | "tarjetas">("tarjetas");

  const [modalService, setModalService] = useState<Service | null>(null);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgId = organization?._id as string | undefined;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        if (!orgId) return;
        const data = await getServicesByOrganizationId(orgId);

        const active = (data || []).filter((s) => s.isActive);
        setServices(active);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orgId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.type || "Sin categoría"));
    return ["__all__", ...Array.from(set)];
  }, [services]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    let list = services.filter((s) => {
      const matchesQ =
        !q ||
        normalize(s.name).includes(q) ||
        normalize(s.description || "").includes(q) ||
        normalize(s.type || "").includes(q);
      const matchesCat =
        !category ||
        category === "__all__" ||
        (s.type || "Sin categoría") === category;
      return matchesQ && matchesCat;
    });

    switch (order) {
      case "price-asc":
        list = list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        list = list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "name-asc":
        list = list.sort((a, b) => a.name.localeCompare(b.name, "es"));
        break;
    }
    return list;
  }, [services, query, category, order]);

  const grouped = useMemo(() => {
    const g: Record<string, Service[]> = {};
    filtered.forEach((s) => {
      const key = s.type || "Sin categoría";
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    return g;
  }, [filtered]);

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <Stack gap="md">
        <Title order={2}>Servicios y precios</Title>
        <Group>
          <Skeleton height={40} w={260} />
          <Skeleton height={40} w={180} />
          <Skeleton height={40} w={220} />
          <Skeleton height={40} w={210} />
        </Group>
        <Skeleton height={22} w="60%" />
        <Skeleton height={260} radius="lg" />
        <Skeleton height={260} radius="lg" />
      </Stack>
    );
  }

  return (
    <Box>
      <Stack gap="xs" mb="sm">
        <Title
          order={2}
          style={{ color: theme.colors[primary][7], fontWeight: 900 }}
        >
          Servicios y precios
        </Title>
        <Text c="dimmed" size="sm">
          Explora por categoría, compara precios y abre los detalles para ver
          imágenes y descripciones.
        </Text>
      </Stack>

      {/* Barra de filtros */}
      <Card
        withBorder
        radius="lg"
        mb="md"
        p="md"
        style={{ backdropFilter: "blur(6px)" }}
      >
        <Flex gap="sm" wrap="wrap" align="center">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Buscar servicio..."
            leftSection={<BiSearch size={16} />}
            rightSection={
              query ? (
                <ActionIcon variant="subtle" onClick={() => setQuery("")}>
                  <BiX size={16} />
                </ActionIcon>
              ) : null
            }
            w={{ base: "100%", sm: 280 }}
          />

          <Select
            label={undefined}
            placeholder="Categoría"
            value={category}
            onChange={setCategory}
            data={categories.map((c) =>
              c === "__all__"
                ? { value: c, label: "Todas las categorías" }
                : { value: c, label: c }
            )}
            checkIconPosition="right"
            w={{ base: "100%", sm: 220 }}
          />

          <Select
            placeholder="Ordenar por"
            value={order}
            onChange={(v: any) => setOrder(v)}
            data={[
              { value: "price-asc", label: "Precio (menor a mayor)" },
              { value: "price-desc", label: "Precio (mayor a menor)" },
              { value: "name-asc", label: "Nombre (A–Z)" },
            ]}
            w={{ base: "100%", sm: 240 }}
          />

          <SegmentedControl
            value={view}
            onChange={(v: any) => setView(v)}
            data={[
              { value: "lista", label: "Lista" },
              { value: "tarjetas", label: "Tarjetas" },
            ]}
          />
        </Flex>

        {/* Chips rápidas de categorías */}
        <PillGroup mt="sm" gap="xs">
          {categories
            .filter((c) => c !== "__all__")
            .map((c) => (
              <Pill
                key={c}
                onClick={() => setCategory(category === c ? "__all__" : c)}
                withRemoveButton={false}
                radius="xl"
                variant={category === c ? "filled" : "light"}
                color={primary}
              >
                {c}
              </Pill>
            ))}
        </PillGroup>
      </Card>

      {/* Contenido */}
      {filtered.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Flex direction="column" align="center" gap="xs">
            <Text fw={700}>Sin resultados</Text>
            <Text c="dimmed" size="sm" ta="center">
              Intenta limpiar los filtros o usar otro término de búsqueda.
            </Text>
          </Flex>
        </Card>
      ) : view === "tarjetas" ? (
        <CardsView
          services={filtered}
          onOpen={(s) => setModalService(s)}
          primary={primary}
        />
      ) : (
        <PriceListView
          grouped={grouped}
          onOpen={(s) => setModalService(s)}
          primary={primary}
        />
      )}

      {/* Modal */}
      <ServiceDetailModal
        opened={!!modalService}
        onClose={() => setModalService(null)}
        service={modalService}
        primary={primary}
      />
    </Box>
  );
};

export default ServicesAndPrices;
