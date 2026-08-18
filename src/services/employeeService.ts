import { apiEmployee, apiEmployeePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Service } from "./serviceService";

interface Role {
  name: string;
  permissions: string[];
}

// Bloqueo temporal de horario (excepción) de un profesional
export interface EmployeeScheduleException {
  _id?: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  allDay: boolean;
  startTime?: string; // "HH:mm" (solo si !allDay)
  endTime?: string;   // "HH:mm" (solo si !allDay)
  reason?: string;
}

// Definir la estructura de un profesional
export interface Employee {
  _id: string;
  names: string;
  position: string;
  services?: Service[];
  email: string;
  password?: string;
  phoneNumber: string;
  organizationId: string;
  role: Role;
  customPermissions: string[];
  isActive: boolean;
  profileImage: string;
  color: string;
  order?: number;
  commissionType?: "percentage" | "fixed";
  commissionValue?: number;
  scheduleExceptions?: EmployeeScheduleException[];
}

interface CreateEmployeePayload {
  names: string;
  position: string;
  email: string;
  phoneNumber: string;
  services?: Partial<Service>[];
  organizationId: string;
  password: string;
  isActive: boolean;
  profileImage: string;
  commissionType?: "percentage" | "fixed";
  commissionValue?: number;
}

// Preferencia de recordatorio de cita del propio profesional (in-app + push)
export interface EmployeeReminderPreferences {
  enabled: boolean;
  hoursBefore: 1 | 2 | 6 | 24;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener todos los profesionales
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await apiEmployee.get<Response<Employee[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los profesionales");
    return [];
  }
};

// Obtener profesionales por organizationId
export const getEmployeesByOrganizationId = async (
  organizationId: string
): Promise<Employee[]> => {
  try {
    const response = await apiEmployeePublic.get<Response<Employee[]>>(
      `/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los profesionales por organización");
    return [];
  }
};

// Obtener un profesional por ID
export const getEmployeeById = async (
  employeeId: string
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.get<Response<Employee>>(
      `/${employeeId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el profesional");
  }
};

// Crear un nuevo profesional
export const createEmployee = async (
  employeeData: CreateEmployeePayload
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.post<Response<Employee>>(
      "/",
      employeeData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el profesional");
  }
};

// Actualizar un profesional
export const updateEmployee = async (
  employeeId: string,
  updatedData: Partial<Employee>
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.put<Response<Employee>>(
      `/${employeeId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el profesional");
  }
};

// Eliminar un profesional
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    await apiEmployee.delete<Response<void>>(`/${employeeId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el profesional");
  }
};

// Obtener la preferencia de recordatorio de cita del profesional autenticado
export const getMyReminderPreferences = async (): Promise<
  EmployeeReminderPreferences | undefined
> => {
  try {
    const response = await apiEmployee.get<Response<EmployeeReminderPreferences>>(
      "/me/reminder-preferences"
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener la preferencia de recordatorio");
  }
};

// Actualizar la preferencia de recordatorio de cita del profesional autenticado
export const updateMyReminderPreferences = async (
  data: Partial<EmployeeReminderPreferences>
): Promise<EmployeeReminderPreferences | undefined> => {
  try {
    const response = await apiEmployee.put<Response<EmployeeReminderPreferences>>(
      "/me/reminder-preferences",
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la preferencia de recordatorio");
  }
};
