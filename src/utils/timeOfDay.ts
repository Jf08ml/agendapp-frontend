// Utilidades para horas del día en formato "HH:mm" de 24 h (el formato del backend).

const pad = (n: number) => String(n).padStart(2, "0");

export const parseTime = (value: string): { h: number; m: number } => {
  const [h, m] = (value || "").split(":").map((n) => parseInt(n, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
};

/** "14:00" → "2:00 PM" (12h) o "14:00" (24h). Para mensajes de validación. */
export const formatTimeLabel = (value: string, is24h: boolean): string => {
  const { h, m } = parseTime(value);
  if (is24h) return `${pad(h)}:${pad(m)}`;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
};
