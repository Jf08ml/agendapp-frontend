import axios from "axios";

const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

// Instancia pública: sin auth, sin tenant header
const apiRegistration = axios.create({ baseURL: API_BASE_URL });

export interface RegisterData {
  slug: string;
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  turnstileToken?: string;
  default_country?: string;
  timezone?: string;
  currency?: string;
  referralCode?: string;
  businessVertical?: string;
  /** UTM y fbclid con los que llegó desde la landing (atribución de campañas). */
  attribution?: SignupAttribution;
}

export type SignupAttribution = Partial<
  Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "fbclid", string>
>;

const ATTRIBUTION_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;
const ATTRIBUTION_STORAGE_KEY = "signup_attribution";

/**
 * Lee los UTM/fbclid de la URL y los guarda en sessionStorage para la visita
 * actual (como el código de referido): si el usuario navega antes de enviar el
 * formulario, no se pierden. Sin datos personales.
 */
export function captureSignupAttribution(search: string): SignupAttribution | undefined {
  const params = new URLSearchParams(search);
  const fromUrl: SignupAttribution = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) fromUrl[key] = value.slice(0, key === "fbclid" ? 500 : 200);
  }
  try {
    if (Object.keys(fromUrl).length) {
      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SignupAttribution) : undefined;
  } catch {
    return Object.keys(fromUrl).length ? fromUrl : undefined;
  }
}

export function clearSignupAttribution(): void {
  try {
    sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // sessionStorage no disponible: no hay nada que limpiar.
  }
}

export interface RegisterResponse {
  exchangeCode: string;
  subdomain: string;
  organizationId: string;
}

export interface CheckSlugResponse {
  available: boolean;
  reason?: "invalid_format" | "reserved" | "taken";
  suggestions?: string[];
}

export interface ExchangeResponse {
  token: string;
  sessionId?: string; // id de la sesión/dispositivo (ver sessionModel.js) — ausente en impersonación
  userId: string;
  userType: string;
  organizationId: string;
  userPermissions: string[];
  expiresAt: string;
  isImpersonated?: boolean;
}

export const checkSlugAvailability = async (
  slug: string
): Promise<CheckSlugResponse> => {
  const response = await apiRegistration.get(`/check-slug/${slug}`);
  return response.data.data;
};

export const registerOrganization = async (
  data: RegisterData
): Promise<RegisterResponse> => {
  const response = await apiRegistration.post("/register", data);
  return response.data.data;
};

export const exchangeCodeForToken = async (
  code: string
): Promise<ExchangeResponse> => {
  const response = await apiRegistration.post("/exchange", { code });
  return response.data.data;
};

export interface AgentPublicInfo {
  found: boolean;
  name: string | null;
  trialDays?: number;
}

export const getAgentPublicInfo = async (code: string): Promise<AgentPublicInfo> => {
  const response = await apiRegistration.get(`/agent-info/${encodeURIComponent(code)}`);
  return response.data.data;
};
