import { apiClient } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Entrada del historial de recompensas
export interface RewardHistoryEntry {
  _id: string;
  type: 'service' | 'referral';
  reward: string;
  earnedAt: string;
  redeemed: boolean;
  redeemedAt?: string;
}

// Definir la estructura de un cliente
export interface Client {
  _id: string;
  name: string;
  phoneNumber: string;
  phone_e164?: string;
  phone_country?: string;
  email?: string;
  documentId?: string;
  notes?: string;
  servicesTaken: number;
  referralsMade: number;
  hasServiceDiscount?: boolean;
  hasReferralBenefit?: boolean;
  rewardHistory?: RewardHistoryEntry[];
  organizationId: string;
  birthDate: Date | null;
}

interface CreateClientPayload {
  name: string;
  phoneNumber: string;
  phone_e164?: string; // 🌍 Número normalizado en formato E.164
  phone_country?: string; // 🌍 Código de país ISO2 (CO, MX, US, etc.)
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

// 🔁 Estado de recordatorios de seguimiento entre servicios (ver GET /clients/:id/follow-up-status)
export interface FollowUpServiceRef {
  _id: string;
  name: string;
}

export interface FollowUpPendingEntry {
  appointmentId: string;
  triggerService: FollowUpServiceRef;
  followUpService: FollowUpServiceRef | null;
  followUpDays: number;
  startDate: string;
  projectedDate: string;
  windowState: 'upcoming' | 'due' | 'expired';
  preview: { wouldSend: boolean; reason: string } | null;
}

export type FollowUpOutcome = 'sent' | 'skipped_already_returned' | 'skipped_no_phone' | 'skipped_superseded';

export interface FollowUpProcessedEntry {
  appointmentId: string;
  triggerService: FollowUpServiceRef;
  followUpService: FollowUpServiceRef | null;
  startDate: string;
  outcome: FollowUpOutcome | null;
  processedAt: string | null;
}

export interface ClientFollowUpStatus {
  organizationHasRules: boolean;
  pending: FollowUpPendingEntry[];
  processed: FollowUpProcessedEntry[];
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

// Obtener el estado de recordatorios de seguimiento de un cliente (próximos/enviados/no enviados)
export const getClientFollowUpStatus = async (
  clientId: string
): Promise<ClientFollowUpStatus | undefined> => {
  try {
    const response = await apiClient.get<Response<ClientFollowUpStatus>>(
      `/${clientId}/follow-up-status`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el estado de recordatorios de seguimiento");
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

// Buscar cliente por el campo identificador configurado en la organización
export const getClientByIdentifier = async (
  field: 'phone' | 'email' | 'documentId',
  value: string,
  organizationId: string
): Promise<Client | undefined> => {
  if (field === 'phone') {
    return getClientByPhoneNumberAndOrganization(value, organizationId);
  }
  try {
    const response = await apiClient.get<Response<Client>>('/by-identifier', {
      params: { field, value, organizationId },
    });
    return response.data.data;
  } catch (error) {
    return undefined;
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

// Fusionar cliente origen (sourceId) en cliente destino (targetId)
export const mergeClient = async (targetId: string, sourceId: string): Promise<Client> => {
  try {
    const response = await apiClient.post<Response<Client>>(`/${targetId}/merge/${sourceId}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al fusionar clientes");
    throw error;
  }
};

// Eliminar un cliente y todos sus registros relacionados
export const forceDeleteClient = async (clientId: string): Promise<void> => {
  try {
    await apiClient.delete<Response<void>>(`/${clientId}/force`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el cliente");
    throw error;
  }
};

// Restablecer contadores de fidelidad de un cliente
export const resetClientLoyalty = async (clientId: string): Promise<Client | undefined> => {
  try {
    const response = await apiClient.post<Response<Client>>(`/${clientId}/reset`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al restablecer los contadores");
    throw error;
  }
};

// Restablecer contadores de fidelidad de todos los clientes de la organización
export const resetAllClientsLoyalty = async (): Promise<{ modifiedCount: number } | undefined> => {
  try {
    const response = await apiClient.post<Response<{ modifiedCount: number }>>("/reset-all");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al restablecer los contadores");
    throw error;
  }
};

// Marcar una recompensa como canjeada
export const redeemReward = async (clientId: string, rewardId: string): Promise<Client | undefined> => {
  try {
    const response = await apiClient.put<Response<Client>>(`/${clientId}/rewards/${rewardId}/redeem`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al canjear la recompensa");
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

