import { apiGeneral } from "./axiosConfig";

export interface ChatbotTypeStats {
  _id: "admin" | "booking";
  sesiones: number;
  rondasPromedio: number;
  inputTokens: number;
  outputTokens: number;
  duracionPromedioMs: number;
  conRoundLimit: number;
  conError: number;
}

export interface ChatbotBookingFunnel {
  sesiones: number;
  conPayloadPreparado: number;
  reservasCreadas: number;
  tasaPreparacion: number;
  tasaConversionPayload: number;
  tasaConversionTotal: number;
}

export interface ChatbotOrgStats {
  organizationId: string;
  nombre: string;
  sesiones: number;
  booking: number;
  admin: number;
  conPayload: number;
  convertidas: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatbotFeedbackStats {
  _id: string;
  total: number;
  ratingPromedio: number;
}

export interface ChatbotStats {
  startDate: string;
  endDate: string;
  porTipo: ChatbotTypeStats[];
  funnelBooking: ChatbotBookingFunnel;
  porOrganizacion: ChatbotOrgStats[];
  feedback: ChatbotFeedbackStats[];
}

export interface ChatbotSessionMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotSession {
  _id: string;
  sessionId: string;
  organizationId: { _id: string; name: string; slug?: string } | null;
  type: "admin" | "booking";
  messages: ChatbotSessionMessage[];
  reply?: string;
  rounds: number;
  toolsUsed: string[];
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
  bookingPayload?: unknown;
  reservationCreated?: boolean;
  reservationCreatedAt?: string;
  hitRoundLimit?: boolean;
  error?: string;
  createdAt: string;
}

export interface ChatbotSessionsResponse {
  sessions: ChatbotSession[];
  total: number;
  page: number;
  pages: number;
}

export interface ChatbotSessionsParams {
  startDate?: string;
  endDate?: string;
  type?: "admin" | "booking";
  organizationId?: string;
  converted?: boolean;
  hasError?: boolean;
  hitRoundLimit?: boolean;
  page?: number;
  limit?: number;
}

function buildParams(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, string | number | boolean | undefined>).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, String(value));
      }
    }
  );
  return query.toString();
}

export const getChatbotStats = async (params: {
  startDate?: string;
  endDate?: string;
}): Promise<ChatbotStats> => {
  const response = await apiGeneral.get(`/admin/chatbot/stats?${buildParams(params)}`);
  return response.data.data;
};

export const getChatbotSessions = async (
  params: ChatbotSessionsParams
): Promise<ChatbotSessionsResponse> => {
  const response = await apiGeneral.get(`/admin/chatbot/sessions?${buildParams(params)}`);
  return response.data.data;
};
