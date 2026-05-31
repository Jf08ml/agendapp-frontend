import { apiAgent } from "./axiosConfig";

export type AgentType =
  | "influencer"
  | "vendedor_externo"
  | "vendedor_interno"
  | "medio_comunicacion";

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  influencer: "Influencer",
  vendedor_externo: "Vendedor externo",
  vendedor_interno: "Vendedor interno",
  medio_comunicacion: "Medio de comunicación",
};

export const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  influencer: "blue",
  vendedor_externo: "green",
  vendedor_interno: "orange",
  medio_comunicacion: "violet",
};

export interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  type: AgentType;
  code: string;
  status: "active" | "inactive";
  trialDays: number;
  notes: string | null;
  referralCount?: number;
  conversionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentReferral {
  _id: string;
  name: string;
  slug: string;
  email: string;
  membershipStatus: string;
  referredAt: string | null;
  convertedToPayingAt: string | null;
  createdAt: string;
}

export interface CreateAgentPayload {
  name: string;
  email: string;
  phone?: string;
  type: AgentType;
  notes?: string;
  code?: string;
  trialDays?: number;
}

export interface UpdateAgentPayload {
  name?: string;
  email?: string;
  phone?: string;
  type?: AgentType;
  notes?: string;
  status?: "active" | "inactive";
  trialDays?: number;
}

export const agentService = {
  getAgents: async (): Promise<Agent[]> => {
    const res = await apiAgent.get("/");
    return res.data.data;
  },

  createAgent: async (payload: CreateAgentPayload): Promise<Agent> => {
    const res = await apiAgent.post("/", payload);
    return res.data.data;
  },

  updateAgent: async (id: string, payload: UpdateAgentPayload): Promise<Agent> => {
    const res = await apiAgent.put(`/${id}`, payload);
    return res.data.data;
  },

  deleteAgent: async (id: string): Promise<void> => {
    await apiAgent.delete(`/${id}`);
  },

  getAgentReferrals: async (id: string): Promise<{ agent: Agent; referrals: AgentReferral[] }> => {
    const res = await apiAgent.get(`/${id}/referrals`);
    return res.data.data;
  },
};
