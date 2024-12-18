import { useEffect, useState } from "react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import {
  Card,
  Text,
  Title,
  TextInput,
  Button,
  Stack,
  Container,
  Divider,
  Group,
  Badge,
} from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../services/organizationService";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import CustomLoader from "../../components/customLoader/CustomLoader";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = { lat: 6.2442, lng: -75.5812 };

const OrganizationInfo = () => {
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
        await updateOrganization(organizationId, organization);
        showNotification({
          title: "Éxito",
          message: "Información actualizada correctamente",
          color: "green",
        });
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
      <Card shadow="sm" radius="md" mb="md">
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

        <Stack>
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
              setOrganization((prev) => ({ ...prev, email: e.target.value }))
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
        </Stack>
      </Card>
    </Container>
  );
};

export default OrganizationInfo;
