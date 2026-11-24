// Menú de notificaciones (rediseño, NotificacionesMenu): tiempo relativo, filtro
// y estado de los avisos del dispositivo. Puro (sin React) para probarlo con node --test.

export type NotifFilter = "todas" | "sin_leer";

export function filterNotifications<T extends { status?: string; createdAt?: string | Date }>(list: T[], filter: NotifFilter): T[] {
  const sorted = [...list].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  return filter === "sin_leer" ? sorted.filter((n) => n.status === "unread") : sorted;
}

/** «Ahora», «hace 5 min», «hace 2 h», «Ayer», «hace 3 días», «12 nov». */
export function relativeTime(dateMs: number, nowMs: number): string {
  const diffMin = Math.floor((nowMs - dateMs) / 60_000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const d = new Date(dateMs);
  const n = new Date(nowMs);
  const dayDiff = Math.round(
    (Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000
  );
  if (dayDiff <= 1) return "Ayer";
  if (dayDiff < 7) return `hace ${dayDiff} días`;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export type PushState = "on" | "off" | "blocked" | "ios_install" | "unsupported";

/**
 * Estado de los avisos en este dispositivo:
 * - ios_install: iPhone/iPad sin la app instalada (Safari solo permite push en la app instalada).
 * - blocked: el navegador los bloqueó (hay que desbloquearlos a mano).
 */
export function pushState(opts: {
  subscribed: boolean;
  permission: "granted" | "denied" | "default" | "unsupported";
  isIOS: boolean;
  standalone: boolean;
  hasPushManager: boolean;
}): PushState {
  if (opts.isIOS && !opts.standalone) return "ios_install";
  if (opts.permission === "unsupported" || !opts.hasPushManager) return "unsupported";
  if (opts.permission === "denied") return "blocked";
  return opts.subscribed && opts.permission === "granted" ? "on" : "off";
}

/** Quita el emoji inicial que algunos títulos traen del backend («✅ Asistencia confirmada»). */
export function cleanTitle(title: string): string {
  return title.replace(/^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})️?\s*/u, "").trim();
}
