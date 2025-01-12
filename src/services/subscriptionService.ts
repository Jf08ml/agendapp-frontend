import { apiSubscribe } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// Definir la estructura de una suscripción de notificación
export interface Subscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string; // ID único del usuario
}

// Crear una nueva suscripción de notificación
export const createSubscription = async (
  subscriptionData: Subscription
): Promise<void> => {
  try {
    await apiSubscribe.post("/", subscriptionData);
  } catch (error) {
    handleAxiosError(error, "Error al crear la suscripción de notificación");
  }
};

export const getSubscriptionByEndpoint = async (endpoint: string): Promise<unknown> => {
  try {
    const response = await apiSubscribe.get(`/endpoint`, {
      params: { endpoint }, 
    });

    return response.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener una suscripción por endpoint");
  }
};

export const deleteSubscription = async (
  endpoint: string,
  userId: string
): Promise<void> => {
  try {
    await apiSubscribe.delete("/", {
      data: {
        endpoint,
        userId,
      },
    });
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la suscripción de notificación");
  }
};
