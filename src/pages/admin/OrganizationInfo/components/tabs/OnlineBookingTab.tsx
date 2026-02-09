import { Switch, Stack, Text } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function OnlineBookingTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  return (
    <SectionCard
      title="Configuración de reserva en línea"
      description="Controla la disponibilidad y visibilidad del sistema de reservas en línea para tus clientes."
    >
      <Stack gap="md">
        <Switch
          label="Habilitar reserva en línea"
          description="Permite a los clientes hacer reservas en línea. Al desactivar, se ocultará el botón de reserva en el menú de navegación y en la página principal."
          {...form.getInputProps("enableOnlineBooking", { type: "checkbox" })}
          disabled={!isEditing}
        />
        
        <Text size="sm" c="dimmed" mt="md">
          Cuando la reserva en línea está deshabilitada, los clientes no podrán acceder al sistema de reservas. 
          Solo podrán agendar citas a través del administrador o por otros medios de contacto.
        </Text>
      </Stack>
    </SectionCard>
  );
}
