// services/paymentsService.ts
import { apiPayments } from "./axiosConfig";

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId?: string;
  currency?: string;
}

export const createMembershipCheckout = async (params: {
  organizationId: string;
  planSlug?: string;
  planId?: string;
  currency?: "USD" | "COP";
  returnPath?: string; // frontend path, default "/payment/success"
}): Promise<CheckoutResponse> => {
  const { data } = await apiPayments.post("/checkout", params);
  return data.data as CheckoutResponse;
};

export const verifyCheckout = async (sessionId: string) => {
  const { data } = await apiPayments.get(`/verify`, { params: { sessionId } });
  return data.data;
};

export interface PaymentSession {
  _id: string;
  provider: string;
  sessionId: string;
  checkoutUrl?: string;
  organizationId?: string;
  planId?: {
    _id: string;
    name: string;
    displayName: string;
    slug: string;
    price: number;
  } | string;
  membershipId?: string;
  currency?: string;
  amount?: number;
  status: string; // created | succeeded | failed
  processed: boolean;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const getPaymentHistory = async (params: {
  organizationId?: string;
  planId?: string;
  limit?: number;
}): Promise<PaymentSession[]> => {
  const { data } = await apiPayments.get(`/history`, { params });
  return data.data as PaymentSession[];
};
