import { useEffect, useState } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import {
  Text,
  Title,
  TextInput,
  Button,
  Stack,
  Container,
  Divider,
  Group,
  Badge,
  rem,
  Tabs,
  NumberInput,
} from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../services/organizationService";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { GrOrganization } from "react-icons/gr";
import { RiGlobalLine } from "react-icons/ri";
import { BiLocationPlus } from "react-icons/bi";
import { TimeInput } from "@mantine/dates";
import { updateOrganizationState } from "../../features/organization/sliceOrganization";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 6.2442, lng: -75.5812 };

const OrganizationInfo = () => {
  const dispatch = useDispatch();
  const [organization, setOrganization] = useState<Organization>(
    {} as Organization
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchBox, setSearchBox] =
    useState<google.maps.places.Autocomplete | null>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  const iconStyle = { width: rem(12), height: rem(12) };

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (organizationId) {
          const response = await getOrganizationById(organizationId);
          if (response) {
            setOrganization(response);
          }
        }
      } catch (error) {
        console.error("Error al cargar la información:", error);
        showNotification({
          title: "Error",
          message: "Error al cargar la información de la organización",
          color: "red",
          icon: <IoAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [organizationId]);

  const handlePlaceSelect = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place.geometry) {
        const location = place.geometry.location;
        const formattedAddress = place.formatted_address || "";
        if (!location) {
          return;
        }
        setOrganization((prev) => ({
          ...prev,
          location: {
            lat: location.lat(),
            lng: location.lng(),
          },
          address: formattedAddress,
        }));
      }
    }
  };

  const handleSave = async () => {
    try {
      if (organizationId) {
        const updatedOrganization = await updateOrganization(
          organizationId,
          organization
        );
        
        if (!updatedOrganization) {
          throw new Error("La organización actualizada es null");
        }

        showNotification({
          title: "Éxito",
          message: "Información actualizada correctamente",
          color: "green",
          autoClose: 3000,
          position: "top-right",
        });

        dispatch(updateOrganizationState(updatedOrganization));

        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error al guardar la organización:", error);
      showNotification({
        title: "Error",
        message: "Error al guardar los datos",
        color: "red",
      });
    }
  };

  if (loading) return <CustomLoader />;

  return (
    <Container>
      <Group justify="space-between" align="center" mb="lg">
        <Title order={2}>
          Información de la Organización{" "}
          <Badge color={organization.isActive ? "green" : "red"}>
            {organization.isActive ? "Activo" : "Inactivo"}
          </Badge>{" "}
        </Title>
        <Button
          color={isEditing ? "green" : "blue"}
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          {isEditing ? "Guardar Cambios" : "Editar"}
        </Button>
      </Group>

      <Divider my="lg" />
      <Tabs defaultValue="contact">
        <Tabs.List>
          <Tabs.Tab
            value="contact"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Nombre y contacto
          </Tabs.Tab>
          <Tabs.Tab
            value="openingsHours"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Horario de atención
          </Tabs.Tab>
          <Tabs.Tab
            value="socialMedia"
            leftSection={<RiGlobalLine style={iconStyle} />}
          >
            Redes sociales
          </Tabs.Tab>
          <Tabs.Tab
            value="location"
            leftSection={<BiLocationPlus style={iconStyle} />}
          >
            Ubicación
          </Tabs.Tab>
          <Tabs.Tab
            value="fidelity"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Fidelidad
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab: Contacto */}
        <Tabs.Panel value="contact">
          <Stack p="md">
            <TextInput
              label="Nombre"
              value={organization.name || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <TextInput
              label="Correo Electrónico"
              value={organization.email || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
            <TextInput
              label="Teléfono"
              value={organization.phoneNumber || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  phoneNumber: e.target.value,
                }))
              }
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="openingsHours">
          <Group grow>
            <TimeInput
              label="Horario de Apertura"
              value={organization.openingHours?.start || ""}
              disabled={!isEditing}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setOrganization((prev) => ({
                  ...prev,
                  openingHours: {
                    ...prev.openingHours,
                    start: value,
                    end: prev.openingHours?.end || "",
                  },
                }));
              }}
            />
            <TimeInput
              label="Horario de Cierre"
              value={organization.openingHours?.end || ""}
              disabled={!isEditing}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setOrganization((prev) => ({
                  ...prev,
                  openingHours: {
                    ...prev.openingHours,
                    start: prev.openingHours?.start || "",
                    end: value,
                  },
                }));
              }}
            />
          </Group>
        </Tabs.Panel>

        {/* Tab: Redes Sociales */}
        <Tabs.Panel value="socialMedia">
          <Stack p="md">
            <TextInput
              label="Facebook"
              value={organization.facebookUrl || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  facebookUrl: e.target.value,
                }))
              }
            />
            <TextInput
              label="Instagram"
              value={organization.instagramUrl || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  instagramUrl: e.target.value,
                }))
              }
            />
            <TextInput
              label="WhatsApp"
              value={organization.whatsappUrl || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  whatsappUrl: e.target.value,
                }))
              }
            />
            <TextInput
              label="TikTok"
              value={organization.tiktokUrl || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  tiktokUrl: e.target.value,
                }))
              }
            />
          </Stack>
        </Tabs.Panel>

        {/* Tab: Ubicación */}
        <Tabs.Panel value="location">
          <Stack p="md">
            {organization.address && (
              <TextInput
                label="Dirección"
                value={organization.address || ""}
                disabled={!isEditing}
                onChange={(e) =>
                  setOrganization((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            )}
            <Autocomplete
              onLoad={(autocomplete) => setSearchBox(autocomplete)}
              onPlaceChanged={handlePlaceSelect}
            >
              <TextInput
                label="Buscar Dirección"
                placeholder="Ingresa una dirección o nombre del lugar"
                disabled={!isEditing}
              />
            </Autocomplete>
            <Text>
              Escribe la dirección o busca la ubicación de la organización
            </Text>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={
                organization.location
                  ? {
                      lat: organization.location.lat,
                      lng: organization.location.lng,
                    }
                  : defaultCenter
              }
              zoom={13}
              onClick={(e) => {
                if (isEditing) {
                  setOrganization((prev) => ({
                    ...prev,
                    location: {
                      lat:
                        e.latLng?.lat() ||
                        prev.location?.lat ||
                        defaultCenter.lat,
                      lng:
                        e.latLng?.lng() ||
                        prev.location?.lng ||
                        defaultCenter.lng,
                    },
                  }));
                }
              }}
            >
              {organization.location && (
                <Marker
                  position={{
                    lat: organization.location.lat,
                    lng: organization.location.lng,
                  }}
                  draggable={isEditing}
                  onDragEnd={(e) => {
                    setOrganization((prev) => ({
                      ...prev,
                      location: {
                        lat: e.latLng?.lat() || prev.location?.lat,
                        lng: e.latLng?.lng() || prev.location?.lng,
                      },
                    }));
                  }}
                />
              )}
            </GoogleMap>

            {organization.location && (
              <Text>
                Latitud: {organization.location.lat}, Longitud:{" "}
                {organization.location.lng}
              </Text>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Tab: Fidelidad */}
        <Tabs.Panel value="fidelity">
          <Stack p="md">
            <NumberInput
              label="Número de Referidos"
              value={organization.referredCount || 0}
              disabled={!isEditing}
              onChange={(value) => {
                const numericValue = typeof value === "number" ? value : 0;
                setOrganization((prev) => ({
                  ...prev,
                  referredCount: numericValue,
                }));
              }}
            />

            <TextInput
              label="Premio por Referidos"
              value={organization.referredReward || ""}
              disabled={!isEditing}
              onChange={(e) => {
                setOrganization((prev) => ({
                  ...prev,
                  referredReward: e.target.value.toUpperCase(),
                }));
              }}
            />

            <NumberInput
              label="Número de Servicios"
              value={organization.serviceCount || 0}
              disabled={!isEditing}
              onChange={(value) => {
                const numericValue = typeof value === "number" ? value : 0;
                setOrganization((prev) => ({
                  ...prev,
                  serviceCount: numericValue,
                }));
              }}
            />

            <TextInput
              label="Premio por Servicios"
              value={organization.serviceReward || ""}
              disabled={!isEditing}
              onChange={(e) =>
                setOrganization((prev) => ({
                  ...prev,
                  serviceReward: e.target.value.toUpperCase(),
                }))
              }
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default OrganizationInfo;
