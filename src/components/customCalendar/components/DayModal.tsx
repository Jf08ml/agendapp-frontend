import React, { FC, useState, useEffect, useMemo } from "react";
import { Modal, Box, Button, Paper, Group, Badge, Flex, SegmentedControl, Collapse, Text, Divider } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { format, addDays } from "date-fns";
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
} from "../utils/scheduleUtils";
import { useExpandAppointment } from "../hooks/useExpandAppointment";
import { usePermissions } from "../../../hooks/usePermissions";
import { BiCalendar, BiListUl } from "react-icons/bi";
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
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
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
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  employees,
  setAppointments,
  timezone = 'America/Bogota', // 🌍 Default timezone
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

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

  // Si el día NO está en el mes, haz fetch sólo para ese día, y ponlo local
  useEffect(() => {
    let mounted = true;
    // Si el día no está en el array global (mes), o el array está vacío
    if (appointmentsFromMonth.length === 0) {
      setFetchingLocalDay(true);
      fetchAppointmentsForDay(currentDay)
        .then((res) => {
          if (mounted) setLocalDayAppointments(res);
        })
        .finally(() => {
          if (mounted) setFetchingLocalDay(false);
        });
    } else {
      setLocalDayAppointments(null); // usar global
    }
    return () => {
      mounted = false;
    };
  }, [currentDay, appointmentsFromMonth, fetchAppointmentsForDay]);

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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title={
        <Group gap="md" align="center">
          <span>{`Agenda para el ${format(currentDay, "EEEE, d MMMM", { locale: es })}`}</span>
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
        </Group>
      }
      size="xl"
      styles={{ body: { padding: 0 } }}
    >
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
          />
        ) : (
          /* Vista de calendario */
          <>
            <Box
              style={{
                display: "flex",
                position: "sticky",
                top: 0,
                zIndex: 100,
                backgroundColor: "white",
              }}
            >
              <Header
                employees={employeesSorted}
                hiddenEmployeeIds={hiddenEmployeeIds}
                onToggleEmployeeHidden={handleToggleEmployeeHidden}
              />
            </Box>
            <Box style={{ display: "flex", position: "relative" }}>
              <Box
                style={{
                  display: "flex",
                  position: "sticky",
                  left: 0,
                  zIndex: 100,
                  backgroundColor: "white",
                }}
              >
                <TimeColumn timeIntervals={timeIntervals} />
              </Box>
              <Box style={{ flex: 1, position: "relative" }}>
                {currentLinePosition !== null && (
                  <div
                    style={{
                      position: "absolute",
                      top: `${currentLinePosition}px`,
                      width: "100%",
                      height: "2px",
                      backgroundColor: "red",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid red",
                        borderRight: "8px solid transparent",
                        borderBottom: "8px solid transparent",
                        borderTop: "8px solid transparent",
                        position: "absolute",
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
                      startHour={startHour}
                      endHour={endHour}
                      selectedDay={currentDay}
                      isExpanded={isExpanded}
                      handleToggleExpand={handleToggleExpand}
                      onEditAppointment={onEditAppointment}
                      onCancelAppointment={onCancelAppointment}
                      onConfirmAppointment={onConfirmAppointment}
                      hasPermission={hasPermission}
                      onOpenModal={onOpenModal}
                      timezone={timezone}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </>
        )}
      </div>
      <Paper
        p="xs"
        radius={0}
        withBorder
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          backgroundColor: "white",
        }}
      >
        <Group
          justify="space-between"
          align="center"
          gap="xs"
          style={{
            flexDirection: "row",
            gap: isSmallScreen ? 8 : 2,
          }}
        >
          {/* Navegación de días */}
          <Group gap={8}>
            <Button size="xs" variant="subtle" onClick={goToPreviousDay}>
              Día anterior
            </Button>
            <Button size="xs" variant="filled" onClick={goToNextDay}>
              Día siguiente
            </Button>
          </Group>

          {/* Resumen de stats */}
          <Group gap={8}>
            <Flex direction={isSmallScreen ? "column" : "row"} gap={8}>
              <Badge size="sm" radius="xl" variant="light">
                Citas: {activeAppointments.length}
              </Badge>
              <Badge size="sm" radius="xl" variant="outline">
                Clientes: {totalUniqueClients}
              </Badge>
              {cancelledAppointments.length > 0 && (
                <Badge 
                  size="sm" 
                  radius="xl" 
                  variant="filled" 
                  color="red"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowCancelled(!showCancelled)}
                >
                  ❌ Canceladas: {cancelledAppointments.length}
                </Badge>
              )}
            </Flex>
          </Group>
        </Group>
        
        {/* Sección de citas canceladas */}
        <Collapse in={showCancelled && cancelledAppointments.length > 0}>
          <Divider my="xs" />
          <Text size="sm" fw={600} mb="xs">Citas canceladas del día:</Text>
          <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
            {cancelledAppointments.map((apt) => (
              <Paper
                key={apt._id}
                p="xs"
                mb="xs"
                withBorder
                style={{
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => onEditAppointment(apt)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text size="sm" fw={600} style={{ textDecoration: 'line-through' }}>
                      {formatInTimezone(apt.startDate, timezone, 'HH:mm')} - {formatInTimezone(apt.endDate, timezone, 'HH:mm')}
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
                  <Badge size="xs" color="red" variant="light">
                    {apt.status === 'cancelled_by_customer' ? 'Cliente' : 'Admin'}
                  </Badge>
                </Flex>
              </Paper>
            ))}
          </Box>
        </Collapse>
      </Paper>
    </Modal>
  );
};

export default React.memo(DayModal);
