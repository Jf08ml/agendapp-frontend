// Lógica pura de Tienda e inventario (rediseño, InventarioPanel / PedidosPanel):
// stock bajo, comisión y publicación en palabras, estados de pago y entrega de
// los pedidos y qué acción corresponde a cada pedido. Sin React (node --test).

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export type IconKey = "check" | "store" | "cashRegister" | "off" | "clock" | "eye" | "refund" | "x" | "truck";

export interface StateInfo {
  label: string;
  tone: Tone;
  icon: IconKey;
}

export const badgeClass = (tone: Tone) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

interface StockFields {
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
}

/** «Bajo» cuando controla stock y llega a su umbral de alerta (igual que antes). */
export const isLowStock = (p: StockFields) =>
  p.trackStock && p.lowStockThreshold > 0 && p.stockQuantity <= p.lowStockThreshold;

/** Comisión en texto claro para la tabla. */
export function productCommissionText(
  type: "percentage" | "fixed" | null | undefined,
  value: number | undefined,
  money: (n: number) => string
): string {
  if (!type) return "La del profesional";
  if (!value) return "Sin comisión";
  return type === "percentage" ? `${value} % de la venta` : `${money(value)} por unidad`;
}

/** Publicación en palabras: En la tienda / Solo en caja / Inactivo. */
export function publicationState(p: { active: boolean; visibleInStore?: boolean }): StateInfo {
  if (!p.active) return { label: "Inactivo", tone: "neutral", icon: "off" };
  if (p.visibleInStore) return { label: "En la tienda", tone: "success", icon: "store" };
  return { label: "Solo en caja", tone: "info", icon: "cashRegister" };
}

interface OrderFields {
  status: string;
  provider: string;
  store?: { fulfillmentStatus?: string };
}

/** Pago del pedido (mismas reglas de antes, ahora con tono e ícono). */
export function orderPaymentState(o: OrderFields): StateInfo {
  if (o.status === "paid") return { label: "Pagado", tone: "success", icon: "check" };
  if (o.status === "in_review") return { label: "En revisión", tone: "warning", icon: "eye" };
  if (o.status === "refunded") return { label: "Reembolsado", tone: "neutral", icon: "refund" };
  if (o.status === "failed" || o.status === "expired") return { label: "Cancelado", tone: "neutral", icon: "x" };
  if (o.provider === "cod") return { label: "Pendiente de pago", tone: "warning", icon: "clock" };
  return { label: "Sin pagar", tone: "neutral", icon: "clock" };
}

export function orderFulfillmentState(o: OrderFields): StateInfo {
  const f = o.store?.fulfillmentStatus || "pending";
  if (f === "delivered") return { label: "Entregado", tone: "success", icon: "check" };
  if (f === "cancelled") return { label: "Cancelado", tone: "neutral", icon: "x" };
  return { label: "Por entregar", tone: "info", icon: "truck" };
}

export const PROVIDER_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago",
  receipt: "Transferencia",
  cod: "Contraentrega",
};

export interface OrderActions {
  /** Una sola acción principal según el caso. */
  primary: "collect" | "deliver" | null;
  canCancel: boolean;
  canDelete: boolean;
  /** Comprobante en revisión: se revisa en Caja y pagos › Comprobantes. */
  inReview: boolean;
}

/** Mismas reglas que la bandeja anterior (el backend valida igual). */
export function orderActions(o: OrderFields, canManage: boolean): OrderActions {
  const isPending = (o.store?.fulfillmentStatus || "pending") === "pending";
  const collect = canManage && o.provider === "cod" && o.status === "pending" && isPending;
  const deliver = canManage && o.status === "paid" && isPending;
  return {
    primary: collect ? "collect" : deliver ? "deliver" : null,
    canCancel: canManage && o.status !== "paid" && isPending,
    canDelete: canManage && o.status !== "in_review" && !(o.status === "paid" && isPending),
    inReview: o.status === "in_review",
  };
}

/** Número corto del pedido para mostrar («#A1B2C3»). */
export const orderNumber = (o: { _id: string; externalReference?: string }) =>
  `#${o._id.slice(-6).toUpperCase()}`;
