// Reservas online (rediseño, ReservasOnlinePanel): pestañas, agrupación de la
// bandeja y textos de estado. Puro (sin React ni dayjs) para probarlo con node --test.

export type ReservationsTab = "por_confirmar" | "vencidas" | "historial" | "configuracion";
export type ReservationPolicyLike = "manual" | "auto_if_available" | string | null | undefined;

export const RESERVATIONS_TAB_LABELS: Record<ReservationsTab, string> = {
  por_confirmar: "Por confirmar",
  vencidas: "Vencidas",
  historial: "Historial",
  configuracion: "Configuración",
};

/**
 * Pestañas visibles. Con aprobación manual: Por confirmar · Vencidas · Historial ·
 * Configuración. Con «Confirmar sola si hay cupo» no hay bandeja (solo Historial y
 * Configuración); si alguna quedó pendiente por falta de cupo, o hay vencidas,
 * aparecen sus pestañas para poder resolverlas.
 */
export function reservationsTabs(policy: ReservationPolicyLike, pendingCount: number, expiredCount: number): ReservationsTab[] {
  const manual = policy !== "auto_if_available";
  const tabs: ReservationsTab[] = [];
  if (manual || pendingCount > 0) tabs.push("por_confirmar");
  if (manual || expiredCount > 0) tabs.push("vencidas");
  tabs.push("historial", "configuracion");
  return tabs;
}

/** La pedida en ?tab= si está visible; si no, la primera. */
export function resolveReservationsTab(requested: string | null, visible: ReservationsTab[]): ReservationsTab {
  if (requested && (visible as string[]).includes(requested)) return requested as ReservationsTab;
  return visible[0] ?? "historial";
}

/** Contador del menú: nada sin pendientes, «99+» con más de 99. */
export function formatPendingCount(n: number | null | undefined): string | null {
  if (!n || n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

export type WhenBucket = "hoy" | "semana" | "despues";
export const WHEN_LABELS: Record<WhenBucket, string> = { hoy: "Hoy", semana: "Esta semana", despues: "Más adelante" };

/**
 * Hoy / Esta semana (los próximos 7 días) / Más adelante. `dayKey` es la fecha
 * YYYY-MM-DD en la zona del negocio (la calcula quien llama).
 */
export function whenBucket(dayKey: string, todayKey: string): WhenBucket {
  if (dayKey <= todayKey) return "hoy";
  const days = Math.round((Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
  return days <= 7 ? "semana" : "despues";
}

/** «en 40 min», «en 2 h», «mañana», «en 3 días»; para vencidas, «hace 2 días». */
export function relativeWhen(startMs: number, nowMs: number, dayDiff: number): string {
  const diffMin = Math.round((startMs - nowMs) / 60_000);
  if (diffMin < 0) {
    const ago = -diffMin;
    if (ago < 60) return `hace ${ago} min`;
    if (ago < 60 * 24) return `hace ${Math.round(ago / 60)} h`;
    const d = Math.max(1, -dayDiff);
    return d === 1 ? "ayer" : `hace ${d} días`;
  }
  if (dayDiff === 0) return diffMin < 60 ? `en ${diffMin} min` : `en ${Math.round(diffMin / 60)} h`;
  if (dayDiff === 1) return "mañana";
  return `en ${dayDiff} días`;
}

export type ReservationStatusKey =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_approved"
  | "cancelled_by_customer"
  | "cancelled_by_admin"
  | "appointment_deleted";

/** Los 7 estados con palabra y tono (badge `ag-badge--{tone}`). */
export const STATUS_META: Record<ReservationStatusKey, { label: string; tone: "warning" | "success" | "danger" | "info" | "neutral" }> = {
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "success" },
  auto_approved: { label: "Confirmada sola", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  cancelled_by_customer: { label: "Cancelada por el cliente", tone: "neutral" },
  cancelled_by_admin: { label: "Cancelada por el negocio", tone: "neutral" },
  appointment_deleted: { label: "Cita eliminada", tone: "danger" },
};

export const ORIGIN_LABELS: Record<string, string> = {
  ai_chatbot: "Chat IA",
  manual_booking: "Web",
  admin: "Panel",
};

export function originLabel(source: string | null | undefined): string {
  return (source && ORIGIN_LABELS[source]) || "Web";
}

/** Abono: palabra y tono según el estado de la orden. */
export function paymentMeta(status: string | null | undefined): { label: string; tone: "warning" | "success" | "danger" | "neutral" } | null {
  switch (status) {
    case "in_review":
      return { label: "Comprobante en revisión", tone: "warning" };
    case "paid":
      return { label: "Abono pagado", tone: "success" };
    case "created":
    case "pending":
      return { label: "Abono sin pagar", tone: "neutral" };
    case "failed":
      return { label: "Comprobante rechazado", tone: "danger" };
    case "expired":
      return { label: "Abono vencido", tone: "neutral" };
    default:
      return null;
  }
}
