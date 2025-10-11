import { Alert, Box, SimpleGrid, Text, TextInput } from "@mantine/core";
import SectionCard from "../SectionCard";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { useRef } from "react";
import { IoAlertCircle } from "react-icons/io5";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

const mapContainerStyle = { width: "100%", height: "380px" };
const defaultCenter = { lat: 6.2442, lng: -75.5812 };

export default function LocationTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const searchRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceSelect = () => {
    const place = searchRef.current?.getPlace();
    if (place?.geometry?.location) {
      const loc = place.geometry.location;
      form.setValues({
        ...form.values,
        location: { lat: loc.lat(), lng: loc.lng() },
        address: place.formatted_address || form.values.address || "",
      });
    }
  };

  return (
    <SectionCard
      title="Ubicación"
      description="Busca y ajusta manualmente la ubicación en el mapa."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
        <TextInput
          label="Dirección"
          {...form.getInputProps("address")}
          disabled={!isEditing}
          placeholder="Calle 123 #45-67"
        />

        <Box>
          <Text size="sm" fw={500} mb={4}>
            Buscar dirección
          </Text>
          <Autocomplete
            onLoad={(a) => (searchRef.current = a)}
            onPlaceChanged={handlePlaceSelect}
          >
            <TextInput
              placeholder="Ingresa una dirección"
              disabled={!isEditing}
            />
          </Autocomplete>
        </Box>
      </SimpleGrid>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={
          form.values.location
            ? { lat: form.values.location.lat, lng: form.values.location.lng }
            : defaultCenter
        }
        zoom={13}
        onClick={(e) => {
          if (!isEditing) return;
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (lat && lng) form.setFieldValue("location", { lat, lng });
        }}
      >
        {form.values.location && (
          <Marker
            position={form.values.location}
            draggable={isEditing}
            onDragEnd={(e) => {
              const lat = e.latLng?.lat();
              const lng = e.latLng?.lng();
              if (lat && lng) form.setFieldValue("location", { lat, lng });
            }}
          />
        )}
      </GoogleMap>

      {form.values.location && (
        <Alert mt="sm" icon={<IoAlertCircle />} color="gray" variant="light">
          Lat: {form.values.location.lat} — Lng: {form.values.location.lng}
        </Alert>
      )}
    </SectionCard>
  );
}
