import { apiGeneral } from "../services/axiosConfig";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  reply: string;
  invalidates: string[];
}

export const sendMessage = async (messages: ChatMessage[], sessionId?: string): Promise<ChatResponse> => {
  const { data } = await apiGeneral.post("/chat", { messages, sessionId });
  return { reply: data.data.reply, invalidates: data.data.invalidates ?? [] };
};

export type FeedbackType = "bug" | "sugerencia" | "comentario";

export const sendFeedback = async (payload: {
  type: FeedbackType;
  message: string;
  sessionId?: string;
}): Promise<void> => {
  await apiGeneral.post("/chat/feedback", payload);
};
