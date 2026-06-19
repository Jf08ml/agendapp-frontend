import { apiGeneral } from "./axiosConfig";

export interface FunnelOrg {
  id: string;
  name: string;
}

export interface FunnelStep {
  hito: string;
  clave: string;
  total: number;
  pct: number;
  orgs?: FunnelOrg[]; // organizaciones que alcanzaron este hito
}

export interface ConversionPorHito {
  hito: string;
  base: number;
  pagaron: number;
  tasaPago: number;
}

export interface OnboardingFunnel {
  startDate: string;
  endDate: string;
  funnel: FunnelStep[];
  conversionPorHito: ConversionPorHito[];
}

function buildParams(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, string | undefined>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
  });
  return query.toString();
}

export const getOnboardingFunnel = async (params: {
  startDate?: string;
  endDate?: string;
}): Promise<OnboardingFunnel> => {
  const response = await apiGeneral.get(`/admin/onboarding/funnel?${buildParams(params)}`);
  return response.data.data;
};
