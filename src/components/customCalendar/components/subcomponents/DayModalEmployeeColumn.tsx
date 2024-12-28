import { FC, useRef } from "react";
import { Box } from "@mantine/core";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { Appointment } from "../../../../services/appointmentService";
import { Employee } from "../../../../services/employeeService";
import { calculateAppointmentPosition } from "../../utils/scheduleUtils";
import DraggableAppointmentCard from "../DraggableAppointmentCard";
import { HOUR_HEIGHT, MINUTE_HEIGHT, CARD_WIDTH } from "../DayModal";

interface EmployeeColumnProps {
  employee: Employee;
  appointmentsByEmployee: Record<string, Appointment[]>;
  /** 
   * No usamos `timeIntervals` para “snap”, 
   * pero sí podrías necesitarlo si deseas generar un fondo de líneas, 
   * o al hacer clic en un hueco.
   */
  timeIntervals: Date[];
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
}

interface DraggedItem {
  appointmentId: string;
  offsetY: number;
  cardHeightPx: number;
}

const DayModalEmployeeColumn: FC<EmployeeColumnProps> = ({
  employee,
  appointmentsByEmployee,
  /** timeIntervals: si quieres usarlo para click en hueco, pero NO para snap */
  timeIntervals,
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
}) => {
  const columnRef = useRef<HTMLDivElement | null>(null);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.APPOINTMENT,
    drop: (item: DraggedItem, monitor) => {
      if (!columnRef.current) return;

      const boundingRect = columnRef.current.getBoundingClientRect();
      const mousePos = monitor.getClientOffset();
      if (!mousePos) return;

      // 1) Obtener la cita original
      const allAppointments = Object.values(appointmentsByEmployee).flat();
      const originalAppointment = allAppointments.find(
        (app) => app._id === item.appointmentId
      );
      if (!originalAppointment) return;

      // 2) Calcular la posición vertical (borde superior)
      const yTop = mousePos.y - boundingRect.top - item.offsetY;

      // 3) Convertir yTop a minutos exactos desde startHour
      //    asumiendo 1 hora = HOUR_HEIGHT px => 1 min = (HOUR_HEIGHT/60) px
      //    => minutesOffset = (yTop / HOUR_HEIGHT) * 60
      const minutesOffset = (yTop / HOUR_HEIGHT) * 60;

      // a) Hora offset (cuántas horas más allá de startHour)
      const hourOffset = Math.floor(minutesOffset / 60);
      // b) Minutos sobrantes
      const minuteOffset = Math.round(minutesOffset % 60);

      // 4) Generar la nueva hora de inicio
      const newStartDate = new Date(selectedDay);
      newStartDate.setHours(startHour + hourOffset);
      newStartDate.setMinutes(minuteOffset, 0, 0);

      // 5) Mantener la duración
      const originalStart = new Date(originalAppointment.startDate);
      const originalEnd = new Date(originalAppointment.endDate);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      // 6) Cita actualizada
      const updatedAppointment: Appointment = {
        ...originalAppointment,
        employee, // o employeeId: employee._id
        startDate: newStartDate,
        endDate: newEndDate,
      };

      // 7) Llamar al callback para editar
      onEditAppointment(updatedAppointment);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={(node) => {
        drop(node);
        columnRef.current = node;
      }}
      style={{
        width: `${CARD_WIDTH}px`,
        marginLeft: "10px",
        borderRight: "1px solid #e0e0e0",
        position: "relative",
        border: isOver ? "2px dashed #4caf50" : "1px solid transparent",
        backgroundColor: "transparent",
      }}
      onClick={(event) => {
        // Ejemplo: crear una cita con onOpenModal al hacer clic vacío
        const clickedElement = event.target as HTMLElement;
        if (!clickedElement.closest(".appointment-card")) {
          const clickedIntervalIndex = Math.floor(
            event.nativeEvent.offsetY / HOUR_HEIGHT
          );
          const clickedInterval = timeIntervals[clickedIntervalIndex];
          if (hasPermission("appointments:create") && clickedInterval) {
            onOpenModal(selectedDay, clickedInterval, employee._id);
          }
        }
      }}
    >
      <Box
        style={{
          position: "relative",
          minHeight: `${(endHour - startHour + 1) * HOUR_HEIGHT}px`,
        }}
      >
        {appointmentsByEmployee[employee._id]?.map((appointment) => {
          const { top, height } = calculateAppointmentPosition(
            appointment,
            startHour,
            selectedDay,
            MINUTE_HEIGHT
          );

          return (
            <Box
              key={appointment._id}
              style={{
                position: "absolute",
                top: `${top}px`,
                width: "100%",
                height: isExpanded(appointment) ? "auto" : `${height}px`,
                zIndex: isExpanded(appointment) ? 1 : 0,
                overflow: "hidden",
                cursor: "move",
              }}
              onClick={() => handleToggleExpand(appointment._id)}
            >
              <DraggableAppointmentCard
                appointment={appointment}
                onEditAppointment={onEditAppointment}
                onCancelAppointment={onCancelAppointment}
                onConfirmAppointment={onConfirmAppointment}
              />
            </Box>
          );
        })}
      </Box>
    </div>
  );
};

export default DayModalEmployeeColumn;
