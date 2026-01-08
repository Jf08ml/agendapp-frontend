import { FC, useRef, useMemo, useCallback } from "react";
import { Box } from "@mantine/core";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { Appointment } from "../../../../services/appointmentService";
import { Employee } from "../../../../services/employeeService";
import { calculateAppointmentPosition, organizeAppointmentsInLayers } from "../../utils/scheduleUtils";
import DraggableAppointmentCard from "../DraggableAppointmentCard";
import { HOUR_HEIGHT, MINUTE_HEIGHT, CARD_WIDTH } from "../DayModal";

interface EmployeeColumnProps {
  employee: Employee;
  appoinments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  appointmentsByEmployee: Record<string, Appointment[]>;
  columnWidth?: number;
  startHour: number;
  endHour: number;
  selectedDay: Date;
  isExpanded: (appointment: Appointment) => boolean;
  handleToggleExpand: (appointmentId: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  hasPermission: (permission: string) => boolean;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  timezone?: string; // 🌍 Timezone de la organización
}

interface DraggedItem {
  appointmentId: string;
  offsetY: number;
  cardHeightPx: number;
}

const isTouchDevice = () => navigator.maxTouchPoints > 0;
function snapToQuarter(minutes: number) {
  return Math.round(minutes / 15) * 15;
}

const DayModalEmployeeColumn: FC<EmployeeColumnProps> = ({
  employee,
  appoinments,
  setAppointments,
  appointmentsByEmployee,
  columnWidth,
  startHour,
  endHour,
  selectedDay,
  isExpanded,
  handleToggleExpand,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  hasPermission,
  onOpenModal,
  timezone = 'America/Bogota', // 🌍 Default timezone
}) => {
  const columnRef = useRef<HTMLDivElement | null>(null);

  const allAppointments = useMemo(
    () => Object.values(appointmentsByEmployee).flat(),
    [appointmentsByEmployee]
  );

  const handleDrop = useCallback(
    (item: DraggedItem, monitor: DropTargetMonitor) => {
      if (!columnRef.current) return;
      const boundingRect = columnRef.current.getBoundingClientRect();
      const mousePos = monitor.getClientOffset();
      if (!mousePos) return;

      const devicePixelRatio = isTouchDevice() ? window.devicePixelRatio : 1;
      const scrollOffset = columnRef.current.scrollTop || 0;
      const correctedY = (mousePos.y - boundingRect.top) / devicePixelRatio;
      const yTop = correctedY - item.offsetY + scrollOffset;

      const totalMinutes = Math.round((yTop / HOUR_HEIGHT) * 60);
      const snappedMinutes = snapToQuarter(totalMinutes);
      const hourOffset = Math.floor(snappedMinutes / 60);
      const minuteOffset = snappedMinutes % 60;

      const newStartDate = new Date(selectedDay);
      newStartDate.setHours(startHour + hourOffset, minuteOffset, 0, 0);

      const originalAppointment = allAppointments.find(
        (app) => app._id === item.appointmentId
      );
      if (!originalAppointment) return;

      const durationMs =
        new Date(originalAppointment.endDate).getTime() -
        new Date(originalAppointment.startDate).getTime();

      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      const updatedAppointment: Appointment = {
        ...originalAppointment,
        employee,
        startDate: newStartDate,
        endDate: newEndDate,
      };

      onEditAppointment(updatedAppointment);
    },
    [columnRef, allAppointments, employee, onEditAppointment, selectedDay, startHour]
  );

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.APPOINTMENT,
    drop: handleDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const handleColumnClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const clickedElement = event.target as HTMLElement;
    if (clickedElement.closest(".appointment-card")) return;

    const boundingRect = columnRef.current?.getBoundingClientRect();
    if (!boundingRect) return;

    const clickedY = event.clientY - boundingRect.top;
    const totalMinutes = (clickedY / HOUR_HEIGHT) * 60;
    const snappedMinutes = snapToQuarter(totalMinutes);
    const hourOffset = Math.floor(snappedMinutes / 60);
    const minuteOffset = snappedMinutes % 60;

    const clickedInterval = new Date(selectedDay);
    clickedInterval.setHours(startHour + hourOffset, minuteOffset, 0, 0);

    if (hasPermission("appointments:create") && clickedInterval) {
      onOpenModal(selectedDay, clickedInterval, employee._id);
    }
  };

  const renderAppointments = () => {
    const activeAppointments = appointmentsByEmployee[employee._id]
      ?.filter((appointment) => !appointment.status.includes('cancelled'))
      ?.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];

    // 👥 Organizar en capas para evitar que se monten cuando hay superposición
    const layers = organizeAppointmentsInLayers(activeAppointments);

    return activeAppointments.map((appointment) => {
      const { top, height } = calculateAppointmentPosition(
        appointment,
        startHour,
        selectedDay,
        MINUTE_HEIGHT,
        timezone
      );

      // Buscar en qué capa quedó esta cita
      const layerIndex = layers.findIndex((layer) => layer.some((appt) => appt._id === appointment._id));
      const totalLayers = Math.max(layers.length, 1);
      const gapPx = 4;
      const widthPercent = 100 / totalLayers;
      const leftPercent = widthPercent * layerIndex;

      return (
        <Box
          key={appointment._id}
          style={{
            position: "absolute",
            top: `${top}px`,
            left: `calc(${leftPercent}% + ${gapPx / 2}px)`,
            width: `calc(${widthPercent}% - ${gapPx}px)`,
            height: isExpanded(appointment) ? "auto" : `${height}px`,
            zIndex: isExpanded(appointment) ? 2 : 1,
            overflow: "hidden",
            cursor: "move",
          }}
        >
          <DraggableAppointmentCard
            appointment={appointment}
            appoinments={appoinments}
            setAppointments={setAppointments}
            onEditAppointment={onEditAppointment}
            onCancelAppointment={onCancelAppointment}
            onConfirmAppointment={onConfirmAppointment}
            isExpanded={isExpanded}
            handleToggleExpand={handleToggleExpand}
            timezone={timezone}
          />
        </Box>
      );
    });
  };

// 🕓 Renderiza las líneas guía dentro de la columna (exactas a TimeGrid)
const renderGuides = () => {
  const hours = endHour - startHour + 1;
  const marks = [0, 15, 30, 45];

  return (
    <>
      {/* Línea vertical de columna */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,              // o right: 0 si la quieres al borde derecho
          borderLeft: "1px solid #e0e0e0",
          pointerEvents: "none",
        }}
      />

      {/* Líneas horizontales (horas y cuartos) */}
      {Array.from({ length: hours }).map((_, hourIndex) =>
        marks.map((minutes, markIndex) => {
          const isMain = minutes === 0;
          const top =
            hourIndex * HOUR_HEIGHT +
            (HOUR_HEIGHT / marks.length) * markIndex;

          return (
            <Box
              key={`${hourIndex}-${minutes}`}
              style={{
                position: "absolute",
                top,
                left: 0,
                right: 0,
                borderTop: isMain
                  ? "2px solid #e0e0e0"
                  : "1px dashed rgb(171, 171, 173)",
                pointerEvents: "none",
              }}
            />
          );
        })
      )}
    </>
  );
};


  const canCreate = hasPermission("appointments:create");

  return (
    <div
      ref={(node) => {
        dropRef(node);
        columnRef.current = node;
      }}
      style={{
        width: `${columnWidth ?? CARD_WIDTH}px`,
        marginLeft: 2,
        borderRight: "1px solid #e0e0e0",
        position: "relative",
        background: isOver ? "rgba(76, 175, 80, 0.04)" : "#fff",
        outline: isOver ? "2px dashed #4caf50" : "none",
        outlineOffset: -2,
        transition: "background 120ms ease, outline-color 120ms ease",
        cursor: canCreate ? "crosshair" : "default",
      }}
      onClick={handleColumnClick}
    >
      {/* Fondo con guías */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 0,
        }}
      >
        {renderGuides()}
      </Box>

      {/* Contenedor de citas */}
      <Box
        style={{
          position: "relative",
          minHeight: `${(endHour - startHour + 1) * HOUR_HEIGHT}px`,
          zIndex: 1,
        }}
      >
        {renderAppointments()}
      </Box>
    </div>
  );
};

export default DayModalEmployeeColumn;
