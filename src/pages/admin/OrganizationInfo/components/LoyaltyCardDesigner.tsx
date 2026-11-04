/**
 * Editor del diseño de la tarjeta virtual de fidelidad (Información del negocio
 * → Fidelidad). Plantilla + color + texto + imagen de fondo por tarjeta, con
 * vista previa en vivo. Se guarda con el resto del formulario (loyaltyCard).
 */
import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  FileButton,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconPhoto, IconTrash } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../schema";
import LoyaltyCardFace from "../../../../components/loyaltyCard/LoyaltyCardFace";
import { CARD_TEMPLATES, normalizeTiers, shade } from "../../../../components/loyaltyCard/loyaltyCardUtils";
import { uploadImage } from "../../../../services/imageService";
import type { LoyaltyCardDesign, LoyaltyCardTemplate } from "../../../../services/loyaltyCardService";

const SWATCH: Record<LoyaltyCardTemplate, (c: string) => string> = {
  classic: (c) => `linear-gradient(135deg, ${c}, ${shade(c, -0.35)})`,
  gradient: (c) => `linear-gradient(135deg, ${c}, ${shade(c, 0.35)} 50%, ${shade(c, -0.2)})`,
  dark: (c) => `linear-gradient(145deg, #1a1b1e, #2c2e33 60%, ${shade(c, -0.55)})`,
  pastel: (c) => `linear-gradient(135deg, ${shade(c, 0.82)}, ${shade(c, 0.65)})`,
  minimal: () => "#ffffff",
  image: () => "linear-gradient(135deg, #868e96, #495057)",
};

type BgKey = "serviceBackgroundUrl" | "referralBackgroundUrl";

export default function LoyaltyCardDesigner({
  form,
  disabled,
}: {
  form: UseFormReturnType<FormValues>;
  disabled: boolean;
}) {
  const design: LoyaltyCardDesign = (form.values.loyaltyCard as LoyaltyCardDesign) ?? {};
  const branding = form.values.branding as { primaryColor?: string; logoUrl?: string } | undefined;
  const brandColor = branding?.primaryColor || "#7048e8";
  const color = design.primaryColor || brandColor;
  const [uploading, setUploading] = useState<BgKey | null>(null);

  const set = (patch: Partial<LoyaltyCardDesign>) =>
    form.setFieldValue("loyaltyCard", { ...design, ...patch } as FormValues["loyaltyCard"]);

  const pickTemplate = (template: LoyaltyCardTemplate) => {
    const t = CARD_TEMPLATES.find((x) => x.value === template);
    set({ template, textColor: t?.defaultText ?? "light" });
  };

  const onUpload = async (file: File | null, key: BgKey) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification({ title: "Archivo inválido", message: "Debe ser una imagen", color: "red" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showNotification({ title: "Archivo muy grande", message: "Máximo 3MB", color: "red" });
      return;
    }
    setUploading(key);
    try {
      const url = await uploadImage(file);
      if (!url) throw new Error("Sin URL");
      // Subir una imagen activa la plantilla "Con imagen".
      set({ [key]: url, template: "image", textColor: design.template === "image" ? design.textColor : "light" });
    } catch {
      showNotification({ title: "Error", message: "No se pudo subir la imagen", color: "red" });
    } finally {
      setUploading(null);
    }
  };

  const serviceTiers = normalizeTiers(form.values.serviceTiers as never);
  const referralTiers = normalizeTiers(form.values.referralTiers as never);
  const sampleCount = (max: number) => (max > 1 ? Math.max(1, Math.floor(max / 2)) : 0);
  const orgName = (form.values as { name?: string }).name || "Tu negocio";

  const bgPicker = (key: BgKey, label: string) => (
    <Group gap="xs" wrap="nowrap">
      <FileButton onChange={(f) => onUpload(f, key)} accept="image/*" disabled={disabled}>
        {(props) => (
          <Button
            {...props}
            size="xs"
            variant="light"
            leftSection={<IconPhoto size={14} />}
            loading={uploading === key}
            disabled={disabled}
          >
            {design[key] ? `Cambiar fondo ${label}` : `Fondo ${label}`}
          </Button>
        )}
      </FileButton>
      {design[key] && (
        <Tooltip label="Quitar imagen">
          <ActionIcon variant="subtle" color="red" disabled={disabled} onClick={() => set({ [key]: null })}>
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );

  return (
    <Stack gap="md">
      <Box>
        <Text fw={500} size="sm" mb={4}>Plantilla</Text>
        <SimpleGrid cols={{ base: 3, sm: 6 }} spacing="xs">
          {CARD_TEMPLATES.map((t) => {
            const active = (design.template || "classic") === t.value;
            return (
              <UnstyledButton
                key={t.value}
                disabled={disabled}
                onClick={() => pickTemplate(t.value)}
                style={{ textAlign: "center", opacity: disabled ? 0.6 : 1 }}
              >
                <Box
                  style={{
                    aspectRatio: "1.586",
                    borderRadius: 8,
                    background: SWATCH[t.value](color),
                    border: active ? `2px solid ${color}` : "1px solid var(--mantine-color-gray-3)",
                    outline: active ? `2px solid ${shade(color, 0.6)}` : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t.value === "image" && <IconPhoto size={18} color="#fff" />}
                  {active && t.value !== "image" && (
                    <IconCheck size={16} color={t.defaultText === "light" ? "#fff" : color} />
                  )}
                </Box>
                <Text size="xs" mt={4} fw={active ? 700 : 400}>{t.label}</Text>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <ColorInput
          label="Color de la tarjeta"
          description="Vacío = color de tu marca"
          placeholder={brandColor}
          value={design.primaryColor || ""}
          onChange={(v) => set({ primaryColor: v || null })}
          disabled={disabled}
          popoverProps={{ zIndex: 400 }}
        />
        <Box>
          <Text fw={500} size="sm">Color del texto</Text>
          <Text size="xs" c="dimmed" mb={4}>Elige el que se lea mejor sobre el fondo</Text>
          <SegmentedControl
            fullWidth
            disabled={disabled}
            value={design.textColor || "light"}
            onChange={(v) => set({ textColor: v as "light" | "dark" })}
            data={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </Box>
        <TextInput
          label="Título de la tarjeta"
          placeholder="Tarjeta de fidelidad"
          maxLength={40}
          value={design.title || ""}
          onChange={(e) => set({ title: e.currentTarget.value })}
          disabled={disabled}
        />
        <Switch
          mt={{ sm: 28 }}
          label="Mostrar mi logo"
          checked={design.showLogo !== false}
          onChange={(e) => set({ showLogo: e.currentTarget.checked })}
          disabled={disabled}
        />
      </SimpleGrid>

      <Textarea
        label="Mensaje para tus clientes"
        description="Aparece debajo de la tarjeta (opcional)"
        placeholder="Muestra esta tarjeta en cada visita y acumula premios ✨"
        maxLength={140}
        autosize
        minRows={2}
        value={design.message || ""}
        onChange={(e) => set({ message: e.currentTarget.value })}
        disabled={disabled}
      />

      <Box>
        <Text fw={500} size="sm">Imagen de fondo</Text>
        <Text size="xs" c="dimmed" mb={6}>
          Sugerido: horizontal, 1000×630 px. Se oscurece un poco para que el texto se lea.
        </Text>
        <Group gap="md">
          {bgPicker("serviceBackgroundUrl", "servicios")}
          {bgPicker("referralBackgroundUrl", "referidos")}
        </Group>
      </Box>

      <Box>
        <Text fw={500} size="sm" mb={6}>Vista previa</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <LoyaltyCardFace
            kind="service"
            design={design}
            orgName={orgName}
            logoUrl={branding?.logoUrl}
            brandColor={brandColor}
            clientName="María Pérez"
            count={sampleCount(serviceTiers[serviceTiers.length - 1]?.threshold ?? 0)}
            tiers={serviceTiers}
          />
          <LoyaltyCardFace
            kind="referral"
            design={design}
            orgName={orgName}
            logoUrl={branding?.logoUrl}
            brandColor={brandColor}
            clientName="María Pérez"
            count={sampleCount(referralTiers[referralTiers.length - 1]?.threshold ?? 0)}
            tiers={referralTiers}
          />
        </SimpleGrid>
        {design.message && (
          <Text size="sm" c="dimmed" ta="center" mt="xs">{design.message}</Text>
        )}
      </Box>
    </Stack>
  );
}
