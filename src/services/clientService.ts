import { apiClient } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Definir la estructura de un cliente
export interface Client {
  _id: string;
  name: string;
  phoneNumber: string;
  phone_e164?: string; // 🌍 Número normalizado en formato E.164
  phone_country?: string; // 🌍 Código de país ISO2 (CO, MX, US, etc.)
  email?: string;
  servicesTaken: number;
  referralsMade: number;
  organizationId: string;
  birthDate: Date | null;
}

interface CreateClientPayload {
  name: string;
  phoneNumber: string;
  email?: string;
  organizationId: string;
  birthDate: Date | null;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener todos los clientes
export const getClients = async (): Promise<Client[]> => {
  try {
    const response = await apiClient.get<Response<Client[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los clientes");
    return [];
  }
};

// Obtener clientes por organizationId
export const getClientsByOrganizationId = async (
  organizationId: string
): Promise<Client[]> => {
  try {
    const response = await apiClient.get<Response<Client[]>>(
      `/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los clientes");
    return [];
  }
};

// 🚀 Búsqueda optimizada de clientes con filtros
export const searchClients = async (
  organizationId: string,
  searchQuery: string = "",
  limit: number = 20
): Promise<Client[]> => {
  try {
    const response = await apiClient.get<Response<Client[]>>(
      `/organization/${organizationId}/search`,
      {
        params: { search: searchQuery, limit }
      }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los clientes por organización");
    return [];
  }
};

// Obtener un cliente por ID
export const getClientById = async (
  clientId: string
): Promise<Client | undefined> => {
  try {
    const response = await apiClient.get<Response<Client>>(`/${clientId}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el cliente");
  }
};

// Crear un nuevo cliente
export const createClient = async (
  clientData: CreateClientPayload
): Promise<Client | undefined> => {
  try {
    const response = await apiClient.post<Response<Client>>("/", clientData);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el cliente");
  }
};

// Actualizar un cliente
export const updateClient = async (
  clientId: string,
  updatedData: Partial<Client>
): Promise<Client | undefined> => {
  try {
    const response = await apiClient.put<Response<Client>>(
      `/${clientId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el cliente");
  }
};

// Eliminar un cliente
export const deleteClient = async (clientId: string): Promise<void> => {
  try {
    await apiClient.delete<Response<void>>(`/${clientId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el cliente");
  }
};

// Obtener un cliente por número de teléfono
export const getClientByPhoneNumberAndOrganization = async (
  phoneNumber: string,
  organizationId: string
): Promise<Client | undefined> => {
  try {
    const response = await apiClient.get<Response<Client>>(
      `/phone/${phoneNumber}/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al buscar el cliente");
  }
};

// Registrar un servicio tomado por el cliente
export const registerService = async (clientId: string): Promise<void> => {
  try {
    await apiClient.post<Response<void>>(`/${clientId}/register-service`);
  } catch (error) {
    handleAxiosError(error, "Error al registrar el servicio");
  }
};

// Registrar un referido hecho por el cliente
export const registerReferral = async (clientId: string): Promise<void> => {
  try {
    await apiClient.post<Response<void>>(`/${clientId}/register-referral`);
  } catch (error) {
    handleAxiosError(error, "Error al registrar el referido");
  }
};

// Carga masiva de clientes desde Excel
export const bulkUploadClients = async (
  clients: Array<{
    name: string;
    phoneNumber: string;
    email?: string;
    birthDate?: Date | null;
  }>,
  organizationId: string
): Promise<{
  success: Array<{ row: number; name: string; phoneNumber: string }>;
  errors: Array<{ row: number; name: string; phoneNumber: string; error: string }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}> => {
  try {
    const response = await apiClient.post<
      Response<{
        success: Array<{ row: number; name: string; phoneNumber: string }>;
        errors: Array<{ row: number; name: string; phoneNumber: string; error: string }>;
        totalProcessed: number;
        totalSuccess: number;
        totalErrors: number;
      }>
    >("/bulk-upload", { clients, organizationId });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al cargar los clientes");
    throw error;
  }
};

