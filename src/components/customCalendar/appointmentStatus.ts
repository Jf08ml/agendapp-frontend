// Estado de una cita en palabra + ícono + color de estado (design system:
// «cada estado se explica con palabra + ícono + color, nunca solo con color»).
// Mismas palabras que el modal de la cita.
import {
  IconCalendarOff,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconUserX,
  type Icon,
} from "@tabler/icons-react";

export type StatusTone = "success" | "warning" | "danger" | "info";

export interface StatusInfo {
  label: string;
  tone: StatusTone;
  icon: Icon;
}

const STATUS: Record<string, StatusInfo> = {
  pending: { label: "Pendiente", tone: "warning", icon: IconClock },
  confirmed: { label: "Confirmada", tone: "success", icon: IconCheck },
  attended: { label: "Asistió", tone: "success", icon: IconCircleCheck },
  no_show: { label: "No asistió", tone: "danger", icon: IconUserX },
  cancelled: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
  cancelled_by_customer: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
  cancelled_by_admin: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
};

export function appointmentStatus(status: string): StatusInfo {
  return STATUS[status] ?? { label: status, tone: "info", icon: IconClock };
}
