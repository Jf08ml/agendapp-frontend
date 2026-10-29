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
  lastSource: "inbound" | "retargeting" | "ai_agent" | "manual" | "alert" | "oficina";
  lastMessageAt: string;
  unreadCount: number;
  withinReplyWindow: boolean;
}

export interface PlatformWaMessage {
  _id: string;
  phone: string;
  organizationId: string | null;
  direction: "inbound" | "outbound";
  source: "inbound" | "retargeting" | "ai_agent" | "manual" | "alert" | "oficina";
  body: string;
  templateName?: string | null;
  read: boolean;
  status?: "sent" | "delivered" | "read" | "failed" | null;
  statusUpdatedAt?: string | null;
  createdAt: string;
}

// Interruptores de los envíos automáticos por el número de plataforma. El aviso de trial
// por vencer arranca prendido; los demás, apagados.
export interface PlatformSettings {
  retargetingEnabled: boolean;
  waDisconnectWhatsappAlertEnabled: boolean;
  trialNudgeEnabled: boolean;
}

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const response = await apiGeneral.get("/admin/wa-inbox/settings");
  return response.data.data;
};

export const updatePlatformSettings = async (patch: Partial<PlatformSettings>): Promise<PlatformSettings> => {
  const response = await apiGeneral.patch("/admin/wa-inbox/settings", patch);
  return response.data.data;
};

// Números de AgenditApp con inbox: el oficial y el de soporte y ventas (Oficina IA).
export type PlatformWaLine = "platform" | "oficina";

export interface PlatformWaLineInfo {
  id: PlatformWaLine;
  configured: boolean;
}

export const getLines = async (): Promise<PlatformWaLineInfo[]> => {
  const response = await apiGeneral.get("/admin/wa-inbox/lines");
  return response.data.data;
};

export const getConversations = async (line: PlatformWaLine): Promise<PlatformConversation[]> => {
  const response = await apiGeneral.get("/admin/wa-inbox/conversations", { params: { line } });
  return response.data.data;
};

export const getConversationMessages = async (phone: string, line: PlatformWaLine): Promise<PlatformWaMessage[]> => {
  const response = await apiGeneral.get(`/admin/wa-inbox/conversations/${phone}/messages`, { params: { line } });
  return response.data.data;
};

export const markConversationRead = async (phone: string, line: PlatformWaLine): Promise<void> => {
  await apiGeneral.patch(`/admin/wa-inbox/conversations/${phone}/read`, undefined, { params: { line } });
};

export const replyToConversation = async (phone: string, body: string, line: PlatformWaLine): Promise<PlatformWaMessage> => {
  const response = await apiGeneral.post(`/admin/wa-inbox/conversations/${phone}/reply`, { body }, { params: { line } });
  return response.data.data;
};
