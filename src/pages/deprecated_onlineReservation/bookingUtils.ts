// src/components/Booking/bookingUtils.ts

import { getAppointmentsByEmployee } from "../../services/appointmentService";
import { Appointment } from "../../services/appointmentService";
import {
  Employee,
  getEmployeesByOrganizationId,
} from "../../services/employeeService";
import {
  getServicesByOrganizationId,
  Service,
} from "../../services/serviceService";
import dayjs from "dayjs";

export const fetchServicesAndEmployees = async (
  organizationId: string | null,
  setServices: (services: Service[]) => void,
  setEmployees: (employees: Employee[]) => void
) => {
  if (!organizationId) return;
  const servicesData = await getServicesByOrganizationId(organizationId);
  const employeesData = await getEmployeesByOrganizationId(organizationId);
  setServices(servicesData.filter((service) => service.isActive));
  setEmployees(employeesData);
};

export const filterEmployeesByService = (
  employees: Employee[],
  serviceId: string
): Employee[] => {
  return employees.filter((employee) =>
    (employee.services || []).some((service) => service._id === serviceId)
  );
};

export const fetchAppointmentsAndAvailableTimes = async (
  employeeId: string | null,
  date: Date,
  serviceDuration: number,
  setAppointments: (appointments: Appointment[]) => void,
  setAvailableTimes: (times: string[]) => void,
  employees: Employee[] // Lista de empleados filtrados
) => {
  if (!date || !serviceDuration) return;

  let appointmentsData: Appointment[] = [];

  if (employeeId) {
    // Obtener citas de un empleado específico
    appointmentsData = await getAppointmentsByEmployee(employeeId);
  } else {
    // Obtener citas de todos los empleados disponibles
    const allAppointments = await Promise.all(
      employees.map((employee) => getAppointmentsByEmployee(employee._id))
    );
    appointmentsData = allAppointments.flat(); // Combinar citas de todos los empleados
  }

  setAppointments(appointmentsData);

  const availableTimes = generateAvailableTimes(
    date,
    serviceDuration,
    appointmentsData
  );
  setAvailableTimes(availableTimes);
};

export const generateAvailableTimes = (
  date: Date,
  serviceDuration: number,
  appointments: Appointment[]
): string[] => {
  const startHour = 8;
  const endHour = 18;
  const times: string[] = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeSlotStart = dayjs(date).hour(hour).minute(minute);
      const timeSlotEnd = timeSlotStart.add(serviceDuration, "minute");

      const isAvailable = !appointments.some(
        (appointment) =>
          dayjs(appointment.startDate).isBefore(timeSlotEnd) &&
          dayjs(appointment.endDate).isAfter(timeSlotStart)
      );

      if (isAvailable) {
        times.push(timeSlotStart.format("hh:mm A"));
      }
    }
  }

  return times;
};
