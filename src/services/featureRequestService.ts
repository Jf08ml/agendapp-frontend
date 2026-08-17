import { apiGeneral } from "./axiosConfig";

export type FeatureRequestStatus = "pending" | "under_review" | "planned" | "done" | "declined";

export interface FeatureRequest {
  _id: string;
  text: string;
  status: FeatureRequestStatus;
  adminReply?: string;
  respondedAt?: string;
  submittedByName?: string;
  submittedByRole?: "admin" | "employee";
  closedByOrg?: boolean;
  closedByOrgAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRequestAdmin extends FeatureRequest {
  organizationId: { _id: string; name: string };
}

// ── Endpoints de organización (auth, sin membership) ──────────────────────

export const createFeatureRequest = (text: string): Promise<FeatureRequest> =>
  apiGeneral.post<{ data: FeatureRequest }>("/feature-requests", { text }).then((r) => r.data.data);

export const getMyFeatureRequests = (): Promise<FeatureRequest[]> =>
  apiGeneral.get<{ data: FeatureRequest[] }>("/feature-requests").then((r) => r.data.data);

export const closeFeatureRequest = (id: string): Promise<FeatureRequest> =>
  apiGeneral.patch<{ data: FeatureRequest }>(`/feature-requests/${id}/close`).then((r) => r.data.data);

// ── Endpoints superadmin ──────────────────────────────────────────────────

export const adminGetFeatureRequests = (status?: FeatureRequestStatus): Promise<FeatureRequestAdmin[]> =>
  apiGeneral
    .get<{ data: FeatureRequestAdmin[] }>("/admin/feature-requests", { params: status ? { status } : undefined })
    .then((r) => r.data.data);

export const adminUpdateFeatureRequest = (
  id: string,
  data: { status: FeatureRequestStatus; adminReply?: string }
): Promise<FeatureRequestAdmin> =>
  apiGeneral.patch<{ data: FeatureRequestAdmin }>(`/admin/feature-requests/${id}`, data).then((r) => r.data.data);
