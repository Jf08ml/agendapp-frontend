import { Stack, NumberInput, Switch, Group, Text } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function CancellationPolicyTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  return (
    <Stack gap="md">
      <SectionCard
        title="Política de cancelación"
        description="Configura las reglas para que los clientes puedan cancelar sus citas desde el enlace de cancelación."
      >
        <Stack gap="md">
          <NumberInput
            label="Tiempo mínimo de anticipación para cancelar"
            description="Número de horas antes de la cita en que el cliente puede cancelar. Deja en 0 para permitir cancelar en cualquier momento."
            placeholder="0"
            min={0}
            max={168}
            {...form.getInputProps("cancellationPolicy.minHoursBeforeAppointment")}
            disabled={!isEditing}
            rightSection={<Text size="sm" c="dimmed">horas</Text>}
          />

          {(form.values.cancellationPolicy?.minHoursBeforeAppointment ?? 0) > 0 && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Ejemplo: Si configuras 24 horas, un cliente no podrá cancelar una cita que sea en menos de 24 horas.
              </Text>
            </Group>
          )}

          <Switch
            label="No permitir cancelar citas confirmadas"
            description="Si está activo, los clientes no podrán cancelar citas que ya hayan sido confirmadas (por el administrador o por ellos mismos)"
            {...form.getInputProps("cancellationPolicy.preventCancellingConfirmed", { type: "checkbox" })}
            disabled={!isEditing}
          />

          {form.values.cancellationPolicy?.preventCancellingConfirmed && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Cuando una cita es confirmada (status = "confirmed" o el cliente ya confirmó asistencia), no podrá cancelarla desde su enlace.
              </Text>
            </Group>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
