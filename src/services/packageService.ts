import { apiPackage, apiPackagePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// =============================================
// Interfaces
// =============================================

export interface PackageServiceItem {
  serviceId: string;
  sessionsIncluded: number;
}

export interface ServicePackage {
  _id: string;
  name: string;
  description: string;
  organizationId: string;
  services: PackageServiceItem[];
  price: number;
  validityDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPackageService {
  serviceId:
    | string
    | { _id: string; name: string; price: number; duration: number };
  sessionsIncluded: number;
  sessionsUsed: number;
  sessionsRemaining: number;
}

export interface ConsumptionHistoryItem {
  appointmentId: string;
  serviceId: string;
  action: "consume" | "refund";
  date: string;
}

export interface ClientPackage {
  _id: string;
  clientId: string;
  servicePackageId:
    | string
    | { _id: string; name: string; description: string };
  organizationId: string;
  services: ClientPackageService[];
  purchaseDate: string;
  expirationDate: string;
  status: "active" | "expired" | "exhausted" | "cancelled";
  totalPrice: number;
  paymentMethod: string;
  paymentNotes: string;
  consumptionHistory: ConsumptionHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// =============================================
// CRUD - ServicePackage (plantillas)
// =============================================

export const createServicePackage = async (
  data: Omit<ServicePackage, "_id" | "createdAt" | "updatedAt">
): Promise<ServicePackage | undefined> => {
  try {
    const response = await apiPackage.post<Response<ServicePackage>>("/", data);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el paquete");
  }
};

export const getServicePackages = async (
  organizationId: string,
  activeOnly = false
): Promise<ServicePackage[]> => {
  try {
    const response = await apiPackage.get<Response<ServicePackage[]>>(
      `/organization/${organizationId}`,
      { params: { activeOnly: activeOnly ? "true" : undefined } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los paquetes");
    return [];
  }
};

export const getServicePackageById = async (
  id: string
): Promise<ServicePackage | undefined> => {
  try {
    const response = await apiPackage.get<Response<ServicePackage>>(`/${id}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el paquete");
  }
};

export const updateServicePackage = async (
  id: string,
  data: Partial<ServicePackage>
): Promise<ServicePackage | undefined> => {
  try {
    const response = await apiPackage.put<Response<ServicePackage>>(
      `/${id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el paquete");
  }
};

export const deleteServicePackage = async (id: string, organizationId: string): Promise<void> => {
  try {
    await apiPackage.delete<Response<void>>(`/${id}`, {
      data: { organizationId },
    });
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el paquete");
  }
};

// =============================================
// ClientPackage (asignación y consulta)
// =============================================

export interface AssignPackagePayload {
  servicePackageId: string;
  clientId: string;
  organizationId: string;
  paymentMethod: string;
  paymentNotes?: string;
  purchaseDate?: string;
}

export const assignPackageToClient = async (
  data: AssignPackagePayload
): Promise<ClientPackage | undefined> => {
  try {
    const response = await apiPackage.post<Response<ClientPackage>>(
      "/assign",
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al asignar el paquete al cliente");
  }
};

export const getClientPackages = async (
  clientId: string,
  organizationId: string
): Promise<ClientPackage[]> => {
  try {
    const response = await apiPackage.get<Response<ClientPackage[]>>(
      `/client/${clientId}`,
      { params: { organizationId } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los paquetes del cliente");
    return [];
  }
};

export const cancelClientPackage = async (
  clientPackageId: string,
  organizationId: string
): Promise<ClientPackage | undefined> => {
  try {
    const response = await apiPackage.put<Response<ClientPackage>>(
      `/client-package/${clientPackageId}/cancel`,
      { organizationId }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al cancelar el paquete");
  }
};

export const deleteClientPackage = async (
  clientPackageId: string,
  organizationId: string
): Promise<void> => {
  try {
    await apiPackage.delete<Response<void>>(
      `/client-package/${clientPackageId}`,
      { data: { organizationId } }
    );
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el paquete");
  }
};

export const getAllOrgClientPackages = async (
  organizationId: string,
  status = ""
): Promise<ClientPackage[]> => {
  try {
    const response = await apiPackage.get<Response<ClientPackage[]>>(
      `/organization/${organizationId}/assigned`,
      { params: status ? { status } : undefined }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los paquetes asignados");
    return [];
  }
};

export const getActivePackagesForService = async (
  clientId: string,
  serviceId: string,
  organizationId: string
): Promise<ClientPackage[]> => {
  try {
    const response = await apiPackage.get<Response<ClientPackage[]>>(
      `/client/${clientId}/service/${serviceId}`,
      { params: { organizationId } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(
      error,
      "Error al verificar paquetes activos para el servicio"
    );
    return [];
  }
};

// =============================================
// Público (reserva online)
// =============================================

export interface ClientPackageCheckResult {
  client: { _id: string; name: string } | null;
  packages: ClientPackage[];
}

export const checkClientPackagesPublic = async (
  phone: string,
  serviceIds: string[],
  organizationId: string
): Promise<ClientPackageCheckResult> => {
  try {
    const response = await apiPackagePublic.get<
      Response<ClientPackageCheckResult>
    >("/public/client-check", {
      params: {
        phone,
        serviceIds: serviceIds.join(","),
        organizationId,
      },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al verificar paquetes del cliente");
    return { client: null, packages: [] };
  }
};
