import { apiService, apiServicePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export interface ServiceCost {
  concept: string;
  amount: number;
}

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
  featured?: boolean; // ⭐ Destacado: se muestra primero en landing, wizard y chatbot
  maxConcurrentAppointments?: number; // 👥 Número de citas simultáneas que puede atender un profesional (default: 1)
  recommendations?: string; // 📋 Recomendaciones para el cliente antes de la cita
  costs?: ServiceCost[]; // 💸 Gastos por insumos/materiales
  followUpServiceId?: string | null; // 🔁 Servicio de seguimiento a recomendar N días después
  followUpDays?: number | null; // 🔁 Días de espera antes de recordar el servicio de seguimiento
  pdfUrl?: string | null; // 📄 PDF con información adicional (ej: ficha técnica, catálogo)
  videoUrl?: string | null; // 🎬 URL de video (YouTube/Vimeo) mostrado en el detalle público
  ctaMode?: "booking" | "whatsapp_quote"; // 💬 CTA: reserva normal o cotizar por WhatsApp
  whatsappQuoteMessage?: string | null; // 💬 Mensaje prellenado para el link de WhatsApp
}

interface CreateServicePayload {
  images?: (string | File)[];
  name: string;
  type: string;
  description?: string;
  price: number;
  duration: number;
  featured?: boolean;
  maxConcurrentAppointments?: number;
  recommendations?: string;
  costs?: ServiceCost[];
  followUpServiceId?: string | null;
  followUpDays?: number | null;
  pdfUrl?: string | null;
  videoUrl?: string | null;
  ctaMode?: "booking" | "whatsapp_quote";
  whatsappQuoteMessage?: string | null;
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
    const response = await apiServicePublic.get<Response<Service[]>>(
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

// Obtener un servicio por ID — versión pública (vista de detalle compartible,
// sin autenticación). Silencioso ante error (ej: link viejo a un servicio
// desactivado) para que la página muestre su propio estado de "no encontrado".
export const getPublicServiceById = async (
  serviceId: string,
  organizationId: string
): Promise<Service | undefined> => {
  try {
    const response = await apiServicePublic.get<Response<Service>>(
      `/public/${serviceId}`,
      { params: { organizationId } }
    );
    return response.data.data;
  } catch {
    return undefined;
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
    featured?: boolean;
    maxConcurrentAppointments?: number;
  }>,
  organizationId: string
): Promise<{
  created: number;
  updated: number;
  success: Array<{ row: number; name: string; price: number; duration: number }>;
  errors: Array<{ row: number; name: string; error: string }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}> => {
  try {
    const response = await apiService.post<
      Response<{
        created: number;
        updated: number;
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

