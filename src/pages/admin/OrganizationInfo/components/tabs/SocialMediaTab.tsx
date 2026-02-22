import { SimpleGrid, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandTiktok,
  IconWorld,
} from "@tabler/icons-react";
import SectionCard from "../SectionCard";
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
      description="Los enlaces que agregues aparecerán en el encabezado y pie de página de tu sitio público."
      icon={<IconWorld size={16} />}
      iconColor="indigo"
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Facebook"
          placeholder="https://facebook.com/tu-pagina"
          leftSection={<IconBrandFacebook size={16} color="#1877F2" />}
          {...form.getInputProps("facebookUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="Instagram"
          placeholder="https://instagram.com/tu-cuenta"
          leftSection={<IconBrandInstagram size={16} color="#E1306C" />}
          {...form.getInputProps("instagramUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="WhatsApp"
          placeholder="https://wa.me/57300000000"
          leftSection={<IconBrandWhatsapp size={16} color="#25D366" />}
          {...form.getInputProps("whatsappUrl")}
          disabled={!isEditing}
        />
        <TextInput
          label="TikTok"
          placeholder="https://tiktok.com/@tu-cuenta"
          leftSection={<IconBrandTiktok size={16} />}
          {...form.getInputProps("tiktokUrl")}
          disabled={!isEditing}
        />
      </SimpleGrid>
    </SectionCard>
  );
}
