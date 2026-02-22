import { Alert, Divider, List, NumberInput, SimpleGrid, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconBell, IconBulb, IconBrandWhatsapp } from "@tabler/icons-react";
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
  const enabled = form.values.reminderSettings?.enabled;
  const hours = form.values.reminderSettings?.hoursBefore ?? 24;
  const start = form.values.reminderSettings?.sendTimeStart ?? "07:00";
  const end = form.values.reminderSettings?.sendTimeEnd ?? "20:00";

  return (
    <Stack gap="md">
      <SectionCard
        title="Recordatorios automáticos"
        description="Envía mensajes por WhatsApp a tus clientes antes de sus citas para reducir inasistencias."
        icon={<IconBell size={16} />}
        iconColor="orange"
      >
        <Stack gap="md">
          <Switch
            label="Activar recordatorios automáticos"
            description="Los clientes recibirán un mensaje de WhatsApp recordándoles su cita"
            {...form.getInputProps("reminderSettings.enabled", { type: "checkbox" })}
            disabled={!isEditing}
          />

          {enabled && (
            <>
              <Divider />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label="Anticipación del recordatorio"
                  description="¿Con cuántas horas de anticipación enviar el mensaje?"
                  placeholder="24"
                  min={1}
                  max={72}
                  suffix=" horas"
                  {...form.getInputProps("reminderSettings.hoursBefore")}
                  disabled={!isEditing}
                />

                <Alert
                  icon={<IconBulb size={14} />}
                  color="blue"
                  variant="light"
                  title="Ejemplo"
                  styles={{ title: { fontSize: 13 }, body: { fontSize: 12 } }}
                >
                  Cita el martes a las 3 PM → recordatorio el lunes a las 3 PM
                  {` (${hours}h antes)`}
                </Alert>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Horario de envío — desde"
                  description="Hora más temprana permitida para enviar"
                  placeholder="07:00"
                  {...form.getInputProps("reminderSettings.sendTimeStart")}
                  disabled={!isEditing}
                />
                <TextInput
                  label="Horario de envío — hasta"
                  description="Hora más tardía permitida para enviar"
                  placeholder="20:00"
                  {...form.getInputProps("reminderSettings.sendTimeEnd")}
                  disabled={!isEditing}
                />
              </SimpleGrid>

              <Alert
                icon={<IconBrandWhatsapp size={14} />}
                color="teal"
                variant="light"
              >
                <List size="xs" spacing={4}>
                  <List.Item>
                    Si la hora calculada cae fuera del rango {start}–{end}, el mensaje se enviará al comienzo del rango.
                  </List.Item>
                  <List.Item>
                    Varios servicios en el mismo día se consolidan en <strong>un solo mensaje</strong> para no saturar al cliente.
                  </List.Item>
                  <List.Item>
                    Los envíos se distribuyen en el tiempo para evitar bloqueos por spam.
                  </List.Item>
                </List>
              </Alert>

              <Divider />

              <Switch
                label="Activar segundo recordatorio"
                description="Envía un aviso adicional más cercano a la hora de la cita"
                {...form.getInputProps("reminderSettings.secondReminder.enabled", { type: "checkbox" })}
                disabled={!isEditing}
              />

              {form.values.reminderSettings?.secondReminder?.enabled && (
                <NumberInput
                  label="Anticipación del segundo recordatorio"
                  description="Horas antes de la cita para el segundo mensaje"
                  placeholder="2"
                  min={1}
                  max={72}
                  suffix=" horas"
                  {...form.getInputProps("reminderSettings.secondReminder.hoursBefore")}
                  disabled={!isEditing}
                  w={{ base: "100%", sm: 260 }}
                />
              )}
            </>
          )}

          {!enabled && (
            <Alert icon={<IconBulb size={14} />} color="gray" variant="light">
              <Text size="sm">
                Activa los recordatorios para configurar cuándo y cómo se envían los mensajes a tus clientes.
              </Text>
            </Alert>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
