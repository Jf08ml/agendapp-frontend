import React, { useRef, useEffect } from "react";
import { Grid, Paper, Box, Text, ScrollArea, Card } from "@mantine/core";
import { format, getHours } from "date-fns";
import { es } from "date-fns/locale";
import { Appointment } from "../../../../services/appointmentService";
import AppointmentCard from "../AppointmentCard";
import {
  generateTimeIntervals,
  organizeAppointmentsByEmployee,
  calculateAppointmentPosition,
} from "../../utils/scheduleUtils";
import { useExpandAppointment } from "../../hooks/useExpandAppointment";
import { usePermissions } from "../../../../hooks/usePermissions";

interface DayViewProps {
  currentDate: Date;
  isMobile: boolean;
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  isMobile,
  onOpenModal,
  getAppointmentsForDay,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();

  const appointments = getAppointmentsForDay(currentDate);

  // Extraer empleados únicos de las citas
  const employees = Array.from(
    new Set(appointments.map((appointment) => appointment.employee._id))
  ).map((id) => {
    const employee = appointments.find(
      (appointment) => appointment.employee._id === id
    )?.employee;
    return { id, name: employee?.names || "Desconocido" };
  });

  const appointmentsByEmployee = organizeAppointmentsByEmployee(appointments);

  const earliestAppointment = Math.min(
    ...appointments.map((app) => getHours(new Date(app.startDate)))
  );
  const latestAppointment = Math.max(
    ...appointments.map((app) => getHours(new Date(app.endDate)))
  );

  const startHour = Math.min(earliestAppointment, 5);
  const endHour = Math.max(22, latestAppointment);
  const timeIntervals = generateTimeIntervals(startHour, endHour, currentDate);

  const HOUR_HEIGHT = 100;
  const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
  const CARD_WIDTH = 180;

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  return (
    <Grid gutter="xs">
      <Grid.Col span={12}>
        <Paper shadow="sm" radius="md" p="xs" withBorder ref={scrollAreaRef}>
          <Card mb="xs" withBorder>
            <Text size={isMobile ? "xs" : "md"} ta="center" fw={800} c="blue">
              {format(currentDate, "EEEE, d MMMM yyyy", { locale: es })}
            </Text>
          </Card>

          <ScrollArea
            style={{ height: "70vh", overflowX: "auto", overflowY: "auto" }}
            scrollbarSize={10}
            offsetScrollbars
          >
            {/* Cabecera fija con los nombres de empleados */}
            <Box
              bg="gray"
              style={{
                display: "flex",
                position: "sticky",
                top: 0,
                zIndex: 2,
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <Box style={{ width: "80px" }} />
              {/* Espacio para la línea de tiempo */}
              {employees.map((employee) => (
                <Paper
                  bg="gray"
                  p="sm"
                  withBorder
                  key={employee.id}
                  style={{
                    width: `${CARD_WIDTH}px`,
                    textAlign: "center",
                    marginLeft: "10px",
                    border: "1px solid gray",
                    borderRadius: "5px",
                  }}
                >
                  <Text size="sm">{employee.name}</Text>
                </Paper>
              ))}
            </Box>

            {/* Contenedor de la línea de tiempo y citas */}
            <Box style={{ display: "flex", position: "relative" }}>
              {/* Columna de Intervalos de Tiempo ocupando todo el alto */}
              <Box style={{ width: "80px" }}>
                {timeIntervals.map((interval, index) => (
                  <Box
                    key={index}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      borderTop: "1px solid #ccc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRight: "1px solid #e0e0e0",
                    }}
                    onClick={() =>
                      hasPermission("appointments:create") &&
                      onOpenModal(currentDate, interval)
                    }
                  >
                    <Text size="sm">{format(interval, "h a")}</Text>
                  </Box>
                ))}
              </Box>

              {/* Fondo de líneas de separación */}
              <Box style={{ flex: 1, position: "relative" }}>
                {timeIntervals.map((_, index) => (
                  <Box
                    key={index}
                    style={{
                      position: "absolute",
                      top: `${index * HOUR_HEIGHT}px`,
                      left: 0,
                      right: 0,
                      borderTop: "1px solid #e0e0e0",
                    }}
                  />
                ))}

                {/* Columnas de Empleados con citas */}
                <Box style={{ display: "flex", position: "relative" }}>
                  {employees.map((employee) => (
                    <Box
                      key={employee.id}
                      style={{
                        width: `${CARD_WIDTH}px`,
                        marginLeft: "10px",
                        borderRight: "1px solid #e0e0e0",
                      }}
                    >
                      <Box
                        style={{
                          position: "relative",
                          minHeight: `${
                            (endHour - startHour + 1) * HOUR_HEIGHT
                          }px`,
                        }}
                      >
                        {appointmentsByEmployee[employee.id]?.map(
                          (appointment, index) => {
                            const { top, height } =
                              calculateAppointmentPosition(
                                appointment,
                                startHour,
                                currentDate,
                                MINUTE_HEIGHT
                              );

                            return (
                              <Box
                                key={index}
                                style={{
                                  position: "absolute",
                                  top: `${top}px`,
                                  width: "100%",
                                  height: isExpanded(appointment)
                                    ? "auto"
                                    : `${height}px`,
                                  zIndex: isExpanded(appointment) ? 1 : 0,
                                  border: "1px solid #00acc1",
                                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  handleToggleExpand(appointment._id)
                                }
                              >
                                <AppointmentCard
                                  appoinments={appointments}
                                  appointment={appointment}
                                  onEditAppointment={onEditAppointment}
                                  onCancelAppointment={onCancelAppointment}
                                  onConfirmAppointment={onConfirmAppointment}
                                />
                              </Box>
                            );
                          }
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </ScrollArea>
        </Paper>
      </Grid.Col>
    </Grid>
  );
};

export default DayView;
