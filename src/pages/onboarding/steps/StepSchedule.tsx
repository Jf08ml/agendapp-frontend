import { Stack, Group, Button, Divider, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import OpeningHoursTab from "../../admin/OrganizationInfo/components/tabs/OpeningHoursTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepSchedule({ form, onNext, onBack, saving }: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Define tu horario de atención, los días laborales y el intervalo de tiempo mínimo entre citas.
        Podrás ajustarlo en cualquier momento desde la configuración del negocio.
      </Alert>

      <OpeningHoursTab form={form} isEditing={true} hideClassBooking={true} />

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
