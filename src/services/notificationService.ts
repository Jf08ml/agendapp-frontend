import { apiNotification } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Definir la estructura de una notificación
export interface Notification {
  _id: string;
  title: string;
  message: string;
  employeeId?: string;
  organizationId: string;
  status: "unread" | "read";
  type: "reservation";
  frontendRoute: "string";
  createdAt: Date;
  updatedAt: Date;
}

interface CreateNotificationPayload {
  title: string;
  message: string;
  employeeId?: string;
  organizationId: string;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener todas las notificaciones
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await apiNotification.get<Response<Notification[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las notificaciones");
    return [];
  }
};

// Obtener notificaciones por usuario (userId)
export const getNotificationsByUserOrOrganization = async (
  id: string,
  type: "employee" | "organization"
): Promise<Notification[]> => {
  try {
    const response = await apiNotification.get<Response<Notification[]>>(
      `/user-or-org/${id}?type=${type}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(
      error,
      `Error al obtener las notificaciones del ${type} especificado`
    );
    return [];
  }
};

// Obtener una notificación por ID
export const getNotificationById = async (
  notificationId: string
): Promise<Notification | undefined> => {
  try {
    const response = await apiNotification.get<Response<Notification>>(
      `/id/${notificationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener la notificación");
  }
};

// Crear una nueva notificación
export const createNotification = async (
  notificationData: CreateNotificationPayload
): Promise<Notification | undefined> => {
  try {
    const response = await apiNotification.post<Response<Notification>>(
      "/",
      notificationData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la notificación");
  }
};

// Actualizar una notificación
export const updateNotification = async (
  notificationId: string,
  updatedData: Partial<Notification>
): Promise<Notification | undefined> => {
  try {
    const response = await apiNotification.put<Response<Notification>>(
      `/${notificationId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la notificación");
  }
};

export const markAsRead = async (
  notificationId: string
): Promise<Notification | undefined> => {
  try {
    const response = await apiNotification.put<Response<Notification>>(
      `/mark-as-read/${notificationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la notificación");
  }
};

// Marcar todas las notificaciones como leídas
export const markAllNotificationsAsRead = async (
    id: string,
    type: "organization" | "employee"
  ): Promise<void> => {
    try {
      await apiNotification.put(`/mark-all-as-read/${id}/${type}`);
    } catch (error) {
      console.error("Error al marcar todas las notificaciones como leídas:", error);
    }
  };
  

// Eliminar una notificación
export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  try {
    await apiNotification.delete<Response<void>>(`/${notificationId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la notificación");
  }
};
