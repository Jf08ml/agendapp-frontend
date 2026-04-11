import { Stack, Group, Button, Divider, Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import LocationTab from "../../admin/OrganizationInfo/components/tabs/LocationTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepLocation({ form, onNext, onSkip, onBack, saving }: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" radius="md">
        Indica dónde se encuentra tu negocio para que los clientes puedan encontrarte fácilmente. Este paso es opcional.
      </Alert>

      <LocationTab form={form} isEditing={true} />

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Group>
          <Button variant="subtle" color="gray" onClick={onSkip}>
            Omitir por ahora
          </Button>
          <Button size="md" onClick={onNext} loading={saving}>
            Guardar y continuar →
          </Button>
        </Group>
      </Group>
      <Text size="xs" c="dimmed" ta="center">
        Puedes agregar tu ubicación en cualquier momento desde Configuración del negocio → Ubicación.
      </Text>
    </Stack>
  );
}
