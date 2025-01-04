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

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [currentDay, setCurrentDay] = useState<Date>(
    selectedDay || new Date() // Usa la fecha actual si no hay `selectedDay`
  );
  const [currentLinePosition, setCurrentLinePosition] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (selectedDay) {
      setCurrentDay(selectedDay);
    }
  }, [selectedDay]);

  const appointments = useMemo(
    () => getAppointmentsForDay(currentDay),
    [currentDay, getAppointmentsForDay]
  );

  const appointmentsByEmployee = useMemo(
    () => organizeAppointmentsByEmployee(appointments),
    [appointments]
  );

  // Cálculo de las horas de inicio y fin
  const { startHour, endHour } = useMemo(() => {
    const orgStartHour = organization?.openingHours?.start
      ? parseInt(organization.openingHours.start.split(":")[0], 10)
      : 8;
    const orgEndHour = organization?.openingHours?.end
      ? parseInt(organization.openingHours.end.split(":")[0], 10)
      : 22;

    const earliestAppointment = appointments.length
      ? Math.min(
          ...appointments.map((app) => getHours(new Date(app.startDate)))
        )
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

  // Actualización de la posición de la línea actual
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
    const intervalId = setInterval(updateCurrentLinePosition, 60000); // Actualizar cada minuto

    return () => clearInterval(intervalId);
  }, [currentDay, startHour, endHour]);

  const goToNextDay = () => setCurrentDay((prev) => addDays(prev, 1));
  const goToPreviousDay = () => setCurrentDay((prev) => addDays(prev, -1));

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
      <div
        style={{

          width: "100%",
          height: "80vh",
          overflowX: "auto",
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          event.preventDefault();
          const scrollArea = event.currentTarget as HTMLDivElement;

          const { clientX, clientY } = event;
          const rect = scrollArea.getBoundingClientRect();

          // Detectar bordes cercanos para el desplazamiento
          const threshold = 100; // Distancia desde el borde para activar el desplazamiento
          const scrollSpeed = 50; // Velocidad de desplazamiento

          // Desplazamiento horizontal
          if (clientX < rect.left + threshold) {
            scrollArea.scrollBy({ left: -scrollSpeed, behavior: "smooth" });
          } else if (clientX > rect.right - threshold) {
            scrollArea.scrollBy({ left: scrollSpeed, behavior: "smooth" });
          }

          // Desplazamiento vertical
          if (clientY < rect.top + threshold) {
            scrollArea.scrollBy({ top: -scrollSpeed, behavior: "smooth" });
          } else if (clientY > rect.bottom - threshold) {
            scrollArea.scrollBy({ top: scrollSpeed, behavior: "smooth" });
          }
        }}
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
          <Box style={{ display: "flex", gap: 8 }}>
            <Button size="xs" variant="outline" onClick={goToPreviousDay}>
              Día anterior
            </Button>
            <Button size="xs" variant="outline" onClick={goToNextDay}>
              Día siguiente
            </Button>
          </Box>

          <Text size="sm" mt={isSmallScreen ? 8 : 0}>
            Total de citas para {format(currentDay, "d MMM", { locale: es })}:{" "}
            <strong>{appointments.length}</strong>
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
          <Header employees={employees} />
        </Box>

        <Box
          style={{
            display: "flex",
            position: "relative"
          }}
        >
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
                {/* Flecha (Triángulo) */}
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
      </div>
    </Modal>
  );
};

export default DayModal;
