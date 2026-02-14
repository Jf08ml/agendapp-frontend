import { Container, Paper, Title, Text, Button, Stack } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";

export default function NotFoundOrg() {
  return (
    <Container size={400} my={80}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack align="center" gap="md">
          <IconBuildingStore size={48} color="var(--mantine-color-gray-5)" />
          <Title order={3} ta="center">
            Organización no encontrada
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            El subdominio que ingresaste no corresponde a ninguna organización
            registrada. Verifica la dirección o crea tu propia cuenta.
          </Text>
          <Button
            fullWidth
            onClick={() => {
              window.location.href = "https://app.agenditapp.com/signup";
            }}
          >
            Crear cuenta gratis
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
