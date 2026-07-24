import { apiPackage, apiPackagePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// =============================================
// Interfaces
// =============================================

export interface PackageServiceItem {
  serviceId: string;
  // Obligatorio solo si el paquete NO tiene niveles — con niveles, las
  // sesiones las define cada tier de forma uniforme.
  sessionsIncluded?: number;
}

// 📚 Clase incluida en la plantilla de paquete
export interface PackageClassItem {
  classId: string;
  sessionsIncluded?: number;
}

// 🎚️ Nivel/variante del paquete (ej: "x4", "x8", "x12") — mismo servicio/clase
// base, distinta cantidad de sesiones, precio y sesiones de cortesía.
export interface PackageTier {
  _id?: string;
  label: string;
  sessionsIncluded: number;
  price: number;
  courtesySessions?: number;
}

export interface ServicePackage {
  _id: string;
  name: string;
  description: string;
  organizationId: string;
  services: PackageServiceItem[];
  classes?: PackageClassItem[];
  // Obligatorio solo si el paquete NO tiene niveles (tiers vacío/ausente).
  price?: number;
  // Niveles del paquete. Vacío = paquete "simple" (un solo price/sessionsIncluded).
  tiers?: PackageTier[];
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
  // Cuántas de sessionsIncluded fueron de cortesía (informativo).
  courtesySessions?: number;
}

// 📚 Crédito de clase en el paquete del cliente
export interface ClientPackageClass {
  classId:
    | string
    | { _id: string; name: string; color?: string | null; pricePerPerson?: number; duration?: number };
  sessionsIncluded: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  courtesySessions?: number;
}

export interface ConsumptionHistoryItem {
  appointmentId?: string;
  serviceId?: string;
  enrollmentId?: string;
  classId?: string;
  itemType?: "service" | "class";
  action: "consume" | "refund";
  date: string;
}

export interface PackagePaymentRecord {
  _id: string;
  amount: number;
  method: "cash" | "card" | "transfer" | "other";
  date: string;
  note?: string;
  registeredBy?: string;
}

export interface ClientPackage {
  _id: string;
  clientId: string;
  servicePackageId:
    | string
    | { _id: string; name: string; description: string };
  organizationId: string;
  services: ClientPackageService[];
  classes?: ClientPackageClass[];
  // Nivel comprado, si el paquete tenía niveles (ej: "x8"). null si no.
  tierLabel?: string | null;
  purchaseDate: string;
  expirationDate: string;
  status: "active" | "expired" | "exhausted" | "cancelled";
  totalPrice: number;
  paymentMethod: string;
  paymentNotes: string;
  payments?: PackagePaymentRecord[];
  paymentStatus?: "unpaid" | "partial" | "paid";
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

// Borrado permanente (irreversible). El backend lo rechaza si el paquete ya
// fue vendido/asignado a algún cliente — en ese caso hay que desactivarlo.
export const permanentlyDeleteServicePackage = async (
  id: string,
  organizationId: string
): Promise<void> => {
  try {
    await apiPackage.delete<Response<void>>(`/${id}/permanent`, {
      data: { organizationId },
    });
  } catch (error) {
    handleAxiosError(error, "No se pudo eliminar el paquete");
  }
};

export interface DeletedPackageCascade {
  clientPackages: number;
  appointments: number;
  enrollments: number;
  reservations: number;
  orders: number;
}

// Borrado FORZADO (irreversible): ignora ventas/asignaciones existentes y
// elimina en cascada los ClientPackage y también las citas/clases/reservas
// (Appointment/Enrollment/Reservation) pagadas con esas sesiones.
export const forceDeleteServicePackage = async (
  id: string,
  organizationId: string
): Promise<DeletedPackageCascade | undefined> => {
  try {
    const response = await apiPackage.delete<Response<DeletedPackageCascade>>(
      `/${id}/force`,
      { data: { organizationId } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "No se pudo eliminar el paquete de forma forzada");
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
  // Requerido cuando el paquete tiene niveles (tiers).
  tierId?: string;
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

// 📚 Paquetes activos del cliente con créditos para una clase
export const getActivePackagesForClass = async (
  clientId: string,
  classId: string,
  organizationId: string
): Promise<ClientPackage[]> => {
  try {
    const response = await apiPackage.get<Response<ClientPackage[]>>(
      `/client/${clientId}/class/${classId}`,
      { params: { organizationId } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al verificar paquetes activos para la clase");
    return [];
  }
};

// =============================================
// Pagos de ClientPackage
// =============================================

export const addClientPackagePayment = async (
  clientPackageId: string,
  payment: Omit<PackagePaymentRecord, "_id">
): Promise<ClientPackage | undefined> => {
  try {
    const response = await apiPackage.post<Response<ClientPackage>>(
      `/client-package/${clientPackageId}/payments`,
      payment
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al registrar el pago");
  }
};

export const removeClientPackagePayment = async (
  clientPackageId: string,
  paymentId: string
): Promise<ClientPackage | undefined> => {
  try {
    const response = await apiPackage.delete<Response<ClientPackage>>(
      `/client-package/${clientPackageId}/payments/${paymentId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el pago");
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

// Verificar paquetes de SERVICIO por el identificador configurado (phone/email/documentId).
// Funciona aunque el cliente no tenga teléfono guardado (a diferencia de checkClientPackagesPublic).
export const checkClientPackagesByIdentifierPublic = async (
  field: "phone" | "email" | "documentId",
  value: string,
  serviceIds: string[],
  organizationId: string
): Promise<ClientPackageCheckResult> => {
  try {
    const response = await apiPackagePublic.get<
      Response<ClientPackageCheckResult>
    >("/public/client-check-by-identifier", {
      params: {
        field,
        value,
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

// 📚 Verificar paquetes con créditos de clase por teléfono (reserva pública)
export const checkClientClassPackagesPublic = async (
  phone: string,
  classIds: string[],
  organizationId: string
): Promise<ClientPackageCheckResult> => {
  try {
    const response = await apiPackagePublic.get<
      Response<ClientPackageCheckResult>
    >("/public/client-class-check", {
      params: {
        phone,
        classIds: classIds.join(","),
        organizationId,
      },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al verificar paquetes de clase del cliente");
    return { client: null, packages: [] };
  }
};

// 📚 Verificar paquetes de clase por el identificador configurado (reserva pública)
export const checkClientClassPackagesByIdentifier = async (
  field: "phone" | "email" | "documentId",
  value: string,
  classIds: string[],
  organizationId: string
): Promise<ClientPackageCheckResult> => {
  try {
    const response = await apiPackagePublic.get<
      Response<ClientPackageCheckResult>
    >("/public/client-class-check-by-identifier", {
      params: {
        field,
        value,
        classIds: classIds.join(","),
        organizationId,
      },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al verificar paquetes de clase del cliente");
    return { client: null, packages: [] };
  }
};
