// services/collectionService.ts
// Cobros cliente→organización: conexión de la cuenta de Mercado Pago del negocio.
import { apiOrganization, apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export type OrderStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export interface OrderStatusResult {
  status: OrderStatus;
  amount: number;
  currency: string;
  type: string;
}

// Estado del Order para la pantalla de retorno (polling). Público.
export const getOrderStatus = async (
  externalReference: string
): Promise<OrderStatusResult | null> => {
  try {
    const { data } = await apiGeneral.get(`/mp/order/${externalReference}`);
    return data.data as OrderStatusResult;
  } catch {
    return null;
  }
};

export interface MpCollectStatus {
  connected: boolean;
  userId: string | null;
  site: string | null;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
}

// Estado de conexión de la cuenta de cobro (no devuelve tokens).
export const getMpStatus = async (orgId: string): Promise<MpCollectStatus | null> => {
  try {
    const { data } = await apiOrganization.get(`/${orgId}/mp/status`);
    return data.data as MpCollectStatus;
  } catch (error) {
    handleAxiosError(error, "No se pudo obtener el estado de Mercado Pago");
    return null;
  }
};

// Devuelve la URL de autorización OAuth a la que se redirige al dueño del negocio.
export const getMpConnectUrl = async (orgId: string): Promise<string | null> => {
  try {
    const { data } = await apiOrganization.get(`/${orgId}/mp/connect`);
    return (data.data?.url as string) ?? null;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar la conexión con Mercado Pago");
    return null;
  }
};

// Desconecta la cuenta de cobro de la organización.
export const disconnectMp = async (orgId: string): Promise<boolean> => {
  try {
    await apiOrganization.post(`/${orgId}/mp/disconnect`);
    return true;
  } catch (error) {
    handleAxiosError(error, "No se pudo desconectar Mercado Pago");
    return false;
  }
};
