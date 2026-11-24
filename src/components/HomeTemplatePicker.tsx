// Selector de plantilla de la página de inicio (design system, AjustesWeb y
// ConfiguracionInicial · Fase 2): Esencial, Estudio y Academia en tarjetas con
// miniatura. Sin el plan, Estudio y Academia se ven con «Pro» y candado en
// lugar de ocultarse; al tocarlas se muestra cómo se vería y «Ver planes».
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconCheck, IconLock } from "@tabler/icons-react";
import { HOME_TEMPLATES, layoutFor, templateAllowed, templateOf, type HomeLayout, type HomeTemplate } from "./homeTemplates";

interface Props {
  value?: string | null;
  onChange: (layout: HomeLayout) => void;
  professionalLanding?: boolean;
  /** Academia muestra clases: avisa si están apagadas. */
  classesEnabled?: boolean;
  disabled?: boolean;
  name?: string;
  logoUrl?: string | null;
  /** Dónde ver planes (el panel tiene /my-membership; en la configuración inicial, nada). */
  plansPath?: string | null;
}

const bar = (w: string, h = 4, bg = "var(--line-strong)") => <span style={{ display: "block", width: w, height: h, borderRadius: 3, background: bg }} />;

/** Miniatura esquemática de cada plantilla, con la marca del negocio. */
function Thumb({ id, name, logoUrl, big }: { id: HomeTemplate; name?: string; logoUrl?: string | null; big?: boolean }) {
  const h = big ? 220 : 120;
  const logo = logoUrl ? (
    <img src={logoUrl} alt="" style={{ width: big ? 22 : 14, height: big ? 22 : 14, borderRadius: 4, objectFit: "cover", background: "#fff" }} />
  ) : (
    <span style={{ width: big ? 22 : 14, height: big ? 22 : 14, borderRadius: 4, background: "var(--on-brand)", opacity: 0.85 }} />
  );
  const header = (
    <div style={{ background: "var(--brand)", color: "var(--on-brand)", display: "flex", alignItems: "center", gap: 6, padding: big ? "8px 10px" : "5px 7px" }}>
      {logo}
      {big ? <b style={{ fontSize: 12 }}>{name || "Tu negocio"}</b> : bar("40%", 4, "var(--on-brand)")}
    </div>
  );
  let body: ReactNode;
  if (id === "essential") {
    body = (
      <div style={{ padding: big ? 12 : 8, display: "grid", gap: big ? 8 : 5 }}>
        {bar("55%", big ? 8 : 5, "var(--ink)")}
        {bar("80%")}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--line)", borderRadius: 5, padding: big ? "6px 8px" : "3px 5px" }}>
            {bar(i === 0 ? "45%" : "35%")}
            {bar("18%", 4, "var(--brand-text)")}
          </div>
        ))}
      </div>
    );
  } else if (id === "studio") {
    body = (
      <>
        <div style={{ background: "var(--brand)", padding: big ? "14px 12px 18px" : "8px 7px 11px", display: "grid", gap: big ? 6 : 4 }}>
          {bar("60%", big ? 10 : 6, "var(--on-brand)")}
          {bar("40%", 4, "var(--on-brand)")}
          <span style={{ width: big ? 60 : 34, height: big ? 16 : 9, borderRadius: 99, background: "var(--on-brand)" }} />
        </div>
        <div style={{ padding: big ? 10 : 6, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: big ? 6 : 4 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 5, overflow: "hidden" }}>
              <span style={{ display: "block", height: big ? 34 : 16, background: "var(--brand-soft)" }} />
              <div style={{ padding: 3 }}>{bar("70%", 3)}</div>
            </div>
          ))}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div style={{ background: "var(--brand)", padding: big ? "12px" : "7px", display: "grid", gap: 4 }}>
          {bar("55%", big ? 9 : 5, "var(--on-brand)")}
          {bar("35%", 4, "var(--on-brand)")}
        </div>
        <div style={{ padding: big ? 10 : 6, display: "grid", gap: big ? 6 : 4 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", border: "1px solid var(--line)", borderRadius: 5, padding: big ? 6 : 3 }}>
              <span style={{ width: big ? 26 : 13, height: big ? 26 : 13, borderRadius: 4, background: "var(--brand-soft)", flex: "none" }} />
              <span style={{ flex: 1, display: "grid", gap: 3 }}>
                {bar("60%")}
                {bar("35%", 3)}
              </span>
              <span style={{ width: big ? 40 : 20, height: big ? 14 : 7, borderRadius: 99, background: "var(--brand)" }} />
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <div aria-hidden="true" style={{ height: h, overflow: "hidden", background: "var(--surface-raised)", pointerEvents: "none" }}>
      {header}
      {body}
    </div>
  );
}

export default function HomeTemplatePicker({ value, onChange, professionalLanding, classesEnabled, disabled, name, logoUrl, plansPath = "/my-membership" }: Props) {
  const current = templateOf(value);
  const [peek, setPeek] = useState<HomeTemplate | null>(null);
  const peekInfo = HOME_TEMPLATES.find((t) => t.id === peek);

  return (
    <div className="ag-stack" style={{ gap: 12 }}>
      <div role="radiogroup" aria-label="Plantilla de la página de inicio" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {HOME_TEMPLATES.map((t) => {
          const allowed = templateAllowed(t.id, professionalLanding);
          const on = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => {
                if (!allowed) {
                  setPeek(peek === t.id ? null : t.id);
                  return;
                }
                setPeek(null);
                onChange(layoutFor(t.id, value));
              }}
              style={{
                textAlign: "left",
                padding: 0,
                font: "inherit",
                color: "inherit",
                cursor: disabled ? "default" : "pointer",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                background: "var(--surface-raised)",
                border: on ? "2px solid var(--ink)" : "1px solid var(--line)",
                boxShadow: on ? "0 0 0 3px var(--surface-hover)" : undefined,
              }}
            >
              <div style={{ opacity: allowed ? 1 : 0.6, borderBottom: "1px solid var(--line)" }}>
                <Thumb id={t.id} name={name} logoUrl={logoUrl} />
              </div>
              <div style={{ padding: "8px 10px", display: "grid", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <b style={{ fontSize: 14 }}>{t.label}</b>
                  {t.pro && (
                    <span className="ag-badge" style={{ gap: 3 }}>
                      {!allowed && <IconLock size={11} />}
                      Pro
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  {on && <IconCheck size={16} />}
                </span>
                <span className="ag-muted" style={{ fontSize: 12, lineHeight: "16px" }}>{t.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {current === "academy" && classesEnabled === false && (
        <div className="ag-alert ag-alert--warning" style={{ fontSize: 13 }}>
          Academia muestra tus clases, pero la reserva de clases está apagada. Actívala en Reservas para que se vean.
        </div>
      )}

      {peekInfo && (
        <div className="ag-card" style={{ padding: "var(--space-4)", display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14 }}>
            <b>{peekInfo.label}</b> es parte de los planes Marca y Pro. Así se vería tu web:
          </div>
          <div style={{ maxWidth: 320, border: "1px solid var(--line)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <Thumb id={peekInfo.id} name={name} logoUrl={logoUrl} big />
          </div>
          {plansPath && (
            <div>
              <Link to={plansPath} className="ag-link" style={{ fontSize: 14, fontWeight: 600 }}>
                Ver planes
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
