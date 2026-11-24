// Configuración inicial › Presentación (design system, ConfiguracionInicial ·
// Fase 2): mensaje de bienvenida y las 3 plantillas nuevas. Esencial queda
// elegida por defecto; Estudio y Academia se ven con «Pro».
import { Stack, TextInput, Textarea, Group, Button, Text, Paper, Divider, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import HomeTemplatePicker from "../../../components/HomeTemplatePicker";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepWelcomeMessage({ form, onNext, onBack, saving }: Props) {
  const planLimits = useSelector((s: RootState) => s.organization.organization?.planLimits);
  const canUseLanding = planLimits?.professionalLanding !== false;

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Escribe cómo saludas a tus clientes y elige cómo se verá tu página. Puedes cambiarlo cuando quieras en Ajustes.
      </Alert>

      {/* Mensaje de bienvenida */}
      <Paper withBorder p="md" radius="md">
        <Text fw={700} size="sm" mb="sm">Mensaje de bienvenida</Text>
        <Divider mb="md" />
        <Stack gap="md">
          <TextInput
            label="Título de bienvenida"
            description="Encabezado principal de tu página pública"
            placeholder="Ej: ¡Bienvenido a tu espacio de bienestar!"
            {...form.getInputProps("welcomeTitle")}
          />
          <Textarea
            label="Descripción de bienvenida"
            description="Una frase que describa tu negocio o invite al cliente a reservar"
            placeholder="Ej: Aquí te mereces lo mejor. Agenda tu cita"
            {...form.getInputProps("welcomeDescription")}
            minRows={2}
            autosize
          />
        </Stack>
      </Paper>

      {/* Plantilla */}
      <Paper withBorder p="md" radius="md">
        <Text fw={700} size="sm" mb="xs">Plantilla de tu página</Text>
        <Text size="xs" c="dimmed" mb="md">
          Esencial funciona para la mayoría de negocios. Estudio y Academia son parte de los planes Marca y Pro.
        </Text>
        <HomeTemplatePicker
          value={form.values.homeLayout}
          onChange={(layout) => form.setFieldValue("homeLayout", layout)}
          professionalLanding={canUseLanding}
          classesEnabled={form.values.enableClassBooking}
          name={form.values.name}
          logoUrl={(form.values.branding as { logoUrl?: string } | undefined)?.logoUrl}
          plansPath={null}
        />
      </Paper>

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar</Button>
      </Group>
    </Stack>
  );
}
