import { useRef } from "react";
import { Box, Text, TextInput } from "@mantine/core";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";

interface AddressMapPickerProps {
  lat?: number;
  lng?: number;
  onChange: (data: { lat: number; lng: number; address?: string }) => void;
  height?: number;
  defaultCenter?: { lat: number; lng: number };
}

const FALLBACK_CENTER = { lat: 6.2442, lng: -75.5812 };

// Selector de ubicación reutilizable (autocomplete de Google Places + mapa con
// pin arrastrable). Controlado: no depende de useForm, solo de lat/lng + onChange.
// Mismo patrón que OrganizationInfo/components/tabs/LocationTab.tsx.
export default function AddressMapPicker({
  lat,
  lng,
  onChange,
  height = 280,
  defaultCenter = FALLBACK_CENTER,
}: AddressMapPickerProps) {
  const searchRef = useRef<google.maps.places.Autocomplete | null>(null);
  const hasPin = typeof lat === "number" && typeof lng === "number";
  const center = hasPin ? { lat, lng } : defaultCenter;

  const handlePlaceSelect = () => {
    const place = searchRef.current?.getPlace();
    if (place?.geometry?.location) {
      const loc = place.geometry.location;
      onChange({ lat: loc.lat(), lng: loc.lng(), address: place.formatted_address });
    }
  };

  return (
    <Box>
      <Autocomplete onLoad={(a) => (searchRef.current = a)} onPlaceChanged={handlePlaceSelect}>
        <TextInput placeholder="Buscar dirección..." mb="xs" />
      </Autocomplete>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: `${height}px`, borderRadius: 8 }}
        center={center}
        zoom={hasPin ? 16 : 12}
        onClick={(e) => {
          const nlat = e.latLng?.lat();
          const nlng = e.latLng?.lng();
          if (nlat != null && nlng != null) onChange({ lat: nlat, lng: nlng });
        }}
      >
        {hasPin && (
          <Marker
            position={{ lat: lat as number, lng: lng as number }}
            draggable
            onDragEnd={(e) => {
              const nlat = e.latLng?.lat();
              const nlng = e.latLng?.lng();
              if (nlat != null && nlng != null) onChange({ lat: nlat, lng: nlng });
            }}
          />
        )}
      </GoogleMap>

      <Text size="xs" c="dimmed" mt={4}>
        Busca tu dirección, toca el mapa o arrastra el pin para ajustar el punto exacto de entrega.
      </Text>
    </Box>
  );
}
