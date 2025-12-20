/* eslint-disable @typescript-eslint/no-explicit-any */
// bookingUtilsMulti.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

import { Appointment } from "../../services/appointmentService";

export const TIME_FORMATS = [
  "h:mm A",
  "HH:mm",
  "HH:mm:ss",
  "h:mm:ss A",
] as const;

/** --- NUEVO: Tipos que vienen del schema del org --- */
export type OpeningBreak = {
  day: number; // 0..6 (Dom..Sáb)
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  note?: string;
};
export type OpeningConstraints = {
  start?: string; // "HH:mm" o ""
  end?: string; // "HH:mm" o ""
  businessDays?: number[]; // ej. [1,2,3,4,5]
  breaks?: OpeningBreak[]; // array por día
  stepMinutes?: number; // override del step si quieres
};

// ---------- Helpers genéricos ----------

/** Normaliza un id que puede venir como string u objeto con _id */
export function getId(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && (val as any)._id)
    return String((val as any)._id);
  return undefined;
}

/** Convierte "HH:mm" -> minutos desde 00:00 */
function hhmmToMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Devuelve la ventana de trabajo del día (dayjs start/end) según openingHours (con fallback si faltan) */
function getWorkWindow(
  day: Date,
  opening: OpeningConstraints,
  fallback = { start: 8 * 60, end: 18 * 60 }
) {
  const minutesStart = hhmmToMinutes(opening.start) ?? fallback.start;
  const minutesEnd = hhmmToMinutes(opening.end) ?? fallback.end;

  const base = dayjs(day).startOf("day");
  const winStart = base.add(minutesStart, "minute");
  const winEnd = base.add(minutesEnd, "minute");
  return { winStart, winEnd };
}

function isBusinessDay(day: Date, businessDays?: number[]) {
  if (!businessDays || businessDays.length === 0) return true; // si no config, no limitar
  const dow = dayjs(day).day(); // 0..6 (Dom..Sáb)
  return businessDays.includes(dow);
}

/** ¿El rango [from, to) cae dentro de algún break del mismo día? */
function isInBreak(
  from: dayjs.Dayjs,
  to: dayjs.Dayjs,
  breaks?: OpeningBreak[]
) {
  if (!breaks || breaks.length === 0) return false;
  const dow = from.day();
  const dayBreaks = breaks.filter((b) => b.day === dow);
  if (dayBreaks.length === 0) return false;

  return dayBreaks.some((b) => {
    const bStartMin = hhmmToMinutes(b.start);
    const bEndMin = hhmmToMinutes(b.end);
    if (bStartMin == null || bEndMin == null) return false;

    const base = from.startOf("day");
    const brStart = base.add(bStartMin, "minute");
    const brEnd = base.add(bEndMin, "minute");
    // solapa si brStart < to && from < brEnd
    return brStart.isBefore(to) && from.isBefore(brEnd);
  });
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

// ---------- Disponibilidades por servicio (días distintos) ----------

/** Retorna horas disponibles en formato "h:mm A", aplicando openingHours y breaks */
export function generateAvailableTimes(
  date: Date,
  duration: number,
  appointments: Appointment[],
  opening?: OpeningConstraints
): string[] {
  console.log(opening);
  const stepMinutes = opening?.stepMinutes ?? 15;

  // si no es día laboral, retorna []
  if (!isBusinessDay(date, opening?.businessDays)) return [];

  const { winStart, winEnd } = getWorkWindow(date, opening ?? {});
  const times: string[] = [];

  for (
    let slotStart = winStart.clone();
    slotStart.add(duration, "minute").isSameOrBefore(winEnd);
    slotStart = slotStart.add(stepMinutes, "minute")
  ) {
    const slotEnd = slotStart.add(duration, "minute");

    // salta si cae en un break
    if (isInBreak(slotStart, slotEnd, opening?.breaks)) continue;

    // evita solapes con citas
    const overlaps = appointments.some(
      (a) =>
        dayjs(a.startDate).isBefore(slotEnd) &&
        dayjs(a.endDate).isAfter(slotStart)
    );
    if (!overlaps) {
      times.push(slotStart.format("h:mm A"));
    }
  }

  return times;
}

// ---------- Bloques encadenados (mismo día) ----------

export interface ChainService {
  serviceId: string;
  employeeId: string | null;
  duration: number; // en minutos
}

export interface MultiServiceSlot {
  start: Date;
  times: { employeeId: string | null; from: Date; to: Date }[];
}

/** Calcula bloques encadenados (mismo día, en orden) respetando horario/breaks */
export function findAvailableMultiServiceSlots(
  day: Date,
  services: ChainService[],
  appointmentsByEmp: Record<string, Appointment[]>,
  opening?: OpeningConstraints
): MultiServiceSlot[] {
  if (!day || !services.length) return [];
  if (!isBusinessDay(day, opening?.businessDays)) return [];

  const stepMinutes = opening?.stepMinutes ?? 15;
  const { winStart, winEnd } = getWorkWindow(day, opening ?? {});
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const blocks: MultiServiceSlot[] = [];

  for (
    let t = winStart.clone();
    t.clone().add(totalDuration, "minute").isSameOrBefore(winEnd);
    t = t.add(stepMinutes, "minute")
  ) {
    let isAvailable = true;
    const times: { employeeId: string | null; from: Date; to: Date }[] = [];

    let slotStart = t.clone();

    for (const svc of services) {
      const slotEnd = slotStart.clone().add(svc.duration, "minute");
      if (slotEnd.isAfter(winEnd)) {
        isAvailable = false;
        break;
      }

      // respeta breaks
      if (isInBreak(slotStart, slotEnd, opening?.breaks)) {
        isAvailable = false;
        break;
      }

      // respeta citas del empleado (si aplica)
      if (svc.employeeId) {
        const appts = appointmentsByEmp[svc.employeeId] ?? [];
        const overlap = appts.some(
          (appt) =>
            dayjs(appt.startDate).isBefore(slotEnd) &&
            dayjs(appt.endDate).isAfter(slotStart)
        );
        if (overlap) {
          isAvailable = false;
          break;
        }
      }

      times.push({
        employeeId: svc.employeeId,
        from: slotStart.toDate(),
        to: slotEnd.toDate(),
      });
      slotStart = slotEnd;
    }

    if (isAvailable) {
      blocks.push({ start: t.toDate(), times });
    }
  }

  return blocks;
}

// ---------- Auto-asignación: menos citas ese día ----------

function overlapsRange(appt: Appointment, from: dayjs.Dayjs, to: dayjs.Dayjs) {
  return (
    dayjs(appt.startDate).isBefore(to) && dayjs(appt.endDate).isAfter(from)
  );
}

function dayKey(d: Date) {
  return dayjs(d).format("YYYY-MM-DD");
}

export function pickEmployeeWithLessAppointmentsForSlot(opts: {
  date: Date; // día del slot
  from: Date; // inicio exacto
  to: Date; // fin exacto
  candidateEmployeeIds: string[];
  appointmentsByEmp: Record<string, Appointment[]>;
}): string | null {
  const { date, from, to, candidateEmployeeIds, appointmentsByEmp } = opts;
  if (!candidateEmployeeIds?.length) return null;

  const fromDj = dayjs(from);
  const toDj = dayjs(to);
  const dk = dayKey(date);

  // 1) filtra a los que realmente están libres en ese rango
  const free = candidateEmployeeIds.filter((empId) => {
    const appts = appointmentsByEmp[empId] ?? [];
    return !appts.some((a) => overlapsRange(a, fromDj, toDj));
  });

  if (free.length === 0) return null;

  // 2) cuenta citas del día (no solo overlaps del rango)
  //    (asumiendo que appointmentsByEmp ya viene filtrado por día, aún así lo hacemos robusto)
  const counts = free.map((empId) => {
    const appts = appointmentsByEmp[empId] ?? [];
    const countThatDay = appts.filter(
      (a) => dayKey(new Date(a.startDate)) === dk
    ).length;
    return { empId, count: countThatDay };
  });

  // 3) menor cantidad
  counts.sort((a, b) => a.count - b.count);
  return counts[0].empId;
}

export type EligibleByService = Record<string, string[]>;

/**
 * Igual que findAvailableMultiServiceSlots, pero si svc.employeeId es null:
 * - busca entre empleados elegibles para ese servicio
 * - elige el que esté libre en ese rango y tenga menos citas ese día
 * - devuelve el bloque con employeeId ya asignado por tramo
 */
export function findAvailableMultiServiceSlotsAuto(
  day: Date,
  services: ChainService[],
  appointmentsByEmp: Record<string, Appointment[]>,
  eligibleByService: EligibleByService,
  opening?: OpeningConstraints
): MultiServiceSlot[] {
  if (!day || !services.length) return [];
  if (!isBusinessDay(day, opening?.businessDays)) return [];

  const stepMinutes = opening?.stepMinutes ?? 15;
  const { winStart, winEnd } = getWorkWindow(day, opening ?? {});
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const blocks: MultiServiceSlot[] = [];

  for (
    let t = winStart.clone();
    t.clone().add(totalDuration, "minute").isSameOrBefore(winEnd);
    t = t.add(stepMinutes, "minute")
  ) {
    let isAvailable = true;
    const times: { employeeId: string | null; from: Date; to: Date }[] = [];

    let slotStart = t.clone();

    for (const svc of services) {
      const slotEnd = slotStart.clone().add(svc.duration, "minute");
      if (slotEnd.isAfter(winEnd)) {
        isAvailable = false;
        break;
      }

      // respeta breaks
      if (isInBreak(slotStart, slotEnd, opening?.breaks)) {
        isAvailable = false;
        break;
      }

      // candidatos: fijo o elegibles del servicio
      const candidates = svc.employeeId
        ? [svc.employeeId]
        : eligibleByService[svc.serviceId] ?? [];

      if (!candidates.length) {
        isAvailable = false;
        break;
      }

      // elige empleado para este tramo
      const chosenEmpId = svc.employeeId
        ? svc.employeeId
        : pickEmployeeWithLessAppointmentsForSlot({
            date: day,
            from: slotStart.toDate(),
            to: slotEnd.toDate(),
            candidateEmployeeIds: candidates,
            appointmentsByEmp,
          });

      if (!chosenEmpId) {
        isAvailable = false;
        break;
      }

      times.push({
        employeeId: chosenEmpId,
        from: slotStart.toDate(),
        to: slotEnd.toDate(),
      });

      slotStart = slotEnd;
    }

    if (isAvailable) {
      blocks.push({ start: t.toDate(), times });
    }
  }

  return blocks;
}
