import { FC, useRef, useMemo, useCallback } from "react";
import { Box } from "@mantine/core";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { Appointment } from "../../../../services/appointmentService";
import { Employee } from "../../../../services/employeeService";
import { calculateAppointmentPosition } from "../../utils/scheduleUtils";
import DraggableAppointmentCard from "../DraggableAppointmentCard";
import { HOUR_HEIGHT, MINUTE_HEIGHT, CARD_WIDTH } from "../DayModal";

interface EmployeeColumnProps {
  employee: Employee;
  appoinments: Appointment[]; // todas las citas (no solo de este empleado)
  appointmentsByEmployee: Record<string, Appointment[]>;
  // timeIntervals: Date[];
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

const isTouchDevice = () => navigator.maxTouchPoints > 0;

/**
 * Función para ajustar los minutos al bloque de 15 min más cercano
 * ej: 10:07 → 10:00, 10:08 → 10:15
 */
function snapToQuarter(minutes: number) {
  return Math.round(minutes / 15) * 15;
}

const DayModalEmployeeColumn: FC<EmployeeColumnProps> = ({
  employee,
  appoinments,
  appointmentsByEmployee,
  // timeIntervals,
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

  // Obtenemos todas las citas en un solo array para buscar la original al hacer drop
  const allAppointments = useMemo(
    () => Object.values(appointmentsByEmployee).flat(),
    [appointmentsByEmployee]
  );

  /**
   * Función que maneja la lógica cuando se suelta (drop) una cita.
   */
  const handleDrop = useCallback(
    (item: DraggedItem, monitor: DropTargetMonitor) => {
      if (!columnRef.current) return;

      const boundingRect = columnRef.current.getBoundingClientRect();
      const mousePos = monitor.getClientOffset();
      if (!mousePos) return;

      // Ajustar posición para dispositivos táctiles
      const devicePixelRatio = isTouchDevice() ? window.devicePixelRatio : 1;

      // Ajustamos la posición (y) de donde se suelta
      const scrollOffset = columnRef.current.scrollTop || 0;
      const correctedY = mousePos.y / devicePixelRatio;
      const yTop = correctedY - boundingRect.top - item.offsetY + scrollOffset;

      // Convertir posición vertical a “minutos desde el inicio de la jornada”
      const totalMinutes = (yTop / HOUR_HEIGHT) * 60;
      const snappedMinutes = snapToQuarter(totalMinutes); // redondea a 15 min
      const hourOffset = Math.floor(snappedMinutes / 60);
      const minuteOffset = snappedMinutes % 60;

      // Generar nueva fecha de inicio usando startHour
      const newStartDate = new Date(selectedDay);
      newStartDate.setHours(startHour + hourOffset, minuteOffset, 0, 0);

      // Buscar la cita original y calcular su duración
      const originalAppointment = allAppointments.find(
        (app) => app._id === item.appointmentId
      );
      if (!originalAppointment) return;

      const durationMs =
        new Date(originalAppointment.endDate).getTime() -
        new Date(originalAppointment.startDate).getTime();

      // Generar nueva fecha de fin
      const newEndDate = new Date(newStartDate.getTime() + durationMs);

      // Crear la cita actualizada
      const updatedAppointment: Appointment = {
        ...originalAppointment,
        employee,
        startDate: newStartDate,
        endDate: newEndDate,
      };

      // Llamamos a la función que abre tu lógica de edición
      onEditAppointment(updatedAppointment);
    },
    [
      columnRef,
      allAppointments,
      employee,
      onEditAppointment,
      selectedDay,
      startHour,
    ]
  );

  // Configuración de la zona drop (columna)
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.APPOINTMENT,
    drop: handleDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  /**
   * Cuando hacemos click en la columna vacía,
   * calculamos el horario y abrimos el modal de creación.
   */
  const handleColumnClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const clickedElement = event.target as HTMLElement;
    // Evita abrir modal si hizo click en una cita
    if (clickedElement.closest(".appointment-card")) {
      return;
    }
  
    const boundingRect = columnRef.current?.getBoundingClientRect();
    if (!boundingRect) return;
  
    const clickedY = event.clientY - boundingRect.top;
  
    // Calcula el tiempo basado en la posición vertical del clic
    const totalMinutes = (clickedY / HOUR_HEIGHT) * 60;
    const snappedMinutes = snapToQuarter(totalMinutes); // Redondea al bloque de 15 minutos más cercano
    const hourOffset = Math.floor(snappedMinutes / 60);
    const minuteOffset = snappedMinutes % 60;
  
    // Genera la hora de inicio ajustada
    const clickedInterval = new Date(selectedDay);
    clickedInterval.setHours(startHour + hourOffset, minuteOffset, 0, 0);
  
    if (hasPermission("appointments:create") && clickedInterval) {
      onOpenModal(selectedDay, clickedInterval, employee._id);
    }
  };
  

  /**
   * Pintamos las citas del empleado (absolutas en el contenedor).
   */
  const renderAppointments = () => {
    return appointmentsByEmployee[employee._id]?.map((appointment) => {
      // Calcula posición y altura en píxeles
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
            appoinments={appoinments}
            onEditAppointment={onEditAppointment}
            onCancelAppointment={onCancelAppointment}
            onConfirmAppointment={onConfirmAppointment}
          />
        </Box>
      );
    });
  };

  return (
    <div
      ref={(node) => {
        dropRef(node);
        columnRef.current = node;
      }}
      style={{
        width: `${CARD_WIDTH}px`,
        marginLeft: 2,
        borderRight: "1px solid #e0e0e0",
        position: "relative",
        border: isOver ? "2px dashed #4caf50" : "1px solid #e0e0e0",
      }}
      onClick={handleColumnClick}
    >
      <Box
        style={{
          position: "relative",
          minHeight: `${(endHour - startHour + 1) * HOUR_HEIGHT}px`,
        }}
      >
        {renderAppointments()}
      </Box>
    </div>
  );
};

export default DayModalEmployeeColumn;
