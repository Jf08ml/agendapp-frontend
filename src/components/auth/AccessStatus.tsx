// Piezas de las pantallas de acceso y error de la plataforma (rediseño,
// ErroresYAcceso): círculo de estado e indicador de progreso indeterminado.
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

export function StatusIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  const bg = tone === "muted" ? "var(--surface-muted)" : `var(--${tone}-soft)`;
  const fg = tone === "muted" ? "var(--ink-muted)" : `var(--${tone})`;
  return (
    <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: bg, color: fg, flex: "none" }}>
      {children}
    </span>
  );
}

/** Barra de progreso indeterminada (no sabemos cuánto falta). */
export function IndeterminateBar() {
  return (
    <div className="ag-indeterminate" role="progressbar" aria-busy="true" aria-label="Cargando">
      <style>{`
        .ag-indeterminate { width: 100%; height: 4px; border-radius: 999px; background: var(--line); overflow: hidden; position: relative; }
        .ag-indeterminate::after { content: ""; position: absolute; inset: 0; width: 40%; border-radius: inherit; background: var(--platform); animation: ag-indet 1.2s ease-in-out infinite; }
        @keyframes ag-indet { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
        @media (prefers-reduced-motion: reduce) { .ag-indeterminate::after { animation: none; width: 100%; opacity: .5; } }
      `}</style>
    </div>
  );
}
