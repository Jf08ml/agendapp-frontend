import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);

import { Appointment } from "../../services/appointmentService";

// Retorna las horas disponibles en formato "HH:mm A"
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

      // El slot debe estar dentro del rango de trabajo
      if (slotEnd.hour() > endHour || slotEnd.isAfter(day.endOf("day")))
        continue;

      const overlaps = appointments.some(
        (a) =>
          dayjs(a.startDate).isBefore(slotEnd) &&
          dayjs(a.endDate).isAfter(slotStart)
      );
      if (!overlaps) {
        times.push(slotStart.format("h:mm A"));
      }
    }
  }
  return times;
}

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
 * Calcula los bloques encadenados de horarios donde pueden agendarse los servicios uno tras otro,
 * respetando la disponibilidad de cada empleado y la duración de cada servicio.
 * - Todos los servicios van el mismo día, encadenados en el orden recibido.
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

  // Define los límites del día de trabajo
  const dayStart = dayjs(day)
    .hour(workStartHour)
    .minute(0)
    .second(0)
    .millisecond(0);
  const dayEnd = dayjs(day)
    .hour(workEndHour)
    .minute(0)
    .second(0)
    .millisecond(0);

  // Calcula la duración total encadenada
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const blocks: MultiServiceSlot[] = [];

  // Recorre cada posible inicio de bloque
  for (
    let t = dayStart.clone();
    t.clone().add(totalDuration, "minute").isSameOrBefore(dayEnd);
    t = t.add(stepMinutes, "minute")
  ) {
    let isAvailable = true;
    const times: {
      employeeId: string | null;
      from: Date;
      to: Date;
    }[] = [];

    let slotStart = t.clone();

    for (const svc of services) {
      const slotEnd = slotStart.clone().add(svc.duration, "minute");
      // Si algún servicio se pasa del fin de la jornada, termina el loop
      if (slotEnd.isAfter(dayEnd)) {
        isAvailable = false;
        break;
      }
      // Si tiene empleado asignado, revisa solapamiento
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
      blocks.push({
        start: t.toDate(),
        times,
      });
    }
  }

  return blocks;
}
