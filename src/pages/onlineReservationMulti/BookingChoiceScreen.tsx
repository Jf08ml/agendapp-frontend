import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Badge,
  SimpleGrid,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { IconRobot, IconCalendarEvent } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface BookingChoiceScreenProps {
  onSelectAI: () => void;
  onSelectManual: () => void;
}

export default function BookingChoiceScreen({
  onSelectAI,
  onSelectManual,
}: BookingChoiceScreenProps) {
  const color =
    useSelector(
      (s: RootState) =>
        s.organization.organization?.branding?.primaryColor
    ) || "#1C3461";

  const orgName = useSelector(
    (s: RootState) => s.organization.organization?.name
  );

  return (
    <Stack align="center" gap="xl" py="xl">
      <Stack align="center" gap="xs">
        <Title order={2} ta="center">
          Reserva tu cita{orgName ? ` en ${orgName}` : ""}
        </Title>
        <Text c="dimmed" ta="center" size="sm">
          Elige cómo quieres continuar
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" w="100%" maw={600}>
        {/* Opción IA */}
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            cursor: "pointer",
            transition: "box-shadow 150ms ease, border-color 150ms ease",
            borderColor: color,
          }}
          onClick={onSelectAI}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              `0 0 0 2px ${color}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon
              size={rem(56)}
              radius="xl"
              style={{ background: color }}
            >
              <IconRobot size={28} color="white" />
            </ThemeIcon>
            <Stack align="center" gap={4}>
              <Group gap="xs">
                <Text fw={700} size="lg">
                  Asistente IA
                </Text>
                <Badge size="xs" color="yellow" variant="light">
                  Beta
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" ta="center">
                Cuéntame qué necesitas y te guío paso a paso por chat.
              </Text>
            </Stack>
          </Stack>
        </Card>

        {/* Opción manual */}
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            cursor: "pointer",
            transition: "box-shadow 150ms ease",
          }}
          onClick={onSelectManual}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 2px var(--mantine-color-gray-5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon size={rem(56)} radius="xl" color="gray" variant="light">
              <IconCalendarEvent size={28} />
            </ThemeIcon>
            <Stack align="center" gap={4}>
              <Text fw={700} size="lg">
                Reservar manualmente
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Selecciona servicio, fecha y horario a tu ritmo.
              </Text>
            </Stack>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
