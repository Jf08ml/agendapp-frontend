// Tema de temporada (navidad) en las páginas que ven los clientes.
// Módulo puro: sin React ni DOM, testeado en tests/seasonalTheme.test.ts.

export type SeasonalTheme = "none" | "christmas";

// Temporada navideña: 1 de diciembre – 6 de enero (Reyes), ambos incluidos.
// Fuera de ella el tema no se muestra aunque el admin lo deje encendido, así no
// queda puesto en febrero.
export const CHRISTMAS_SEASON_LABEL = "del 1 de diciembre al 6 de enero";

/** Mes (1-12) y día del instante `now` en la zona horaria de la organización. */
function monthDayInTimezone(now: Date, timeZone?: string): { month: number; day: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "America/Bogota",
      month: "numeric",
      day: "numeric",
    }).formatToParts(now);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    if (month && day) return { month, day };
  } catch {
    // Zona horaria inválida → caer a la hora local del navegador
  }
  return { month: now.getMonth() + 1, day: now.getDate() };
}

export function isChristmasSeason(now: Date, timeZone?: string): boolean {
  const { month, day } = monthDayInTimezone(now, timeZone);
  return month === 12 || (month === 1 && day <= 6);
}

// Páginas que ve el cliente final. El panel admin, los pagos, las cancelaciones,
// el login y el superadmin quedan sin decoración (es la herramienta de trabajo /
// pantallas transaccionales).
const CLIENT_FACING_EXACT = new Set([
  "/",
  "/servicios-precios",
  "/programas",
  "/online-reservation",
  "/location",
  "/reservar-clase",
  "/comprar-paquete",
  "/tienda",
  "/search-client",
  "/plan-viewer",
  "/mis-reservas",
]);

const CLIENT_FACING_PREFIXES = [
  "/servicio/",
  "/programa/",
  "/tienda/",
  "/mi-tarjeta/",
  "/mis-reservas/",
];

export function isClientFacingPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (CLIENT_FACING_EXACT.has(path)) return true;
  return CLIENT_FACING_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function shouldShowChristmas(opts: {
  seasonalTheme?: string | null;
  pathname: string;
  now: Date;
  timeZone?: string;
  /** Solo dev (?preview=navidad): ignora el interruptor y la temporada, no las páginas. */
  preview?: boolean;
}): boolean {
  if (!isClientFacingPath(opts.pathname)) return false;
  if (opts.preview) return true;
  return opts.seasonalTheme === "christmas" && isChristmasSeason(opts.now, opts.timeZone);
}

// ?preview=navidad (solo en `npm run dev`): se recuerda en sessionStorage para que
// la vista previa siga al navegar entre páginas; ?preview=off la quita.
export const CHRISTMAS_PREVIEW_KEY = "app_christmas_preview";

export function resolveChristmasPreview(search: string, stored: string | null): {
  preview: boolean;
  store: "set" | "clear" | null;
} {
  const param = new URLSearchParams(search).get("preview");
  if (param === "navidad") return { preview: true, store: "set" };
  if (param === "off") return { preview: false, store: "clear" };
  return { preview: stored === "1", store: null };
}
