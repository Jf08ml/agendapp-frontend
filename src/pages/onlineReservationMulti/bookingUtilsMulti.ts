/* eslint-disable @typescript-eslint/no-explicit-any */
// bookingUtilsMulti.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

import { Appointment } from "../../services/appointmentService";

// ---------- Helpers genéricos ----------

export const TIME_FORMATS = ["h:mm A", "HH:mm", "HH:mm:ss", "h:mm:ss A"] as const;

/** Normaliza un id que puede venir como string u objeto con _id */
export function getId(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object" && (val as any)._id) return String((val as any)._id);
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

// ---------- Disponibilidades por servicio (días distintos) ----------

/** Retorna horas disponibles en formato "h:mm A" */
export function generateAvailableTimes(
  date: Date,
  duration: number,
  appointments: Appointment[],
  startHour = 8,
  endHour = 18,
  stepMinutes = 15
): string[] {
  const times: string[] = [];
  const day = dayjs(date);

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const slotStart = day.hour(hour).minute(minute).second(0).millisecond(0);
      const slotEnd = slotStart.add(duration, "minute");

      if (slotEnd.hour() > endHour || slotEnd.isAfter(day.endOf("day"))) continue;

      const overlaps = appointments.some(
        (a) => dayjs(a.startDate).isBefore(slotEnd) && dayjs(a.endDate).isAfter(slotStart)
      );
      if (!overlaps) {
        times.push(slotStart.format("h:mm A"));
      }
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
  times: {
    employeeId: string | null;
    from: Date;
    to: Date;
  }[];
}

/**
 * Calcula bloques encadenados (mismo día, en orden).
 */
export function findAvailableMultiServiceSlots(
  day: Date,
  services: ChainService[],
  appointmentsByEmp: Record<string, Appointment[]>,
  workStartHour = 8,
  workEndHour = 18,
  stepMinutes = 15
): MultiServiceSlot[] {
  if (!day || !services.length) return [];

  const dayStart = dayjs(day).hour(workStartHour).minute(0).second(0).millisecond(0);
  const dayEnd = dayjs(day).hour(workEndHour).minute(0).second(0).millisecond(0);

  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const blocks: MultiServiceSlot[] = [];

  for (let t = dayStart.clone(); t.clone().add(totalDuration, "minute").isSameOrBefore(dayEnd); t = t.add(stepMinutes, "minute")) {
    let isAvailable = true;
    const times: { employeeId: string | null; from: Date; to: Date }[] = [];

    let slotStart = t.clone();

    for (const svc of services) {
      const slotEnd = slotStart.clone().add(svc.duration, "minute");
      if (slotEnd.isAfter(dayEnd)) {
        isAvailable = false;
        break;
      }

      if (svc.employeeId) {
        const appts = appointmentsByEmp[svc.employeeId] ?? [];
        const overlap = appts.some(
          (appt) => dayjs(appt.startDate).isBefore(slotEnd) && dayjs(appt.endDate).isAfter(slotStart)
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
