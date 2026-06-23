// services/collectionService.ts
// Cobros cliente→organización: conexión de la cuenta de Mercado Pago del negocio.
import {
  apiOrganization,
  apiGeneral,
  apiEnrollmentPublic,
  apiPackagePublic,
} from "./axiosConfig";
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

// ── Checkout (pay-to-confirm) — clases y compra de paquetes ──────────────────

export interface CheckoutResult {
  checkoutUrl: string;
  orderId: string;
  externalReference: string;
  amount: number;
  currency: string;
}

export interface CheckoutCustomerDetails {
  name: string;
  phone: string;
  email?: string;
  documentId?: string;
  birthDate?: string;
  notes?: string;
}

export interface ClassCheckoutPayload {
  organizationId: string;
  sessionId: string;
  attendee: {
    name: string;
    phone: string;
    phone_e164?: string;
    phone_country?: string;
    email?: string;
  };
  companion?: ClassCheckoutPayload["attendee"];
  notes?: string;
}

// Crea el checkout del depósito de una inscripción a clase (pay-to-confirm).
export const createClassCheckout = async (
  payload: ClassCheckoutPayload
): Promise<CheckoutResult | undefined> => {
  try {
    const { data } = await apiEnrollmentPublic.post("/checkout", payload);
    return data.data as CheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago del depósito de la clase");
  }
};

export interface PublicPackageItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  validityDays: number;
  services?: { serviceId?: { name?: string; duration?: number }; sessionsIncluded: number }[];
  classes?: { classId?: { name?: string; duration?: number }; sessionsIncluded: number }[];
}

export interface PublicPackagesResult {
  currency: string;
  mpConnected: boolean;
  paymentMethods?: ReceiptPaymentMethod[];
  packages: PublicPackageItem[];
}

// Lista los paquetes activos para compra pública.
// Se pasa el organizationId explícito porque en localhost el organizationResolver
// no puede deducir el tenant sin el slug de dev.
export const listPublicPackages = async (
  organizationId?: string
): Promise<PublicPackagesResult | null> => {
  try {
    const { data } = await apiPackagePublic.get("/public/list", {
      params: organizationId ? { org: organizationId } : undefined,
    });
    return data.data as PublicPackagesResult;
  } catch (error) {
    handleAxiosError(error, "No se pudieron cargar los paquetes");
    return null;
  }
};

export interface PackageCheckoutPayload {
  organizationId: string;
  servicePackageId: string;
  customerDetails: CheckoutCustomerDetails;
}

// Crea el checkout de compra de un paquete (el ClientPackage se crea al pagar).
export const createPackageCheckout = async (
  payload: PackageCheckoutPayload
): Promise<CheckoutResult | undefined> => {
  try {
    const { data } = await apiPackagePublic.post("/public/checkout", payload);
    return data.data as CheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar la compra del paquete");
  }
};

// ── Cobro por transferencia + comprobante con IA ─────────────────────────────

export interface ReceiptPaymentMethod {
  type: string;
  accountName?: string;
  accountNumber?: string;
  phoneNumber?: string;
  qrCodeUrl?: string;
  notes?: string;
}

export interface ReceiptCheckoutResult {
  orderId: string;
  externalReference: string;
  amount: number;
  currency: string;
  paymentMethods: ReceiptPaymentMethod[];
}

export interface ReservationReceiptPayload {
  organizationId: string;
  services: { serviceId: string; employeeId?: string | null; duration?: number }[];
  startDate: string;
  customerDetails: CheckoutCustomerDetails;
  source?: string;
}

export const createReceiptReservationCheckout = async (
  payload: ReservationReceiptPayload
): Promise<ReceiptCheckoutResult | undefined> => {
  try {
    const { data } = await apiGeneral.post("/collection/receipt/reservation", payload);
    return data.data as ReceiptCheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago por transferencia");
  }
};

export const createReceiptClassCheckout = async (
  payload: ClassCheckoutPayload
): Promise<ReceiptCheckoutResult | undefined> => {
  try {
    const { data } = await apiGeneral.post("/collection/receipt/class", payload);
    return data.data as ReceiptCheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago por transferencia de la clase");
  }
};

export const createReceiptPackageCheckout = async (
  payload: PackageCheckoutPayload
): Promise<ReceiptCheckoutResult | undefined> => {
  try {
    const { data } = await apiGeneral.post("/collection/receipt/package", payload);
    return data.data as ReceiptCheckoutResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo iniciar el pago por transferencia del paquete");
  }
};

export interface SubmitReceiptResult {
  status: OrderStatus;
  autoApproved: boolean;
  externalReference: string;
}

// Sube la imagen del comprobante. La IA valida y devuelve si se auto-confirmó.
export const submitReceipt = async (
  externalReference: string,
  file: File
): Promise<{ result?: SubmitReceiptResult; message: string }> => {
  const form = new FormData();
  form.append("image", file);
  try {
    const { data } = await apiGeneral.post(`/collection/receipt/${externalReference}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { result: data.data as SubmitReceiptResult, message: data.message };
  } catch (error) {
    handleAxiosError(error, "No se pudo procesar el comprobante");
    return { message: "No se pudo procesar el comprobante." };
  }
};

// ── Bandeja de comprobantes (admin) ──────────────────────────────────────────

export interface ReceiptOrder {
  _id: string;
  type: "reservation" | "class" | "package";
  amount: number;
  currency: string;
  status: OrderStatus | "in_review";
  createdAt: string;
  updatedAt: string;
  receipt?: {
    imageUrl?: string;
    uploadedAt?: string;
    extracted?: {
      amount?: number;
      currency?: string;
      date?: string;
      reference?: string;
      destinationAccount?: string;
      bank?: string;
      senderName?: string;
    };
    aiConfidence?: number;
    aiVerdict?: "match" | "mismatch" | "unreadable";
    aiNotes?: string;
    reviewStatus?: string;
  };
}

export const listReceiptOrders = async (
  status = "in_review"
): Promise<ReceiptOrder[]> => {
  try {
    const { data } = await apiGeneral.get("/receipts", { params: { status } });
    return (data.data?.orders as ReceiptOrder[]) || [];
  } catch (error) {
    handleAxiosError(error, "No se pudieron cargar los comprobantes");
    return [];
  }
};

export const reviewReceiptOrder = async (
  orderId: string,
  decision: "approve" | "reject",
  notes?: string
): Promise<boolean> => {
  try {
    await apiGeneral.post(`/receipts/${orderId}/review`, { decision, notes });
    return true;
  } catch (error) {
    handleAxiosError(error, "No se pudo procesar la revisión");
    return false;
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
