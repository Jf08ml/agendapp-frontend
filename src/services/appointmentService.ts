/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiAppointment } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Service } from "./serviceService";
import { Employee } from "./employeeService";
import { Client } from "./clientService";

export interface AdditionalItem {
  name: string;
  price: number;
}

export interface Appointment {
  _id: string;
  client: Client;
  service: Service;
  employee: Employee;
  employeeRequestedByClient: boolean;
  startDate: Date;
  endDate: Date;
  status: string; // Puede ser "pending", "confirmed", "cancelled", "cancelled_by_customer", "cancelled_by_admin"
  organizationId: string;
  advancePayment: number;
  customPrice?: number | null; // Precio personalizado definido por el usuario
  additionalItems?: AdditionalItem[]; // Lista de adicionales adquiridos
  totalPrice: number; // Precio total calculado para la cita
  reminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentPayload {
  service: Service | string; // ID del servicio
  client: Client | string; // ID del cliente
  employee: Employee | string; // ID del empleado
  startDate: Date;
  endDate: Date;
  status: string; // Puede ser "pending", "confirmed", "cancelled", "cancelled_by_customer", "cancelled_by_admin"
  organizationId: string;
  advancePayment: number | undefined;
  customPrice?: number; // Precio personalizado (opcional)
  additionalItems?: AdditionalItem[]; // Lista de adicionales adquiridos (opcional)
}

/** Payload para el endpoint BATCH RECOMENDADO */
export interface CreateAppointmentsBatchPayload {
  services: Array<Service | string>; // ids
  employee: Employee | string;
  client: Client | string;
  startDate: Date | string; // inicio de la primera cita
  organizationId: string;
  advancePayment?: number;
  employeeRequestedByClient?: boolean;
  /** { [serviceId]: price } */
  customPrices?: Record<string, number>;
  /** { [serviceId]: AdditionalItem[] } */
  additionalItemsByService?: Record<string, AdditionalItem[]>;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

/** ---- Helpers ---- */
const asId = (x: any) => (typeof x === "string" ? x : x?._id ?? x?.id ?? x);

/**
 * Convierte una fecha a formato sin zona horaria (YYYY-MM-DDTHH:mm:ss)
 * para que el backend la interprete en la timezone de la organización.
 * 
 * Evita usar .toISOString() que convierte a UTC y causa desfases horarios.
 */
const asISO = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// Obtener todas las citas
export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await apiAppointment.get<Response<Appointment[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las citas");
    return [];
  }
};

// Obtener citas por organizationId con rango de fechas opcional
export const getAppointmentsByOrganizationId = async (
  organizationId: string,
  startDate?: string, // Fecha de inicio opcional
  endDate?: string // Fecha de fin opcional
): Promise<Appointment[]> => {
  try {
    // Construir los parámetros de consulta si las fechas están definidas
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    
    // Agregar timestamp para evitar caché
    queryParams.append("_t", Date.now().toString());

    // Construir la URL con los parámetros de consulta
    const url = `/organization/${organizationId}/dates${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await apiAppointment.get<Response<Appointment[]>>(url);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las citas por organización");
    return [];
  }
};

// Obtener una cita por ID
export const getAppointmentById = async (
  appointmentId: string
): Promise<Appointment | undefined> => {
  try {
    const response = await apiAppointment.get<Response<Appointment>>(
      `/${appointmentId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener la cita");
  }
};

export const getAppointmentsByEmployee = async (
  employeeId: string
): Promise<Appointment[]> => {
  try {
    const response = await apiAppointment.get<Response<Appointment[]>>(
      `/employee/${employeeId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las citas");
    return [];
  }
};

export const getAppointmentsByClient = async (
  clientId: string
): Promise<Appointment[]> => {
  try {
    const response = await apiAppointment.get<Response<Appointment[]>>(
      `/client/${clientId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las citas, por cliente.");
    return [];
  }
};

// Obtener buckets agregados (day/week/month) desde backend
export const getAppointmentsAggregatedByOrganizationId = async (
  organizationId: string,
  startDate?: string,
  endDate?: string,
  granularity: 'day' | 'week' | 'month' = 'day',
  employeeIds?: string[]
): Promise<Array<{ key: string; ingresos: number; citas: number; timestamp: number | null }>> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (granularity) params.append('granularity', granularity);
    if (employeeIds && employeeIds.length > 0) params.append('employeeIds', employeeIds.join(','));

    const url = `/organization/${organizationId}/aggregated${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiAppointment.get<Response<any[]>>(url);
    return response.data.data || [];
  } catch (error) {
    handleAxiosError(error, 'Error al obtener buckets agregados');
    return [];
  }
};

// Crear una nueva cita
export const createAppointment = async (
  appointmentData: CreateAppointmentPayload
): Promise<Appointment | undefined> => {
  try {
    const response = await apiAppointment.post<Response<Appointment>>(
      "",
      appointmentData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la cita");
  }
};

// Crear múltiples citas (batch)
/**
 * Crear múltiples citas en lote (endpoint recomendado /appointments/batch)
 * -> El backend espera UN payload con arreglo de servicios, no { appointments: [...] }
 */
export const createAppointmentsBatch = async (
  data: CreateAppointmentsBatchPayload
): Promise<Appointment[] | undefined> => {
  try {
    const payload = {
      services: data.services.map(asId),
      employee: asId(data.employee),
      client: asId(data.client),
      startDate: asISO(data.startDate),
      organizationId: data.organizationId,
      advancePayment: data.advancePayment,
      employeeRequestedByClient: data.employeeRequestedByClient ?? false,
      customPrices: data.customPrices,
      additionalItemsByService: data.additionalItemsByService,
    };
    const res = await apiAppointment.post<Response<Appointment[]>>(
      "/batch",
      payload
    );
    return res.data.data;
  } catch (err) {
    handleAxiosError(err, "Error al crear las citas en lote");
  }
};

// Actualizar una cita
export const updateAppointment = async (
  appointmentId: string,
  updatedData: Partial<Appointment>
): Promise<Appointment | undefined> => {
  try {
    // Transformar fechas al formato correcto sin timezone
    const payload = { ...updatedData };
    if (payload.startDate) {
      payload.startDate = asISO(payload.startDate) as any;
    }
    if (payload.endDate) {
      payload.endDate = asISO(payload.endDate) as any;
    }
    
    const response = await apiAppointment.put<Response<Appointment>>(
      `/${appointmentId}`,
      payload
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la cita");
  }
};

// Eliminar una cita
export const deleteAppointment = async (
  appointmentId: string
): Promise<void> => {
  try {
    await apiAppointment.delete<Response<void>>(`/${appointmentId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la cita");
  }
};
