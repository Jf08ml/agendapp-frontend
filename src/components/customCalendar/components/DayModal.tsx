import { FC } from "react";
import { Modal, Box, ScrollArea } from "@mantine/core";
import { format, getHours } from "date-fns";
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

/* Constantes de diseño */
export const HOUR_HEIGHT = 60;
export const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
export const CARD_WIDTH = 180;

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

  if (!selectedDay) return null;

  /* Obtener las citas y organizarlas por empleado */
  const appointments = getAppointmentsForDay(selectedDay);
  const appointmentsByEmployee = organizeAppointmentsByEmployee(appointments);

  /* Calcular rango horario según las citas y horario de la organización */
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

  /* Generar intervalos de tiempo (e.g., cada hora) */
  const timeIntervals = generateTimeIntervals(startHour, endHour, selectedDay);

  /* Render principal */
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      fullScreen
      title={`Agenda para el ${format(selectedDay, "EEEE, d MMMM", {
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
        {/* Cabecera fija con los nombres de empleados */}
        <Header employees={employees} />

        {/* Contenedor de la línea de tiempo y citas */}
        <Box style={{ display: "flex", position: "relative" }}>
          {/* Columna de Intervalos de Tiempo ocupando todo el alto */}
          <TimeColumn timeIntervals={timeIntervals} />

          {/* Contenedor que ocupa el resto del espacio horizontal */}
          <Box style={{ flex: 1, position: "relative" }}>
            {/* Las líneas de fondo (TimeGrid) siempre atrás (zIndex: 0) */}
            <TimeGrid
              timeIntervals={timeIntervals}
              hasPermission={hasPermission}
              onOpenModal={onOpenModal}
              selectedDay={selectedDay}
            />

            {/* Columnas de Empleados con citas */}
            <Box style={{ display: "flex", position: "relative", zIndex: 1 }}>
              {employees.map((employee) => (
                <EmployeeColumn
                  key={employee._id}
                  employee={employee}
                  appointmentsByEmployee={appointmentsByEmployee}
                  timeIntervals={timeIntervals}
                  startHour={startHour}
                  endHour={endHour}
                  selectedDay={selectedDay}
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
