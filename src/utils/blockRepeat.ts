// Repetición de un bloqueo de agenda (semanal o mensual): valor, validación y
// campos del payload. Lo usan BlockRepeatFields y los modales de bloqueo.

export interface BlockRepeatValue {
  recurrence: "none" | "weekly" | "monthly";
  weekdays: number[]; // 0 = domingo … 6 = sábado
  monthDays: number[]; // 1 … 31
}

export const DEFAULT_REPEAT: BlockRepeatValue = { recurrence: "none", weekdays: [], monthDays: [] };

/** Error de validación (o null) para mostrar/bloquear el guardado. */
export function repeatError(value: BlockRepeatValue): string | null {
  if (value.recurrence === "weekly" && value.weekdays.length === 0) return "Elige al menos un día de la semana.";
  if (value.recurrence === "monthly" && value.monthDays.length === 0) return "Elige al menos un día del mes.";
  return null;
}

/** Campos de recurrencia para el payload del backend (vacío si no se repite). */
export function repeatPayload(value: BlockRepeatValue) {
  if (value.recurrence === "weekly") return { recurrence: "weekly" as const, weekdays: value.weekdays };
  if (value.recurrence === "monthly") return { recurrence: "monthly" as const, monthDays: value.monthDays };
  return {};
}
