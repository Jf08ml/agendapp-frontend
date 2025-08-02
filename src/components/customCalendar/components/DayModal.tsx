import { FC, useState, useEffect, useMemo } from "react";
import { Modal, Box, Button, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { format, getHours, addDays } from "date-fns";
import { es } from "date-fns/locale";
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

/* Subcomponentes */
import Header from "./subcomponents/DayModalHeader";
import TimeColumn from "./subcomponents/DayModalTimeColumn";
import TimeGrid from "./subcomponents/DayModalTimeGrid";
import EmployeeColumn from "./subcomponents/DayModalEmployeeColumn";
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
}

const DayModal: FC<DayModalProps> = ({
  opened,
  selectedDay,
  onClose,
  onOpenModal,
  getAppointmentsForDay,
  fetchAppointmentsForDay, // Usa el prop nuevo
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  employees,
  setAppointments
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [currentDay, setCurrentDay] = useState<Date>(selectedDay || new Date());
  const [localDayAppointments, setLocalDayAppointments] = useState<Appointment[] | null>(null);
  const [fetchingLocalDay, setFetchingLocalDay] = useState(false);
  const [currentLinePosition, setCurrentLinePosition] = useState<number | null>(null);
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);

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
    return () => { mounted = false };
  }, [currentDay, appointmentsFromMonth, fetchAppointmentsForDay]);

  // Lo que va a mostrar
  const appointments = localDayAppointments ?? appointmentsFromMonth;

  // Resto de cálculos igual
  const appointmentsByEmployee = useMemo(
    () => organizeAppointmentsByEmployee(appointments),
    [appointments]
  );

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

  const visibleEmployees = useMemo(() => {
    return employeesSorted.filter((emp) => !hiddenEmployeeIds.includes(emp._id));
  }, [employeesSorted, hiddenEmployeeIds]);

  const totalUniqueClients = useMemo(() => {
    const clientIds = appointments.map((app) => app.client?._id).filter(Boolean);
    return new Set(clientIds).size;
  }, [appointments]);

  const { startHour, endHour } = useMemo(() => {
    const orgStartHour = organization?.openingHours?.start
      ? parseInt(organization.openingHours.start.split(":")[0], 10)
      : 8;
    const orgEndHour = organization?.openingHours?.end
      ? parseInt(organization.openingHours.end.split(":")[0], 10)
      : 22;

    const earliestAppointment = appointments.length
      ? Math.min(...appointments.map((app) => getHours(new Date(app.startDate))))
      : orgStartHour;

    const latestAppointment = appointments.length
      ? Math.max(...appointments.map((app) => getHours(new Date(app.endDate))))
      : orgEndHour;

    return {
      startHour: Math.min(earliestAppointment, orgStartHour),
      endHour: Math.max(orgEndHour, latestAppointment),
    };
  }, [appointments, organization]);

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
        const totalMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();
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
      title={`Agenda para el ${format(currentDay, "EEEE, d MMMM", { locale: es })}`}
      size="xl"
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          width: "100%",
          height: "80vh",
          overflowX: "auto",
          overflowY: "auto",
          position: "relative"
        }}
        onClick={(event) => event.stopPropagation()}
        // ...scroll on drag igual...
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
              justifyContent: "center"
            }}
          >
            <CustomLoader loadingText="Obteniendo citas del día..." overlay />
          </div>
        )}
        <Box
          p="xs"
          style={{
            display: "flex",
            alignItems: isSmallScreen ? "flex-start" : "center",
            flexDirection: isSmallScreen ? "column" : "row",
            justifyContent: "space-between",
            gap: isSmallScreen ? 8 : 0,
          }}
        >
          <Box style={{ display: "flex", gap: 8 }}>
            <Button size="xs" variant="outline" onClick={goToPreviousDay}>
              Día anterior
            </Button>
            <Button size="xs" variant="outline" onClick={goToNextDay}>
              Día siguiente
            </Button>
          </Box>

          <Text size="sm" mt={isSmallScreen ? 8 : 0}>
            Total de citas: <strong>{appointments.length}</strong>
            {"  "}•{"  "}
            Total de clientes: <strong>{totalUniqueClients}</strong>
          </Text>
        </Box>
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
                />
              ))}
            </Box>
          </Box>
        </Box>
      </div>
    </Modal>
  );
};

export default DayModal;
