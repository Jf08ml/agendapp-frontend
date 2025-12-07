import { SimpleGrid, Stack, TextInput, Textarea, Select, Switch, NumberInput, Group, Text } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function ContactTab({
  form,
  isEditing,
  domains,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  domains: string[];
}) {
  return (
    <Stack gap="md">
      <SectionCard
        title="Nombre y contacto"
        description="Estos datos se usan en tu encabezado, recibos y comunicaciones."
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Nombre"
            {...form.getInputProps("name")}
            disabled={!isEditing}
          />
          <TextInput
            label="Correo electrónico"
            {...form.getInputProps("email")}
            disabled={!isEditing}
          />
          <TextInput
            label="Teléfono"
            {...form.getInputProps("phoneNumber")}
            disabled={!isEditing}
          />
          <TextInput
            label="Dominios"
            value={(domains || []).join(", ")}
            disabled
          />
        </SimpleGrid>
      </SectionCard>

      <SectionCard
        title="Mensaje de bienvenida"
        description="Personaliza el mensaje que verán tus clientes en la página de inicio."
      >
        <Stack gap="md">
          <Select
            label="Diseño de página de inicio"
            description="Elige cómo se mostrará la página principal a tus clientes"
            {...form.getInputProps("homeLayout")}
            disabled={!isEditing}
            data={[
              { value: "modern", label: "Moderno - Con gradientes difuminados" },
              { value: "minimal", label: "Minimalista - Diseño limpio y simple" },
              { value: "cards", label: "Tarjetas - Enfoque en servicios" },
            ]}
          />
          <TextInput
            label="Título de bienvenida"
            placeholder="¡Hola! Bienvenido"
            {...form.getInputProps("welcomeTitle")}
            disabled={!isEditing}
          />
          <Textarea
            label="Descripción de bienvenida"
            placeholder="Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨"
            {...form.getInputProps("welcomeDescription")}
            disabled={!isEditing}
            minRows={3}
          />
        </Stack>
      </SectionCard>

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
                  💡 Ejemplo: Si una cita es a las 3:00 PM del día 8, y configuras 24 horas antes 
                  con rango 7:00-20:00, el recordatorio se enviará el día 7 a las 3:00 PM 
                  (porque está dentro del rango permitido).
                </Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  🕐 Si la hora calculada cae fuera del rango (ej: cita a las 2:00 AM), 
                  el recordatorio se enviará al inicio del rango (7:00 AM).
                </Text>
              </Group>

              <Group gap="xs">
                <Text size="sm" c="blue">
                  ℹ️ Si un cliente tiene varias citas el mismo día, recibirá un solo mensaje 
                  consolidado con todas sus citas. Los recordatorios se envían de forma 
                  distribuida para evitar detección de spam.
                </Text>
              </Group>
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
