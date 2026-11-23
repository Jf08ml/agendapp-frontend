// «Primeros pasos» en la agenda (rediseño, PrimerosPasos): une las tres guías
// (configuración, primera cita y WhatsApp) en una lista de 6 pasos con progreso.
// Puro (sin React) para probarlo con node --test.

export type GettingStartedKey = "service" | "employee" | "schedule" | "appointment" | "whatsapp" | "share";

export interface GettingStartedInput {
  servicesCount: number;
  employeesCount: number;
  employeesWithServices: number;
  scheduleSaved: boolean;
  hasAppointments: boolean;
  whatsappConnected: boolean;
  linkShared: boolean;
}

export interface GettingStartedStep {
  key: GettingStartedKey;
  title: string;
  description: string;
  done: boolean;
  recommended?: boolean;
}

export function gettingStartedSteps(i: GettingStartedInput): GettingStartedStep[] {
  return [
    {
      key: "service",
      title: "Agrega un servicio",
      description: "Nombre, duración y precio. Es lo que tus clientes reservan.",
      done: i.servicesCount > 0,
    },
    {
      key: "employee",
      title: "Agrega un profesional y sus servicios",
      description: "Cada profesional es una columna de la agenda; asígnale los servicios que hace.",
      done: i.employeesCount > 0 && i.employeesWithServices > 0,
    },
    {
      key: "schedule",
      title: "Configura tu horario",
      description: "Los días y horas en que atiendes. Con eso se calculan los cupos.",
      done: i.scheduleSaved,
    },
    {
      key: "appointment",
      title: "Crea tu primera cita",
      description: "Toca una hora libre en la columna de un profesional, o usa «Nueva cita».",
      done: i.hasAppointments,
    },
    {
      key: "whatsapp",
      title: "Conecta WhatsApp",
      description: "Tus clientes reciben la confirmación y el recordatorio de cada cita. Reduce las inasistencias.",
      done: i.whatsappConnected,
      recommended: true,
    },
    {
      key: "share",
      title: "Comparte tu enlace de reservas",
      description: "Ponlo en tu Instagram o envíalo por WhatsApp para que reserven solos.",
      done: i.linkShared,
    },
  ];
}

export function progressOf(steps: GettingStartedStep[]) {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, pct: Math.round((done / steps.length) * 100), current: steps.find((s) => !s.done)?.key ?? null };
}

/** ¿Se muestra la lista? «Ocultar hasta mañana» guarda un instante; «No volver a mostrar», un flag. */
export function isGettingStartedHidden(opts: { neverShow: boolean; hiddenUntilMs: number | null; nowMs: number }): boolean {
  if (opts.neverShow) return true;
  return opts.hiddenUntilMs !== null && opts.nowMs < opts.hiddenUntilMs;
}

/** Mañana a las 00:00 (hora local del navegador). */
export function tomorrowStart(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
