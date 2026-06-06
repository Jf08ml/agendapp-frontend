import { apiGeneral } from "./axiosConfig";

export interface AnnouncementItem {
  type: "new" | "improvement" | "fix";
  text: string;
  detail?: string;
}

export interface Announcement {
  _id: string;
  version: string;
  date: string;
  isoDate: string;
  items: AnnouncementItem[];
  published: boolean;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Endpoints de organización (auth, sin membership) ──────────────────────

export const getPublishedAnnouncements = (): Promise<Announcement[]> =>
  apiGeneral.get<{ data: Announcement[] }>("/announcements").then((r) => r.data.data);

export const getLatestAnnouncementDate = (): Promise<{ isoDate: string | null }> =>
  apiGeneral.get<{ data: { isoDate: string | null } }>("/announcements/latest-date").then((r) => r.data.data);

export const markAnnouncementsRead = (): Promise<void> =>
  apiGeneral.post("/announcements/mark-read").then(() => undefined);

// ── Endpoints superadmin ──────────────────────────────────────────────────

export const adminGetAnnouncements = (): Promise<Announcement[]> =>
  apiGeneral.get<{ data: Announcement[] }>("/admin/announcements").then((r) => r.data.data);

export const adminCreateAnnouncement = (
  data: Omit<Announcement, "_id" | "createdAt" | "updatedAt">
): Promise<Announcement> =>
  apiGeneral.post<{ data: Announcement }>("/admin/announcements", data).then((r) => r.data.data);

export const adminUpdateAnnouncement = (
  id: string,
  data: Partial<Omit<Announcement, "_id" | "createdAt" | "updatedAt">>
): Promise<Announcement> =>
  apiGeneral.put<{ data: Announcement }>(`/admin/announcements/${id}`, data).then((r) => r.data.data);

export const adminDeleteAnnouncement = (id: string): Promise<void> =>
  apiGeneral.delete(`/admin/announcements/${id}`).then(() => undefined);

export const adminTogglePublish = (id: string, published: boolean): Promise<Announcement> =>
  apiGeneral
    .patch<{ data: Announcement }>(`/admin/announcements/${id}/publish`, { published })
    .then((r) => r.data.data);
