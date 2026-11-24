// Vista «Día» de la agenda (rediseño, AgendaEscritorio / AgendaMovil). Antes era
// el contenido de un modal de pantalla completa (DayModal) que se abría al tocar
// un día del mes; ahora es una vista más del calendario, junto a Semana y Mes.
// Dos modos, como antes («Calendario» / «Compacta»):
//   - Tarjetas: una columna por profesional, con el arrastre que ya existía.
//   - Lista: una fila por cita (antes «Compacta», una grilla de horas).
// Abre en Tarjetas (también en móvil) salvo que la persona haya elegido Lista;
// el selector y lo que se recuerda viven en CustomCalendar (barra del calendario).
import React, { FC, useState, useEffect, useMemo } from "react";
import { Box, Group, Badge, Flex, Collapse, Text, Divider, ActionIcon, Tooltip } from "@mantine/core";
import { useElementSize, useMediaQuery } from "@mantine/hooks";
import { isSameMonth } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { IconTrash } from "@tabler/icons-react";
import type { DayMode } from "../CustomCalendar";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { Appointment, type AppointmentMove } from "../../../services/appointmentService";
import { Employee, EmployeeScheduleException } from "../../../services/employeeService";
import {
  generateTimeIntervals,
  organizeAppointmentsByEmployee,
  organizeAppointmentsInLayers,
} from "../utils/scheduleUtils";
import { useExpandAppointment } from "../hooks/useExpandAppointment";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatInTimezone } from "../../../utils/timezoneUtils";
import { toSpanishMeridiem } from "../../../utils/timeFormatUtils";
import { HOUR_HEIGHT, CARD_WIDTH } from "./dayGrid";

/* Subcomponentes */
import Header from "./subcomponents/DayModalHeader";
import TimeColumn from "./subcomponents/DayModalTimeColumn";
import TimeGrid from "./subcomponents/DayModalTimeGrid";
import EmployeeColumn from "./subcomponents/DayModalEmployeeColumn";
import DayListView from "./DayListView";
import CustomLoader from "../../../components/customLoader/CustomLoader";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_COLUMN_WIDTH = 80; // DayModalTimeColumn

interface DayViewProps {
  /** Día que se muestra (lo controla la barra del calendario) */
  day: Date;
  /** Tarjetas o Lista (el selector está en la barra del calendario) */
  mode: DayMode;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  fetchAppointmentsForDay: (day: Date) => Promise<Appointment[]>;
  loadedMonthDate: Date;
  onEditAppointment: (appointment: Appointment, initialTab?: string, move?: AppointmentMove) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  onDeleteAppointment?: (appointmentId: string) => void;
  employees: Employee[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  timezone?: string;
  onExceptionDeleted: (employeeId: string, updatedExceptions: EmployeeScheduleException[]) => void;
}

const pill = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap" as const,
};

const DayView: FC<DayViewProps> = ({
  day,
  mode,
  onOpenModal,
  getAppointmentsForDay,
  fetchAppointmentsForDay,
  loadedMonthDate,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  onDeleteAppointment,
  employees,
  setAppointments,
  timezone = "America/Bogota",
  onExceptionDeleted,
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const timeFormat = organization?.timeFormat || "12h";

  const isSmallScreen = useMediaQuery("(max-width: 768px)", false, { getInitialValueInEffect: false });

  const [localDayAppointments, setLocalDayAppointments] = useState<Appointment[] | null>(null);
  const [fetchingLocalDay, setFetchingLocalDay] = useState(false);
  const [currentLinePosition, setCurrentLinePosition] = useState<number | null>(null);
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);

  // Citas del día desde la data del mes ya cargado
  const appointmentsFromMonth = useMemo(() => getAppointmentsForDay(day), [day, getAppointmentsForDay]);

  // Si el día cae fuera del mes cargado, se piden solo las de ese día. Se repite
  // cuando cambia la data del mes (crear/editar/cancelar).
  useEffect(() => {
    let mounted = true;
    if (!isSameMonth(day, loadedMonthDate)) {
      setFetchingLocalDay(true);
      fetchAppointmentsForDay(day)
        .then((res) => {
          if (mounted) setLocalDayAppointments(res);
        })
        .finally(() => {
          if (mounted) setFetchingLocalDay(false);
        });
    } else {
      setLocalDayAppointments(null);
    }
    return () => {
      mounted = false;
    };
  }, [day, loadedMonthDate, fetchAppointmentsForDay, getAppointmentsForDay]);

  const appointments = localDayAppointments ?? appointmentsFromMonth;

  const cancelledAppointments = useMemo(
    () => appointments.filter((apt) => apt.status.includes("cancelled")),
    [appointments]
  );
  const activeAppointments = useMemo(
    () => appointments.filter((apt) => !apt.status.includes("cancelled")),
    [appointments]
  );

  const appointmentsByEmployee = useMemo(() => organizeAppointmentsByEmployee(appointments), [appointments]);

  const handleToggleEmployeeHidden = (employeeId: string) => {
    setHiddenEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const employeesSorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aHidden = hiddenEmployeeIds.includes(a._id);
      const bHidden = hiddenEmployeeIds.includes(b._id);
      if (aHidden && !bHidden) return 1;
      if (!aHidden && bHidden) return -1;
      return 0;
    });
  }, [employees, hiddenEmployeeIds]);

  const visibleEmployees = useMemo(
    () => employeesSorted.filter((emp) => !hiddenEmployeeIds.includes(emp._id)),
    [employeesSorted, hiddenEmployeeIds]
  );

  // Ancho disponible para repartir entre las columnas visibles
  const { ref: gridRef, width: gridWidth } = useElementSize();

  // Ancho por profesional según las capas de citas que se cruzan
  const columnWidthMap = useMemo(() => {
    const map = new Map<string, number>();
    const extraPerLayer = 40;
    const maxWidth = 360;
    employeesSorted.forEach((emp) => {
      const appts = (appointmentsByEmployee[emp._id] || []).filter((a) => !a.status.includes("cancelled"));
      const layersCount = Math.max(organizeAppointmentsInLayers(appts).length, 1);
      map.set(emp._id, Math.min(maxWidth, CARD_WIDTH + (layersCount - 1) * extraPerLayer));
    });
    // Si sobra espacio, las columnas visibles se reparten el ancho (AgendaEscritorio):
    // nunca quedan más angostas que su mínimo.
    const visible = employeesSorted.filter((e) => !hiddenEmployeeIds.includes(e._id));
    const hiddenWidth = (employeesSorted.length - visible.length) * CARD_WIDTH;
    // 18 px: barra de scroll vertical
    const available = gridWidth - TIME_COLUMN_WIDTH - hiddenWidth - 18;
    if (visible.length > 0 && available > 0) {
      const share = Math.floor(available / visible.length);
      visible.forEach((e) => map.set(e._id, Math.max(map.get(e._id) ?? CARD_WIDTH, share)));
    }
    return map;
  }, [employeesSorted, appointmentsByEmployee, hiddenEmployeeIds, gridWidth]);

  const totalUniqueClients = useMemo(() => {
    const clientIds = activeAppointments.map((app) => app.client?._id).filter(Boolean);
    return new Set(clientIds).size;
  }, [activeAppointments]);

  const { startHour, endHour } = useMemo(() => {
    const orgStartHour = organization?.openingHours?.start
      ? parseInt(organization.openingHours.start.split(":")[0], 10)
      : 8;
    const orgEndHour = organization?.openingHours?.end
      ? parseInt(organization.openingHours.end.split(":")[0], 10)
      : 22;
    const earliest = activeAppointments.length
      ? Math.min(...activeAppointments.map((app) => dayjs.tz(app.startDate, timezone).hour()))
      : orgStartHour;
    const latest = activeAppointments.length
      ? Math.max(...activeAppointments.map((app) => dayjs.tz(app.endDate, timezone).hour()))
      : orgEndHour;
    return { startHour: Math.min(earliest, orgStartHour), endHour: Math.max(orgEndHour, latest) };
  }, [activeAppointments, organization, timezone]);

  const timeIntervals = useMemo(() => generateTimeIntervals(startHour, endHour, day), [startHour, endHour, day]);

  // Línea de «ahora» (sin mutar `day`: es la fecha compartida del calendario)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const from = new Date(day);
      from.setHours(startHour, 0, 0, 0);
      const to = new Date(day);
      to.setHours(endHour, 0, 0, 0);
      if (now >= from && now <= to) {
        const totalMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();
        setCurrentLinePosition((totalMinutes / 60) * HOUR_HEIGHT);
      } else {
        setCurrentLinePosition(null);
      }
    };
    update();
    const intervalId = setInterval(update, 60000);
    return () => clearInterval(intervalId);
  }, [day, startHour, endHour]);

  return (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--surface-raised)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Barra delgada: totales del día (Tarjetas/Lista está en la barra del calendario) */}
      <Box style={{ borderBottom: "1px solid var(--line)", background: "var(--surface-muted)", padding: "4px 10px", flexShrink: 0 }}>
        <Group gap="md" align="center" style={{ flexWrap: "wrap" }}>
          <Group gap={6} align="center">
            <Box style={{ ...pill, background: "var(--brand-soft)", color: "var(--brand-text)" }}>
              {activeAppointments.length} {activeAppointments.length === 1 ? "cita" : "citas"}
            </Box>
            <Box style={{ ...pill, background: "var(--surface-raised)", border: "1px solid var(--line)", color: "var(--ink-muted)" }}>
              {totalUniqueClients} {totalUniqueClients === 1 ? "cliente" : "clientes"}
            </Box>
            {cancelledAppointments.length > 0 && (
              <Box
                component="button"
                type="button"
                onClick={() => setShowCancelled((v) => !v)}
                aria-expanded={showCancelled}
                style={{ ...pill, border: 0, cursor: "pointer", background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                {cancelledAppointments.length} cancelada{cancelledAppointments.length !== 1 ? "s" : ""}
              </Box>
            )}
          </Group>
        </Group>

        {/* Citas canceladas del día */}
        <Collapse in={showCancelled && cancelledAppointments.length > 0}>
          <Divider my="xs" color="var(--line)" />
          <Box style={{ maxHeight: 200, overflowY: "auto" }}>
            {cancelledAppointments.map((apt) => (
              <Box
                key={apt._id}
                style={{
                  padding: "8px 10px",
                  marginBottom: 6,
                  borderRadius: 8,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--line)",
                }}
              >
                <Flex justify="space-between" align="center">
                  <Box style={{ cursor: "pointer", flex: 1 }} onClick={() => onEditAppointment(apt)}>
                    <Text size="sm" fw={600} style={{ textDecoration: "line-through" }}>
                      {toSpanishMeridiem(formatInTimezone(apt.startDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A"))} -{" "}
                      {toSpanishMeridiem(formatInTimezone(apt.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A"))}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {apt.client.name} • {apt.employee.names}
                    </Text>
                    {apt.service && (
                      <Text size="xs" c="dimmed">
                        {apt.service.name}
                      </Text>
                    )}
                  </Box>
                  <Group gap="xs">
                    <Badge size="xs" color="red" variant="light">
                      {apt.status === "cancelled_by_customer" ? "Cliente" : "Admin"}
                    </Badge>
                    {onDeleteAppointment && (
                      <Tooltip label="Eliminar cita" withArrow>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          aria-label="Eliminar cita"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAppointment(apt._id);
                          }}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Flex>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>

      <div
        ref={gridRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "auto",
          overflowY: "auto",
          position: "relative",
          // En móvil, espacio para el botón flotante «Nueva cita»
          paddingBottom: isSmallScreen ? 72 : 0,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {fetchingLocalDay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1000,
              background: "color-mix(in srgb, var(--surface) 60%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomLoader loadingText="Obteniendo citas del día..." overlay />
          </div>
        )}

        {mode === "compact" ? (
          <DayListView
            appointments={appointments}
            onEditAppointment={onEditAppointment}
            timezone={timezone}
            timeFormat={timeFormat}
          />
        ) : (
          /* minWidth: scroll horizontal real para que la columna de horas quede fija */
          <div style={{ minWidth: "max-content" }}>
            <Box style={{ display: "flex", position: "sticky", top: 0, zIndex: 100, backgroundColor: "var(--surface-muted)" }}>
              <Header
                employees={employeesSorted}
                hiddenEmployeeIds={hiddenEmployeeIds}
                onToggleEmployeeHidden={handleToggleEmployeeHidden}
                columnWidthMap={columnWidthMap}
              />
            </Box>
            <Box style={{ display: "flex", position: "relative" }}>
              <Box
                style={{
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 100,
                  backgroundColor: "var(--surface-raised)",
                  flexShrink: 0,
                }}
              >
                <TimeColumn timeIntervals={timeIntervals} timeFormat={timeFormat} />
              </Box>
              <Box style={{ position: "relative" }}>
                {/* Línea de «ahora» en danger (AgendaEscritorio) */}
                {currentLinePosition !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: `${currentLinePosition}px`,
                      width: "100%",
                      height: 2,
                      backgroundColor: "var(--danger)",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: -1,
                        top: -4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "var(--danger)",
                      }}
                    />
                  </div>
                )}

                <TimeGrid
                  timeIntervals={timeIntervals}
                  hasPermission={hasPermission}
                  onOpenModal={onOpenModal}
                  selectedDay={day}
                />
                <Box style={{ display: "flex", position: "relative", zIndex: 1 }}>
                  {visibleEmployees.map((employee) => (
                    <EmployeeColumn
                      key={employee._id}
                      employee={employee}
                      appoinments={appointments}
                      setAppointments={setAppointments}
                      appointmentsByEmployee={appointmentsByEmployee}
                      columnWidth={columnWidthMap.get(employee._id)}
                      startHour={startHour}
                      endHour={endHour}
                      selectedDay={day}
                      isExpanded={isExpanded}
                      handleToggleExpand={handleToggleExpand}
                      onEditAppointment={onEditAppointment}
                      onCancelAppointment={onCancelAppointment}
                      onConfirmAppointment={onConfirmAppointment}
                      onMarkAttendance={onMarkAttendance}
                      hasPermission={hasPermission}
                      onOpenModal={onOpenModal}
                      timezone={timezone}
                      timeFormat={timeFormat}
                      onExceptionDeleted={onExceptionDeleted}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </div>
        )}
      </div>
    </Box>
  );
};

export default React.memo(DayView);
