import { FC, useRef, useMemo, useCallback } from "react";
import { Box, Text } from "@mantine/core";
import { format } from "date-fns";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useDrop, DropTargetMonitor } from "react-dnd";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import { ItemTypes } from "./ItemTypes";
import { Appointment } from "../../../../services/appointmentService";
import { Employee, EmployeeScheduleException } from "../../../../services/employeeService";
import { removeEmployeeException } from "../../../../services/scheduleService";
import { calculateAppointmentPosition, organizeAppointmentsInLayers } from "../../utils/scheduleUtils";
import DraggableAppointmentCard from "../DraggableAppointmentCard";
import { HOUR_HEIGHT, MINUTE_HEIGHT, CARD_WIDTH } from "../DayModal";

interface DayBlock {
  id?: string;
  top: number;
  height: number;
  label: string;
  allDay: boolean;
  /** Rango completo del bloqueo (puede abarcar varios días, más allá del día visible) */
  startDate: string;
  endDate: string;
}

// Calcula los bloqueos (excepciones) del profesional que aplican al día visible,
// convertidos a coordenadas (top/height) del grid de tiempo.
function computeDayBlocks(
  employee: Employee,
  selectedDay: Date,
  startHour: number,
  endHour: number
): DayBlock[] {
  const exceptions = employee.scheduleExceptions;
  if (!exceptions?.length) return [];

  const dayStr = format(selectedDay, "yyyy-MM-dd");
  const totalHeight = (endHour - startHour + 1) * HOUR_HEIGHT;
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
    return (h || 0) * 60 + (m || 0);
  };

  const blocks: DayBlock[] = [];
  for (const ex of exceptions) {
    // ¿La excepción cubre este día? (comparación de strings ISO YYYY-MM-DD)
    if (!(ex.startDate <= dayStr && dayStr <= ex.endDate)) continue;

    const range = { startDate: ex.startDate, endDate: ex.endDate };

    if (ex.allDay || !ex.startTime || !ex.endTime) {
      blocks.push({ id: ex._id, top: 0, height: totalHeight, label: ex.reason || "Bloqueado", allDay: true, ...range });
      continue;
    }

    const startMin = toMin(ex.startTime) - startHour * 60;
    const endMin = toMin(ex.endTime) - startHour * 60;
    const top = Math.max(0, startMin * MINUTE_HEIGHT);
    const bottom = Math.min(totalHeight, endMin * MINUTE_HEIGHT);
    if (bottom <= top) continue;
    blocks.push({ id: ex._id, top, height: bottom - top, label: ex.reason || "Bloqueado", allDay: false, ...range });
  }
  return blocks;
}

// Franja visible: uno o varios bloqueos que se pintan superpuestos se ven como UNA sola
// franja, así que se manejan (y se eliminan) juntos. Si no, al quitar el de arriba el de
// abajo seguía pintado justo debajo y parecía que "se eliminó pero sigue ahí".
interface DayBand {
  top: number;
  height: number;
  label: string;
  allDay: boolean;
  members: DayBlock[];
}

function mergeOverlappingBlocks(blocks: DayBlock[]): DayBand[] {
  const sorted = [...blocks].sort((a, b) => a.top - b.top);
  const bands: DayBand[] = [];
  for (const block of sorted) {
    const last = bands[bands.length - 1];
    // Se fusionan solo si se pisan de verdad; dos bloqueos contiguos (10-12 y 12-14) quedan separados
    if (last && block.top < last.top + last.height) {
      const bottom = Math.max(last.top + last.height, block.top + block.height);
      last.height = bottom - last.top;
      last.allDay = last.allDay || block.allDay;
      last.members.push(block);
      continue;
    }
    bands.push({ top: block.top, height: block.height, label: block.label, allDay: block.allDay, members: [block] });
  }
  for (const band of bands) {
    if (band.members.length > 1) {
      const labels = [...new Set(band.members.map((m) => m.label))];
      band.label = labels.length > 2 ? `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}` : labels.join(" · ");
    }
  }
  return bands;
}

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
  onEditAppointment: (appointment: Appointment, initialTab?: string) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  hasPermission: (permission: string) => boolean;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  timezone?: string; // 🌍 Timezone de la organización
  timeFormat?: string;
  /** Se llama tras eliminar un bloqueo, con la lista de excepciones ya actualizada */
  onExceptionDeleted: (employeeId: string, updatedExceptions: EmployeeScheduleException[]) => void;
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
  onMarkAttendance,
  hasPermission,
  onOpenModal,
  timezone = 'America/Bogota', // 🌍 Default timezone
  timeFormat,
  onExceptionDeleted,
}) => {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = useSelector((state: RootState) => state.auth.userId);

  const allAppointments = useMemo(
    () => Object.values(appointmentsByEmployee).flat(),
    [appointmentsByEmployee]
  );

  // 🚫 Bloqueos (excepciones de horario) del profesional para el día visible, agrupados en
  // franjas (los superpuestos se ven y se eliminan como uno solo)
  const dayBands = useMemo(
    () => mergeOverlappingBlocks(computeDayBlocks(employee, selectedDay, startHour, endHour)),
    [employee, selectedDay, startHour, endHour]
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

      onEditAppointment(updatedAppointment, "edicion");
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

  const handleDeleteBand = useCallback(
    (band: DayBand) => {
      const members = band.members.filter((m) => m.id);
      if (members.length === 0) return;
      const dayStr = format(selectedDay, "yyyy-MM-dd");
      const name = employee.names.trim();
      const hasMultiDay = members.some((m) => m.startDate !== m.endDate);
      const single = members.length === 1 ? members[0] : null;

      modals.openConfirmModal({
        title: single
          ? hasMultiDay
            ? "Eliminar bloqueo de este día"
            : "Eliminar bloqueo"
          : "Eliminar bloqueos de este día",
        children: single ? (
          hasMultiDay ? (
            <Text size="sm">
              Este bloqueo de {name} abarca del {single.startDate} al {single.endDate}.
              Solo se eliminará el bloqueo del {dayStr}; los demás días se mantienen. Para quitar
              todo el rango, hazlo desde el horario del profesional.
            </Text>
          ) : (
            <Text size="sm">
              ¿Eliminar este bloqueo de horario de {name}? Esta acción no se puede deshacer.
            </Text>
          )
        ) : (
          <Text size="sm">
            En este horario {name} tiene {members.length} bloqueos superpuestos. Se quitarán todos
            del {dayStr}
            {hasMultiDay ? "; los demás días de cada bloqueo se mantienen" : ""}.
          </Text>
        ),
        labels: { confirm: "Eliminar", cancel: "Cancelar" },
        confirmProps: { color: "red" },
        zIndex: 2000,
        onConfirm: async () => {
          // Secuencial: cada respuesta trae la lista ya actualizada y así no chocan las
          // escrituras sobre el mismo profesional.
          let latest: Awaited<ReturnType<typeof removeEmployeeException>>;
          try {
            for (const m of members) {
              // Un bloqueo multi-día se quita solo del día visible; los demás días se mantienen
              latest = await removeEmployeeException(
                employee._id,
                m.id!,
                m.startDate !== m.endDate ? dayStr : undefined
              );
            }
            showNotification({
              title: "Éxito",
              message: members.length > 1 ? "Bloqueos eliminados" : "Bloqueo eliminado",
              color: "green",
            });
            onExceptionDeleted?.(employee._id, latest ?? []);
          } catch (err) {
            // Si alguno ya se había eliminado, la pantalla se alinea con lo último que confirmó el servidor
            if (latest) onExceptionDeleted?.(employee._id, latest);
            // El mensaje viene del servidor (p. ej. "Solo puedes gestionar bloqueos de tu propia agenda.")
            showNotification({
              title: "Error",
              message: err instanceof Error && err.message ? err.message : "No se pudo eliminar el bloqueo",
              color: "red",
            });
          }
        },
      });
    },
    [employee._id, employee.names, selectedDay, onExceptionDeleted]
  );

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
            onMarkAttendance={onMarkAttendance}
            isExpanded={isExpanded}
            handleToggleExpand={handleToggleExpand}
            timezone={timezone}
            timeFormat={timeFormat}
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
  // Quien puede crear citas gestiona los bloqueos de cualquier profesional; quien solo tiene
  // "Bloquear su propia agenda" (manage_own_blocks) puede quitar únicamente los suyos.
  const canManageBlocks =
    canCreate ||
    (hasPermission("appointments:manage_own_blocks") && employee._id === currentUserId);
  // Área táctil más grande en pantallas touch (16px era muy difícil de acertar con el dedo)
  const blockBtnSize = isTouchDevice() ? 28 : 18;

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

      {/* 🚫 Bloqueos de horario (encima de las guías, debajo de las citas) */}
      {dayBands.map((band, i) => (
        <Box
          key={`block-${i}`}
          title={band.label}
          style={{
            position: "absolute",
            top: `${band.top}px`,
            left: 0,
            right: 0,
            height: `${band.height}px`,
            zIndex: 0,
            pointerEvents: "none",
            background:
              "repeating-linear-gradient(45deg, rgba(180,80,80,0.10), rgba(180,80,80,0.10) 6px, rgba(180,80,80,0.18) 6px, rgba(180,80,80,0.18) 12px)",
            borderTop: "1px solid rgba(180,80,80,0.35)",
            borderBottom: band.allDay ? "none" : "1px solid rgba(180,80,80,0.35)",
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(150,50,50,0.9)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              padding: "2px 4px",
              paddingRight: blockBtnSize + 4,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {band.label}
          </Text>
        </Box>
      ))}

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

      {/* 🗑️ Botones para eliminar bloqueos (capa por encima de las citas) */}
      {canManageBlocks && dayBands.some((b) => b.members.some((m) => m.id)) && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {dayBands.map((band, i) =>
            band.members.some((m) => m.id) ? (
              <Box
                key={`block-x-${i}`}
                role="button"
                title="Eliminar bloqueo"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBand(band);
                }}
                style={{
                  position: "absolute",
                  top: `${band.top + 2}px`,
                  right: 2,
                  width: blockBtnSize,
                  height: blockBtnSize,
                  borderRadius: "50%",
                  background: "rgba(150,50,50,0.92)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: blockBtnSize - 4,
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: "pointer",
                  pointerEvents: "auto",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }}
              >
                ×
              </Box>
            ) : null
          )}
        </Box>
      )}
    </div>
  );
};

export default DayModalEmployeeColumn;
