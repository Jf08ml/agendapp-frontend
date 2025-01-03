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
}

interface CreateReservationPayload {
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
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
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
