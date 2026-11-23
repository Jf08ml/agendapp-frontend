// Barra fija de guardado de Ajustes (rediseño, SettingsLayout): aparece solo con
// cambios. «Tienes cambios sin guardar · Descartar · Guardar». En móvil queda
// sobre la barra inferior del panel.
import { Button } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export default function StickyActionBar({
  isDirty,
  saving,
  onCancel,
  onSave,
}: {
  isDirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  if (!isDirty) return null;
  return (
    <div
      role="region"
      aria-label="Cambios sin guardar"
      style={{
        position: "sticky",
        bottom: isMobile ? "calc(var(--app-shell-footer-offset, 0px) + 8px)" : 16,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 10px 10px 16px",
        borderRadius: "var(--radius-lg)",
        background: "var(--ink)",
        color: "var(--ink-inverse)",
        boxShadow: "var(--shadow-lg)",
        marginTop: "var(--space-4)",
      }}
    >
      <b style={{ fontSize: 14, flex: 1, minWidth: 160 }}>Tienes cambios sin guardar</b>
      <Button variant="subtle" color="gray" onClick={onCancel} disabled={saving} styles={{ root: { color: "var(--ink-inverse)" } }}>
        Descartar
      </Button>
      <Button variant="white" color="dark" onClick={onSave} loading={saving}>
        Guardar
      </Button>
    </div>
  );
}
