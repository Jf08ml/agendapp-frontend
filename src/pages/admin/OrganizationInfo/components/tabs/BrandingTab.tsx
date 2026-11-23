// Marca y web (rediseño, AjustesMarca / AjustesWeb). La antigua pestaña
// «Branding» se separa en tres páginas con `part`:
// - "brand": logo, color principal y secundario (muestras + selector), tipografía en tarjetas.
// - "pwa": App instalable (ícono, favicon, nombres, descripción, color del navegador).
// - "season": Temporada (decoración navideña con vista previa y «Ver en mi web»).
// `branding.footerTextColor` ya no se edita (el pie de la web es neutro); el valor guardado no se toca.
import { Alert, Box, ColorInput, FileInput, Loader, Paper, SegmentedControl, SimpleGrid, Switch, Text, TextInput } from "@mantine/core";
import { IconCheck, IconChristmasTree, IconExternalLink, IconLock } from "@tabler/icons-react";
import { ChristmasDecorations, SantaHat } from "../../../../../components/seasonal/ChristmasDecorations";
import { CHRISTMAS_SEASON_LABEL } from "../../../../../utils/seasonalTheme";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../app/store";
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

// Muestras sugeridas para el color principal (el selector libre sigue disponible)
const BRAND_SWATCHES = ["#111111", "#1c7ed6", "#0c8599", "#2f9e44", "#e8590c", "#d6336c", "#7048e8", "#ae3ec9", "#c2255c", "#5f3dc4"];

type UploadKey = "logoUrl" | "faviconUrl" | "pwaIcon";

function ImageField({
  label,
  help,
  url,
  uploading,
  size,
  radius,
  disabled,
  onFile,
  placeholder,
}: {
  label: string;
  help: string;
  url?: string | null;
  uploading: boolean;
  size: number;
  radius: number;
  disabled: boolean;
  onFile: (f: File | null) => void;
  placeholder: string;
}) {
  return (
    <div className="ag-field">
      <span className="ag-label">{label}</span>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Box
          style={{
            width: size,
            height: size,
            flex: "none",
            borderRadius: radius,
            border: "1px solid var(--line)",
            background: "var(--surface-raised)",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {uploading ? (
            <Loader size="sm" />
          ) : url ? (
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span className="ag-subtle" style={{ fontSize: 11 }}>Sin imagen</span>
          )}
        </Box>
        <FileInput
          accept="image/*"
          disabled={disabled || uploading}
          placeholder={uploading ? "Subiendo…" : placeholder}
          onChange={(f) => onFile(f as File)}
          style={{ flex: 1 }}
        />
      </div>
      <span className="ag-help">{help}</span>
    </div>
  );
}

export default function BrandingTab({
  form,
  isEditing,
  uploadingLogo,
  uploadingFavicon,
  uploadingPwaIcon,
  onUpload,
  part = "brand",
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  uploadingLogo: boolean;
  uploadingFavicon: boolean;
  uploadingPwaIcon: boolean;
  onUpload: (file: File | null, key: UploadKey) => void;
  part?: "brand" | "pwa" | "season";
}) {
  const planLimits = useSelector((s: RootState) => s.organization.organization?.planLimits);
  const canUseBranding = planLimits?.customBranding !== false;
  const brandingDisabled = !isEditing || !canUseBranding;
  const b = form.values.branding;

  const planAlert = !canUseBranding && (
    <Alert icon={<IconLock size={14} />} color="gray" variant="light" mb="md">
      <Text size="sm">
        Personalizar la marca (logo, colores, tipografía e app instalable) está disponible desde el <strong>Plan Starter</strong>.
      </Text>
    </Alert>
  );

  if (part === "season") {
    const on = form.values.seasonalTheme === "christmas";
    // La vista previa de temporada existe solo fuera de producción (?preview=navidad);
    // en producción se ve la web tal cual.
    const previewUrl = `${window.location.origin}/?preview=navidad`;
    return (
      <SectionCard
        title="Decoración navideña"
        description={`Nieve, luces y un gorrito en tu logo en las páginas que ven tus clientes (inicio, reservas, tienda, tarjeta de fidelidad). Se muestra solo ${CHRISTMAS_SEASON_LABEL}; tus colores no cambian y tu panel queda igual.`}
        icon={<IconChristmasTree size={16} />}
      >
        <div className="ag-switchrow" style={{ paddingTop: 0 }}>
          <div>
            <b>Mostrar decoración navideña</b>
            <span>Disponible en todos los planes.</span>
          </div>
          <span style={{ flex: "none" }}>
            <Switch
              aria-label="Decoración navideña"
              checked={on}
              onChange={(e) => form.setFieldValue("seasonalTheme", e.currentTarget.checked ? "christmas" : "none")}
              disabled={!isEditing}
            />
          </span>
        </div>
        {on && (
          <>
            <Paper
              withBorder
              radius="md"
              mt="sm"
              style={{ position: "relative", overflow: "hidden", height: 140, background: "linear-gradient(180deg, #1c3461 0%, #2b4c86 100%)" }}
            >
              <ChristmasDecorations contained />
              <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <SantaHat show>
                  <Box style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", overflow: "hidden" }}>
                    {b?.logoUrl && <img src={b.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </Box>
                </SantaHat>
                <Text c="white" fw={600} size="sm">
                  Vista previa
                </Text>
              </div>
            </Paper>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 10, fontSize: 14, color: "var(--brand-text)" }}
            >
              <IconExternalLink size={14} /> Ver en mi web
            </a>
          </>
        )}
      </SectionCard>
    );
  }

  if (part === "pwa") {
    const custom = !!b?.themeColor;
    return (
      <SectionCard title="App instalable" description="Así aparece tu web cuando un cliente la agrega a la pantalla de inicio de su celular.">
        {planAlert}
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <ImageField
              label="Ícono de la app"
              help="PNG de 512 × 512. Se ve en la pantalla de inicio del celular."
              url={b?.pwaIcon}
              uploading={uploadingPwaIcon}
              size={64}
              radius={14}
              disabled={brandingDisabled}
              onFile={(f) => onUpload(f, "pwaIcon")}
              placeholder="Cambiar ícono"
            />
            <ImageField
              label="Favicon"
              help="PNG de 32 × 32. Se ve en la pestaña del navegador."
              url={b?.faviconUrl}
              uploading={uploadingFavicon}
              size={40}
              radius={8}
              disabled={brandingDisabled}
              onFile={(f) => onUpload(f, "faviconUrl")}
              placeholder="Cambiar favicon"
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Nombre de la app"
              description="Aparece al instalarla."
              {...form.getInputProps("branding.pwaName")}
              disabled={brandingDisabled}
            />
            <TextInput
              label="Nombre corto"
              description="Debajo del ícono. Mejor 12 letras o menos."
              {...form.getInputProps("branding.pwaShortName")}
              disabled={brandingDisabled}
              rightSection={<span className="ag-subtle ag-num" style={{ fontSize: 11 }}>{(b?.pwaShortName || "").length}</span>}
            />
          </SimpleGrid>
          <TextInput
            label="Descripción"
            description="También se usa al compartir el enlace de tu web."
            {...form.getInputProps("branding.pwaDescription")}
            disabled={brandingDisabled}
          />
          <div className="ag-field">
            <span className="ag-label">Color de la barra del navegador</span>
            <SegmentedControl
              size="xs"
              style={{ alignSelf: "flex-start" }}
              value={custom ? "custom" : "auto"}
              onChange={(v) => form.setFieldValue("branding.themeColor", v === "custom" ? b?.primaryColor || "#111111" : "")}
              data={[
                { value: "auto", label: "Automático" },
                { value: "custom", label: "Personalizado" },
              ]}
              disabled={brandingDisabled}
            />
            {custom && (
              <ColorInput {...form.getInputProps("branding.themeColor")} disabled={brandingDisabled} w={220} />
            )}
            <span className="ag-help">Automático: el navegador usa su color de siempre.</span>
          </div>
        </div>
      </SectionCard>
    );
  }

  // part === "brand"
  const selectedFont = FONT_OPTIONS.find((f) => f.value === (b?.fontFamily ?? "inter")) ?? FONT_OPTIONS[0];
  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      {planAlert}
      <SectionCard title="Logo" description="Se ve en el encabezado de tu web, en la reserva en línea y en la tarjeta de fidelidad.">
        <ImageField
          label="Logo del negocio"
          help="PNG de 256 × 256, fondo blanco o transparente. Máximo 2 MB."
          url={b?.logoUrl}
          uploading={uploadingLogo}
          size={72}
          radius={12}
          disabled={brandingDisabled}
          onFile={(f) => onUpload(f, "logoUrl")}
          placeholder="Cambiar logo"
        />
      </SectionCard>

      <SectionCard title="Colores" description="El color principal se usa en botones, enlaces y la selección de tu web.">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <ColorInput
            label="Color principal"
            swatches={BRAND_SWATCHES}
            swatchesPerRow={10}
            {...form.getInputProps("branding.primaryColor")}
            disabled={brandingDisabled}
          />
          <ColorInput
            label="Color secundario (opcional)"
            description="Para detalles y fondos suaves."
            swatches={BRAND_SWATCHES}
            swatchesPerRow={10}
            {...form.getInputProps("branding.secondaryColor")}
            disabled={brandingDisabled}
          />
        </SimpleGrid>
      </SectionCard>

      <SectionCard title="Tipografía" description="Se aplica en tu web, la reserva en línea y tu panel.">
        <div
          role="radiogroup"
          aria-label="Tipografía"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}
        >
          {FONT_OPTIONS.map((f) => {
            const on = f.value === selectedFont.value;
            return (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={brandingDisabled}
                className="ag-opt"
                onClick={() => form.setFieldValue("branding.fontFamily", f.value as BrandingFont)}
                style={{ cursor: brandingDisabled ? "default" : "pointer", textAlign: "left", flexDirection: "column", gap: 2, font: "inherit", color: "inherit" }}
              >
                <span style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: `"${f.css}", sans-serif`, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>Aa</span>
                  {on && <IconCheck size={16} />}
                </span>
                <b style={{ fontFamily: `"${f.css}", sans-serif` }}>{f.label}</b>
                <span className="d" style={{ fontFamily: `"${f.css}", sans-serif` }}>Tu cita es mañana a las 10:00</span>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
