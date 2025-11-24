// services/reminderService.ts (frontend)
import { apiGeneral } from "./axiosConfig";

export const sendOrgReminders = async (
  organizationId: string,
  opts?: { dryRun?: boolean; targetDate?: string }
) => {
  const { data } = await apiGeneral.post(
    `/organizations/${organizationId}/wa/reminders`,
    {
      dryRun: opts?.dryRun ?? false,
      targetDate: opts?.targetDate,
    }
  );
  return data; // { ok, results: [{ orgId, bulkId, prepared, title }] }
};
