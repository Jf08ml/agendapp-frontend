// Perfil → Redes sociales (design system, Fase 2): el negocio escribe solo su
// usuario (o número de WhatsApp con indicativo) y se arma el enlace. Si pega
// un enlace completo, se toma el usuario; si es de otra red, se avisa.
import { SimpleGrid, TextInput } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandTiktok,
  IconWorld,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import SectionCard from "../SectionCard";
import type { FormValues } from "../../schema";
import { SOCIAL_PREFIX, socialError, socialHandle, socialUrl, type SocialNetwork } from "../../settingsHelpers";

type SocialKey = "facebookUrl" | "instagramUrl" | "whatsappUrl" | "tiktokUrl";

const FIELDS: { key: SocialKey; network: SocialNetwork; label: string; placeholder: string; icon: ReactNode; description?: string }[] = [
  { key: "facebookUrl", network: "facebook", label: "Facebook", placeholder: "tu-pagina", icon: <IconBrandFacebook size={16} color="#1877F2" /> },
  { key: "instagramUrl", network: "instagram", label: "Instagram", placeholder: "tu.cuenta", icon: <IconBrandInstagram size={16} color="#E1306C" /> },
  {
    key: "whatsappUrl",
    network: "whatsapp",
    label: "WhatsApp",
    placeholder: "573001234567",
    icon: <IconBrandWhatsapp size={16} color="#25D366" />,
    description: "Con el indicativo del país, sin espacios ni «+».",
  },
  { key: "tiktokUrl", network: "tiktok", label: "TikTok", placeholder: "tu.cuenta", icon: <IconBrandTiktok size={16} /> },
];

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
      description="Escribe solo tu usuario; el enlace se arma solo. Aparecen en el encabezado y el pie de tu web."
      icon={<IconWorld size={16} />}
      iconColor="indigo"
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {FIELDS.map(({ key, network, label, placeholder, icon, description }) => {
          const url = (form.values[key] as string | null | undefined) ?? "";
          const handle = socialHandle(network, url);
          const prefix = SOCIAL_PREFIX[network];
          return (
            <TextInput
              key={key}
              label={label}
              description={description}
              placeholder={placeholder}
              value={handle ?? url}
              onChange={(e) => form.setFieldValue(key, socialUrl(network, e.currentTarget.value))}
              error={socialError(network, url) ?? form.errors[key]}
              leftSectionWidth={prefix.length * 7 + 44}
              leftSection={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingLeft: 10, paddingRight: 6, width: "100%", color: "var(--ink-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                  {icon}
                  {prefix}
                </span>
              }
              disabled={!isEditing}
            />
          );
        })}
      </SimpleGrid>
    </SectionCard>
  );
}
