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
  revisadas: number;
}

/** Opciones de categoría para clasificar hallazgos al revisar una conversación. */
export const REVIEW_CATEGORIES: { value: string; label: string }[] = [
  { value: "alucinacion", label: "Alucinación / dato falso" },
  { value: "tool_mal_usada", label: "Herramienta mal usada" },
  { value: "mal_entendido", label: "No entendió la intención" },
  { value: "prompt_mejora", label: "Revela que falta ajustar el prompt" },
  { value: "buena_respuesta", label: "Buen ejemplo (positivo)" },
  { value: "otro", label: "Otro" },
];

export interface ChatSessionReview {
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  category?: string;
  notes?: string;
}

export interface ReviewPayload {
  reviewed: boolean;
  category?: string;
  notes?: string;
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
  channel?: "web" | "whatsapp";
  review?: ChatSessionReview;
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
  channel?: "web" | "whatsapp";
  organizationId?: string;
  converted?: boolean;
  hasError?: boolean;
  hitRoundLimit?: boolean;
  reviewed?: boolean;
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

export const markChatLogSessionReviewed = async (
  id: string,
  payload: ReviewPayload
): Promise<ChatbotSession> => {
  const response = await apiGeneral.post(`/admin/chatbot/sessions/${id}/review`, payload);
  return response.data.data;
};

// ─── Agente admin por WhatsApp (WaBotMessage) ───────────────────────────────

export interface WaBotSession {
  sessionId: string;
  organizationId: { _id: string; name: string } | null;
  messageCount: number;
  firstMessageAt: string;
  lastMessageAt: string;
  review?: ChatSessionReview;
}

export interface WaBotSessionsResponse {
  sessions: WaBotSession[];
  total: number;
  page: number;
  pages: number;
}

export interface WaBotSessionsParams {
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  reviewed?: boolean;
  page?: number;
  limit?: number;
}

export interface WaBotSessionMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export const getWaBotSessions = async (
  params: WaBotSessionsParams
): Promise<WaBotSessionsResponse> => {
  const response = await apiGeneral.get(`/admin/chatbot/wa-sessions?${buildParams(params)}`);
  return response.data.data;
};

export const getWaBotSessionMessages = async (
  sessionId: string
): Promise<WaBotSessionMessage[]> => {
  const response = await apiGeneral.get(`/admin/chatbot/wa-sessions/${sessionId}/messages`);
  return response.data.data.messages;
};

export const markWaBotSessionReviewed = async (
  sessionId: string,
  payload: ReviewPayload
): Promise<{ sessionId: string; review: ChatSessionReview }> => {
  const response = await apiGeneral.post(`/admin/chatbot/wa-sessions/${sessionId}/review`, payload);
  return response.data.data;
};
