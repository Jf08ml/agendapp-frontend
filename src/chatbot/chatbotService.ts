import { apiGeneral } from "../services/axiosConfig";

export type ChatRole = "user" | "assistant";

export interface ServiceSuggestion {
  name: string;
  type: string;
  duration: number;
  /** Precio de referencia del rubro, ya en la moneda de la org (solo pista). */
  typicalPrice: number;
}

/** Tarjetas interactivas que el backend decide mostrar debajo de la respuesta. */
export type ChatWidget = {
  type: "service_picker";
  currency: string;
  suggestions: ServiceSuggestion[];
};

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Se envía al backend pero no se dibuja (ej. el disparador del onboarding). */
  hidden?: boolean;
  /** Solo se muestra mientras sea el último mensaje de la conversación. */
  widget?: ChatWidget;
}

export interface ChatResponse {
  reply: string;
  invalidates: string[];
  widgets: ChatWidget[];
}

export const sendMessage = async (messages: ChatMessage[], sessionId?: string): Promise<ChatResponse> => {
  // Al backend solo viaja el texto: hidden/widget son estado de la interfaz.
  const payload = messages.map(({ role, content }) => ({ role, content }));
  const { data } = await apiGeneral.post("/chat", { messages: payload, sessionId });
  return {
    reply: data.data.reply,
    invalidates: data.data.invalidates ?? [],
    widgets: data.data.widgets ?? [],
  };
};

export type FeedbackType = "bug" | "sugerencia" | "comentario";

export const sendFeedback = async (payload: {
  type: FeedbackType;
  message: string;
  sessionId?: string;
}): Promise<void> => {
  await apiGeneral.post("/chat/feedback", payload);
};
