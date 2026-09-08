import { Card, Stack, Text, SimpleGrid, ThemeIcon, Group } from "@mantine/core";
import { IconCreditCard, IconTicket } from "@tabler/icons-react";

export type BookingMode = "single" | "package";

interface Props {
  onSelect: (mode: BookingMode) => void;
}

export default function StepBookingMode({ onSelect }: Props) {
  return (
    <Stack gap="md">
      <Text fw={600} size="lg">¿Cómo quieres agendar?</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="lg"
          onClick={() => onSelect("single")}
          style={{ cursor: "pointer" }}
        >
          <Stack align="center" gap="xs" ta="center">
            <ThemeIcon size={44} radius="xl" variant="light" color="blue">
              <IconCreditCard size={24} />
            </ThemeIcon>
            <Group gap={4}>
              <Text fw={700}>Pagar una clase</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Reserva y paga una sesión individual al precio de lista.
            </Text>
          </Stack>
        </Card>

        <Card
          withBorder
          radius="md"
          p="lg"
          onClick={() => onSelect("package")}
          style={{ cursor: "pointer" }}
        >
          <Stack align="center" gap="xs" ta="center">
            <ThemeIcon size={44} radius="xl" variant="light" color="grape">
              <IconTicket size={24} />
            </ThemeIcon>
            <Text fw={700}>Usar mi paquete</Text>
            <Text size="sm" c="dimmed">
              Ya compré un paquete de sesiones y quiero usar uno de mis créditos.
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
