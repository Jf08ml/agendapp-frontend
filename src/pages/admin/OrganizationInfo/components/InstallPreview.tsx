// Vista de instalación (design system, AjustesWeb · Fase 2): cómo se ve la app
// en la pantalla de inicio del celular y el aviso de «Instalar», con el ícono,
// los nombres y el color de barra que se están eligiendo.

interface Props {
  icon?: string | null;
  name: string;
  shortName: string;
  description?: string | null;
  themeColor?: string | null;
}

/** Como la muestran los teléfonos: 12 caracteres y «…». */
const homeLabel = (s: string) => (s.length > 12 ? `${s.slice(0, 11)}…` : s);

export default function InstallPreview({ icon, name, shortName, description, themeColor }: Props) {
  const appIcon = (size: number, radius: number) =>
    icon ? (
      <img src={icon} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", background: "#fff" }} />
    ) : (
      <span style={{ width: size, height: size, borderRadius: radius, background: "var(--brand)", color: "var(--on-brand)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: size * 0.4 }}>
        {(shortName || name || "A").slice(0, 1).toUpperCase()}
      </span>
    );
  const others = ["#e8590c", "#2f9e44", "#1c7ed6", "#ae3ec9", "#f59f00", "#0c8599", "#c2255c"];

  return (
    <div className="ag-row" style={{ gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* Pantalla de inicio */}
      <div
        aria-label="Vista previa de la pantalla de inicio"
        style={{ width: 180, height: 300, borderRadius: 26, border: "6px solid #1a1b1e", overflow: "hidden", background: "linear-gradient(160deg, #5f3dc4 0%, #1c7ed6 100%)", position: "relative", flex: "none" }}
      >
        <div style={{ height: 18, background: themeColor || "transparent", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 6px", padding: "14px 10px" }}>
          {others.slice(0, 5).map((c) => (
            <span key={c} style={{ display: "grid", justifyItems: "center", gap: 3 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: c, opacity: 0.85 }} />
              <span style={{ width: 24, height: 3, borderRadius: 2, background: "rgba(255,255,255,.6)" }} />
            </span>
          ))}
          <span style={{ display: "grid", justifyItems: "center", gap: 3 }}>
            {appIcon(30, 8)}
            <span style={{ color: "#fff", fontSize: 8, lineHeight: "10px", maxWidth: 42, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
              {homeLabel(shortName || name || "Tu app")}
            </span>
          </span>
          {others.slice(5).map((c) => (
            <span key={c} style={{ display: "grid", justifyItems: "center", gap: 3 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: c, opacity: 0.85 }} />
              <span style={{ width: 24, height: 3, borderRadius: 2, background: "rgba(255,255,255,.6)" }} />
            </span>
          ))}
        </div>
      </div>

      {/* Aviso de instalación */}
      <div style={{ flex: "1 1 220px", maxWidth: 320, display: "grid", gap: 8 }}>
        <span className="ag-subtle">Al tocar «Instalar» en tu web:</span>
        <div className="ag-card" style={{ padding: 14, display: "grid", gap: 10, boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,.08))" }}>
          <div className="ag-row" style={{ gap: 10, alignItems: "center" }}>
            {appIcon(40, 10)}
            <div style={{ minWidth: 0 }}>
              <b style={{ display: "block", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Tu app"}</b>
              <span className="ag-subtle">{typeof window !== "undefined" ? window.location.host : ""}</span>
            </div>
          </div>
          {description && <div className="ag-muted" style={{ fontSize: 13 }}>{description}</div>}
          <div className="ag-row" style={{ gap: 8, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)", padding: "6px 10px" }}>Cancelar</span>
            <span style={{ fontSize: 13, fontWeight: 600, background: "var(--brand)", color: "var(--on-brand)", borderRadius: 8, padding: "6px 12px" }}>Instalar</span>
          </div>
        </div>
        {(shortName || name).length > 12 && (
          <span className="ag-subtle" style={{ color: "var(--warning)" }}>
            El nombre corto tiene más de 12 letras: en el celular se corta.
          </span>
        )}
      </div>
    </div>
  );
}
