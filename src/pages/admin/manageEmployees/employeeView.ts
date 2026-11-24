// Lógica pura de Profesionales (rediseño, ProfesionalesPanel). Sin React ni red
// para poder probarla con node --test.

export type OnlineBookingMode = "visible" | "backup" | "hidden";

interface OnlineBookingFields {
  onlineBookingEnabled?: boolean;
  onlineBookingBackup?: boolean;
}

/** Las tres opciones excluyentes salen de los dos campos de siempre. */
export function onlineBookingMode(e: OnlineBookingFields): OnlineBookingMode {
  if (e.onlineBookingEnabled === false) return "hidden";
  return e.onlineBookingBackup === true ? "backup" : "visible";
}

/** Y vuelven a los dos campos al guardar (mismo dato en el backend). */
export function onlineBookingFields(mode: OnlineBookingMode): Required<OnlineBookingFields> {
  if (mode === "hidden") return { onlineBookingEnabled: false, onlineBookingBackup: false };
  return { onlineBookingEnabled: true, onlineBookingBackup: mode === "backup" };
}

export const ONLINE_BOOKING_LABEL: Record<OnlineBookingMode, string> = {
  visible: "Visible",
  backup: "Solo respaldo",
  hidden: "Oculta",
};

/**
 * Colores de profesional: los 8 tokens pro-1…pro-8 (tema claro). Se guardan como
 * hex porque la agenda y los reportes leen `employee.color` tal cual.
 */
export const PRO_COLORS: { token: string; hex: string }[] = [
  { token: "pro-1", hex: "#1c7ed6" },
  { token: "pro-2", hex: "#d6336c" },
  { token: "pro-3", hex: "#0c8599" },
  { token: "pro-4", hex: "#e8590c" },
  { token: "pro-5", hex: "#7048e8" },
  { token: "pro-6", hex: "#5c940d" },
  { token: "pro-7", hex: "#ae3ec9" },
  { token: "pro-8", hex: "#868e96" },
];

export const sameColor = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Comisión en texto corto para la tabla: «30 %», «$15.000 por cita», «—». */
export function commissionLabel(
  type: "percentage" | "fixed" | undefined,
  value: number | undefined,
  money: (n: number) => string
): string {
  if (!value) return "—";
  return type === "fixed" ? `${money(value)} por cita` : `${value} %`;
}

interface Contact {
  _id?: string;
  email?: string;
  phoneNumber?: string;
}

const digits = (s = "") => s.replace(/\D/g, "");

/**
 * Correo o teléfono repetido con otro profesional, para mostrarlo bajo el campo.
 * Correo sin distinguir mayúsculas; teléfono por sus últimos 10 dígitos.
 */
export function findDuplicateContact(
  candidate: Contact,
  others: Contact[]
): { email: boolean; phone: boolean } {
  const email = (candidate.email ?? "").trim().toLowerCase();
  const phone = digits(candidate.phoneNumber).slice(-10);
  const rest = others.filter((o) => !candidate._id || o._id !== candidate._id);
  return {
    email: !!email && rest.some((o) => (o.email ?? "").trim().toLowerCase() === email),
    phone: phone.length >= 7 && rest.some((o) => digits(o.phoneNumber).slice(-10) === phone),
  };
}

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
