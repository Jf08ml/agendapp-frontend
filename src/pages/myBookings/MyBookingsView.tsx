// Lista de reservas del cliente (rediseño, MisReservas): próximas citas y
// solicitudes pendientes, clases e historial. La comparten la consulta por
// teléfono (solo lectura) y el enlace personal (con cancelar).
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Collapse } from "@mantine/core";
import { IconCalendarEvent, IconCalendarPlus, IconChevronDown, IconChevronUp, IconClock, IconLock, IconSchool, IconUser } from "@tabler/icons-react";
import type { MyBookings, MyBookingType } from "../../services/clientBookingsService";
import { bookingFormatters, TYPE_NOUN } from "./bookingFormat";

type Tone = "success" | "warning" | "info" | "danger" | "neutral";

export type BookingRow = {
  type: MyBookingType;
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  person?: string | null;
  personLabel: string;
  badge?: { label: string; tone: Tone };
  canCancel: boolean;
  cancelBlockedReason: string | null;
};

const APPT_BADGE: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Agendada", tone: "info" },
  confirmed: { label: "Confirmada", tone: "success" },
};

const CLASS_BADGE: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: "Pago pendiente", tone: "warning" },
  pending: { label: "Pendiente de aprobación", tone: "warning" },
  confirmed: { label: "Confirmada", tone: "success" },
};

const HISTORY_BADGE: Record<string, { label: string; tone: Tone }> = {
  attended: { label: "Asistió", tone: "success" },
  no_show: { label: "No asistió", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  cancelled_by_customer: { label: "Cancelada", tone: "neutral" },
  cancelled_by_admin: { label: "Cancelada", tone: "neutral" },
};

const badgeClass = (tone: Tone) => (tone === "neutral" ? "ag-badge" : `ag-badge ag-badge--${tone}`);

interface Props {
  data: MyBookings;
  /** Sin esta función la vista es de solo lectura (consulta por teléfono). */
  onCancel?: (row: BookingRow) => void;
  /** Aviso bajo el saludo (p. ej. cómo cancelar en modo consulta). */
  notice?: React.ReactNode;
  footer?: React.ReactNode;
}

const MyBookingsView: React.FC<Props> = ({ data, onCancel, notice, footer }) => {
  const [showHistory, setShowHistory] = useState(false);
  const { dayLabel, timeLabel, time } = bookingFormatters(data);

  const upcoming: BookingRow[] = [
    ...data.appointments.map<BookingRow>((a) => ({
      type: "appointment",
      id: a.id,
      title: a.serviceName,
      startDate: a.startDate,
      endDate: a.endDate,
      person: a.employeeName,
      personLabel: "Con",
      badge: a.clientConfirmed ? { label: "Asistencia confirmada", tone: "success" } : APPT_BADGE[a.status],
      canCancel: a.canCancel,
      cancelBlockedReason: a.cancelBlockedReason,
    })),
    ...data.pendingReservations.map<BookingRow>((r) => ({
      type: "reservation",
      id: r.id,
      title: r.serviceName,
      startDate: r.startDate,
      person: r.employeeName,
      personLabel: "Con",
      badge: { label: "Pendiente de aprobación", tone: "warning" },
      canCancel: r.canCancel,
      cancelBlockedReason: r.cancelBlockedReason,
    })),
  ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const classes: BookingRow[] = data.classes.map((c) => ({
    type: "enrollment",
    id: c.id,
    title: c.className,
    startDate: c.startDate,
    endDate: c.endDate,
    person: c.instructorName,
    personLabel: "Instructor:",
    badge: CLASS_BADGE[c.status],
    canCancel: c.canCancel,
    cancelBlockedReason: c.cancelBlockedReason,
  }));

  const showClassesSection = classes.length > 0 || data.organization.enableClassBooking;
  const firstName = (data.client.name || "").trim().split(/\s+/)[0];
  const minHours = data.organization.cancellationPolicy.minHoursBeforeAppointment;

  const sectionTitle = (title: string, action?: React.ReactNode) => (
    <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
      <h2 className="ag-h" style={{ margin: 0 }}>{title}</h2>
      {action}
    </div>
  );

  const meta = (Icon: typeof IconClock, text: React.ReactNode) => (
    <div className="ag-row" style={{ gap: 8, fontSize: 14, color: "var(--ink-muted)", flexWrap: "nowrap" }}>
      <Icon size={16} style={{ flex: "none" }} /> <span>{text}</span>
    </div>
  );

  const renderRow = (row: BookingRow) => (
    <article key={`${row.type}-${row.id}`} className="ag-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "nowrap" }}>
        <b style={{ fontSize: 15, minWidth: 0 }}>{row.title}</b>
        {row.badge && <span className={badgeClass(row.badge.tone)} style={{ flex: "none" }}>{row.badge.label}</span>}
      </div>
      {meta(IconCalendarEvent, dayLabel(row.startDate))}
      {meta(IconClock, timeLabel(row.startDate, row.endDate))}
      {row.person && meta(IconUser, `${row.personLabel} ${row.person}`)}
      {onCancel && row.canCancel && (
        <div style={{ marginTop: 6 }}>
          <Button variant="subtle" color="red" size="xs" px={0} onClick={() => onCancel(row)}>
            Cancelar {TYPE_NOUN[row.type]}
          </Button>
        </div>
      )}
      {!row.canCancel && row.cancelBlockedReason && (
        <div className="ag-subtle" style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "flex-start" }}>
          <IconLock size={14} style={{ flex: "none", marginTop: 2 }} />
          <span>{row.cancelBlockedReason}. Si necesitas cambiarla, escríbele al negocio.</span>
        </div>
      )}
    </article>
  );

  const empty = (text: string, action?: React.ReactNode) => (
    <div className="ag-card" style={{ padding: "24px 16px", textAlign: "center" }}>
      <div className="ag-muted" style={{ fontSize: 14, marginBottom: action ? 10 : 0 }}>{text}</div>
      {action}
    </div>
  );

  return (
    <div className="ag-stack" style={{ gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, font: "600 26px/32px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>
          {firstName ? `Hola, ${firstName}` : "Mis reservas"}
        </h1>
        <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Tus reservas en {data.organization.name}.</div>
      </div>

      {notice}

      <section className="ag-stack" style={{ gap: 10 }}>
        {sectionTitle(
          "Próximas citas",
          data.organization.enableOnlineBooking && upcoming.length > 0 ? (
            <Button component={Link} to="/online-reservation" size="xs" variant="default" leftSection={<IconCalendarPlus size={14} />}>
              Reservar
            </Button>
          ) : undefined
        )}
        {upcoming.length
          ? upcoming.map(renderRow)
          : empty(
              "No tienes citas próximas.",
              data.organization.enableOnlineBooking ? (
                <Button component={Link} to="/online-reservation" size="xs" leftSection={<IconCalendarPlus size={14} />}>
                  Reservar una cita
                </Button>
              ) : undefined
            )}
      </section>

      {showClassesSection && (
        <section className="ag-stack" style={{ gap: 10 }}>
          {sectionTitle(
            "Próximas clases",
            data.organization.enableClassBooking ? (
              <Button component={Link} to="/reservar-clase" size="xs" variant="default" leftSection={<IconSchool size={14} />}>
                Reservar clase
              </Button>
            ) : undefined
          )}
          {classes.length ? classes.map(renderRow) : empty("No tienes clases próximas.")}
        </section>
      )}

      {minHours > 0 && (
        <div className="ag-subtle">
          Las citas se pueden cancelar hasta {minHours} {minHours === 1 ? "hora" : "horas"} antes.
        </div>
      )}

      {data.history.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, font: "600 15px/20px var(--font-sans)", color: "var(--ink)" }}
          >
            Citas anteriores ({data.history.length}) {showHistory ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>
          <Collapse in={showHistory}>
            <div className="ag-card" style={{ padding: "0 16px", marginTop: 10 }}>
              {data.history.map((h) => (
                <div key={h.id} className="ag-list-row" style={{ gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{h.serviceName}</b>
                    <div className="ag-subtle">
                      {dayLabel(h.startDate)} · {time(h.startDate)}
                      {h.employeeName ? ` · ${h.employeeName}` : ""}
                    </div>
                  </div>
                  {HISTORY_BADGE[h.status] && <span className={badgeClass(HISTORY_BADGE[h.status].tone)}>{HISTORY_BADGE[h.status].label}</span>}
                </div>
              ))}
            </div>
          </Collapse>
        </section>
      )}

      {footer}
    </div>
  );
};

export default MyBookingsView;
