// Cálculo puro del destino al soltar una cita en la grilla Día / Semana.
// Sin React ni dayjs para probarlo con node --test.

export const snapToQuarter = (minutes: number) => Math.round(minutes / 15) * 15;

/**
 * Minutos desde el inicio de la grilla según dónde se soltó.
 * - clientY: posición del puntero (px CSS, igual para mouse y táctil).
 * - rectTop: borde superior de la columna en pantalla (getBoundingClientRect ya
 *   descuenta el scroll de los contenedores; no se suma scrollTop aparte).
 * - offsetY: dónde se agarró la tarjeta, para que su borde superior caiga donde se ve.
 * Nunca negativo ni más allá del final de la grilla.
 */
export function dropMinutes(clientY: number, rectTop: number, offsetY: number, hourHeight: number, gridMinutes: number): number {
  const raw = ((clientY - rectTop - offsetY) / hourHeight) * 60;
  const snapped = snapToQuarter(Math.round(raw));
  return Math.min(Math.max(0, snapped), Math.max(0, gridMinutes - 15));
}

/** Diferencia (ms) entre la hora local de `tz` y UTC en el instante `t`. */
function tzOffsetMs(t: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(t / 1000) * 1000;
}

/** Medianoche (en la zona del negocio) del día al que pertenece `day` en esa zona. */
export function zonedDayStart(day: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
  const [y, m, d] = parts.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - tzOffsetMs(guess, tz);
  t = guess - tzOffsetMs(t, tz); // segunda pasada por si el desfase cambia ese día
  return new Date(t);
}

/**
 * Inicio propuesto: día visible (en la zona del negocio) + hora de inicio de la
 * grilla + minutos soltados. Misma referencia que usa calculateAppointmentPosition
 * para dibujar las citas, así la cita cae donde se soltó aunque el navegador
 * esté en otra zona horaria.
 */
export function dropStart(day: Date, tz: string, startHour: number, minutes: number): Date {
  return new Date(zonedDayStart(day, tz).getTime() + (startHour * 60 + minutes) * 60_000);
}
