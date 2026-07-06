// services/storeOrderService.ts
// Bandeja ADMIN de pedidos de la tienda pública (/store-orders — grupo
// protegido: organizationResolver + verifyToken + requireActiveMembership).
// El flujo público (catálogo/checkout) vive en storeService.ts — NO mezclar.
import { apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export type StoreOrderStatus =
  | "created"
  | "pending"
  | "in_review"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type StoreOrderProvider = "mercadopago" | "receipt" | "cod";

export type StoreFulfillmentStatus = "pending" | "delivered" | "cancelled";

// Métodos válidos para registrar el cobro contraentrega (contrato backend).
export type CodCollectMethod = "cash" | "card" | "transfer" | "other";

export interface StoreOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface StoreOrder {
  _id: string;
  organizationId: string;
  type: "store";
  status: StoreOrderStatus;
  provider: StoreOrderProvider;
  amount: number;
  currency: string;
  externalReference?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  store?: {
    items?: StoreOrderItem[];
    customer?: { name?: string; phone?: string; email?: string };
    delivery?: { mode?: "pickup" | "delivery"; address?: string; notes?: string };
    fulfillmentStatus?: StoreFulfillmentStatus;
    fulfilledAt?: string;
    saleId?: string;
  };
}

// GET /store-orders?fulfillment=pending|all → { orders }
export const listStoreOrders = async (
  fulfillment: "pending" | "all" = "pending"
): Promise<StoreOrder[]> => {
  try {
    const { data } = await apiGeneral.get("/store-orders", {
      params: { fulfillment },
    });
    return (data.data?.orders as StoreOrder[]) || [];
  } catch (error) {
    handleAxiosError(error, "No se pudieron cargar los pedidos");
    return [];
  }
};

// POST /store-orders/:id/deliver — pedidos pagados online: marca la entrega.
export const deliverStoreOrder = async (orderId: string): Promise<void> => {
  try {
    await apiGeneral.post(`/store-orders/${orderId}/deliver`);
  } catch (error) {
    handleAxiosError(error, "No se pudo marcar el pedido como entregado");
  }
};

// POST /store-orders/:id/collect — COD: registra el cobro (crea la venta con
// descuento atómico de stock; puede fallar con 400 si el stock no alcanza) y
// marca el pedido pagado + entregado. El mensaje del backend se propaga.
export const collectStoreOrder = async (
  orderId: string,
  method: CodCollectMethod
): Promise<void> => {
  try {
    await apiGeneral.post(`/store-orders/${orderId}/collect`, { method });
  } catch (error) {
    handleAxiosError(error, "No se pudo registrar el cobro");
  }
};

// POST /store-orders/:id/cancel — solo pedidos NO pagados.
export const cancelStoreOrder = async (orderId: string): Promise<void> => {
  try {
    await apiGeneral.post(`/store-orders/${orderId}/cancel`);
  } catch (error) {
    handleAxiosError(error, "No se pudo cancelar el pedido");
  }
};

// DELETE /store-orders/:id — elimina el pedido definitivamente (no reversible).
// El backend lo bloquea si está pagado sin entregar o con comprobante en revisión.
export const deleteStoreOrderPermanently = async (orderId: string): Promise<void> => {
  try {
    await apiGeneral.delete(`/store-orders/${orderId}`);
  } catch (error) {
    handleAxiosError(error, "No se pudo eliminar el pedido");
  }
};
