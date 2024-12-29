import { FC, useState, useEffect } from "react";
import {
  Modal,
  Box,
  ScrollArea,
  Button,
  Text,
} from "@mantine/core";
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

/* Constantes de diseño */
export const HOUR_HEIGHT = 60;
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
export const CARD_WIDTH = 180;

interface DayModalProps {
  opened: boolean;
  selectedDay: Date | null;
  onClose: () => void;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  employees: Employee[];
}

const DayModal: FC<DayModalProps> = ({
  opened,
  selectedDay,
  onClose,
  onOpenModal,
  getAppointmentsForDay,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  employees,
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Hook de Mantine para saber si el viewport es menor a 768px
  const isSmallScreen = useMediaQuery("(max-width: 768px)");

  // Estado local para controlar el día
  const [currentDay, setCurrentDay] = useState<Date | null>(selectedDay);

  // Sincronizar el estado local cuando la prop selectedDay cambie
  useEffect(() => {
    setCurrentDay(selectedDay);
  }, [selectedDay]);

  if (!currentDay) return null;

  // Funciones de navegación de día
  const goToNextDay = () => {
    setCurrentDay((prev) => (prev ? addDays(prev, 1) : null));
  };

  const goToPreviousDay = () => {
    setCurrentDay((prev) => (prev ? addDays(prev, -1) : null));
  };

  // Obtener citas del día actual
  const appointments = getAppointmentsForDay(currentDay);
  const appointmentsByEmployee = organizeAppointmentsByEmployee(appointments);

  // Calcular el rango horario
  const earliestAppointment = Math.min(
    ...appointments.map((app) => getHours(new Date(app.startDate)))
  );
  const latestAppointment = Math.max(
    ...appointments.map((app) => getHours(new Date(app.endDate)))
  );

  const orgStartHour = organization?.openingHours?.start
    ? parseInt(organization.openingHours.start.split(":")[0], 10)
    : 8;
  const orgEndHour = organization?.openingHours?.end
    ? parseInt(organization.openingHours.end.split(":")[0], 10)
    : 22;

  const startHour = Math.min(earliestAppointment, orgStartHour);
  const endHour = Math.max(orgEndHour, latestAppointment);

  // Generar intervalos de tiempo
  const timeIntervals = generateTimeIntervals(startHour, endHour, currentDay);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title={`Agenda para el ${format(currentDay, "EEEE, d MMMM", {
        locale: es,
      })}`}
      size="xl"
      styles={{ body: { padding: 0 } }}
    >
      <ScrollArea
        style={{
          width: "100%",
          height: "80vh",
          overflowX: "auto",
          overflowY: "auto",
        }}
        scrollbarSize={10}
        offsetScrollbars
      >
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
          {/* Botones para cambiar día */}
          <Box style={{ display: "flex", gap: 8 }}>
            <Button size="xs" variant="outline" onClick={goToPreviousDay}>
              Día anterior
            </Button>
            <Button size="xs" variant="outline" onClick={goToNextDay}>
              Día siguiente
            </Button>
          </Box>

          {/* Texto con el total de citas */}
          <Text size="sm" mt={isSmallScreen ? 8 : 0}>
            Total de citas para {format(currentDay, "d MMM", { locale: es })}:{" "}
            <strong>{appointments.length}</strong>
          </Text>
        </Box>

        <Header employees={employees} />

        <Box style={{ display: "flex", position: "relative" }}>
          <TimeColumn timeIntervals={timeIntervals} />

          <Box style={{ flex: 1, position: "relative" }}>
            <TimeGrid
              timeIntervals={timeIntervals}
              hasPermission={hasPermission}
              onOpenModal={onOpenModal}
              selectedDay={currentDay}
            />

            <Box style={{ display: "flex", position: "relative", zIndex: 1 }}>
              {employees.map((employee) => (
                <EmployeeColumn
                  key={employee._id}
                  employee={employee}
                  appointmentsByEmployee={appointmentsByEmployee}
                  timeIntervals={timeIntervals}
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
      </ScrollArea>
    </Modal>
  );
};

export default DayModal;
