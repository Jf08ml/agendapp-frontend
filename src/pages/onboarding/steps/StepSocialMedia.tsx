import { Stack, Group, Button, Divider, Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import SocialMediaTab from "../../admin/OrganizationInfo/components/tabs/SocialMediaTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function StepSocialMedia({ form, onNext, onSkip, onBack, saving }: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" radius="md">
        Agrega los enlaces de tus redes sociales para que tus clientes puedan encontrarte. Este paso es opcional y puedes completarlo después.
      </Alert>

      <SocialMediaTab form={form} isEditing={true} />

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
        Puedes agregar o editar tus redes sociales en cualquier momento desde Configuración del negocio → Redes sociales.
      </Text>
    </Stack>
  );
}
