// "Mis reservas" del cliente (/mis-reservas y /mis-reservas/:token)
import { apiClient, apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export interface MyAppointment {
  id: string;
  serviceName: string;
  employeeName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  clientConfirmed: boolean;
  canCancel: boolean;
  cancelBlockedReason: string | null;
}

export interface MyPendingReservation {
  id: string;
  serviceName: string;
  employeeName: string | null;
  startDate: string;
  status: "pending_approval";
  canCancel: boolean;
  cancelBlockedReason: string | null;
}

export interface MyClassEnrollment {
  id: string;
  className: string;
  attendeeName: string | null;
  instructorName: string | null;
  startDate: string;
  endDate: string;
  status: "pending_payment" | "pending" | "confirmed" | "attended" | "no_show";
  canCancel: boolean;
  cancelBlockedReason: string | null;
}

export interface MyHistoryItem {
  id: string;
  serviceName: string;
  employeeName: string | null;
  startDate: string;
  status: string;
}

export interface MyBookings {
  /** true en la consulta por teléfono: se ve pero no se cancela (eso pide el enlace). */
  readOnly: boolean;
  client: { name: string };
  organization: {
    name: string;
    timezone: string;
    timeFormat: "12h" | "24h";
    logoUrl: string | null;
    enableOnlineBooking: boolean;
    enableClassBooking: boolean;
    cancellationPolicy: { minHoursBeforeAppointment: number };
  };
  appointments: MyAppointment[];
  pendingReservations: MyPendingReservation[];
  classes: MyClassEnrollment[];
  history: MyHistoryItem[];
}

export type MyBookingType = "appointment" | "reservation" | "enrollment";

export type BookingsLinkRequestResult = { status: "sent" | "cooldown" | "unavailable" };

/** Clave de localStorage con el token ya abierto en este dispositivo (por org). */
export const savedBookingsKey = (orgId: string) => `app_my_bookings_${orgId}`;

/** Lanza con el mensaje del servidor (p. ej. "No encontramos reservas con ese número."). */
export const requestMyBookingsLink = async (phone: string): Promise<BookingsLinkRequestResult> => {
  try {
    const res = await apiGeneral.post("/public/my-bookings/request", { phone });
    return res.data.data as BookingsLinkRequestResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo enviar el enlace");
    throw error;
  }
};

/** Consulta de solo lectura con el teléfono. Lanza con el mensaje del servidor (404 = no es cliente). */
export const lookupMyBookings = async (phone: string): Promise<MyBookings> => {
  try {
    const res = await apiGeneral.post("/public/my-bookings/lookup", { phone });
    return res.data.data as MyBookings;
  } catch (error) {
    handleAxiosError(error, "No se pudieron consultar tus reservas");
    throw error;
  }
};

/** null si el enlace no es válido. */
export const getMyBookings = async (token: string): Promise<MyBookings | null> => {
  try {
    const res = await apiGeneral.get(`/public/my-bookings/${encodeURIComponent(token)}`);
    return res.data.data as MyBookings;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    handleAxiosError(error, "No se pudieron cargar tus reservas");
    throw error;
  }
};

export const cancelMyBooking = async (token: string, type: MyBookingType, id: string): Promise<string> => {
  try {
    const res = await apiGeneral.post(`/public/my-bookings/${encodeURIComponent(token)}/cancel`, { type, id });
    return res.data.message as string;
  } catch (error) {
    handleAxiosError(error, "No se pudo cancelar");
    throw error;
  }
};

/** Admin: enlace "Mis reservas" de un cliente (lo crea si hace falta). */
export const getClientBookingsLink = async (clientId: string): Promise<{ url: string; token: string }> => {
  try {
    const res = await apiClient.get(`/${clientId}/bookings-link`);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "No se pudo obtener el enlace de reservas");
    throw error;
  }
};
