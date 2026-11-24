// «Agregar a mi calendario» (design system, Fase 2): archivo .ics y enlace de
// Google Calendar, solo frontend. Módulo puro para probarlo con `node --test`.
//
// Las horas llegan de tres formas:
// - ISO con zona (`…Z` o `…-05:00`) o un Date: instante exacto.
// - ISO sin zona (`2026-11-25T14:00:00`): hora del negocio, se interpreta en
//   `timezone` (IANA). Así lo arma la reserva web y el chat.
// Todo se escribe en UTC, que leen igual Google, Apple y Outlook.

export interface CalendarEvent {
  title: string;
  start: string | Date;
  /** Si falta, se usa `durationMinutes` (o 60). */
  end?: string | Date | null;
  durationMinutes?: number;
  /** Zona del negocio para horas sin zona. */
  timezone?: string | null;
  location?: string | null;
  description?: string | null;
  /** Para que reimportar no duplique el evento. */
  uid?: string;
}

const HAS_ZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

/** Minutos que `timeZone` está por delante de UTC en el instante `utcMs`. */
function zoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

function validZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Instante de una hora del evento (ver encabezado). `null` si no se entiende. */
export function toInstant(value: string | Date | null | undefined, timezone?: string | null): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = value.trim();
  if (HAS_ZONE_RE.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(NAIVE_RE);
  if (!m) return null;
  const [y, mo, d, h = "0", mi = "0", se = "0"] = m.slice(1);
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
  if (!validZone(timezone)) {
    // Sin zona del negocio: hora local del dispositivo.
    return new Date(+y, +mo - 1, +d, +h, +mi, +se);
  }
  // Dos pasadas para acertar cerca de un cambio de horario.
  let utc = wall - zoneOffsetMinutes(wall, timezone) * 60000;
  utc = wall - zoneOffsetMinutes(utc, timezone) * 60000;
  return new Date(utc);
}

function range(ev: CalendarEvent): { start: Date; end: Date } | null {
  const start = toInstant(ev.start, ev.timezone);
  if (!start) return null;
  let end = toInstant(ev.end ?? null, ev.timezone);
  if (!end || end <= start) end = new Date(start.getTime() + (ev.durationMinutes && ev.durationMinutes > 0 ? ev.durationMinutes : 60) * 60000);
  return { start, end };
}

/** `20261125T190000Z` */
function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Texto de iCalendar: escapa `\ ; ,` y saltos de línea. */
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega a 75 octetos por línea (RFC 5545), sin partir caracteres UTF-8. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // la continuación lleva un espacio
    if (bytes + b > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Archivo .ics con uno o varios eventos (p. ej. una serie o varias clases). */
export function buildIcs(events: CalendarEvent[], now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AgenditApp//Reservas//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  events.forEach((ev, i) => {
    const r = range(ev);
    if (!r) return;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid ?? `${utcStamp(r.start)}-${i}`}@agenditapp`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${utcStamp(r.start)}`,
      `DTEND:${utcStamp(r.end)}`,
      `SUMMARY:${escapeText(ev.title)}`
    );
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    // Aviso una hora antes
    lines.push("BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(ev.title)}`, "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Enlace para crear el evento en Google Calendar (uno solo). */
export function googleCalendarUrl(ev: CalendarEvent): string | null {
  const r = range(ev);
  if (!r) return null;
  const params = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates: `${utcStamp(r.start)}/${utcStamp(r.end)}` });
  if (ev.location) params.set("location", ev.location);
  if (ev.description) params.set("details", ev.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Nombre de archivo legible: «cita-galaxia-glamour.ics». */
export function icsFileName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${slug || "cita"}.ics`;
}

/** Eventos válidos (con hora entendible). */
export function validEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((ev) => range(ev) !== null);
}

// ── Reserva pagada con Mercado Pago ─────────────────────────────────────────
// La pantalla de retorno solo recibe la referencia del pago, así que el evento
// se guarda en el navegador antes de salir hacia el checkout.

const PENDING_KEY = (ref: string) => `ag-calendar:${ref}`;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function savePendingCalendar(ref: string | null | undefined, events: CalendarEvent[], store: StorageLike | null = storage()): void {
  if (!ref || !store || events.length === 0) return;
  try {
    const plain = events.map((ev) => ({
      ...ev,
      start: ev.start instanceof Date ? ev.start.toISOString() : ev.start,
      end: ev.end instanceof Date ? ev.end.toISOString() : ev.end,
    }));
    store.setItem(PENDING_KEY(ref), JSON.stringify({ savedAt: Date.now(), events: plain }));
  } catch {
    /* sin almacenamiento: el botón simplemente no aparece al volver */
  }
}

/** Eventos guardados para esa referencia (máximo 2 días de antigüedad). */
export function readPendingCalendar(ref: string | null | undefined, store: StorageLike | null = storage(), now = Date.now()): CalendarEvent[] {
  if (!ref || !store) return [];
  try {
    const raw = store.getItem(PENDING_KEY(ref));
    if (!raw) return [];
    const data = JSON.parse(raw) as { savedAt?: number; events?: CalendarEvent[] };
    if (!Array.isArray(data.events) || !data.savedAt || now - data.savedAt > 2 * 86400000) {
      store.removeItem(PENDING_KEY(ref));
      return [];
    }
    return validEvents(data.events);
  } catch {
    return [];
  }
}
