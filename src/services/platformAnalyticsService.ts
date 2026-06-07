import { apiGeneral } from "./axiosConfig";

export interface PlatformOverview {
  newOrganizations: number;
  appointments: {
    total: number;
    ingresos: number;
    atendidas: number;
    canceladas: number;
    noShows: number;
  };
  reservations: number;
  membershipBreakdown: Record<string, number>;
  trialToActiveConversions: number;
  mrr: number;
}

export interface PlatformTimeSeriesPoint {
  key: string;
  timestamp: number;
  newOrgs: number;
  citas: number;
  ingresos: number;
  cancelaciones: number;
}

export interface OrganizationRankingItem {
  organizationId: string;
  name: string;
  slug: string;
  citas: number;
  ingresos: number;
  lastActivity: string | null;
  membershipStatus: string | null;
}

export interface PlatformAnalyticsParams {
  startDate?: string;
  endDate?: string;
}

function buildParams(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  return query.toString();
}

export const getPlatformOverview = async (
  params: PlatformAnalyticsParams
): Promise<PlatformOverview> => {
  const response = await apiGeneral.get(`/admin/analytics/overview?${buildParams(params)}`);
  return response.data.data;
};

export const getPlatformTimeSeries = async (
  params: PlatformAnalyticsParams & { granularity?: "day" | "week" | "month" }
): Promise<PlatformTimeSeriesPoint[]> => {
  const response = await apiGeneral.get(`/admin/analytics/timeseries?${buildParams(params)}`);
  return response.data.data;
};

export const getOrganizationRanking = async (
  params: PlatformAnalyticsParams & { sortBy?: "citas" | "ingresos"; limit?: number }
): Promise<OrganizationRankingItem[]> => {
  const response = await apiGeneral.get(`/admin/analytics/organizations?${buildParams(params)}`);
  return response.data.data;
};
