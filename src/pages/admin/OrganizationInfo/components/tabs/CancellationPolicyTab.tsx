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

      <SectionCard
        title="Reagendamiento por el cliente"
        description="Permite que el cliente cambie el día u hora de su cita desde el mismo enlace que recibe por WhatsApp, sin tener que escribirte."
      >
        <Stack gap="md">
          <Switch
            label="Permitir que el cliente reagende su cita"
            description="Solo aplica a citas individuales; mantiene el mismo servicio y profesional, y solo ofrece horarios realmente libres."
            {...form.getInputProps("reschedulePolicy.enabled", { type: "checkbox" })}
            disabled={!isEditing}
          />

          {form.values.reschedulePolicy?.enabled && (
            <>
              <NumberInput
                label="Veces que puede reagendar una misma cita"
                description="Al llegar a este número, el enlace ya no ofrece reagendar."
                min={1}
                max={10}
                {...form.getInputProps("reschedulePolicy.maxReschedules")}
                disabled={!isEditing}
              />
              <NumberInput
                label="Anticipación mínima para reagendar"
                description="No se puede reagendar con menos de estas horas de anticipación a la cita. Deja en 0 para permitirlo hasta el último momento."
                min={0}
                max={168}
                {...form.getInputProps("reschedulePolicy.minHoursBeforeAppointment")}
                disabled={!isEditing}
                rightSection={<Text size="sm" c="dimmed">horas</Text>}
              />
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Cada reagendamiento te llega como notificación, y el cliente recibirá un nuevo recordatorio para la nueva fecha.
                </Text>
              </Group>
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
