// Comparación con el periodo anterior (design system, AnaliticasPanel · Fase 2).
// El rango previo tiene la misma cantidad de días y termina justo antes del
// actual; se pide al mismo endpoint. Módulo puro para `node --test`.

const DAY = 86400000;

/** Inicio del día local. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Rango anterior de igual duración: [inicio, fin] en días locales. */
export function previousRange(start: Date, end: Date): [Date, Date] {
  const s = startOfDay(start);
  const e = startOfDay(end);
  const days = Math.round((e.getTime() - s.getTime()) / DAY) + 1;
  const prevEnd = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (days - 1));
  return [prevStart, prevEnd];
}

export interface Change {
  /** Variación redondeada en %, o null si antes no hubo nada. */
  pct: number | null;
  tone: "success" | "danger" | "neutral";
  text: string;
}

/** Variación de una cifra contra el periodo anterior, en palabras cortas. */
export function changeVs(current: number, previous: number): Change {
  if (!previous) {
    return current > 0
      ? { pct: null, tone: "neutral", text: "Sin datos del periodo anterior" }
      : { pct: 0, tone: "neutral", text: "Igual que el periodo anterior" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, tone: "neutral", text: "Igual que el periodo anterior" };
  return {
    pct,
    tone: pct > 0 ? "success" : "danger",
    text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)} % vs. periodo anterior`,
  };
}
