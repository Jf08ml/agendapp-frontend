// Columna de un día en la vista Semana con todos los profesionales (rediseño,
// AgendaSemana): citas compactas (hora, cliente y punto del color del
// profesional) en una sola columna por día; si se cruzan, se escalonan con
// sombra para que se vean las dos. Conserva el arrastre: soltar una cita en
// otro día u hora abre la cita para confirmar, con el mismo profesional (igual
// que en la columna por profesional).
import React, { FC, useCallback, useMemo, useRef } from "react";
import { useDrag, useDrop, type DropTargetMonitor } from "react-dnd";
import { Appointment, type AppointmentMove } from "../../../services/appointmentService";
import { formatInTimezone } from "../../../utils/timezoneUtils";
import { toSpanishMeridiem } from "../../../utils/timeFormatUtils";
import { calculateAppointmentPosition, organizeAppointmentsInLayers } from "../utils/scheduleUtils";
import { ItemTypes } from "./subcomponents/ItemTypes";
import { HOUR_HEIGHT, MINUTE_HEIGHT } from "./dayGrid";

interface DraggedItem {
  appointmentId: string;
  offsetY: number;
}

interface WeekDayColumnProps {
  day: Date;
  /** Citas activas de ese día (todas las personas del filtro) */
  appointments: Appointment[];
  /** Citas de toda la semana: el arrastre puede venir de otro día */
  weekAppointments: Appointment[];
  startHour: number;
  endHour: number;
  timezone: string;
  timeFormat?: string;
  canCreate: boolean;
  onEditAppointment: (appointment: Appointment, initialTab?: string, move?: AppointmentMove) => void;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
}

const STAGGER_PX = 18;

import { dropMinutes, dropStart, snapToQuarter } from "./dropTarget";

function MiniCard({
  appointment,
  timezone,
  timeFormat,
  onEditAppointment,
  short = false,
}: {
  appointment: Appointment;
  timezone: string;
  timeFormat?: string;
  onEditAppointment: (appointment: Appointment, initialTab?: string, move?: AppointmentMove) => void;
  /** Bloque bajo (≤ 30 min): solo hora y cliente */
  short?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.APPOINTMENT,
    item: (monitor) => {
      const rect = ref.current?.getBoundingClientRect();
      const pos = monitor.getClientOffset();
      return { appointmentId: appointment._id, offsetY: rect && pos ? pos.y - rect.top : 0 };
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));
  drag(ref);

  const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const time = toSpanishMeridiem(formatInTimezone(appointment.startDate, timezone, fmt));
  const proColor = appointment.employee?.color || "var(--pro-8)";

  return (
    <div
      ref={ref}
      className="ag-appt ag-appt--mini"
      role="button"
      tabIndex={0}
      title={`${time} · ${appointment.client?.name ?? ""}${appointment.service?.name ? ` · ${appointment.service.name}` : ""} · ${appointment.employee?.names ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onEditAppointment(appointment);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEditAppointment(appointment);
      }}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: "pointer",
        opacity: isDragging ? 0.4 : 1,
        borderLeft: `3px solid ${proColor}`,
        background: "var(--surface-raised)",
        padding: short ? "2px 6px" : undefined,
      }}
    >
      <span className="ag-appt__time ag-num">{time}</span>
      <span className="ag-appt__client" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {appointment.client?.name}
      </span>
      {!short && (
        <span className="ag-appt__pro" style={{ fontSize: 11 }}>
          <i style={{ background: proColor }} />
          {appointment.employee?.names?.trim().split(/\s+/)[0]}
        </span>
      )}
    </div>
  );
}

const WeekDayColumn: FC<WeekDayColumnProps> = ({
  day,
  appointments,
  weekAppointments,
  startHour,
  endHour,
  timezone,
  timeFormat,
  canCreate,
  onEditAppointment,
  onOpenModal,
}) => {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const totalHeight = (endHour - startHour + 1) * HOUR_HEIGHT;

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [appointments]
  );
  const layers = useMemo(() => organizeAppointmentsInLayers(sorted), [sorted]);

  // Minutos desde el inicio de la grilla según la posición vertical
  const minutesAt = useCallback(
    (clientY: number, offsetY = 0) => {
      const rect = columnRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      return snapToQuarter(Math.round(((clientY - rect.top - offsetY) / HOUR_HEIGHT) * 60));
    },
    []
  );

  const handleDrop = useCallback(
    (item: DraggedItem, monitor: DropTargetMonitor) => {
      const pos = monitor.getClientOffset();
      if (!pos) return;
      const original = weekAppointments.find((a) => a._id === item.appointmentId);
      if (!original) return;
      const rect = columnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minutes = dropMinutes(pos.y, rect.top, item.offsetY, HOUR_HEIGHT, (endHour - startHour + 1) * 60);
      // Hora en la zona del negocio (antes setHours usaba la zona del navegador)
      const newStart = dropStart(day, timezone, startHour, minutes);
      const duration = new Date(original.endDate).getTime() - new Date(original.startDate).getTime();
      // Mismo profesional: en esta vista se cambia día u hora. El modal recibe la cita
      // original y el cambio aparte, para ofrecer avisar al cliente por WhatsApp.
      onEditAppointment(original, "edicion", { startDate: newStart, endDate: new Date(newStart.getTime() + duration) });
    },
    [weekAppointments, day, startHour, endHour, timezone, onEditAppointment]
  );

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.APPOINTMENT,
      drop: handleDrop,
      collect: (monitor) => ({ isOver: !!monitor.isOver() }),
    }),
    [handleDrop]
  );
  drop(columnRef);

  return (
    <div
      ref={columnRef}
      onClick={(e) => {
        if (!canCreate) return;
        const minutes = minutesAt(e.clientY);
        const slot = new Date(day);
        slot.setHours(startHour + Math.floor(minutes / 60), minutes % 60, 0, 0);
        onOpenModal(day, slot);
      }}
      style={{
        position: "relative",
        height: totalHeight,
        background: isOver ? "var(--brand-soft)" : "transparent",
        cursor: canCreate ? "copy" : "default",
      }}
    >
      {/* Líneas de hora */}
      {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: i * HOUR_HEIGHT,
            borderTop: "1px solid var(--line)",
            pointerEvents: "none",
          }}
        />
      ))}

      {sorted.map((appointment) => {
        const { top, height } = calculateAppointmentPosition(appointment, startHour, day, MINUTE_HEIGHT, timezone);
        const layer = Math.max(0, layers.findIndex((l) => l.some((a) => a._id === appointment._id)));
        return (
          <div
            key={appointment._id}
            style={{
              position: "absolute",
              top,
              height: Math.max(height, 34),
              left: 2 + layer * STAGGER_PX,
              right: 2,
              zIndex: 1 + layer,
              boxShadow: layer > 0 ? "var(--shadow-md)" : undefined,
              borderRadius: "var(--radius-md)",
            }}
          >
            <MiniCard
              appointment={appointment}
              timezone={timezone}
              timeFormat={timeFormat}
              onEditAppointment={onEditAppointment}
              short={height <= 40}
            />
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(WeekDayColumn);
