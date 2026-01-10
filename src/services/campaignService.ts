/* eslint-disable @typescript-eslint/no-explicit-any */
// services/campaignService.ts
import { apiGeneral } from "./axiosConfig";
import type {
  Campaign,
  CreateCampaignRequest,
  CampaignListResponse,
  CampaignDetailResponse,
  PhoneValidation,
  AudienceSuggestionsResponse,
} from "../types/campaign";

const campaignService = {
  /**
   * Valida y normaliza una lista de teléfonos
   */
  async validatePhones(
    orgId: string,
    phones: string[]
  ): Promise<PhoneValidation> {
    const response = await apiGeneral.post<{ data: { validation: PhoneValidation } }>(
      `/organizations/${orgId}/campaigns/validate-phones`,
      { phones }
    );
    return response.data.data.validation;
  },

  /**
   * Crea y envía una campaña
   */
  async createCampaign(
    orgId: string,
    data: CreateCampaignRequest
  ): Promise<Campaign> {
    const response = await apiGeneral.post<{ data: { campaign: Campaign } }>(
      `/organizations/${orgId}/campaigns`,
      data
    );
    return response.data.data.campaign;
  },

  /**
   * Lista campañas de una organización
   */
  async listCampaigns(
    orgId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ): Promise<CampaignListResponse> {
    const response = await apiGeneral.get<{ data: CampaignListResponse }>(
      `/organizations/${orgId}/campaigns`,
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtiene detalle completo de una campaña
   */
  async getCampaignDetail(
    orgId: string,
    campaignId: string
  ): Promise<Campaign> {
    const response = await apiGeneral.get<{ data: CampaignDetailResponse }>(
      `/organizations/${orgId}/campaigns/${campaignId}`
    );
    return response.data.data.campaign;
  },

  /**
   * Cancela una campaña en progreso
   */
  async cancelCampaign(orgId: string, campaignId: string): Promise<void> {
    await apiGeneral.post(
      `/organizations/${orgId}/campaigns/${campaignId}/cancel`
    );
  },

  /**
   * Convierte una campaña Dry Run en campaña real
   */
  async convertDryRunToReal(orgId: string, campaignId: string): Promise<Campaign> {
    const response = await apiGeneral.post<{ data: { campaign: Campaign } }>(
      `/organizations/${orgId}/campaigns/${campaignId}/convert-to-real`
    );
    return response.data.data.campaign;
  },

  /**
   * Obtiene sugerencias de audiencia (clientes)
   */
  async getAudienceSuggestions(
    orgId: string,
    search?: string,
    limit?: number,
    page?: number
  ): Promise<AudienceSuggestionsResponse> {
    const response = await apiGeneral.get<{ data: AudienceSuggestionsResponse }>(
      `/organizations/${orgId}/campaigns/audience/suggestions`,
      { params: { search, limit, page } }
    );
    return response.data.data;
  },

  /**
   * Obtiene TODOS los clientes de la organización (para seleccionar todos)
   */
  async getAllClientsForCampaign(
    orgId: string,
    search?: string
  ): Promise<{ ok: boolean; total: number; clients: { id: string; name: string; phone: string }[] }> {
    const response = await apiGeneral.get<{ data: any }>(
      `/organizations/${orgId}/campaigns/audience/all`,
      { params: { search } }
    );
    return response.data.data;
  },
};

export default campaignService;
