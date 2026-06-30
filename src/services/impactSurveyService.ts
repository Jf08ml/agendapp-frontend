import { apiGeneral } from "./axiosConfig";
import type { ImpactReport } from "./impactReportService";

export interface ImpactSurveyAnswers {
  previousTool: string | null;
  previousToolOther?: string | null;
  fewerNoShows: string | null;
  biggestImprovement: string[];
  comment?: string | null;
}

export interface ImpactReportSnapshot {
  daysActive: number;
  totalAppointments: number;
  onlineCount: number;
  onlinePct: number;
  noShowApplicable: boolean;
  noShowRate: number;
}

export interface MyImpactSurvey {
  show: boolean;
  alreadyResponded: boolean;
  report: ImpactReport | null;
}

/** Reporte de impacto de mi propia org + si se debe mostrar el modal. */
export const getMyImpactSurvey = async (): Promise<MyImpactSurvey> => {
  const res = await apiGeneral.get("/impact-survey/me");
  return res.data.data;
};

/** Guarda las respuestas de la encuesta. */
export const respondImpactSurvey = async (payload: {
  answers: ImpactSurveyAnswers;
  reportSnapshot: ImpactReportSnapshot;
}): Promise<void> => {
  await apiGeneral.post("/impact-survey/respond", payload);
};

/** Pospone la encuesta unos días (el modal vuelve a aparecer al vencer). */
export const snoozeImpactSurvey = async (): Promise<void> => {
  await apiGeneral.post("/impact-survey/snooze");
};
