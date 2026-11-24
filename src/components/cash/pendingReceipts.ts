// Aviso de comprobantes por validar dentro de Caja (design system, CajaPanel ·
// Fase 2). Lógica pura para `node --test`.

export interface PendingReceiptLike {
  amount: number;
  currency: string;
  createdAt: string;
  receipt?: { uploadedAt?: string; aiVerdict?: "match" | "mismatch" | "unreadable" };
}

/** «hace 5 min», «hace 3 h», «hace 2 días». */
export function waitingText(fromIso: string, now: number = Date.now()): string {
  const ms = Math.max(0, now - new Date(fromIso).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

export interface PendingSummary {
  count: number;
  total: number;
  currency: string;
  aiMatches: number;
  oldestWaiting: string;
}

export function pendingReceiptsSummary(orders: PendingReceiptLike[], now: number = Date.now()): PendingSummary | null {
  if (orders.length === 0) return null;
  const sent = (o: PendingReceiptLike) => o.receipt?.uploadedAt || o.createdAt;
  const oldest = orders.reduce((a, b) => (new Date(sent(a)).getTime() <= new Date(sent(b)).getTime() ? a : b));
  return {
    count: orders.length,
    total: orders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0),
    currency: orders[0].currency,
    aiMatches: orders.filter((o) => o.receipt?.aiVerdict === "match").length,
    oldestWaiting: waitingText(sent(oldest), now),
  };
}

/** Resultado de la IA en palabras para un solo comprobante. */
export function aiVerdictText(verdict?: "match" | "mismatch" | "unreadable"): string {
  if (verdict === "match") return "La IA lo marcó como válido";
  if (verdict === "mismatch") return "La IA encontró diferencias";
  if (verdict === "unreadable") return "La IA no pudo leerlo";
  return "Sin revisión de la IA";
}
