/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiReservation } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Service } from "./serviceService";
import { Employee } from "./employeeService";

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
  };
  organizationId: string | undefined;
  status: "pending" | "approved" | "rejected";
  groupId?: string; // 👥 ID de grupo para reservas múltiples
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
  startDate: Date | string; // hora inicial de la secuencia
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    birthDate: Date | null;
  };
  organizationId: string;
  // status? Por defecto puede ser 'pending'
}

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
    handleAxiosError(error, "Error al actualizar la reserva");
  }
};

// Eliminar una reserva
export const deleteReservation = async (
  reservationId: string
): Promise<void> => {
  try {
    await apiReservation.delete<Response<void>>(`/${reservationId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la reserva");
  }
};
