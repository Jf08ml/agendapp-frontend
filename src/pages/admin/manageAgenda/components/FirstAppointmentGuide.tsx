import { useState } from "react";
import { Paper, Group, Stack, Text, Button, ThemeIcon, ActionIcon } from "@mantine/core";
import { IconCalendarPlus, IconArrowRight, IconX, IconSparkles } from "@tabler/icons-react";

interface Props {
  /** Abre el modal de nueva cita (para hoy). */
  onCreateFirst: () => void;
  /** Si el negocio entró con datos de ejemplo (cambia el copy). */
  seeded?: boolean;
}

/**
 * Guía de activación: empuja al usuario recién configurado a crear su PRIMERA
 * cita (el evento de activación). Se muestra en la agenda cuando el negocio ya
 * tiene profesionales pero aún no ha creado ninguna cita. Es descartable.
 */
export default function FirstAppointmentGuide({ onCreateFirst, seeded }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Paper
      withBorder
      radius="lg"
      p="lg"
      mb="md"
      style={{
        background:
          "linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-violet-0) 100%)",
        borderColor: "var(--mantine-color-blue-2)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" gap="md" wrap="nowrap">
          <ThemeIcon size={48} radius="xl" variant="light" color="blue" style={{ flexShrink: 0 }}>
            <IconSparkles size={24} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={700} size="md">
              Da el primer paso: crea tu primera cita
            </Text>
            <Text size="sm" c="dimmed" maw={560}>
              {seeded
                ? "Tu agenda ya tiene servicios y profesionales de ejemplo. Crea una cita de prueba para ver cómo funciona — puedes editar o borrar los ejemplos cuando quieras."
                : "Agenda tu primera cita para ver tu negocio funcionando. Toma menos de un minuto y es la mejor forma de conocer la plataforma."}
            </Text>
            <Group gap="xs" mt={6}>
              <Button
                leftSection={<IconCalendarPlus size={16} />}
                rightSection={<IconArrowRight size={14} />}
                onClick={onCreateFirst}
              >
                Crear mi primera cita
              </Button>
            </Group>
          </Stack>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setDismissed(true)}
          aria-label="Descartar"
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
