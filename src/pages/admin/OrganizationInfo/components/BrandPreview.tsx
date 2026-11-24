// Vista previa en vivo de la marca (design system, AjustesMarca · Fase 2):
// la web y la reserva con los colores, logo y tipografía que se están
// eligiendo, antes de guardar. Usa los mismos tokens que la web real.
import { useState } from "react";
import { SegmentedControl } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { buildBrandTokens, resolveBrandColor } from "../../../../theme/brandTokens";

interface Props {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  fontCss: string;
}

export default function BrandPreview({ name, logoUrl, primaryColor, secondaryColor, fontCss }: Props) {
  const [view, setView] = useState<"web" | "booking">("web");
  const t = buildBrandTokens(resolveBrandColor(primaryColor), secondaryColor, "light");
  const font = `"${fontCss}", sans-serif`;
  const initials = (name || "Tu negocio").trim().slice(0, 2).toUpperCase();
  const logo = logoUrl ? (
    <img src={logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", background: "#fff" }} />
  ) : (
    <span style={{ width: 28, height: 28, borderRadius: 6, display: "grid", placeItems: "center", background: t["on-brand"], color: t.brand, fontSize: 12, fontWeight: 700 }}>{initials}</span>
  );

  return (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      <SegmentedControl
        size="xs"
        value={view}
        onChange={(v) => setView(v as "web" | "booking")}
        data={[
          { label: "Web", value: "web" },
          { label: "Reserva", value: "booking" },
        ]}
        style={{ alignSelf: "flex-start" }}
      />
      <div
        aria-label="Vista previa"
        style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#fff", color: "#1a1b1e", fontFamily: font, maxWidth: 380 }}
      >
        <div style={{ background: t.brand, color: t["on-brand"], padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          {logo}
          <b style={{ fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Tu negocio"}</b>
          <span style={{ background: t["on-brand"], color: t.brand, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>Reservar</span>
        </div>

        {view === "web" ? (
          <>
            <div style={{ background: t.brand, color: t["on-brand"], padding: "18px 14px 22px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Bienvenida a {name || "tu negocio"}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Reserva tu cita en minutos.</div>
            </div>
            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              {["Corte y peinado", "Manicure"].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e9ecef", borderRadius: 10, padding: "10px 12px" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s}</div>
                    <div style={{ fontSize: 12, color: "#868e96" }}>{i === 0 ? "45 min" : "30 min"}</div>
                  </div>
                  <span style={{ color: t["brand-text"], fontSize: 13, fontWeight: 600 }}>Ver más</span>
                </div>
              ))}
              <span style={{ alignSelf: "start", background: t["brand-soft"], color: t["brand-text"], borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 600, justifySelf: "start" }}>
                Abierto ahora
              </span>
            </div>
          </>
        ) : (
          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Elige día y hora</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Lun 1", "Mar 2", "Mié 3", "Jue 4"].map((d, i) => (
                <span
                  key={d}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    borderRadius: 10,
                    padding: "8px 0",
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${i === 1 ? t.brand : "#dee2e6"}`,
                    background: i === 1 ? t.brand : "#fff",
                    color: i === 1 ? t["on-brand"] : "#1a1b1e",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["9:00 a. m.", "10:30 a. m.", "2:00 p. m."].map((h, i) => (
                <span key={h} style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, border: `1px solid ${i === 0 ? t["brand-text"] : "#dee2e6"}`, color: i === 0 ? t["brand-text"] : "#1a1b1e", background: i === 0 ? t["brand-soft"] : "#fff", fontWeight: i === 0 ? 600 : 400 }}>
                  {h}
                </span>
              ))}
            </div>
            <span style={{ background: t.brand, color: t["on-brand"], borderRadius: 10, padding: "10px 0", textAlign: "center", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <IconCheck size={16} /> Confirmar reserva
            </span>
            <span style={{ color: t["brand-text"], fontSize: 13, fontWeight: 600, textAlign: "center" }}>Ver mis reservas</span>
          </div>
        )}
      </div>
    </div>
  );
}
