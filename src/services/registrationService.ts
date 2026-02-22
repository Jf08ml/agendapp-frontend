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
