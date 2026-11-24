// Mi plan (rediseño, MembresiaPanel): aviso de cada uno de los 7 estados con una
// sola acción y la cuenta regresiva del periodo de gracia. Puro para node --test.

export type MembershipStatus = "trial" | "active" | "pending" | "past_due" | "suspended" | "cancelled" | "expired" | string;
export type NoticeAction = "renew" | "choose" | "none";

export const STATUS_LABELS: Record<string, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" }> = {
  active: { label: "Activo", tone: "success" },
  trial: { label: "Prueba gratuita", tone: "info" },
  pending: { label: "Pago pendiente", tone: "warning" },
  past_due: { label: "Vencido", tone: "warning" },
  suspended: { label: "Suspendido", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
  expired: { label: "Expirado", tone: "danger" },
};

/** Días de gracia tras el vencimiento (PAST_DUE_GRACE_DAYS en el backend). */
export const GRACE_DAYS = 3;
const DAY_MS = 86_400_000;

export function daysUntil(dateMs: number, nowMs: number): number {
  return Math.ceil((dateMs - nowMs) / DAY_MS);
}

/** Periodo de gracia: fecha de corte (vencimiento + 3 días) y días que quedan. */
export function graceInfo(periodEndMs: number, nowMs: number, accessEndsAtMs?: number | null) {
  const start = accessEndsAtMs ?? periodEndMs;
  const cutMs = start + GRACE_DAYS * DAY_MS;
  const left = Math.max(0, Math.min(GRACE_DAYS, Math.ceil((cutMs - nowMs) / DAY_MS)));
  return { cutMs, left, total: GRACE_DAYS };
}

/**
 * Aviso del estado con una sola acción principal.
 * - renew: renovar el plan actual (de pago). - choose: elegir un plan.
 */
export function statusNotice(
  status: MembershipStatus,
  daysLeft: number,
  canRenewCurrent: boolean
): { tone: "info" | "warning" | "danger"; title: string; text: string; action: NoticeAction } | null {
  const renewOrChoose: NoticeAction = canRenewCurrent ? "renew" : "choose";
  switch (status) {
    case "trial":
      return {
        tone: daysLeft <= 2 ? "warning" : "info",
        title: daysLeft > 0 ? `Tu prueba termina en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}` : "Tu prueba termina hoy",
        text: "Elige un plan antes de que termine para seguir sin interrupciones.",
        action: "choose",
      };
    case "active":
      if (daysLeft > 7) return null;
      return {
        tone: "warning",
        title: daysLeft > 0 ? `Tu plan vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}` : "Tu plan vence hoy",
        text: "Renuévalo para no perder el acceso.",
        action: renewOrChoose,
      };
    case "pending":
      return { tone: "warning", title: "Pago pendiente", text: "Estamos esperando la confirmación de tu pago.", action: renewOrChoose };
    case "past_due":
      return {
        tone: "warning",
        title: "Tu plan venció",
        text: "Mientras tanto solo puedes consultar tus datos. Renueva para recuperar el acceso completo.",
        action: renewOrChoose,
      };
    case "suspended":
      return { tone: "danger", title: "Cuenta suspendida", text: "Renueva tu plan para reactivarla.", action: renewOrChoose };
    case "cancelled":
    case "expired":
      return { tone: "danger", title: "Tu plan no está activo", text: "Elige un plan para recuperar el acceso.", action: "choose" };
    default:
      return null;
  }
}
