import { addHours, differenceInMinutes, startOfDay } from 'date-fns';
import { Appointment } from '../../../services/appointmentService';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Generar intervalos de tiempo para un rango específico
export const generateTimeIntervals = (startHour: number, endHour: number, baseDate: Date) => {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => addHours(startOfDay(baseDate), startHour + i));
};

// Detectar y organizar citas en capas para manejar superposiciones
export const organizeAppointmentsInLayers = (appointments: Appointment[]) => {
  const layers: Appointment[][] = [];

  appointments.forEach((appointment) => {
    const startTime = new Date(appointment.startDate);
    const endTime = new Date(appointment.endDate);

    let placed = false;

    // Verificar cada capa existente para colocar la cita
    for (const layer of layers) {
      const hasOverlap = layer.some((existingAppointment) => {
        const existingStart = new Date(existingAppointment.startDate);
        const existingEnd = new Date(existingAppointment.endDate);
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (existingStart >= startTime && existingStart < endTime)
        );
      });

      // Si no hay superposición en la capa actual, agregar la cita a esa capa
      if (!hasOverlap) {
        layer.push(appointment);
        placed = true;
        break;
      }
    }

    // Si hay superposición en todas las capas existentes, crear una nueva capa
    if (!placed) {
      layers.push([appointment]);
    }
  });

  return layers;
};

// Calcular la posición y altura de una cita
export const calculateAppointmentPosition = (
  appointment: Appointment,
  startHour: number,
  baseDate: Date,
  MINUTE_HEIGHT: number,
  timezone: string = 'America/Bogota'
) => {
  // Parse dates in organization timezone to avoid browser timezone conversion
  const startTime = dayjs.tz(appointment.startDate, timezone);
  const endTime = dayjs.tz(appointment.endDate, timezone);
  
  // Get start of day in organization timezone
  const baseDateStart = dayjs.tz(baseDate, timezone).startOf('day');
  
  // Calculate difference in minutes from start of day
  const startHourDiff = startTime.diff(baseDateStart, 'minute');
  const duration = endTime.diff(startTime, 'minute');

  return {
    top: (startHourDiff - startHour * 60) * MINUTE_HEIGHT,
    height: duration * MINUTE_HEIGHT,
  };
};

// Agrupar citas por empleado
export const organizeAppointmentsByEmployee = (appointments: Appointment[]) => {
  const appointmentsByEmployee: { [employeeId: string]: Appointment[] } = {};

  appointments.forEach((appointment) => {
    const employeeId = appointment.employee._id;
    if (!appointmentsByEmployee[employeeId]) {
      appointmentsByEmployee[employeeId] = [];
    }
    appointmentsByEmployee[employeeId].push(appointment);
  });

  return appointmentsByEmployee;
};

