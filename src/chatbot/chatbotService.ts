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

export const sendMessage = async (messages: ChatMessage[]): Promise<ChatResponse> => {
  const { data } = await apiGeneral.post("/chat", { messages });
  return { reply: data.data.reply, invalidates: data.data.invalidates ?? [] };
};
