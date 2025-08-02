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
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { getServicesByOrganizationId, Service } from "../services/serviceService";
import { CustomLoader } from "./customLoader/CustomLoader";
import { FaEye, FaPaintBrush, FaSmile, FaSpa } from "react-icons/fa";
import { FaScissors } from "react-icons/fa6";

// Puedes personalizar este mapeo de iconos/colores por categoría

const categoryIconMap: Record<string, React.ReactNode> = {
  "Cejas": <FaEye size={38} color="#DE739E" />,
  "Uñas": <FaPaintBrush size={38} color="#DE739E" />,
  "Peluquería": <FaScissors size={38} color="#DE739E" />,
  "Spa": <FaSpa size={38} color="#DE739E" />,
  "Belleza": <FaSmile size={38} color="#DE739E" />,
};

function getCategoryIcon(category: string) {
  return categoryIconMap[category] || <FaSpa size={38} color="#DE739E" />;
}

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
  <Modal opened={opened} onClose={onClose} title={service?.name} centered size="lg">
    <Flex direction="column" align="center" gap="md">
      {service?.images?.length ? (
        <Carousel withIndicators style={{ width: "96%" }} height={210}>
          {service.images.map((img, i) => (
            <Carousel.Slide key={i}>
              <Image
                src={img}
                alt={service.name}
                fit="cover"
                radius="lg"
                style={{
                  width: "100%",
                  maxHeight: 210,
                  objectFit: "cover",
                  margin: "0 auto",
                  borderRadius: "18px",
                }}
              />
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
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalService, setModalService] = useState<Service | null>(null);

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

  console.log(categories)

  // VISTA: Selección de categorías
  if (!selectedCategory) {
    return (
      <Box>
        <Title ta="center" mb={30} style={{ fontWeight: 900, color: "#DE739E" }}>
          ¿Qué tipo de servicio buscas?
        </Title>
        <Group justify="center" align="stretch" style={{ flexWrap: "wrap" }} gap="lg">
          {categories.map((category) => (
            <Card
              key={category}
              shadow="xl"
              radius="xl"
              withBorder
              style={{
                width: rem(190),
                minHeight: rem(195),
                background: "#fff",
                cursor: "pointer",
                transition: "box-shadow .2s,transform .2s",
                textAlign: "center",
                border: "1.5px solid #F7D7E5",
              }}
              onClick={() => setSelectedCategory(category)}
              mx={6}
              my={10}
            >
              <Flex direction="column" align="center" justify="center" h="100%" gap={6}>
                <Box mb={5}>{getCategoryIcon(category)}</Box>
                <Text fw={900} style={{ fontSize: 18, color: "#DE739E" }}>
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

  // VISTA: Lista de servicios de la categoría seleccionada
  return (
    <Box>
      <Group align="center" mb={18} gap={10}>
        <Button
          variant="light"
          color="pink"
          size="xs"
          radius="xl"
          onClick={() => setSelectedCategory(null)}
        >
          ← Volver
        </Button>
        <Title order={2} style={{ color: "#DE739E", fontWeight: 800 }}>
          {getCategoryIcon(selectedCategory)} {selectedCategory}
        </Title>
      </Group>
      <Divider mb={16} />
      <Flex wrap="wrap" gap={18}>
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
              width: 260,
              minHeight: 230,
              background: "#fff",
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {service.images && service.images.length > 0 ? (
              <Image
                src={service.images[0]}
                alt={service.name}
                fit="cover"
                height={112}
                radius="md"
                style={{ marginBottom: 10, objectFit: "cover" }}
              />
            ) : (
              <Box
                h={112}
                mb={10}
                style={{
                  background: "#FCE4EC",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#DE739E",
                  fontSize: 32,
                  fontWeight: 600,
                }}
              >
                <FaSpa />
              </Box>
            )}
            <Text fw={800} style={{ fontSize: 17, color: "#2A2E35" }} mb={2}>
              {service.name}
            </Text>
            <Text size="sm" color="dimmed" mb={2}>
              {service.description?.slice(0, 56) || ""}
              {service.description && service.description.length > 56 ? "…" : ""}
            </Text>
            <Flex align="center" justify="space-between" mt={4}>
              <Text
                fw={900}
                style={{
                  fontSize: 19,
                  background: "linear-gradient(90deg,#DE739E,#FFB6C1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ${service.price.toLocaleString()}
              </Text>
              <Button
                variant="light"
                size="xs"
                color="pink"
                radius="xl"
                onClick={() => setModalService(service)}
              >
                Detalles
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>
      <ServiceDetailModal
        opened={!!modalService}
        onClose={() => setModalService(null)}
        service={modalService}
      />
    </Box>
  );
};

export default ServicesAndPrices;
