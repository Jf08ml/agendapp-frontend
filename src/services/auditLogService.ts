import { apiGeneral } from "./axiosConfig";

export type AuditLogEntityType = "appointment" | "client" | "employee" | "reservation";

export type AuditLogAction =
  | "delete_appointment"
  | "delete_client"
  | "force_delete_client"
  | "delete_employee"
  | "delete_reservation"
  | "delete_reservation_with_appointment";

export interface AuditLog {
  _id: string;
  organizationId: string;
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId: string;
  entitySnapshot: Record<string, unknown>;
  performedById: string | null;
  performedByName: string;
  performedByRole: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: AuditLogEntityType | "";
  action?: AuditLogAction | "";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export const getAuditLogs = async (
  filters: AuditLogFilters = {}
): Promise<AuditLogResponse> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined)
  );
  const response = await apiGeneral.get<{ data: AuditLogResponse }>(
    "/audit-logs",
    { params }
  );
  return response.data.data;
};
