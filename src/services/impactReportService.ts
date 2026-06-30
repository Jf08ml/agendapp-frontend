import { apiGeneral } from "./axiosConfig";

export interface ImpactMonth {
  month: string; // "YYYY-MM"
  count: number;
}

export interface ImpactReport {
  org: {
    id: string;
    name: string;
    businessVertical: string | null;
    registeredAt: string;
    daysActive: number;
  };
  eligible: boolean;
  appointments: {
    total: number;
    avgPerMonth: number;
    peakMonth: ImpactMonth | null;
    byMonth: ImpactMonth[];
  };
  onlineReservations: {
    count: number;
    pct: number;
  };
  cancellations: {
    count: number;
    pct: number;
  };
  noShow: {
    applicable: boolean;
    count: number;
    rate: number; // % sobre lo resuelto
  };
}

export interface ImpactReportsResponse {
  generatedAt: string;
  thresholds: { minAgeDays: number; minPastAppts: number };
  counts: {
    withAppointments: number;
    eligible: number;
    withNoShowBlock: number;
    withOnline: number;
  };
  reports: ImpactReport[];
}

export const getImpactReports = async (params?: {
  includeIneligible?: boolean;
}): Promise<ImpactReportsResponse> => {
  const query = params?.includeIneligible ? "?includeIneligible=true" : "";
  const response = await apiGeneral.get(`/admin/impact-reports${query}`);
  return response.data.data;
};

// ─── Seguimiento de respuestas de la encuesta (superadmin) ───────────────────

export interface ImpactSurveyResponseRow {
  orgId: string;
  orgName: string;
  answers: {
    previousTool: string | null;
    previousToolOther: string | null;
    fewerNoShows: string | null;
    biggestImprovement: string[];
    comment: string | null;
  };
  reportSnapshot: {
    daysActive: number | null;
    totalAppointments: number | null;
    onlineCount: number | null;
    onlinePct: number | null;
    noShowApplicable: boolean;
    noShowRate: number | null;
  };
  respondedAt: string;
}

export interface ImpactSurveyResponsesResponse {
  total: number;
  responses: ImpactSurveyResponseRow[];
}

export const getImpactSurveyResponses = async (): Promise<ImpactSurveyResponsesResponse> => {
  const response = await apiGeneral.get("/admin/impact-survey/responses");
  return response.data.data;
};
