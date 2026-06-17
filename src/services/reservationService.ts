/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiReservation } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Service } from "./serviceService";
import { Employee } from "./employeeService";
import type { RecurrencePattern, SeriesPreview } from "./appointmentService";

export interface Reservation {
  _id?: string;
  serviceId: Service | string;
  employeeId: Employee | string | null;
  startDate: Date | string;
  customer: string | null;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    birthDate: Date | null;
    documentId?: string;
    notes?: string;
  };
  organizationId: string | undefined;
  status: "pending" | "approved" | "rejected" | "auto_approved" | "cancelled_by_customer" | "cancelled_by_admin" | "appointment_deleted";
  groupId?: string;
  appointmentId?: string | { _id: string; [key: string]: unknown } | null;
  errorMessage?: string;
  source?: "ai_chatbot" | "manual_booking" | "admin";
}

export interface CreateReservationPayload {
  _id?: string;
  serviceId: Service | string;
  employeeId: Employee | string | null;
  startDate: Date | string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    birthDate: Date | null;
    documentId?: string;
    notes?: string;
  };
  organizationId: string | undefined;
  status: "pending" | "approved" | "rejected";
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

interface MultipleReservationServiceItem {
  serviceId: string;
  employeeId: string | null;
  duration?: number; // Opcional si el backend lo obtiene
}

// Payload para el endpoint múltiple
export interface CreateMultipleReservationsPayload {
  services: MultipleReservationServiceItem[];
  startDate: Date | string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    birthDate: Date | null;
    documentId?: string;
    notes?: string;
  };
  organizationId: string;
  clientPackageId?: string;
  recurrencePattern?: RecurrencePattern;
  source?: "ai_chatbot" | "manual_booking" | "admin";
  // sessionId del chatbot de reserva: permite al backend marcar la conversión
  // (prepare → reserva real) de forma confiable, en la misma request.
  chatSessionId?: string;
}

// Respuesta del checkout de depósito (pay-to-confirm con Mercado Pago)
export interface ReservationCheckoutResult {
  checkoutUrl: string;
  orderId: string;
  externalReference: string;
  amount: number;
  currency: string;
}

// Crea las reservas en hold + el cobro del depósito y devuelve la URL de pago de
// Mercado Pago. No crea las citas: eso ocurre cuando el webhook confirma el pago.
export const createReservationCheckout = async (
  data: CreateMultipleReservationsPayload
): Promise<ReservationCheckoutResult | undefined> => {
  try {
    const response = await apiReservation.post<Response<ReservationCheckoutResult>>(
      "/checkout",
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago del depósito");
  }
};

// Obtener todas las reservas de una organización
export const getReservationsByOrganization = async (
  organizationId: string
): Promise<Reservation[]> => {
  try {
    const response = await apiReservation.get<Response<Reservation[]>>(
      `/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las reservas");
    return [];
  }
};

// Crear una nueva reserva
export const createReservation = async (
  reservationData: CreateReservationPayload
): Promise<Reservation | undefined> => {
  try {
    const response = await apiReservation.post<Response<Reservation>>(
      "/",
      reservationData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la reserva");
  }
};

export const createMultipleReservations = async (
  data: CreateMultipleReservationsPayload
): Promise<Reservation[] | undefined> => {
  try {
    const response = await apiReservation.post<Response<any>>(
      "/multi",
      data
    );
    // El backend retorna { policy, outcome, reservations: [...] }
    // Necesitamos extraer el array de reservations
    if (response.data.data?.reservations && Array.isArray(response.data.data.reservations)) {
      return response.data.data.reservations;
    }
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear reservas múltiples");
  }
};

// Obtener una reserva por ID
export const getReservationById = async (
  reservationId: string
): Promise<Reservation | undefined> => {
  try {
    const response = await apiReservation.get<Response<Reservation>>(
      `/${reservationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener la reserva");
  }
};

// Actualizar una reserva
export const updateReservation = async (
  reservationId: string,
  updatedData: Partial<Reservation>
): Promise<Reservation | undefined> => {
  try {
    const response = await apiReservation.put<Response<Reservation>>(
      `/${reservationId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    // Re-lanzar el error original (con response.data intacto) para que el caller
    // pueda inspeccionar códigos específicos como CONCURRENCY_LIMIT_REACHED
    throw error;
  }
};

// Cancelar una reserva (soft: cambia status + cancela citas vinculadas)
export const cancelReservation = async (
  reservationId: string,
  options?: { notifyClient?: boolean }
): Promise<void> => {
  try {
    await apiReservation.put<Response<void>>(`/${reservationId}/cancel`, {
      notifyClient: options?.notifyClient ?? false,
    });
  } catch (error) {
    handleAxiosError(error, "Error al cancelar la reserva");
  }
};

// Eliminar una reserva (hard delete + opcionalmente eliminar citas)
export const deleteReservation = async (
  reservationId: string,
  options?: { deleteAppointments?: boolean }
): Promise<void> => {
  try {
    const params = options?.deleteAppointments ? "?deleteAppointments=true" : "";
    await apiReservation.delete<Response<void>>(`/${reservationId}${params}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la reserva");
  }
};

// 🔁 Preview de reservas recurrentes (público)
export const previewRecurringReservations = async (data: {
  services: MultipleReservationServiceItem[];
  startDate: string;
  recurrencePattern: RecurrencePattern;
  organizationId: string;
}): Promise<SeriesPreview | undefined> => {
  try {
    const response = await apiReservation.post<Response<SeriesPreview>>(
      "/multi/preview",
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al generar preview de recurrencia");
  }
};
