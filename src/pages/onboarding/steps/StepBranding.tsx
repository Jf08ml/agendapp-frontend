import { Stack, Group, Button, Divider, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";
import BrandingTab from "../../admin/OrganizationInfo/components/tabs/BrandingTab";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  uploadingLogo: boolean;
  uploadingFavicon: boolean;
  uploadingPwaIcon: boolean;
  onUpload: (file: File | null, key: "logoUrl" | "faviconUrl" | "pwaIcon") => void;
}

export default function StepBranding({
  form, onNext, onBack, saving,
  uploadingLogo, uploadingFavicon, uploadingPwaIcon, onUpload,
}: Props) {
  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Sube el logo de tu negocio y personaliza los colores de tu marca. Esto se reflejará en tu página pública y en la app instalable (PWA).
      </Alert>

      <BrandingTab
        form={form}
        isEditing={true}
        uploadingLogo={uploadingLogo}
        uploadingFavicon={uploadingFavicon}
        uploadingPwaIcon={uploadingPwaIcon}
        onUpload={onUpload}
      />

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">← Anterior</Button>
        <Button size="md" onClick={onNext} loading={saving}>Guardar y continuar →</Button>
      </Group>
    </Stack>
  );
}
