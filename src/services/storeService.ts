// services/storeService.ts
// Tienda pública de productos: catálogo, checkout (MP), pedido contraentrega y
// checkout por transferencia + comprobante. Base pública /api/store.
import { apiGeneral, apiStorePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import type {
  CheckoutResult,
  ReceiptCheckoutResult,
  ReceiptPaymentMethod,
} from "./collectionService";

// Producto expuesto al público (sin costPrice, comisiones ni stock exacto).
export interface StoreProduct {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  // Imagen del producto (URL de ImageKit); "" = sin imagen
  imageUrl?: string;
  salePrice: number;
  // true cuando trackStock && stockQuantity <= 0 (calculado por el backend)
  outOfStock?: boolean;
}

// Ítem del carrito (estado local del frontend).
export interface StoreCartItem {
  product: StoreProduct;
  quantity: number;
}

export interface StoreCatalogResult {
  currency: string;
  mpConnected: boolean;
  paymentMethods?: ReceiptPaymentMethod[];
  codEnabled: boolean;
  products: StoreProduct[];
}

// Catálogo público de la tienda. Se pasa el organizationId explícito porque en
// localhost el organizationResolver no puede deducir el tenant sin el slug de dev.
export const getCatalog = async (
  organizationId?: string
): Promise<StoreCatalogResult | null> => {
  try {
    const { data } = await apiStorePublic.get("/catalog", {
      params: organizationId ? { org: organizationId } : undefined,
    });
    return data.data as StoreCatalogResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo cargar la tienda");
    return null;
  }
};

export interface StoreCustomer {
  name: string;
  phone: string;
  email?: string;
  documentId?: string;
}

export interface StoreDelivery {
  mode: "pickup" | "delivery";
  address?: string;
  notes?: string;
  // 📍 Punto exacto (opcional) capturado con el mini-mapa en el checkout
  lat?: number;
  lng?: number;
}

export interface StoreOrderPayload {
  organizationId: string;
  items: { productId: string; quantity: number }[];
  customer: StoreCustomer;
  delivery: StoreDelivery;
}

// Checkout online con Mercado Pago → redirect a checkoutUrl; el webhook
// confirma el pago y despacha la venta.
export const createStoreCheckout = async (
  payload: StoreOrderPayload
): Promise<CheckoutResult | undefined> => {
  try {
    const { data } = await apiStorePublic.post("/checkout", payload);
    return data.data as CheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago del pedido");
  }
};

export interface StoreCodResult {
  externalReference: string;
  orderId?: string;
  amount?: number;
  currency?: string;
}

// Pedido contra entrega: se crea pendiente y el negocio cobra al entregar.
export const createStoreCodOrder = async (
  payload: StoreOrderPayload
): Promise<StoreCodResult | undefined> => {
  try {
    const { data } = await apiStorePublic.post("/cod", payload);
    return data.data as StoreCodResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo registrar el pedido");
  }
};

// Checkout por transferencia + comprobante (reusa los rieles de /collection).
export const createReceiptStoreCheckout = async (
  payload: StoreOrderPayload
): Promise<ReceiptCheckoutResult | undefined> => {
  try {
    const { data } = await apiGeneral.post("/collection/receipt/store", payload);
    return data.data as ReceiptCheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago por transferencia del pedido");
  }
};
