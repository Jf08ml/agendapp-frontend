// Lógica pura de Clases (rediseño, ClasesPanel): estados con palabra + tono +
// clave de ícono (el componente pone el ícono), pago en palabras, pestañas y
// selección múltiple. Sin React para poder probarla con node --test.

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export type IconKey = "check" | "circleCheck" | "users" | "clock" | "cash" | "userX" | "calendarOff" | "gift";

export interface StateInfo {
  label: string;
  tone: Tone;
  icon: IconKey;
}

const SESSION: Record<string, StateInfo> = {
  open: { label: "Disponible", tone: "success", icon: "circleCheck" },
  full: { label: "Llena", tone: "warning", icon: "users" },
  completed: { label: "Completada", tone: "info", icon: "check" },
  cancelled: { label: "Cancelada", tone: "neutral", icon: "calendarOff" },
};

const ENROLLMENT: Record<string, StateInfo> = {
  pending: { label: "Pendiente", tone: "warning", icon: "clock" },
  pending_payment: { label: "Pendiente de pago", tone: "warning", icon: "cash" },
  confirmed: { label: "Confirmada", tone: "success", icon: "check" },
  attended: { label: "Asistió", tone: "info", icon: "circleCheck" },
  no_show: { label: "No asistió", tone: "danger", icon: "userX" },
  cancelled: { label: "Cancelada", tone: "neutral", icon: "calendarOff" },
};

const PAYMENT: Record<string, StateInfo> = {
  paid: { label: "Pagado", tone: "success", icon: "check" },
  partial: { label: "Abono", tone: "warning", icon: "cash" },
  unpaid: { label: "Sin pagar", tone: "neutral", icon: "clock" },
  free: { label: "Gratis", tone: "neutral", icon: "gift" },
};

const fallback = (s: string): StateInfo => ({ label: s || "Sin estado", tone: "neutral", icon: "clock" });

export const sessionState = (s: string) => SESSION[s] ?? fallback(s);
export const enrollmentState = (s: string) => ENROLLMENT[s] ?? fallback(s);
export const paymentState = (s: string | undefined) => PAYMENT[s ?? ""] ?? PAYMENT.unpaid;

/** Clase CSS del badge según el tono. */
export const badgeClass = (tone: Tone) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

export const CLASS_TABS = [
  { key: "sesiones", label: "Sesiones" },
  { key: "inscripciones", label: "Inscripciones" },
  { key: "clases", label: "Clases" },
  { key: "salones", label: "Salones" },
  { key: "mensajes", label: "Mensajes de WhatsApp" },
] as const;

export type ClassTabKey = (typeof CLASS_TABS)[number]["key"];

export function resolveClassTab(param: string | null): ClassTabKey {
  return (CLASS_TABS.find((t) => t.key === param)?.key ?? "sesiones") as ClassTabKey;
}

/** Filtros de inscripciones (chips). «pending» se carga aparte para el contador. */
export const ENROLLMENT_FILTERS = [
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "attended", label: "Asistió" },
  { value: "all", label: "Todas" },
] as const;

/** Casilla «todas»: marcadas todas las visibles → se desmarcan; si no, se marcan. */
export function toggleAllVisible(selected: Set<string>, visibleIds: string[]): Set<string> {
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const next = new Set(selected);
  for (const id of visibleIds) {
    if (allOn) next.delete(id);
    else next.add(id);
  }
  return next;
}

export function toggleOne(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Porcentaje de ocupación (0–100) para la barra de cupo. */
export const occupancy = (enrolled: number, capacity: number) =>
  capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
