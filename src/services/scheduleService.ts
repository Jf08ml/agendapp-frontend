import { apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Interfaces
export interface BreakPeriod {
  start: string;
  end: string;
  note?: string;
}

export interface DaySchedule {
  day: number;
  isOpen?: boolean; // Para organización
  isAvailable?: boolean; // Para empleado
  start: string;
  end: string;
  breaks: BreakPeriod[];
}

export interface WeeklySchedule {
  enabled: boolean;
  schedule: DaySchedule[];
  stepMinutes?: number; // Solo para organización
}

export interface TimeSlot {
  start: string;
  end: string;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// ============ ORGANIZACIÓN ============

// Obtener horario de la organización
export const getOrganizationSchedule = async (
  organizationId: string
): Promise<WeeklySchedule | undefined> => {
  try {
    const response = await apiGeneral.get<Response<WeeklySchedule>>(
      `/schedule/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el horario de la organización");
  }
};

// Actualizar horario de la organización
export const updateOrganizationSchedule = async (
  organizationId: string,
  schedule: WeeklySchedule
): Promise<WeeklySchedule | undefined> => {
  try {
    const response = await apiGeneral.put<Response<WeeklySchedule>>(
      `/schedule/organization/${organizationId}`,
      schedule
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(
      error,
      "Error al actualizar el horario de la organización"
    );
  }
};

// Obtener días abiertos de la organización en un rango de fechas
export const getOrganizationOpenDays = async (
  organizationId: string,
  startDate: string,
  endDate: string
): Promise<string[] | undefined> => {
  try {
    const response = await apiGeneral.get<Response<string[]>>(
      `/schedule/organization/${organizationId}/open-days`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(
      error,
      "Error al obtener los días abiertos de la organización"
    );
  }
};

// ============ EMPLEADO ============

// Obtener horario de un empleado
export const getEmployeeSchedule = async (
  employeeId: string
): Promise<WeeklySchedule | undefined> => {
  try {
    const response = await apiGeneral.get<Response<WeeklySchedule>>(
      `/schedule/employee/${employeeId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el horario del empleado");
  }
};

// Actualizar horario de un empleado
export const updateEmployeeSchedule = async (
  employeeId: string,
  schedule: WeeklySchedule
): Promise<WeeklySchedule | undefined> => {
  try {
    const response = await apiGeneral.put<Response<WeeklySchedule>>(
      `/schedule/employee/${employeeId}`,
      schedule
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el horario del empleado");
  }
};

// Obtener días disponibles de un empleado en un rango de fechas
export const getEmployeeAvailableDays = async (
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<string[] | undefined> => {
  try {
    const response = await apiGeneral.get<Response<string[]>>(
      `/schedule/employee/${employeeId}/available-days`,
      {
        params: { startDate, endDate },
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(
      error,
      "Error al obtener los días disponibles del empleado"
    );
  }
};

// ============ VALIDACIÓN Y SLOTS ============

// Validar si una fecha/hora es válida para el empleado
export const validateDateTime = async (
  employeeId: string,
  datetime: string
): Promise<{ isValid: boolean; reason?: string } | undefined> => {
  try {
    const response = await apiGeneral.post<
      Response<{ isValid: boolean; reason?: string }>
    >(`/schedule/validate-datetime`, {
      employeeId,
      datetime,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al validar la fecha y hora");
  }
};

// Obtener slots de tiempo disponibles para un empleado en una fecha
export const getAvailableSlots = async (
  employeeId: string,
  date: string,
  serviceDurationMinutes?: number,
  organizationId?: string
): Promise<TimeSlot[] | undefined> => {
  try {
    const response = await apiGeneral.post<Response<{ date: string; slots: { time: string; available: boolean; datetime: string }[]; totalSlots: number }>>(
      `/schedule/available-slots`,
      {
        employeeId,
        date,
        serviceDuration: serviceDurationMinutes,
        organizationId, // El backend lo necesita
      }
    );
    
    // Convertir el formato del backend al formato esperado por el frontend
    const slots = response.data.data.slots
      .filter(slot => slot.available)
      .map(slot => ({
        start: slot.time,
        end: slot.time // El backend no retorna end, pero podemos calcularlo si es necesario
      }));
    
    return slots;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los slots disponibles");
  }
};

// ============ MULTI-SERVICE ============

export interface ServiceInterval {
  serviceId: string;
  employeeId: string;
  start: string;
  end: string;
}

export interface MultiServiceBlock {
  start: string;
  end: string;
  intervals: ServiceInterval[];
}

export interface MultiServiceBlocksResponse {
  blocks: MultiServiceBlock[];
}

export interface BatchSlotRequest {
  date: string;
  serviceId: string;
  employeeId: string | null;
  duration: number;
}

export interface BatchSlotResult {
  serviceId: string;
  employeeId: string | null;
  date: string;
  slots: string[];
}

export interface BatchSlotsResponse {
  results: BatchSlotResult[];
}

// Obtener bloques para múltiples servicios (mismo día)
export const getMultiServiceBlocks = async (
  date: string,
  organizationId: string,
  services: Array<{ serviceId: string; employeeId: string | null; duration: number }>
): Promise<MultiServiceBlocksResponse | undefined> => {
  try {
    const response = await apiGeneral.post<Response<MultiServiceBlocksResponse>>(
      `/schedule/multi-service-blocks`,
      {
        date,
        organizationId,
        services
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener bloques de servicio");
  }
};

// Obtener slots para múltiples días/servicios (batch)
export const getAvailableSlotsBatch = async (
  organizationId: string,
  requests: BatchSlotRequest[]
): Promise<BatchSlotsResponse | undefined> => {
  try {
    const response = await apiGeneral.post<Response<BatchSlotsResponse>>(
      `/schedule/available-slots-batch`,
      {
        organizationId,
        requests
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener slots disponibles");
  }
};

