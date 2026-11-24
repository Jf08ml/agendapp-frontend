// Modelo puro de Membresías del superadmin: días al vencimiento, su color,
// la acción principal por fila y los filtros con conteo.

export type MembershipFilter = "all" | "active" | "trial" | "past_due" | "suspended" | "due_soon";
export type PrimaryAction = "activate" | "reactivate" | "renew";

export const MEMBERSHIP_FILTERS: { value: MembershipFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "trial", label: "Prueba" },
  { value: "past_due", label: "Vencidas" },
  { value: "suspended", label: "Suspendidas" },
  { value: "due_soon", label: "Vencen en 7 días o menos" },
];

const DAY = 86_400_000;

/** Días hasta el vencimiento (negativo si ya venció). */
export function daysLeft(periodEnd: string, now = Date.now()): number {
  return Math.ceil((new Date(periodEnd).getTime() - now) / DAY);
}

/** Texto y color de la columna Días: neutro; ámbar ≤ 7; rojo ≤ 3 o vencida. */
export function daysCell(days: number): { text: string; tone: "neutral" | "warning" | "danger" } {
  if (days < 0) return { text: `Venció hace ${-days} ${-days === 1 ? "día" : "días"}`, tone: "danger" };
  if (days === 0) return { text: "Vence hoy", tone: "danger" };
  const text = `${days} ${days === 1 ? "día" : "días"}`;
  if (days <= 3) return { text, tone: "danger" };
  if (days <= 7) return { text, tone: "warning" };
  return { text, tone: "neutral" };
}

/** La acción que toca según el estado. */
export function primaryAction(status: string): PrimaryAction {
  if (["trial", "past_due", "expired"].includes(status)) return "activate";
  if (status === "suspended") return "reactivate";
  return "renew";
}

export const PRIMARY_LABEL: Record<PrimaryAction, string> = {
  activate: "Activar plan",
  reactivate: "Reactivar",
  renew: "Renovar",
};

/** Vence en 7 días o menos (y aún no venció), solo membresías vigentes. */
export function isDueSoon(m: { status: string; currentPeriodEnd: string }, now = Date.now()): boolean {
  if (!["active", "trial"].includes(m.status)) return false;
  const d = daysLeft(m.currentPeriodEnd, now);
  return d >= 0 && d <= 7;
}

export function matchesFilter(m: { status: string; currentPeriodEnd: string }, filter: MembershipFilter, now = Date.now()): boolean {
  if (filter === "all") return true;
  if (filter === "due_soon") return isDueSoon(m, now);
  return m.status === filter;
}

export function filterCounts(list: { status: string; currentPeriodEnd: string }[], now = Date.now()): Record<MembershipFilter, number> {
  const c = { all: 0, active: 0, trial: 0, past_due: 0, suspended: 0, due_soon: 0 } as Record<MembershipFilter, number>;
  for (const m of list) {
    for (const f of MEMBERSHIP_FILTERS) if (matchesFilter(m, f.value, now)) c[f.value] += 1;
  }
  return c;
}

/** dd/mm/aaaa */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
