// Texto del «Próximo horario libre» (landings, Fase 3): «hoy 4:00 p. m.»,
// «mañana 9:30 a. m.» o «jueves 26, 10:00 a. m.», en la zona del negocio.
// Módulo puro para `node --test`.

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function partsIn(d: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")?.value ?? "");
  return { y: n("year"), m: n("month"), d: n("day"), h: n("hour") % 24, min: n("minute"), wd };
}

export function nextFreeLabel(iso: string | Date, timeZone = "America/Bogota", timeFormat?: string, now: Date = new Date()): string {
  const at = partsIn(new Date(iso), timeZone);
  const today = partsIn(now, timeZone);
  const dayIndex = (x: { y: number; m: number; d: number }) => Date.UTC(x.y, x.m - 1, x.d) / 86400000;
  const diff = dayIndex(at) - dayIndex(today);
  const mm = String(at.min).padStart(2, "0");
  const time =
    timeFormat === "24h"
      ? `${String(at.h).padStart(2, "0")}:${mm}`
      : `${at.h % 12 === 0 ? 12 : at.h % 12}:${mm} ${at.h < 12 ? "a. m." : "p. m."}`;
  if (diff === 0) return `hoy ${time}`;
  if (diff === 1) return `mañana ${time}`;
  return `${DAYS[at.wd]} ${at.d}, ${time}`;
}
