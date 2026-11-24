// Modelo puro de la lista de organizaciones del superadmin: actividad
// (configurada, con citas, inactiva) y estado de la membresía en palabras.

export type ActivityStatus = "unconfigured" | "no_appointments" | "active" | "inactive";
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const INACTIVITY_THRESHOLD_DAYS = 30;

export const ACTIVITY_FILTERS: { value: "all" | ActivityStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: `Inactivas +${INACTIVITY_THRESHOLD_DAYS} días` },
  { value: "no_appointments", label: "Configuradas sin citas" },
  { value: "unconfigured", label: "Sin configurar" },
];

export const ACTIVITY_META: Record<ActivityStatus, { label: string; tone: Tone }> = {
  active: { label: "Activa", tone: "success" },
  inactive: { label: "Inactiva", tone: "warning" },
  no_appointments: { label: "Sin citas", tone: "info" },
  unconfigured: { label: "Sin configurar", tone: "neutral" },
};

export const MEMBERSHIP_META: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Activa", tone: "success" },
  trial: { label: "Prueba", tone: "info" },
  past_due: { label: "Vencida", tone: "warning" },
  suspended: { label: "Suspendida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  expired: { label: "Expirada", tone: "danger" },
  pending: { label: "Pendiente", tone: "warning" },
};

/** Días completos desde una fecha ISO (null si no hay fecha). */
export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

export function activityStatus(
  setupCompleted: boolean | undefined,
  activity: { totalAppointments: number; lastAppointmentAt?: string | null } | undefined,
  now = Date.now()
): ActivityStatus {
  if (!setupCompleted) return "unconfigured";
  if (!activity || activity.totalAppointments === 0) return "no_appointments";
  const days = daysSince(activity.lastAppointmentAt, now);
  return days !== null && days <= INACTIVITY_THRESHOLD_DAYS ? "active" : "inactive";
}

/** «Última cita: hace N días», «Nunca ha agendado» o null (sin configurar). */
export function activityDetail(status: ActivityStatus, lastAppointmentAt: string | null | undefined, now = Date.now()): string | null {
  if (status === "unconfigured") return null;
  const days = daysSince(lastAppointmentAt, now);
  if (days === null) return "Nunca ha agendado";
  if (days <= 0) return "Última cita: hoy";
  return `Última cita: hace ${days} ${days === 1 ? "día" : "días"}`;
}

export const badgeClass = (tone: Tone) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);
