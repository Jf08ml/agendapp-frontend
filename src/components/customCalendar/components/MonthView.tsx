import React from "react";
import { Grid, Box, Paper, Text } from "@mantine/core";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  format as formatDate,
} from "date-fns";
import {
  startOfWeek as startOfCalendarWeek,
  endOfWeek as endOfCalendarWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Appointment } from "../../../services/appointmentService";
import CustomLoader from "../../customLoader/CustomLoader";

interface MonthViewProps {
  currentDate: Date;
  isMobile: boolean;
  handleDayClick: (day: Date) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  loadingMonth: boolean;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  isMobile,
  handleDayClick,
  getAppointmentsForDay,
  loadingMonth,
}) => {
  const daysOfWeek = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({
    start: startOfCalendarWeek(startMonth),
    end: endOfCalendarWeek(endMonth),
  });

  return (
    <Box style={{ position: "relative" }}>
      <Paper withBorder>
        <Text
          ta="center"
          style={{
            fontSize: isMobile ? 16 : 24,
            marginBottom: "2px",
            textTransform: "uppercase",
          }}
        >
          {formatDate(currentDate, "MMMM", { locale: es })}
        </Text>
      </Paper>
      <Paper withBorder my="xs">
        <Grid>
          {daysOfWeek.map((day, index) => (
            <Grid.Col span={1.7} key={index}>
              <Text
                ta="center"
                fw={500}
                style={{ fontSize: isMobile ? 11 : 16 }}
              >
                {day}
              </Text>
            </Grid.Col>
          ))}
        </Grid>
      </Paper>
      {/* Calendario SIEMPRE visible */}
      <Grid gutter="xs">
        {daysInMonth.map((day) => (
          <Grid.Col span={1.7} key={day.toISOString()}>
            <Paper
              shadow="sm"
              radius="md"
              p="xs"
              withBorder
              onClick={() => handleDayClick(day)}
              style={{
                cursor: "pointer",
                position: "relative",
                height: "100%",
                backgroundColor: isSameDay(day, currentDate)
                  ? "#f0f8ff"
                  : "white",
                borderColor: isSameDay(day, currentDate)
                  ? "#007bff"
                  : undefined,
                borderWidth: isSameDay(day, currentDate) ? 2 : 1,
                transition: "background 0.2s, border-color 0.2s",
                opacity: loadingMonth ? 0.7 : 1, // Suaviza el fondo en loading
                filter: loadingMonth ? "blur(0.5px)" : "none",
              }}
            >
              <Text
                size={isMobile ? "xs" : "sm"}
                c="dimmed"
                mb="xs"
                ta="center"
                fw={800}
              >
                {format(day, "d", { locale: es })}
              </Text>
              {getAppointmentsForDay(day).length > 0 && (
                <Text
                  ta="center"
                  c="dimmed"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    fontSize: isMobile ? 10 : 12,
                  }}
                >
                  {getAppointmentsForDay(day).length} citas
                </Text>
              )}
            </Paper>
          </Grid.Col>
        ))}
      </Grid>

      {/* Overlay sólo cuando loadingMonth */}
      {loadingMonth && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 10,
            background: "rgba(255,255,255,0.70)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            borderRadius: 12,
          }}
        >
          <CustomLoader loadingText="Obteniendo citas..." overlay />
        </Box>
      )}
    </Box>
  );
};

export default MonthView;
