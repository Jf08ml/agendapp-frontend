import dayjs from "dayjs";

/**
 * Retorna el string de formato dayjs según la configuración de la organización.
 * - '12h' (default) → "h:mm A"  (ej: "2:30 PM")
 * - '24h'           → "HH:mm"   (ej: "14:30")
 */
export function getTimeFormatStr(timeFormat?: string): string {
  return timeFormat === "24h" ? "HH:mm" : "h:mm A";
}

/**
 * Formatea un valor Date/string con el formato de hora de la organización.
 * Usa dayjs sin conversión de timezone (el valor ya debe estar en la TZ correcta).
 */
export function formatTime(date: Date | string | null | undefined, timeFormat?: string): string {
  if (!date) return "-";
  const dj = dayjs(date);
  return dj.isValid() ? dj.format(getTimeFormatStr(timeFormat)) : "-";
}

/**
 * Extrae y formatea la hora de un string ISO ("YYYY-MM-DDTHH:mm:ss") o
 * un string "HH:mm" plano — sin conversión de timezone.
 * Útil cuando el backend devuelve strings en la TZ de la organización.
 */
export function formatTimeFromISO(isoStr: string, timeFormat?: string): string {
  // Caso 1: string ISO con "T" → extraer la parte de hora
  const isoMatch = isoStr.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return _applyTimeFormat(parseInt(isoMatch[1]), isoMatch[2], timeFormat);
  }
  // Caso 2: string "HH:mm" plano
  const hmMatch = isoStr.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    return _applyTimeFormat(parseInt(hmMatch[1]), hmMatch[2], timeFormat);
  }
  return isoStr;
}

function _applyTimeFormat(hour: number, min: string, timeFormat?: string): string {
  if (timeFormat === "24h") {
    return `${String(hour).padStart(2, "0")}:${min}`;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${min} ${period}`;
}
