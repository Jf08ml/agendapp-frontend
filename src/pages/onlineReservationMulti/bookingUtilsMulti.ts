/* eslint-disable @typescript-eslint/no-explicit-any */
// bookingUtilsMulti.ts - SIMPLIFICADO
// La mayoría de la lógica de disponibilidad ahora está en el backend
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export const TIME_FORMATS = [
  "h:mm A",
  "HH:mm",
  "HH:mm:ss",
  "h:mm:ss A",
] as const;

// ---------- Helpers genéricos (mantener) ----------

/** Normaliza un id que puede venir como string u objeto con _id */
export function getId(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && (val as any)._id)
    return String((val as any)._id);
  return undefined;
}

/** Parsea hora en múltiples formatos y devuelve un dayjs con la fecha dada */
export function buildStartFrom(dateVal: Date, timeStr: string) {
  const t = String(timeStr).replace(/\s+/g, " ").trim();
  const tNorm = t.replace(/(a\.?m\.?|p\.?m\.?)/i, (m) =>
    m.toUpperCase().replace(/\./g, "").replace("AM", "AM").replace("PM", "PM")
  );
  const parsed = dayjs(tNorm, TIME_FORMATS as unknown as string[], true);
  if (!parsed.isValid()) {
    throw new Error(`Hora inválida: "${timeStr}"`);
  }
  return dayjs(dateVal)
    .hour(parsed.hour())
    .minute(parsed.minute())
    .second(parsed.second() || 0)
    .millisecond(0);
}

// ---------- Tipos (mantener para compatibilidad) ----------

export interface ChainService {
  serviceId: string;
  employeeId: string | null;
  duration: number;
}

export interface MultiServiceSlot {
  start: Date;
  times: { employeeId: string | null; from: Date; to: Date }[];
}

export type EligibleByService = Record<string, string[]>;

// ============================================
// ⚠️ NOTA: Las siguientes funciones están DEPRECADAS
// La lógica de disponibilidad ahora debe hacerse en el backend
// usando getMultiServiceBlocks() y getAvailableSlotsBatch()
// del scheduleService.
// ============================================

/**
 * @deprecated Usar scheduleService.getMultiServiceBlocks() en su lugar
 */
export function findAvailableMultiServiceSlots(): MultiServiceSlot[] {
  console.warn("findAvailableMultiServiceSlots está deprecado. Usar scheduleService.getMultiServiceBlocks()");
  return [];
}

/**
 * @deprecated Usar scheduleService.getMultiServiceBlocks() en su lugar
 */
export function findAvailableMultiServiceSlotsAuto(): MultiServiceSlot[] {
  console.warn("findAvailableMultiServiceSlotsAuto está deprecado. Usar scheduleService.getMultiServiceBlocks()");
  return [];
}

/**
 * @deprecated Usar scheduleService.getAvailableSlotsBatch() en su lugar
 */
export async function generateAvailableTimes(): Promise<string[]> {
  console.warn("generateAvailableTimes está deprecado. Usar scheduleService.getAvailableSlotsBatch()");
  return [];
}
