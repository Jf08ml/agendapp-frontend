import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { RecurrencePattern } from "../../../services/appointmentService";
import type { ClassSession } from "../../../services/classService";

dayjs.extend(utc);
dayjs.extend(timezone);

// Horizonte máximo al generar fechas (además del fin elegido por el cliente).
const MAX_WEEKS = 26;

export type OccurrenceStatus = "available" | "selected" | "full" | "none" | "over_limit";

export interface Occurrence {
  day: Dayjs;
  session: ClassSession | null;
  status: OccurrenceStatus;
  /** Otras horas con clase ese día (cuando no la hay a la hora elegida). */
  otherTimes: string[];
}

/**
 * Fechas de "repetir esta clase": misma hora que `base`, en los días de la
 * semana del patrón, cada `intervalWeeks`, desde `base` hasta la fecha fin o
 * hasta juntar `count` sesiones reservables (disponibles + ya elegidas), sin
 * pasar de la última sesión publicada. Cada fecha dice si se puede agregar.
 */
export function buildRepeatOccurrences({
  base, sessions, selectedIds, remainingSlots, pattern, tz, now = new Date(),
}: {
  base: ClassSession;
  /** Sesiones de la clase, abiertas y llenas. */
  sessions: ClassSession[];
  selectedIds: Set<string>;
  /** Cuántas sesiones más se pueden agregar (créditos / tope por reserva). */
  remainingSlots: number;
  pattern: RecurrencePattern;
  tz: string;
  now?: Date;
}): Occurrence[] {
  const weekdays = [...(pattern.weekdays || [])].sort((x, y) => x - y);
  if (!weekdays.length) return [];

  const b = dayjs(base.startDate).tz(tz);
  const time = b.format("HH:mm");

  // Sesiones futuras por día (en la zona de la org).
  const byDay: Record<string, ClassSession[]> = {};
  for (const s of sessions) {
    if (!dayjs(s.startDate).isAfter(now)) continue;
    const key = dayjs(s.startDate).tz(tz).format("YYYY-MM-DD");
    (byDay[key] ||= []).push(s);
  }
  const keys = Object.keys(byDay).sort();
  const lastSessionDay = keys.length
    ? dayjs.tz(keys[keys.length - 1], tz).endOf("day")
    : b.endOf("day");

  // El DateInput entrega medianoche LOCAL del navegador en ISO: se toma el día
  // de calendario elegido (getters locales) y se interpreta en la zona de la org.
  const endByDate =
    pattern.endType === "date" && pattern.endDate
      ? dayjs.tz(dayjs(pattern.endDate).format("YYYY-MM-DD"), tz).endOf("day")
      : null;
  const horizon = [endByDate, lastSessionDay, b.add(MAX_WEEKS, "week")]
    .filter((d): d is Dayjs => !!d)
    .reduce((min, d) => (d.isBefore(min) ? d : min));
  const wanted = pattern.endType === "count" ? Math.max(1, pattern.count || 1) : Infinity;
  const interval = Math.max(1, pattern.intervalWeeks || 1);

  // Semana de la sesión base, empezando en domingo (0), como `weekdays`.
  const weekStart = b.startOf("day").subtract(b.day(), "day");
  const out: Occurrence[] = [];
  let bookable = 0; // disponibles + ya elegidas (cuentan para "después de N")
  let added = 0;

  for (let w = 0; ; w += interval) {
    const ws = weekStart.add(w, "week");
    if (ws.isAfter(horizon)) break;
    for (const wd of weekdays) {
      const day = ws.add(wd, "day");
      if (day.isBefore(b.startOf("day"))) continue;
      if (day.isAfter(horizon) || bookable >= wanted) break;

      const daySessions = byDay[day.format("YYYY-MM-DD")] || [];
      const session =
        daySessions.find((s) => dayjs(s.startDate).tz(tz).format("HH:mm") === time) || null;
      let status: OccurrenceStatus;
      if (!session) status = "none";
      else if (selectedIds.has(session._id)) status = "selected";
      else if (session.status !== "open" || session.capacity - session.enrolledCount < 1) status = "full";
      else if (added >= remainingSlots) status = "over_limit";
      else status = "available";

      if (status === "available") added++;
      if (status === "available" || status === "selected") bookable++;
      out.push({
        day,
        session,
        status,
        otherTimes: session
          ? []
          : daySessions
              .filter((s) => s.status === "open")
              .map((s) => dayjs(s.startDate).tz(tz).format("HH:mm")),
      });
    }
    if (bookable >= wanted) break;
  }
  return out;
}
