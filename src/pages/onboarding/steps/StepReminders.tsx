import { Stack, Group, Button, Divider, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import ReminderSettingsTab from "../../admin/OrganizationInfo/components/tabs/ReminderSettingsTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepReminders({ form, onNext, onBack, saving }: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Configura los recordatorios automáticos por WhatsApp para reducir las inasistencias. Los clientes recibirán un mensaje antes de su cita.
        Para que funcionen, deberás conectar tu WhatsApp en el siguiente paso.
      </Alert>

      <ReminderSettingsTab form={form} isEditing={true} />

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
