import React from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import {
  Text,
  Title,
  Container,
  Stack,
  Center,
  Button,
  Card,
  Box,
  useMantineTheme,
  Paper,
  rem,
} from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { MdLocationOn } from "react-icons/md";

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "18px",
  overflow: "hidden",
};

const defaultCenter = { lat: 6.2442, lng: -75.5812 };

function getPlatformMapUrl(lat: number, lng: number) {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return `https://maps.apple.com/?q=${lat},${lng}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const Location: React.FC = () => {
  const theme = useMantineTheme();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const loading = useSelector(
    (state: RootState) => state.organization.loading
  );

  const location = organization?.location || null;
  const address = organization?.address || "Dirección no disponible";

  // Un solo botón inteligente
  const handleOpenMap = () => {
    if (!location) return;
    const url = getPlatformMapUrl(location.lat, location.lng);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <CustomLoader />;

  return (
    <Container size="sm" p={0} mt="lg">
      <Card
        shadow="lg"
        radius="xl"
        withBorder
        p={rem(28)}
        style={{
          maxWidth: 500,
          margin: "0 auto",
        }}
      >
        <Stack gap="md">
          <Title
            order={2}
            style={{
              textAlign: "center",
              fontWeight: 900,
              color: theme.colors[theme.primaryColor][6],
              marginBottom: 2,
            }}
          >
            Nuestra ubicación
          </Title>

          <Text c="dimmed" ta="center" mb={2}>
            {address}
          </Text>

          <Paper
            shadow="sm"
            radius="lg"
            style={{ overflow: "hidden", margin: "0 auto", width: "100%" }}
            mb={10}
          >
            <Box style={mapContainerStyle}>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={location || defaultCenter}
                zoom={15}
              >
                {location && <Marker position={location} />}
              </GoogleMap>
            </Box>
          </Paper>

          {!location && (
            <Center>
              <Text c="red">No se pudo cargar la ubicación</Text>
            </Center>
          )}

          <Button
            leftSection={<MdLocationOn />}
            onClick={handleOpenMap}
            size="md"
            radius="xl"
            fullWidth
            color={theme.primaryColor}
            variant="filled"
            style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}
            disabled={!location}
            mt={6}
          >
            Abrir en el mapa
          </Button>
        </Stack>
      </Card>
    </Container>
  );
};

export default Location;
