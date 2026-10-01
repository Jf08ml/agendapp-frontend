// utils/deposit.ts
// Espejo en el front de `resolveDepositRule` / `computeDepositForServices`
// (agenda-backend/src/services/collection/orderService.js). Solo sirve para MOSTRAR
// el abono: el monto que realmente se cobra siempre lo calcula el backend.
import type { Service } from "../services/serviceService";

export interface OrgDepositConfig {
  requireReservationDeposit?: boolean;
  reservationDepositType?: "percentage" | "fixed";
  reservationDepositPercentage?: number;
  reservationDepositFixedAmount?: number;
  currency?: string;
}

export interface DepositRule {
  mode: "percentage" | "fixed";
  value: number;
}

type ServiceDeposit = Pick<Service, "price" | "deposit">;

const ZERO_DECIMAL_CURRENCIES = new Set(["COP", "CLP", "PYG", "JPY", "KRW"]);

const roundForCurrency = (amount: number, currency?: string) =>
  ZERO_DECIMAL_CURRENCIES.has(String(currency || "").toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;

/** Regla de abono aplicable a un servicio: la propia o, si hereda, la general de la org. */
export function resolveDepositRule(org: OrgDepositConfig | null | undefined, service?: Pick<Service, "deposit">): DepositRule {
  const own = service?.deposit;
  if (own && (own.mode === "percentage" || own.mode === "fixed")) {
    return { mode: own.mode, value: Math.max(Number(own.value) || 0, 0) };
  }
  if (org?.reservationDepositType === "fixed") {
    return { mode: "fixed", value: Math.max(Number(org.reservationDepositFixedAmount) || 0, 0) };
  }
  return { mode: "percentage", value: Number(org?.reservationDepositPercentage ?? 0) };
}

/** Abono de un servicio (0 si la org no exige abono). */
export function computeServiceDeposit(org: OrgDepositConfig | null | undefined, service: ServiceDeposit): number {
  if (!org?.requireReservationDeposit) return 0;
  const price = Number(service.price || 0);
  const rule = resolveDepositRule(org, service);
  const raw = rule.mode === "fixed" ? Math.min(rule.value, price) : (price * rule.value) / 100;
  return roundForCurrency(raw, org.currency);
}

/** Abono total de un conjunto de servicios (se repite el servicio si se reserva varias veces). */
export function computeDepositTotal(org: OrgDepositConfig | null | undefined, services: ServiceDeposit[]): number {
  return services.reduce((sum, s) => sum + computeServiceDeposit(org, s), 0);
}

/**
 * Porcentaje común si TODOS los servicios aplican el mismo % (para el texto
 * "abono del X%"); undefined si hay montos fijos o porcentajes distintos.
 */
export function uniformDepositPercentage(
  org: OrgDepositConfig | null | undefined,
  services: Pick<Service, "deposit">[]
): number | undefined {
  if (!services.length) return undefined;
  const rules = services.map((s) => resolveDepositRule(org, s));
  const first = rules[0];
  if (first.mode !== "percentage") return undefined;
  return rules.every((r) => r.mode === "percentage" && r.value === first.value) ? first.value : undefined;
}
