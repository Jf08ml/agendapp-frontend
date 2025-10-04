// services/reminderService.ts (frontend)
import { apiGeneral } from "./axiosConfig"; // tu axios base del agenda-backend

export const sendOrgReminders = async (
  organizationId: string,
  opts?: { dryRun?: boolean }
) => {
  const { data } = await apiGeneral.post(
    `/organizations/${organizationId}/wa/reminders`,
    {
      dryRun: opts?.dryRun ?? false,
    }
  );
  return data; // { ok, results: [{ orgId, bulkId, prepared, title }] }
};
