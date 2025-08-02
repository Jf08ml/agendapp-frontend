import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Title,
  Group,
  Text,
  Flex,
  Button,
  Image,
  Divider,
  Modal,
  rem,
  Table,
  useMantineTheme,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import {
  getServicesByOrganizationId,
  Service,
} from "../services/serviceService";
import { CustomLoader } from "./customLoader/CustomLoader";
import { MdMotionPhotosOff } from "react-icons/md";

// --- MODAL DE DETALLE DE SERVICIO ---
const ServiceDetailModal = ({
  opened,
  onClose,
  service,
}: {
  opened: boolean;
  onClose: () => void;
  service: Service | null;
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={service?.name}
    centered
    size="lg"
  >
    <Flex direction="column" align="center" gap="md">
      {service?.images?.length ? (
        <Carousel withIndicators style={{ width: "96%" }} height={350}>
          {service.images.map((img, i) => (
            <Carousel.Slide key={i}>
              <Box
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 18,
                  background: "#f5f5f5",
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
                  radius="lg"
                />
              </Box>
            </Carousel.Slide>
          ))}
        </Carousel>
      ) : (
        <Text color="gray">No hay imágenes para este servicio.</Text>
      )}
      <Text fw={700} size="lg" ta="center">
        {service?.price ? `$${service.price.toLocaleString()}` : ""}
      </Text>
      <Text color="dimmed">{service?.description || "Sin descripción"}</Text>
    </Flex>
  </Modal>
);

const ServicesAndPrices: React.FC = () => {
  const theme = useMantineTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalService, setModalService] = useState<Service | null>(null);
  const [viewAll, setViewAll] = useState(false);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const { _id } = organization || {};

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line
  }, []);

  const fetchServices = async () => {
    setIsLoading(true);
    const data = await getServicesByOrganizationId(_id as string);
    const activeServices = data.filter((service) => service.isActive);
    setServices(activeServices);
    setCategories(Array.from(new Set(activeServices.map((s) => s.type))));
    setIsLoading(false);
  };

  // Servicios filtrados por categoría seleccionada
  const filteredServices = selectedCategory
    ? services.filter((s) => s.type === selectedCategory)
    : [];

  if (isLoading) return <CustomLoader />;

  // --- Vista: Selección de categorías y opción de ver todos ---
  if (!selectedCategory && !viewAll) {
    return (
      <Box>
        <Title
          ta="center"
          style={{
            fontWeight: 900,
            color: theme.colors[theme.primaryColor][6],
          }}
        >
          ¿Qué tipo de servicio buscas?
        </Title>
        <Group
          justify="center"
          align="stretch"
          style={{ flexWrap: "wrap" }}
          gap="sm"
        >
          {/* Opción adicional: Ver todos */}
          <Card
            key="all"
            shadow="xl"
            radius="xl"
            withBorder
            style={{
              width: rem(190),
              minHeight: rem(195),
              cursor: "pointer",
              transition: "box-shadow .2s,transform .2s",
              textAlign: "center",
              border: `2px solid ${theme.colors[theme.primaryColor][3]}`,
              outline: `2.5px dashed ${theme.colors[theme.primaryColor][6]}`,
            }}
            onClick={() => setViewAll(true)}
            mx={6}
            my={8}
          >
            <Flex
              direction="column"
              align="center"
              justify="center"
              h="100%"
              gap={6}
            >
              <Text
                fw={900}
                style={{
                  fontSize: 18,
                  color: theme.colors[theme.primaryColor][6],
                }}
              >
                Ver todos los servicios
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {services.length} servicios activos
              </Text>
            </Flex>
          </Card>

          {/* Resto de categorías */}
          {categories.map((category) => (
            <Card
              key={category}
              shadow="xl"
              radius="xl"
              withBorder
              style={{
                width: rem(190),
                minHeight: rem(195),
                background: theme.colors.gray[0],
                cursor: "pointer",
                transition: "box-shadow .2s,transform .2s",
                textAlign: "center",
                border: `1.5px solid ${theme.colors[theme.primaryColor][2]}`,
              }}
              onClick={() => setSelectedCategory(category)}
              mx={6}
              my={8}
            >
              <Flex
                direction="column"
                align="center"
                justify="center"
                h="100%"
                gap={2}
              >
                <Text
                  fw={900}
                  style={{
                    fontSize: 18,
                    color: theme.colors[theme.primaryColor][6],
                  }}
                >
                  {category}
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {services.filter((s) => s.type === category).length} servicios
                </Text>
              </Flex>
            </Card>
          ))}
        </Group>
      </Box>
    );
  }

  // --- Vista: Ver todos los servicios (tabla) ---
  if (viewAll) {
    return (
      <Box>
        <Group align="center" mb={18} gap={5}>
          <Button
            variant="light"
            color={theme.primaryColor}
            size="xs"
            radius="xl"
            onClick={() => setViewAll(false)}
          >
            ← Volver
          </Button>
          <Title
            order={2}
            style={{
              color: theme.colors[theme.primaryColor][6],
              fontWeight: 800,
            }}
          >
            Todos los servicios
          </Title>
        </Group>
        <Divider mb={16} />
        {services.length === 0 ? (
          <Text c="dimmed" mt={12}>
            No hay servicios registrados.
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder withColumnBorders mb="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {services.map((service) => (
                <Table.Tr key={service._id}>
                  <Table.Td>{service.name}</Table.Td>
                  <Table.Td>{service.type}</Table.Td>
                  <Table.Td>
                    <Text
                      fw={700}
                      style={{
                        fontSize: 17,
                        background: `linear-gradient(90deg,${
                          theme.colors[theme.primaryColor][6]
                        },${theme.colors[theme.primaryColor][2]})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      ${service.price.toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      color={theme.primaryColor}
                      radius="xl"
                      variant="light"
                      onClick={() => setModalService(service)}
                    >
                      Detalles
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        <ServiceDetailModal
          opened={!!modalService}
          onClose={() => setModalService(null)}
          service={modalService}
        />
      </Box>
    );
  }

  // --- Vista: Lista de servicios de la categoría seleccionada ---
  return (
    <Box>
      <Group align="center" mb={18} gap={10}>
        <Button
          variant="light"
          color={theme.primaryColor}
          size="xs"
          radius="xl"
          onClick={() => setSelectedCategory(null)}
        >
          ← Volver
        </Button>
        <Title
          order={2}
          style={{
            color: theme.colors[theme.primaryColor][6],
            fontWeight: 800,
          }}
        >
          {selectedCategory}
        </Title>
      </Group>
      <Divider mb={16} />

      {/* Responsive Grid para cards */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 14,
        }}
        mb="lg"
      >
        {filteredServices.length === 0 && (
          <Text color="dimmed" mt={12}>
            No hay servicios en esta categoría.
          </Text>
        )}
        {filteredServices.map((service) => (
          <Card
            key={service._id}
            shadow="md"
            radius="md"
            withBorder
            style={{
              minWidth: 0,
              background: theme.colors.gray[0],
              minHeight: 230,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Contenedor cuadrado para la imagen */}
            <Box
              style={{
                width: "100%",
                aspectRatio: "1/1",
                position: "relative",
                overflow: "hidden",
                borderRadius: 8,
                marginBottom: 10,
                background: theme.colors.gray[2],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {service.images && service.images.length > 0 ? (
                <Image
                  src={service.images[0]}
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
              ) : (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  style={{
                    width: "100%",
                    height: "100%",
                    color: theme.colors[theme.primaryColor][5],
                    fontSize: 18,
                    fontWeight: 600,
                    gap: 6,
                  }}
                >
                  <MdMotionPhotosOff size={36} style={{ opacity: 0.5 }} />
                  <Text size="xs" c="dimmed">
                    Sin imagen
                  </Text>
                </Flex>
              )}
            </Box>
            <Text
              fw={800}
              style={{ fontSize: 17, color: theme.colors.dark[7] }}
              mb={2}
            >
              {service.name}
            </Text>
            <Text size="sm" color="dimmed" mb={2}>
              {service.description?.slice(0, 56) || ""}
              {service.description && service.description.length > 56
                ? "…"
                : ""}
            </Text>
            <Flex align="center" justify="space-between" mt={4}>
              <Text
                fw={900}
                style={{
                  fontSize: 19,
                  background: `linear-gradient(90deg,${
                    theme.colors[theme.primaryColor][6]
                  },${theme.colors[theme.primaryColor][2]})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ${service.price.toLocaleString()}
              </Text>
              <Button
                variant="light"
                size="xs"
                color={theme.primaryColor}
                radius="xl"
                onClick={() => setModalService(service)}
              >
                Detalles
              </Button>
            </Flex>
          </Card>
        ))}
      </Box>
      <ServiceDetailModal
        opened={!!modalService}
        onClose={() => setModalService(null)}
        service={modalService}
      />
    </Box>
  );
};

export default ServicesAndPrices;
