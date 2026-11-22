// Vista Lista del día (rediseño, AgendaMovil): una fila por cita con hora,
// cliente, servicio, profesional (punto de su color) y estado en palabra +
// ícono. Tocar una fila abre la cita, como en las demás vistas.
import { FC, useMemo } from "react";
import {
  IconCalendarOff,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconUserX,
  type Icon,
} from "@tabler/icons-react";
import { Appointment } from "../../../services/appointmentService";
import { formatInTimezone } from "../../../utils/timezoneUtils";

interface DayListViewProps {
  appointments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  timezone?: string;
  timeFormat?: string;
}

// Mismas palabras que el modal de la cita; colores de estado del sistema
const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info"; icon: Icon }> = {
  pending: { label: "Pendiente", tone: "warning", icon: IconClock },
  confirmed: { label: "Confirmada", tone: "success", icon: IconCheck },
  attended: { label: "Asistió", tone: "success", icon: IconCircleCheck },
  no_show: { label: "No asistió", tone: "danger", icon: IconUserX },
  cancelled: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
  cancelled_by_customer: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
  cancelled_by_admin: { label: "Cancelada", tone: "danger", icon: IconCalendarOff },
};

const DayListView: FC<DayListViewProps> = ({ appointments, onEditAppointment, timezone = "America/Bogota", timeFormat }) => {
  const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const rows = useMemo(
    () =>
      appointments
        .filter((a) => !a.status.includes("cancelled"))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [appointments]
  );

  if (rows.length === 0) {
    return (
      <div className="ag-empty">
        <div className="ag-empty__icon">
          <IconCalendarOff size={22} stroke={1.75} />
        </div>
        <h3>Sin citas este día</h3>
        <p>Toca «Nueva cita» para agendar una.</p>
      </div>
    );
  }

  return (
    <div role="list" style={{ padding: "0 var(--space-4)" }}>
      {rows.map((apt) => {
        const status = STATUS[apt.status] ?? { label: apt.status, tone: "info" as const, icon: IconClock };
        const StatusIcon = status.icon;
        return (
          <button
            key={apt._id}
            type="button"
            role="listitem"
            className="ag-list-row"
            onClick={() => onEditAppointment(apt)}
            style={{
              width: "100%",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid var(--line)",
              textAlign: "left",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
              alignItems: "flex-start",
            }}
          >
            <div className="ag-num" style={{ width: 72, flex: "none", fontSize: 13, lineHeight: "18px", color: "var(--ink-muted)", fontWeight: 500 }}>
              <div style={{ color: "var(--ink)", fontWeight: 600 }}>{formatInTimezone(apt.startDate, timezone, fmt)}</div>
              <div>{formatInTimezone(apt.endDate, timezone, fmt)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, lineHeight: "20px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {apt.client?.name || "Cliente"}
              </div>
              {apt.service?.name && (
                <div className="ag-muted" style={{ fontSize: 13, lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {apt.service.name}
                </div>
              )}
              {apt.employee?.names && (
                <span className="ag-appt__pro">
                  <i style={{ background: apt.employee.color || "var(--pro-8)" }} />
                  {apt.employee.names.trim().split(/\s+/)[0]}
                </span>
              )}
            </div>
            <span className={`ag-badge ag-badge--${status.tone}`} style={{ flex: "none" }}>
              <StatusIcon size={14} stroke={2} />
              {status.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default DayListView;
