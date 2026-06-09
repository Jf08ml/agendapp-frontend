import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getLatestAnnouncementDate } from "../services/announcementService";
import { NOVEDADES_STORAGE_KEY } from "../pages/admin/SystemUpdates";
import { RootState } from "../app/store";

const CACHE_KEY = "announcements_badge_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

interface BadgeCache {
  isoDate: string;
  fetchedAt: number;
}

function readCache(): BadgeCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BadgeCache;
  } catch {
    return null;
  }
}

function isCacheFresh(cache: BadgeCache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

function hasUnseenUpdates(isoDate: string): boolean {
  const lastSeen = localStorage.getItem(NOVEDADES_STORAGE_KEY) ?? "";
  return !!isoDate && isoDate > lastSeen;
}

export function useAnnouncementBadge(): boolean {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  const [hasNew, setHasNew] = useState<boolean>(() => {
    const cache = readCache();
    if (!cache || !isCacheFresh(cache)) return false;
    return hasUnseenUpdates(cache.isoDate);
  });

  // Escucha cuando el usuario visita la página de novedades
  useEffect(() => {
    const handler = () => setHasNew(false);
    window.addEventListener("announcements-seen", handler);
    return () => window.removeEventListener("announcements-seen", handler);
  }, []);

  // Fetch con cache TTL de 1 hora — solo si está autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const cache = readCache();
    if (cache && isCacheFresh(cache)) return;

    getLatestAnnouncementDate()
      .then(({ isoDate }) => {
        const date = isoDate ?? "";
        localStorage.setItem(CACHE_KEY, JSON.stringify({ isoDate: date, fetchedAt: Date.now() }));
        setHasNew(hasUnseenUpdates(date));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  return hasNew;
}
