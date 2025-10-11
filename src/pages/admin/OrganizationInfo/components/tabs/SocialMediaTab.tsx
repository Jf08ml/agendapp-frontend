import { SimpleGrid, TextInput } from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function SocialMediaTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  return (
    <SectionCard
      title="Redes sociales"
      description="Enlaces que se mostrarán en el header y footer."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Facebook"
          {...form.getInputProps("facebookUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="Instagram"
          {...form.getInputProps("instagramUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="WhatsApp"
          {...form.getInputProps("whatsappUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="TikTok"
          {...form.getInputProps("tiktokUrl")}
          disabled={!isEditing}
        />
      </SimpleGrid>
    </SectionCard>
  );
}
