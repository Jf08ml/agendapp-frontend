// Tarjeta virtual de fidelidad (/mi-tarjeta/:token)
import { apiClient, apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import type { Client } from "./clientService";

export type LoyaltyCardTemplate = "classic" | "gradient" | "dark" | "pastel" | "minimal" | "image";

export interface LoyaltyCardDesign {
  template?: LoyaltyCardTemplate;
  primaryColor?: string | null;
  textColor?: "light" | "dark";
  title?: string;
  message?: string;
  showLogo?: boolean;
  serviceBackgroundUrl?: string | null;
  referralBackgroundUrl?: string | null;
}

export interface LoyaltyTier {
  threshold: number;
  reward: string;
}

export interface PublicLoyaltyCard {
  client: {
    name: string;
    servicesTaken: number;
    referralsMade: number;
    rewardHistory: { _id: string; type: "service" | "referral"; reward: string; earnedAt: string; redeemed: boolean }[];
    memberSince: string | null;
  };
  organization: {
    _id: string;
    name: string;
    branding: { logoUrl: string | null; primaryColor: string | null };
    loyaltyCard: LoyaltyCardDesign;
    serviceTiers: LoyaltyTier[];
    referralTiers: LoyaltyTier[];
    serviceCount: number;
    serviceReward: string;
    referredCount: number;
    referredReward: string;
  };
}

export type CardRequestResult =
  | { status: "sent" }
  | { status: "cooldown" }
  | { status: "direct"; token: string };

/** Clave de localStorage con el token de la tarjeta guardada en este dispositivo. */
export const savedCardKey = (organizationId: string) => `loyalty_card_token_${organizationId}`;

export const getPublicLoyaltyCard = async (token: string): Promise<PublicLoyaltyCard | null> => {
  try {
    const res = await apiGeneral.get(`/public/loyalty-card/${encodeURIComponent(token)}`);
    return res.data.data as PublicLoyaltyCard;
  } catch {
    return null;
  }
};

/** Lanza con el mensaje del servidor (p. ej. "No encontramos un cliente con ese número."). */
export const requestLoyaltyCard = async (phone: string): Promise<CardRequestResult> => {
  try {
    const res = await apiGeneral.post("/public/loyalty-card/request", { phone });
    return res.data.data as CardRequestResult;
  } catch (error) {
    handleAxiosError(error, "No se pudo consultar la tarjeta");
    throw error;
  }
};

export const getClientLoyaltyCardLink = async (clientId: string): Promise<{ url: string; token: string }> => {
  try {
    const res = await apiClient.get(`/${clientId}/loyalty-card`);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "No se pudo obtener el enlace de la tarjeta");
    throw error;
  }
};

/** Cliente de este negocio dueño de la tarjeta (requiere sesión). null si no es de esta org. */
export const getClientByLoyaltyCardToken = async (token: string): Promise<Client | null> => {
  try {
    const res = await apiClient.get(`/loyalty-card/by-token/${encodeURIComponent(token)}`);
    return res.data.data as Client;
  } catch {
    return null;
  }
};
