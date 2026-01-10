import { apiService } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Definir la estructura de un servicio
export interface Service {
  _id: string;
  images?: string[];
  name: string;
  type: string;
  description?: string;
  price: number;
  duration: number;
  isActive?: boolean;
  hidePrice?: boolean;
  maxConcurrentAppointments?: number; // 👥 Número de citas simultáneas que puede atender un empleado (default: 1)
}

interface CreateServicePayload {
  images?: (string | File)[];
  name: string;
  type: string;
  description?: string;
  price: number;
  duration: number;
  maxConcurrentAppointments?: number;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener todos los servicios
export const getServices = async (): Promise<Service[]> => {
  try {
    const response = await apiService.get<Response<Service[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los servicios");
    return [];
  }
};

// Obtener servicios por organizationId
export const getServicesByOrganizationId = async (
  organizationId: string
): Promise<Service[]> => {
  try {
    const response = await apiService.get<Response<Service[]>>(
      `/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los servicios por organización");
    return [];
  }
};

// Obtener un servicio por ID
export const getServiceById = async (
  serviceId: string
): Promise<Service | undefined> => {
  try {
    const response = await apiService.get<Response<Service>>(`/${serviceId}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el servicio");
  }
};

// Crear un nuevo servicio
export const createService = async (
  serviceData: CreateServicePayload
): Promise<Service | undefined> => {
  try {
    const response = await apiService.post<Response<Service>>("/", serviceData);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el servicio");
  }
};

// Actualizar un servicio
export const updateService = async (
  serviceId: string,
  updatedData: Partial<Service>
): Promise<Service | undefined> => {
  try {
    const response = await apiService.put<Response<Service>>(
      `/${serviceId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el servicio");
  }
};

// Eliminar un servicio
export const deleteService = async (serviceId: string): Promise<void> => {
  try {
    await apiService.delete<Response<void>>(`/${serviceId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el servicio");
  }
};

// Carga masiva de servicios desde Excel
export const bulkUploadServices = async (
  services: Array<{
    name: string;
    type?: string;
    description?: string;
    price: number;
    duration: number;
    hidePrice?: boolean;
    maxConcurrentAppointments?: number;
  }>,
  organizationId: string
): Promise<{
  success: Array<{ row: number; name: string; price: number; duration: number }>;
  errors: Array<{ row: number; name: string; error: string }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}> => {
  try {
    const response = await apiService.post<
      Response<{
        success: Array<{ row: number; name: string; price: number; duration: number }>;
        errors: Array<{ row: number; name: string; error: string }>;
        totalProcessed: number;
        totalSuccess: number;
        totalErrors: number;
      }>
    >("/bulk-upload", { services, organizationId });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al cargar los servicios");
    throw error;
  }
};

