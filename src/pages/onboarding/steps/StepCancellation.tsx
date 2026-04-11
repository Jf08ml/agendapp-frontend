import { Stack, Group, Button, Divider, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import CancellationPolicyTab from "../../admin/OrganizationInfo/components/tabs/CancellationPolicyTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepCancellation({ form, onNext, onBack, saving }: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Define cuándo y cómo los clientes pueden cancelar sus citas desde el enlace de cancelación que reciben por WhatsApp.
      </Alert>

      <CancellationPolicyTab form={form} isEditing={true} />

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
