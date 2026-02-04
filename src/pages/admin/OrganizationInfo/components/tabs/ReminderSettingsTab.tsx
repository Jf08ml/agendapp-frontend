import { SimpleGrid, Stack, TextInput, Switch, NumberInput, Group, Text } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function ReminderSettingsTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  return (
    <Stack gap="md">
      <SectionCard
        title="Recordatorios automáticos"
        description="Configura el envío automático de recordatorios por WhatsApp a tus clientes."
      >
        <Stack gap="md">
          <Switch
            label="Activar recordatorios automáticos"
            description="Los clientes recibirán un mensaje recordatorio antes de su cita"
            {...form.getInputProps("reminderSettings.enabled", { type: "checkbox" })}
            disabled={!isEditing}
          />

          {form.values.reminderSettings?.enabled && (
            <>
              <NumberInput
                label="Enviar recordatorio con anticipación"
                description="Horas antes de cada cita para enviar el recordatorio"
                placeholder="24"
                min={1}
                max={72}
                {...form.getInputProps("reminderSettings.hoursBefore")}
                disabled={!isEditing}
                rightSection={<Text size="sm" c="dimmed">horas</Text>}
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Horario de inicio"
                  description="Hora más temprana para enviar"
                  placeholder="07:00"
                  {...form.getInputProps("reminderSettings.sendTimeStart")}
                  disabled={!isEditing}
                />

                <TextInput
                  label="Horario de fin"
                  description="Hora más tardía para enviar"
                  placeholder="20:00"
                  {...form.getInputProps("reminderSettings.sendTimeEnd")}
                  disabled={!isEditing}
                />
              </SimpleGrid>

              <Group gap="xs" mt="xs">
                <Text size="sm" c="dimmed">
                  Ejemplo: Si una cita es a las 3:00 PM del día 8, y configuras 24 horas antes
                  con rango 7:00-20:00, el recordatorio se enviará el día 7 a las 3:00 PM
                  (porque está dentro del rango permitido).
                </Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Si la hora calculada cae fuera del rango (ej: cita a las 2:00 AM),
                  el recordatorio se enviará al inicio del rango (7:00 AM).
                </Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="blue">
                  Si un cliente tiene varias citas el mismo día, recibirá un solo mensaje
                  consolidado con todas sus citas. Los recordatorios se envían de forma
                  distribuida para evitar detección de spam.
                </Text>
              </Group>

              <Switch
                label="Activar segundo recordatorio"
                description="Envía un recordatorio adicional más cercano a la cita"
                {...form.getInputProps("reminderSettings.secondReminder.enabled", { type: "checkbox" })}
                disabled={!isEditing}
                mt="md"
              />

              {form.values.reminderSettings?.secondReminder?.enabled && (
                <NumberInput
                  label="Segundo recordatorio con anticipación"
                  description="Horas antes de cada cita para enviar el segundo recordatorio"
                  placeholder="2"
                  min={1}
                  max={72}
                  {...form.getInputProps("reminderSettings.secondReminder.hoursBefore")}
                  disabled={!isEditing}
                  rightSection={<Text size="sm" c="dimmed">horas</Text>}
                />
              )}
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
