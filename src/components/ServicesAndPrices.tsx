import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  List,
  Title,
  Card,
  Group,
  Divider,
  Flex,
  ThemeIcon,
  Modal,
  Image,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { BsEye } from "react-icons/bs";
import {
  getServicesByOrganizationId,
  Service,
} from "../services/serviceService";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { CustomLoader } from "./customLoader/CustomLoader";

// Constantes para estilos reutilizables
const gradientTextStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #DE739E, #FFF5F7",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const gradientPriceStyle = { from: "#DE739E", to: "#FFF5F7", deg: 182 };

// Definición de interfaces para los props
interface ServiceItemProps {
  name: string;
  price: string;
  description?: string;
  images?: string[];
}

interface ServiceCategoryProps {
  title: string;
  services: ServiceItemProps[];
}

// Componente para un servicio individual
const ServiceItem: React.FC<ServiceItemProps> = ({
  name,
  price,
  description,
  images,
}) => {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <List.Item
        icon={
          <ThemeIcon
            variant="light"
            size={18}
            radius="xl"
            onClick={() => setOpened(true)}
            style={{ cursor: "pointer" }}
          >
            <BsEye />
          </ThemeIcon>
        }
      >
        <Text fw={500} style={{ color: "white" }}>
          {name}
        </Text>

        {price === "www.zybizobazar.com" ? (
          <Text size="xl" variant="gradient" gradient={gradientPriceStyle}>
            <a href="https://zybizobazar.com" target="_blank" rel="noreferrer">
              {price}
            </a>
          </Text>
        ) : (
          <Text size="xl" variant="gradient" gradient={gradientPriceStyle}>
            {price}
          </Text>
        )}
      </List.Item>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={` ${name}`}
        size="md"
        centered
      >
        <Flex direction="column" align="center">
          {images && images.length > 0 ? (
            <Carousel withIndicators style={{ width: "90%" }}>
              {images.map((image, index) => (
                <Carousel.Slide key={index}>
                  <Image
                    src={image}
                    alt={`${name} ${index + 1}`}
                    style={{ width: "100%", height: "auto" }}
                  />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Text size="md" style={{ color: "#2A2E35" }}>
              No hay imágenes disponibles para este servicio.
            </Text>
          )}
          <Divider my="sm" />
          <Text size="md" style={{ color: "#2A2E35" }}>
            {description || ""}
          </Text>
          {price === "www.zybizobazar.com" ? (
            <Text>
              <a
                href="https://zybizobazar.com"
                target="_blank"
                rel="noreferrer"
              >
                www.zybizobazar.com
              </a>
            </Text>
          ) : (
            <Text>{price}</Text>
          )}

          <Divider my="sm" />
        </Flex>
      </Modal>
    </>
  );
};

// Componente para una categoría de servicios
const ServiceCategory: React.FC<ServiceCategoryProps> = ({
  title,
  services,
}) => (
  <Card
    shadow="sm"
    my="sm"
    radius="md"
    withBorder
    bg="#DE739E"
    style={{ textAlign: "center" }}
  >
    <Title order={2}>
      <Text size="xl" fw={900} style={gradientTextStyle}>
        {title}
      </Text>
    </Title>
    <Divider my="sm" color="white" />
    <List spacing="sm" size="sm" center>
      {services.map((service, index) => (
        <ServiceItem
          key={index}
          name={service.name}
          price={service.price}
          description={service.description}
          images={service.images}
        />
      ))}
    </List>
  </Card>
);

const ServicesAndPrices: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const { _id } = organization || {};

  // Obtener servicios desde la API
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setIsLoading(true);
    const data = await getServicesByOrganizationId(_id as string);
  
    // Filtrar los servicios que tengan isActive: true
    const activeServices = data.filter((service) => service.isActive);
  
    setServices(activeServices);
  
    // Extraer los tipos de servicios de forma única
    const types = Array.from(new Set(activeServices.map((service) => service.type)));
    setServiceTypes(types);
  
    setIsLoading(false);
  };

  // Filtrar los servicios por tipo
  const filterServicesByType = (type: string) => {
    return services
      .filter((service) => service.type === type)
      .map((service) => ({
        name: service.name,
        price: `$${service.price.toLocaleString()}`,
        description: service.description || "",
        images: service.images || [],
      }));
  };

  if (isLoading) {
    return <CustomLoader />;
  }

  return (
    <Box color="white">
      <Title order={1} mb="lg" ta="center">
        Precios y servicios
      </Title>

      <Group justify="center" grow>
        <Flex direction="column">
          {serviceTypes.map((type) => (
            <ServiceCategory
              key={type}
              title={type}
              services={filterServicesByType(type)}
            />
          ))}
          {/* <ServiceCategory
            title="Insumos para cejas y pestañas"
            services={[
              {
                name: "¿Eres artista de pestañas y cejas? - ¡Clic en el enlace!",
                price: "www.zybizobazar.com",
                description:
                  "Consulta el catálogo y realiza tu pedido en el enlace siguiente",
                images: [
                  "https://ik.imagekit.io/6cx9tc1kx/zybizo/android-chrome-512x512.png?updatedAt=1731360674464",
                ],
              },
            ]}
          /> */}
        </Flex>
      </Group>
    </Box>
  );
};

export default ServicesAndPrices;
