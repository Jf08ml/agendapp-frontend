import {
  Stack, Group, Button, Text, Paper, ThemeIcon, Badge, Divider,
  Alert, SimpleGrid, Box,
} from "@mantine/core";
import {
  IconCheck, IconClock, IconUserCheck, IconInfoCircle,
} from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepOnlineBooking({ form, onNext, onBack, saving }: Props) {
  const isAutoApprove = (form.values.reservationPolicy ?? "manual") === "auto_if_available";

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Define si las reservas de tus clientes se confirman de forma automática o si necesitan tu aprobación manual.
        Podrás cambiarlo en cualquier momento desde la configuración del negocio.
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Opción: Aprobación automática */}
        <Paper
          withBorder
          radius="md"
          p="lg"
          style={{
            cursor: "pointer",
            borderColor: isAutoApprove
              ? "var(--mantine-color-green-6)"
              : "var(--mantine-color-gray-3)",
            borderWidth: isAutoApprove ? 2 : 1,
            background: isAutoApprove ? "var(--mantine-color-green-0)" : undefined,
            transition: "all 0.15s",
          }}
          onClick={() => form.setFieldValue("reservationPolicy", "auto_if_available")}
        >
          <Stack gap="sm">
            <Group gap="sm">
              <ThemeIcon size="xl" radius="md" color="green" variant="light">
                <IconCheck size={22} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="md">Aprobación automática</Text>
                {isAutoApprove && <Badge color="green" size="xs" mt={2}>Seleccionado</Badge>}
              </div>
            </Group>
            <Text size="sm" c="dimmed">
              Las reservas se confirman al instante. El cliente recibe una notificación inmediata y la cita queda agendada sin intervención tuya.
            </Text>
            <Box>
              <Text size="xs" fw={600} mb={4}>Ideal si:</Text>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">✅ Tienes disponibilidad clara y definida</Text>
                <Text size="xs" c="dimmed">✅ Quieres reducir fricción para tus clientes</Text>
                <Text size="xs" c="dimmed">✅ Confías en que tu horario es correcto</Text>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Opción: Aprobación manual */}
        <Paper
          withBorder
          radius="md"
          p="lg"
          style={{
            cursor: "pointer",
            borderColor: !isAutoApprove
              ? "var(--mantine-color-blue-6)"
              : "var(--mantine-color-gray-3)",
            borderWidth: !isAutoApprove ? 2 : 1,
            background: !isAutoApprove ? "var(--mantine-color-blue-0)" : undefined,
            transition: "all 0.15s",
          }}
          onClick={() => form.setFieldValue("reservationPolicy", "manual")}
        >
          <Stack gap="sm">
            <Group gap="sm">
              <ThemeIcon size="xl" radius="md" color="blue" variant="light">
                <IconUserCheck size={22} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="md">Aprobación manual</Text>
                {!isAutoApprove && <Badge color="blue" size="xs" mt={2}>Seleccionado</Badge>}
              </div>
            </Group>
            <Text size="sm" c="dimmed">
              Las reservas quedan en estado "pendiente" hasta que tú las apruebes o rechaces desde el panel de administración.
            </Text>
            <Box>
              <Text size="xs" fw={600} mb={4}>Ideal si:</Text>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">✅ Quieres revisar cada solicitud antes de confirmar</Text>
                <Text size="xs" c="dimmed">✅ Tu disponibilidad varía frecuentemente</Text>
                <Text size="xs" c="dimmed">✅ Atiendes clientes selectivos o por invitación</Text>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="sm" radius="md" bg="gray.0">
        <Group gap="xs">
          <IconClock size={16} />
          <Text size="sm">
            <Text span fw={600}>Consejo:</Text> La mayoría de negocios pequeños comienzan con{" "}
            <Text span fw={600} c="green">aprobación automática</Text> para dar mejor experiencia al cliente.
            Puedes cambiar esta configuración en cualquier momento.
          </Text>
        </Group>
      </Paper>

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
