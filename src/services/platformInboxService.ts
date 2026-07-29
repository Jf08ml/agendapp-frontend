import { apiGeneral } from "./axiosConfig";

export interface PlatformInboxOrg {
  _id: string;
  name: string;
  slug?: string;
  ownerName?: string;
}

export interface PlatformConversation {
  phone: string;
  organization: PlatformInboxOrg | null;
  lastMessage: string;
  lastDirection: "inbound" | "outbound";
  lastSource: "inbound" | "retargeting" | "ai_agent" | "manual";
  lastMessageAt: string;
  unreadCount: number;
  withinReplyWindow: boolean;
}

export interface PlatformWaMessage {
  _id: string;
  phone: string;
  organizationId: string | null;
  direction: "inbound" | "outbound";
  source: "inbound" | "retargeting" | "ai_agent" | "manual";
  body: string;
  templateName?: string | null;
  read: boolean;
  status?: "sent" | "delivered" | "read" | "failed" | null;
  statusUpdatedAt?: string | null;
  createdAt: string;
}

export const getConversations = async (): Promise<PlatformConversation[]> => {
  const response = await apiGeneral.get("/admin/wa-inbox/conversations");
  return response.data.data;
};

export const getConversationMessages = async (phone: string): Promise<PlatformWaMessage[]> => {
  const response = await apiGeneral.get(`/admin/wa-inbox/conversations/${phone}/messages`);
  return response.data.data;
};

export const markConversationRead = async (phone: string): Promise<void> => {
  await apiGeneral.patch(`/admin/wa-inbox/conversations/${phone}/read`);
};

export const replyToConversation = async (phone: string, body: string): Promise<PlatformWaMessage> => {
  const response = await apiGeneral.post(`/admin/wa-inbox/conversations/${phone}/reply`, { body });
  return response.data.data;
};
