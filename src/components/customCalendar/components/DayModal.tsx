import React, { FC, useState, useEffect, useMemo } from "react";
import { Modal, Box, Group, Badge, Flex, SegmentedControl, Collapse, Text, Divider, ActionIcon, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { format, addDays, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { Appointment } from "../../../services/appointmentService";
import { Employee } from "../../../services/employeeService";
import {
  generateTimeIntervals,
  organizeAppointmentsByEmployee,
  organizeAppointmentsInLayers,
} from "../utils/scheduleUtils";
import { useExpandAppointment } from "../hooks/useExpandAppointment";
import { usePermissions } from "../../../hooks/usePermissions";
import { BiCalendar, BiListUl, BiTrash } from "react-icons/bi";
import { formatInTimezone } from "../../../utils/timezoneUtils";

/* Subcomponentes */
import Header from "./subcomponents/DayModalHeader";
import TimeColumn from "./subcomponents/DayModalTimeColumn";
import TimeGrid from "./subcomponents/DayModalTimeGrid";
import EmployeeColumn from "./subcomponents/DayModalEmployeeColumn";
import DayModalCompactView from "./subcomponents/DayModalCompactView";
import CustomLoader from "../../../components/customLoader/CustomLoader"; // Importa tu loader aquí

export const HOUR_HEIGHT = 60;
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
export const CARD_WIDTH = 80;

interface DayModalProps {
  opened: boolean;
  selectedDay: Date | null;
  onClose: () => void;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  fetchAppointmentsForDay: (day: Date) => Promise<Appointment[]>;
  loadedMonthDate: Date;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  onDeleteAppointment?: (appointmentId: string) => void;
  employees: Employee[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  timezone?: string; // 🌍 Timezone de la organización
}

const DayModal: FC<DayModalProps> = ({
  opened,
  selectedDay,
  onClose,
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
  timezone = 'America/Bogota', // 🌍 Default timezone
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const timeFormat = organization?.timeFormat || "12h";

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [currentDay, setCurrentDay] = useState<Date>(selectedDay || new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "compact">("calendar");
  const [localDayAppointments, setLocalDayAppointments] = useState<
    Appointment[] | null
  >(null);
  const [fetchingLocalDay, setFetchingLocalDay] = useState(false);
  const [currentLinePosition, setCurrentLinePosition] = useState<number | null>(
    null
  );
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);

  // Actualizar el día cuando cambian las props
  useEffect(() => {
    if (selectedDay) {
      setCurrentDay(selectedDay);
    }
  }, [selectedDay]);

  // Decide si ese día ya está en la data global (mes)
  const appointmentsFromMonth = useMemo(
    () => getAppointmentsForDay(currentDay),
    [currentDay, getAppointmentsForDay]
  );

  // Si el día está fuera del mes cargado, hacer fetch solo para ese día
  useEffect(() => {
    let mounted = true;
    // Solo fetchar si el día cae fuera del rango mensual ya cargado
    if (!isSameMonth(currentDay, loadedMonthDate)) {
      setFetchingLocalDay(true);
      fetchAppointmentsForDay(currentDay)
        .then((res) => {
          if (mounted) setLocalDayAppointments(res);
        })
        .finally(() => {
          if (mounted) setFetchingLocalDay(false);
        });
    } else {
      setLocalDayAppointments(null); // usar data global del mes
    }
    return () => {
      mounted = false;
    };
  }, [currentDay, loadedMonthDate, fetchAppointmentsForDay]);

  // Lo que va a mostrar
  const appointments = localDayAppointments ?? appointmentsFromMonth;
  
  // Separar citas activas y canceladas
  const cancelledAppointments = useMemo(
    () => appointments.filter(apt => apt.status.includes('cancelled')),
    [appointments]
  );
  
  const activeAppointments = useMemo(
    () => appointments.filter(apt => !apt.status.includes('cancelled')),
    [appointments]
  );

  // Resto de cálculos igual
  const appointmentsByEmployee = useMemo(
    () => organizeAppointmentsByEmployee(appointments),
    [appointments]
  );

  const handleToggleEmployeeHidden = (employeeId: string) => {
    setHiddenEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
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

  const visibleEmployees = useMemo(() => {
    return employeesSorted.filter(
      (emp) => !hiddenEmployeeIds.includes(emp._id)
    );
  }, [employeesSorted, hiddenEmployeeIds]);

  // 📏 Ancho dinámico por profesional según capas simultáneas
  const columnWidthMap = useMemo(() => {
    const map = new Map<string, number>();
    const baseWidth = CARD_WIDTH;
    const extraPerLayer = 40; // píxeles extra por capa de solapamiento
    const maxWidth = 360;

    employeesSorted.forEach((emp) => {
      const appts = (appointmentsByEmployee[emp._id] || []).filter(
        (a) => !a.status.includes("cancelled")
      );
      const layers = organizeAppointmentsInLayers(appts);
      const layersCount = Math.max(layers.length, 1);
      const width = Math.min(maxWidth, baseWidth + (layersCount - 1) * extraPerLayer);
      map.set(emp._id, width);
    });

    return map;
  }, [employeesSorted, appointmentsByEmployee]);

  const totalUniqueClients = useMemo(() => {
    const clientIds = activeAppointments
      .map((app) => app.client?._id)
      .filter(Boolean);
    return new Set(clientIds).size;
  }, [activeAppointments]);

  const { startHour, endHour } = useMemo(() => {
    const orgStartHour = organization?.openingHours?.start
      ? parseInt(organization.openingHours.start.split(":")[0], 10)
      : 8;
    const orgEndHour = organization?.openingHours?.end
      ? parseInt(organization.openingHours.end.split(":")[0], 10)
      : 22;

    const earliestAppointment = activeAppointments.length
      ? Math.min(
          ...activeAppointments.map((app) => dayjs.tz(app.startDate, timezone).hour())
        )
      : orgStartHour;

    const latestAppointment = activeAppointments.length
      ? Math.max(...activeAppointments.map((app) => dayjs.tz(app.endDate, timezone).hour()))
      : orgEndHour;

    return {
      startHour: Math.min(earliestAppointment, orgStartHour),
      endHour: Math.max(orgEndHour, latestAppointment),
    };
  }, [activeAppointments, organization, timezone]);

  const timeIntervals = useMemo(
    () => generateTimeIntervals(startHour, endHour, currentDay),
    [startHour, endHour, currentDay]
  );

  useEffect(() => {
    const updateCurrentLinePosition = () => {
      const now = new Date();
      if (
        now >= new Date(currentDay.setHours(startHour, 0, 0)) &&
        now <= new Date(currentDay.setHours(endHour, 0, 0))
      ) {
        const totalMinutes =
          (now.getHours() - startHour) * 60 + now.getMinutes();
        const position = (totalMinutes / 60) * HOUR_HEIGHT;
        setCurrentLinePosition(position);
      } else {
        setCurrentLinePosition(null);
      }
    };

    updateCurrentLinePosition();
    const intervalId = setInterval(updateCurrentLinePosition, 60000);

    return () => clearInterval(intervalId);
  }, [currentDay, startHour, endHour]);

  // Handlers navegación
  const goToNextDay = () => setCurrentDay((prev) => addDays(prev, 1));
  const goToPreviousDay = () => setCurrentDay((prev) => addDays(prev, -1));

  const MODAL_BRAND = {
    deep: "#1E3A8A",
    cream: "#FAF7F2",
    surface: "#FFFFFF",
    ink: "#101526",
    body: "#404760",
    muted: "#8B92A6",
    line: "#E7E2D6",
    lineSoft: "#F0EBE0",
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title={
        <Box>
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: MODAL_BRAND.muted,
              lineHeight: 1,
              marginBottom: 2,
            }}
          >
            Agenda del día
          </Text>
          <Text
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: isSmallScreen ? 16 : 20,
              fontWeight: 600,
              letterSpacing: -0.4,
              color: MODAL_BRAND.ink,
              lineHeight: 1.1,
              textTransform: "capitalize",
            }}
          >
            {format(currentDay, "EEEE, d 'de' MMMM", { locale: es })}
          </Text>
        </Box>
      }
      size="xl"
      styles={{ body: { padding: 0 } }}
    >
      {/* Toolbar */}
      <Box
        style={{
          borderBottom: `1px solid ${MODAL_BRAND.lineSoft}`,
          backgroundColor: MODAL_BRAND.cream,
          padding: "8px 12px",
        }}
      >
        <Group gap="md" align="center" justify="space-between" style={{ flexWrap: "wrap" }}>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(value) => setViewMode(value as "calendar" | "compact")}
            data={[
              {
                value: "calendar",
                label: (
                  <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <BiCalendar size={14} />
                    <span>Calendario</span>
                  </Box>
                ),
              },
              {
                value: "compact",
                label: (
                  <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <BiListUl size={14} />
                    <span>Compacta</span>
                  </Box>
                ),
              },
            ]}
          />
          <Group gap={6} align="center">
            <Box
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(30,58,138,0.08)",
                fontSize: isSmallScreen ? 10.5 : 11.5,
                fontWeight: 600,
                color: MODAL_BRAND.deep,
                whiteSpace: "nowrap",
              }}
            >
              {activeAppointments.length} {activeAppointments.length === 1 ? "cita" : "citas"}
            </Box>
            <Box
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: MODAL_BRAND.surface,
                border: `1px solid ${MODAL_BRAND.line}`,
                fontSize: isSmallScreen ? 10.5 : 11.5,
                fontWeight: 600,
                color: MODAL_BRAND.body,
                whiteSpace: "nowrap",
              }}
            >
              {totalUniqueClients} {totalUniqueClients === 1 ? "cliente" : "clientes"}
            </Box>
          </Group>
        </Group>
      </Box>
      <div
        style={{
          width: "100%",
          height: "83vh",
          overflowX: "auto",
          overflowY: "auto",
          position: "relative",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Loader traslúcido encima del contenido solo cuando fetch de día */}
        {fetchingLocalDay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1000,
              background: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomLoader loadingText="Obteniendo citas del día..." overlay />
          </div>
        )}

        {/* Vista compacta */}
        {viewMode === "compact" ? (
          <DayModalCompactView
            appointments={appointments}
            onEditAppointment={onEditAppointment}
            timezone={timezone}
            timeFormat={timeFormat}
          />
        ) : (
          /* Vista de calendario — minWidth garantiza que el outer div tenga scroll
             horizontal real y que el sticky de la columna de horas funcione siempre */
          <div style={{ minWidth: "max-content" }}>
            <Box
              style={{
                display: "flex",
                position: "sticky",
                top: 0,
                zIndex: 100,
                backgroundColor: MODAL_BRAND.cream,
              }}
            >
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
                  backgroundColor: MODAL_BRAND.surface,
                  flexShrink: 0,
                }}
              >
                <TimeColumn timeIntervals={timeIntervals} timeFormat={timeFormat} />
              </Box>
              <Box style={{ position: "relative" }}>
                {currentLinePosition !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: `${currentLinePosition}px`,
                      width: "100%",
                      height: 2,
                      backgroundColor: MODAL_BRAND.deep,
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
                        backgroundColor: MODAL_BRAND.deep,
                      }}
                    />
                  </div>
                )}

                <TimeGrid
                  timeIntervals={timeIntervals}
                  hasPermission={hasPermission}
                  onOpenModal={onOpenModal}
                  selectedDay={currentDay}
                />
                <Box
                  style={{
                    display: "flex",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
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
                      selectedDay={currentDay}
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
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </div>
        )}
      </div>
      <Box
        style={{
          borderTop: `1px solid ${MODAL_BRAND.lineSoft}`,
          backgroundColor: MODAL_BRAND.cream,
          padding: "6px 12px",
        }}
      >
        <Group
          justify="space-between"
          align="center"
          gap="xs"
          style={{ flexWrap: "wrap" }}
        >
          {/* Navegación de días */}
          <Group gap={6}>
            {[
              { label: "← Día anterior", fn: goToPreviousDay },
              { label: "Día siguiente →", fn: goToNextDay },
            ].map(({ label, fn }) => (
              <Box
                key={label}
                onClick={fn}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: MODAL_BRAND.surface,
                  border: `1px solid ${MODAL_BRAND.line}`,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: MODAL_BRAND.body,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background 0.12s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F0EBE0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = MODAL_BRAND.surface)}
              >
                {label}
              </Box>
            ))}
          </Group>

          {/* Token de canceladas */}
          {cancelledAppointments.length > 0 && (
            <Box
              onClick={() => setShowCancelled(!showCancelled)}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "#FDECEC",
                fontSize: 11,
                fontWeight: 600,
                color: "#B23A3A",
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              {cancelledAppointments.length} cancelada{cancelledAppointments.length !== 1 ? "s" : ""}
            </Box>
          )}
        </Group>

        {/* Sección de citas canceladas */}
        <Collapse in={showCancelled && cancelledAppointments.length > 0}>
          <Divider my="xs" color={MODAL_BRAND.line} />
          <Text style={{ fontSize: 11.5, fontWeight: 600, color: MODAL_BRAND.body, marginBottom: 6 }}>
            Citas canceladas del día:
          </Text>
          <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
            {cancelledAppointments.map((apt) => (
              <Box
                key={apt._id}
                style={{
                  padding: "8px 10px",
                  marginBottom: 6,
                  borderRadius: 8,
                  background: MODAL_BRAND.surface,
                  border: `1px solid ${MODAL_BRAND.line}`,
                  transition: 'opacity 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.82";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <Flex justify="space-between" align="center">
                  <Box
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => onEditAppointment(apt)}
                  >
                    <Text size="sm" fw={600} style={{ textDecoration: 'line-through' }}>
                      {formatInTimezone(apt.startDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")} - {formatInTimezone(apt.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
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
                      {apt.status === 'cancelled_by_customer' ? 'Cliente' : 'Admin'}
                    </Badge>
                    {onDeleteAppointment && (
                      <Tooltip label="Eliminar cita" withArrow>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAppointment(apt._id);
                          }}
                        >
                          <BiTrash size={14} />
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
    </Modal>
  );
};

export default React.memo(DayModal);
