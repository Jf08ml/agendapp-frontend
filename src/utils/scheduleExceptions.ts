// utils/scheduleExceptions.ts
// Espejo en el front de `exceptionAppliesToDate` (agenda-backend/src/services/scheduleService.js)
// y utilidades para describir/listar bloqueos recurrentes. Las fechas son "YYYY-MM-DD".

export const NO_END_DATE = "2099-12-31";

export interface RecurringFields {
  startDate: string;
  endDate: string;
  recurrence?: "weekly" | "monthly";
  weekdays?: number[]; // 0 = domingo … 6 = sábado
  monthDays?: number[]; // 1 … 31
  excludedDates?: string[];
}

export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAY_LONG = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

export const hasNoEnd = (ex: Pick<RecurringFields, "endDate">) => ex.endDate >= NO_END_DATE;

const weekdayOf = (dateStr: string) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

/** ¿El bloqueo aplica a este día? Rango + regla de recurrencia − ocurrencias excluidas. */
export function exceptionAppliesToDay(ex: RecurringFields, dayStr: string): boolean {
  if (dayStr < ex.startDate || dayStr > ex.endDate) return false;
  if (ex.excludedDates?.includes(dayStr)) return false;
  if (ex.recurrence === "weekly") return !!ex.weekdays?.includes(weekdayOf(dayStr));
  if (ex.recurrence === "monthly") return !!ex.monthDays?.includes(Number(dayStr.slice(8, 10)));
  return true;
}

/** "Todos los lunes y miércoles" / "El 1 y 15 de cada mes" */
export function describeRecurrence(ex: RecurringFields): string {
  const join = (items: string[]) =>
    items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
  if (ex.recurrence === "weekly") {
    const days = [...(ex.weekdays ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
    return `Todos los ${join(days.map((d) => WEEKDAY_LONG[d]))}`;
  }
  if (ex.recurrence === "monthly") {
    const days = [...(ex.monthDays ?? [])].sort((a, b) => a - b);
    return `El ${join(days.map(String))} de cada mes`;
  }
  return "";
}

/** Próximas ocurrencias (desde `fromStr`, máx. `limit`) de un bloqueo recurrente. */
export function listUpcomingOccurrences(ex: RecurringFields, fromStr: string, limit = 12): string[] {
  const out: string[] = [];
  const cursor = new Date(`${ex.startDate > fromStr ? ex.startDate : fromStr}T00:00:00Z`);
  // Tope de seguridad (~4 años) para reglas sin fecha de fin o que casi nunca caen (día 31)
  for (let i = 0; i < 1500 && out.length < limit; i++) {
    const dayStr = cursor.toISOString().slice(0, 10);
    if (dayStr > ex.endDate) break;
    if (exceptionAppliesToDay(ex, dayStr)) out.push(dayStr);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
