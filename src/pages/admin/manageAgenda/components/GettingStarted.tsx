// «Primeros pasos» (rediseño, PrimerosPasos): lista plegable de 6 pasos con
// progreso, a la derecha de la agenda en escritorio y arriba en móvil (solo los
// pendientes). Plegada queda como botón «3 de 6» en el encabezado de la agenda.
// Reemplaza SetupGuide, FirstAppointmentGuide y ConnectWhatsappGuide.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ActionIcon, Button, RingProgress } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconChevronDown, IconChevronUp, IconInfoCircle, IconX } from "@tabler/icons-react";
import {
  isGettingStartedHidden,
  progressOf,
  tomorrowStart,
  type GettingStartedKey,
  type GettingStartedStep,
} from "./gettingStartedModel";

// ─── Preferencias en el navegador (plegado, oculto, enlace compartido) ──────
const keyOf = (orgId: string | undefined, name: string) => `ag_primeros_pasos_${name}_${orgId || "x"}`;
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento: dura esta visita */
  }
};

export function useGettingStartedPrefs(orgId: string | undefined) {
  const [collapsed, setCollapsedState] = useState(() => read(keyOf(orgId, "plegado")) === "1");
  const [hiddenUntil, setHiddenUntil] = useState<number | null>(() => Number(read(keyOf(orgId, "oculto_hasta"))) || null);
  const [neverShow, setNeverShow] = useState(() => read(keyOf(orgId, "nunca")) === "1");
  const [linkShared, setLinkShared] = useState(() => read(keyOf(orgId, "enlace")) === "1");

  return {
    collapsed,
    setCollapsed: (v: boolean) => {
      setCollapsedState(v);
      write(keyOf(orgId, "plegado"), v ? "1" : "0");
    },
    hidden: isGettingStartedHidden({ neverShow, hiddenUntilMs: hiddenUntil, nowMs: Date.now() }),
    hideUntilTomorrow: () => {
      const t = tomorrowStart(Date.now());
      setHiddenUntil(t);
      write(keyOf(orgId, "oculto_hasta"), String(t));
    },
    hideForever: () => {
      setNeverShow(true);
      write(keyOf(orgId, "nunca"), "1");
    },
    linkShared,
    markShared: () => {
      setLinkShared(true);
      write(keyOf(orgId, "enlace"), "1");
    },
  };
}

export type GettingStartedPrefs = ReturnType<typeof useGettingStartedPrefs>;

/** Botón del encabezado de la agenda cuando la lista está plegada. */
export function GettingStartedToggle({ steps, onOpen }: { steps: GettingStartedStep[]; onOpen: () => void }) {
  const p = progressOf(steps);
  return (
    <Button
      variant="default"
      size="sm"
      onClick={onOpen}
      leftSection={<RingProgress size={22} thickness={3} roundCaps sections={[{ value: p.pct, color: "var(--ink)" }]} rootColor="var(--line)" />}
      styles={{ section: { marginRight: 4 } }}
    >
      Primeros pasos · {p.done} de {p.total}
    </Button>
  );
}

interface PanelProps {
  steps: GettingStartedStep[];
  prefs: GettingStartedPrefs;
  isMobile: boolean;
  seeded: boolean;
  onCreateAppointment: () => void;
}

const ACTIONS: Record<GettingStartedKey, { label: string; to?: string }> = {
  service: { label: "Agregar servicio", to: "/gestionar-servicios" },
  employee: { label: "Ir a Profesionales", to: "/gestionar-profesionales" },
  schedule: { label: "Configurar horario", to: "/informacion-negocio?seccion=horario" },
  appointment: { label: "Crear cita de prueba" },
  whatsapp: { label: "Conectar WhatsApp", to: "/gestionar-whatsapp" },
  share: { label: "Copiar mi enlace" },
};

export default function GettingStarted({ steps, prefs, isMobile, seeded, onCreateAppointment }: PanelProps) {
  const [showDone, setShowDone] = useState(false);
  const p = progressOf(steps);
  const allDone = p.done === p.total;
  const bookingUrl = `${window.location.origin}/online-reservation`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      prefs.markShared();
      showNotification({ color: "green", message: "Enlace copiado. Pégalo en tu Instagram o envíalo por WhatsApp." });
    } catch {
      showNotification({ color: "red", message: `No pudimos copiarlo. Tu enlace es ${bookingUrl}` });
    }
  };

  const action = (s: GettingStartedStep, primary: boolean) => {
    const a = ACTIONS[s.key];
    const variant = primary ? "filled" : "default";
    if (s.key === "appointment") {
      return (
        <Button size="xs" variant={variant} onClick={onCreateAppointment}>
          {a.label}
        </Button>
      );
    }
    if (s.key === "share") {
      return (
        <Button size="xs" variant={variant} onClick={copyLink}>
          {a.label}
        </Button>
      );
    }
    return (
      <Button size="xs" variant={variant} component={Link} to={a.to!}>
        {a.label}
      </Button>
    );
  };

  if (allDone) {
    return (
      <aside className="ag-card" style={{ padding: 16, width: isMobile ? "100%" : 340, flex: "none", alignSelf: "flex-start" }}>
        <div className="ag-row" style={{ gap: 10, alignItems: "flex-start" }}>
          <span style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)", flex: "none" }}>
            <IconCheck size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ display: "block" }}>Todo listo</b>
            <span className="ag-muted" style={{ fontSize: 13 }}>Tu negocio ya está recibiendo citas.</span>
          </div>
          <Button size="xs" variant="default" onClick={prefs.hideForever}>
            Cerrar
          </Button>
        </div>
      </aside>
    );
  }

  const visibleSteps = isMobile && !showDone ? steps.filter((s) => !s.done) : steps;

  return (
    <aside
      className="ag-card"
      aria-label="Primeros pasos"
      style={{
        width: isMobile ? "100%" : 340,
        flex: "none",
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        maxHeight: isMobile ? 320 : undefined,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--line)" }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
          <b style={{ fontSize: 15 }}>Primeros pasos</b>
          <div className="ag-row" style={{ gap: 4 }}>
            <span className="ag-subtle ag-num">
              {p.done} de {p.total}
            </span>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Plegar" onClick={() => prefs.setCollapsed(true)}>
              {isMobile ? <IconChevronUp size={16} /> : <IconX size={16} />}
            </ActionIcon>
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: "var(--surface-hover)", marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${p.pct}%`, height: "100%", background: "var(--ink)" }} />
        </div>
      </div>

      {seeded && (
        <div className="ag-alert ag-alert--info" style={{ margin: "12px 16px 0", padding: "8px 12px", fontSize: 13 }}>
          <IconInfoCircle size={18} />
          <div>Estás viendo datos de ejemplo. Edítalos o bórralos en Catálogo y Profesionales.</div>
        </div>
      )}

      <ol style={{ listStyle: "none", margin: 0, padding: "4px 0", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {visibleSteps.map((s, idx) => {
          const n = steps.indexOf(s) + 1;
          const current = s.key === p.current;
          return (
            <li key={s.key} style={{ padding: "10px 16px", display: "flex", gap: 10, alignItems: "flex-start", borderTop: idx > 0 ? "1px solid var(--line)" : undefined }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  flex: "none",
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  background: s.done ? "var(--success)" : current ? "var(--ink)" : "var(--surface-hover)",
                  color: s.done || current ? "#fff" : "var(--ink-muted)",
                }}
              >
                {s.done ? <IconCheck size={13} /> : n}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: current ? 600 : 500, color: s.done ? "var(--ink-subtle)" : "var(--ink)", textDecoration: s.done ? "line-through" : undefined }}>
                    {s.title}
                  </span>
                  {s.recommended && !s.done && <span className="ag-badge ag-badge--brand" style={{ height: 20, fontSize: 11 }}>Muy recomendado</span>}
                </div>
                {current && (
                  <>
                    <div className="ag-muted" style={{ fontSize: 13, margin: "4px 0 8px" }}>{s.description}</div>
                    {action(s, true)}
                  </>
                )}
              </div>
              {!s.done && !current && action(s, false)}
            </li>
          );
        })}
      </ol>

      {isMobile && p.done > 0 && (
        <button type="button" className="ag-link" style={{ background: "none", border: 0, padding: "0 16px 8px", fontSize: 13, textAlign: "left", cursor: "pointer" }} onClick={() => setShowDone((v) => !v)}>
          {showDone ? "Ocultar los completados" : `Ver ${p.done === 1 ? "el completado" : `los ${p.done} completados`}`}
          {showDone ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
        </button>
      )}

      <div style={{ borderTop: "1px solid var(--line)", padding: "8px 16px", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={prefs.hideUntilTomorrow}>
          Ocultar hasta mañana
        </Button>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={prefs.hideForever}>
          No volver a mostrar
        </Button>
      </div>
    </aside>
  );
}
