import {
  Alert,
  Anchor,
  Box,
  ColorInput,
  Divider,
  FileInput,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import type { BrandingFont } from "../../../../../services/organizationService";

const FONT_OPTIONS = [
  { value: "inter", label: "Inter", css: "Inter" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans", css: "Plus Jakarta Sans" },
  { value: "nunito", label: "Nunito", css: "Nunito" },
  { value: "dm-sans", label: "DM Sans", css: "DM Sans" },
  { value: "outfit", label: "Outfit", css: "Outfit" },
  { value: "manrope", label: "Manrope", css: "Manrope" },
];

export default function BrandingTab({
  form,
  isEditing,
  uploadingLogo,
  uploadingFavicon,
  uploadingPwaIcon,
  onUpload,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  uploadingLogo: boolean;
  uploadingFavicon: boolean;
  uploadingPwaIcon: boolean;
  onUpload: (
    file: File | null,
    key: "logoUrl" | "faviconUrl" | "pwaIcon"
  ) => void;
}) {
  return (
    <SectionCard
      title="Branding"
      description="Controla identidad visual y datos de la PWA."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
        {/* LOGO */}
        <Box>
          <Text fw={600} mb={6}>
            Logo
          </Text>
          <Group gap="md" align="center">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                border: "1px solid #eee",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploadingLogo ? (
                <Loader size="sm" />
              ) : form.values.branding?.logoUrl ? (
                <img
                  src={form.values.branding.logoUrl}
                  alt="Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              ) : (
                <Text size="xs" c="dimmed">
                  Sin logo
                </Text>
              )}
            </Box>

            <FileInput
              mt="xs"
              accept="image/*"
              disabled={!isEditing || uploadingLogo}
              placeholder={uploadingLogo ? "Cargando..." : "Cambiar logo"}
              onChange={(f) => onUpload(f as File, "logoUrl")}
              description="Sugerido: 256×256 PNG, fondo blanco o transparente."
            />
          </Group>
        </Box>

        {/* FAVICON */}
        <Box>
          <Text fw={600} mb={6}>
            Favicon
          </Text>
          <Group gap="md" align="center">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid #eee",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploadingFavicon ? (
                <Loader size="xs" />
              ) : form.values.branding?.faviconUrl ? (
                <img
                  src={form.values.branding.faviconUrl}
                  alt="Favicon"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
              ) : (
                <Text size="xs" c="dimmed">
                  32×32
                </Text>
              )}
            </Box>

            <FileInput
              mt="xs"
              accept="image/*"
              disabled={!isEditing || uploadingFavicon}
              placeholder={uploadingFavicon ? "Cargando..." : "Cambiar favicon"}
              onChange={(f) => onUpload(f as File, "faviconUrl")}
              description="Recomendado: 32×32 PNG."
            />
          </Group>
        </Box>

        {/* PWA ICON */}
        <Box>
          <Text fw={600} mb={6}>
            Icono PWA
          </Text>
          <Group gap="md" align="center">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                border: "1px solid #eee",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {uploadingPwaIcon ? (
                <Loader size="sm" />
              ) : (
                form.values.branding?.pwaIcon && (
                  <img
                    src={form.values.branding.pwaIcon}
                    alt="PWA Icon"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: 12,
                    }}
                  />
                )
              )}
            </Box>

            <FileInput
              mt="xs"
              accept="image/*"
              disabled={!isEditing || uploadingPwaIcon}
              placeholder={uploadingPwaIcon ? "Cargando..." : "Cambiar icono"}
              onChange={(f) => onUpload(f as File, "pwaIcon")}
              description="PNG 192×192 o 512×512. Ideal una versión maskable."
            />
          </Group>
        </Box>
      </SimpleGrid>

      {(() => {
        const selectedFont = FONT_OPTIONS.find(
          (f) => f.value === (form.values.branding?.fontFamily ?? "inter")
        ) ?? FONT_OPTIONS[0];
        const previewCss = `"${selectedFont.css}", sans-serif`;

        return (
          <>
            <Select
              label="Tipografía"
              description="Fuente aplicada globalmente en toda la app de tu organización."
              placeholder="Selecciona una fuente"
              data={FONT_OPTIONS}
              value={selectedFont.value}
              onChange={(val) =>
                form.setFieldValue("branding.fontFamily", val as BrandingFont)
              }
              disabled={!isEditing}
              mb="xs"
              renderOption={({ option }) => {
                const font = FONT_OPTIONS.find((f) => f.value === option.value)!;
                return (
                  <Box>
                    <Text style={{ fontFamily: `"${font.css}", sans-serif`, fontWeight: 600, lineHeight: 1.2 }}>
                      {font.label}
                    </Text>
                    <Text style={{ fontFamily: `"${font.css}", sans-serif`, fontSize: 11, color: "#868e96", marginTop: 2 }}>
                      Aa Bb — Tu cita es a las 10:00 AM
                    </Text>
                  </Box>
                );
              }}
            />

            <Paper withBorder p="md" mb="md" style={{ background: "#fafafa" }}>
              <Text style={{ fontFamily: previewCss, fontSize: 40, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1, color: "#1a1a2e" }}>
                Aa
              </Text>
              <Text style={{ fontFamily: previewCss, fontSize: 18, fontWeight: 600, marginTop: 8, color: "#1a1a2e" }}>
                Tu próxima cita es mañana
              </Text>
              <Text style={{ fontFamily: previewCss, fontSize: 14, marginTop: 4, color: "#495057" }}>
                Servicios · Clientes · Agenda · 10:00 AM
              </Text>
              <Text style={{ fontFamily: previewCss, fontSize: 11, marginTop: 6, color: "#868e96" }}>
                {selectedFont.label} — abcdefghijklmnopqrstuvwxyz 0123456789
              </Text>
            </Paper>
          </>
        );
      })()}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <ColorInput
          label="Color primario"
          {...form.getInputProps("branding.primaryColor")}
          disabled={!isEditing}
        />
        <ColorInput
          label="Color secundario"
          {...form.getInputProps("branding.secondaryColor")}
          disabled={!isEditing}
        />
        <ColorInput
          label="Theme color (navegador)"
          {...form.getInputProps("branding.themeColor")}
          disabled={!isEditing}
        />
        <ColorInput
          label="Texto del footer"
          {...form.getInputProps("branding.footerTextColor")}
          disabled={!isEditing}
        />
      </SimpleGrid>

      <Divider my="md" />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Nombre de la app (PWA)"
          {...form.getInputProps("branding.pwaName")}
          disabled={!isEditing}
        />
        <TextInput
          label="Nombre corto (Short name)"
          {...form.getInputProps("branding.pwaShortName")}
          disabled={!isEditing}
        />
        <TextInput
          label="Descripción (PWA)"
          {...form.getInputProps("branding.pwaDescription")}
          disabled={!isEditing}
        />
      </SimpleGrid>

      <Alert mt="md" color="gray" variant="light">
        Para iOS agrega también <code>apple-touch-icon</code> en tu HTML.{" "}
        <Anchor
          href="https://web.dev/articles/apple-touch-icon?hl=es"
          target="_blank"
        >
          Ver guía
        </Anchor>
      </Alert>
    </SectionCard>
  );
}
