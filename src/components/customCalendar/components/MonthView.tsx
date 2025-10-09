import React, { useMemo, useCallback } from "react";
import { Grid, Box, Paper, Text, Group } from "@mantine/core";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import {
  startOfWeek as startOfCalendarWeek,
  endOfWeek as endOfCalendarWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Appointment } from "../../../services/appointmentService";
import CustomLoader from "../../customLoader/CustomLoader";
import { useHolidays, type HolidayConfig } from "../../../hooks/useHolidays";

interface MonthViewProps {
  currentDate: Date;
  isMobile: boolean;
  handleDayClick: (day: Date) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  loadingMonth: boolean;
  holidayConfig?: HolidayConfig;
}

const COLOR = {
  today: "#6366f1", // indigo-500
  holiday: "#ef4444", // red-500
  weekend: "rgba(0,0,0,0.03)",
};

const LegendDot: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <Group gap={8} align="center">
    <Box
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color,
      }}
    />
    <Text size="xs" c="dimmed">
      {label}
    </Text>
  </Group>
);

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  isMobile,
  handleDayClick,
  getAppointmentsForDay,
  loadingMonth,
  holidayConfig = { country: "CO", language: "es" },
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

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfCalendarWeek(startMonth),
        end: endOfCalendarWeek(endMonth),
      }),
    [startMonth, endMonth]
  );

  const { isHoliday } = useHolidays(currentDate, holidayConfig);

  // Conteo memoizado por día
  const apptCountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of daysInMonth) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, getAppointmentsForDay(d)?.length ?? 0);
    }
    return map;
  }, [daysInMonth, getAppointmentsForDay]);

  const onKeyDown = useCallback(
    (day: Date, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDayClick(day);
      }
    },
    [handleDayClick]
  );

  return (
    <Box style={{ position: "relative" }}>
      {/* Título del mes */}
      <Paper withBorder>
        <Text
          ta="center"
          style={{
            fontSize: isMobile ? 16 : 24,
            marginBottom: 2,
            textTransform: "uppercase",
          }}
        >
          {format(currentDate, "MMMM", { locale: es })}
        </Text>
      </Paper>

      {/* Leyenda compacta */}
      <Group justify="center" gap="xl" my={8}>
        <LegendDot color={COLOR.today} label="Hoy" />
        <LegendDot color={COLOR.holiday} label="Festivo" />
        <LegendDot color="#9ca3af" label="Fin de semana" />
      </Group>

      {/* Encabezado días de la semana (misma proporción) */}
      <Paper withBorder my="xs">
        <Grid>
          {daysOfWeek.map((day, index) => (
            <Grid.Col span={1.7} key={index}>
              <Text
                ta="center"
                fw={600}
                style={{ fontSize: isMobile ? 9 : 16 }}
              >
                {day}
              </Text>
            </Grid.Col>
          ))}
        </Grid>
      </Paper>

      {/* Celdas del calendario (misma proporción) */}
      <Grid gutter="xs">
        {daysInMonth.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const count = apptCountByKey.get(key) ?? 0;

          const selected = isSameDay(day, currentDate);
          const holiday = isHoliday(day);
          const weekend = [0, 6].includes(day.getDay());
          const outsideMonth = !isSameMonth(day, currentDate);
          const today = isToday(day);

          const bgColor = selected
            ? "#f0f8ff"
            : holiday
            ? "rgba(255, 99, 71, 0.08)" // festivo sutil
            : weekend
            ? COLOR.weekend
            : "white";

          const borderColor = selected
            ? "#007bff"
            : holiday
            ? "rgba(255, 99, 71, 0.6)"
            : undefined;

          return (
            <Grid.Col span={1.7} key={key}>
              <Paper
                shadow="sm"
                radius="md"
                p="xs"
                withBorder
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => handleDayClick(day)}
                onKeyDown={(e) => onKeyDown(day, e)}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  height: "100%",
                  backgroundColor: bgColor,
                  borderColor,
                  borderWidth: selected || holiday ? 2 : 1,
                  transition: "background 0.2s, border-color 0.2s",
                  opacity: loadingMonth ? 0.7 : outsideMonth ? 0.6 : 1,
                  filter: loadingMonth ? "blur(0.5px)" : "none",
                  outline: today ? `2px solid ${COLOR.today}` : "none",
                  outlineOffset: today ? -2 : 0,
                }}
              >
                {/* Encabezado celda: número del día */}
                <Box
                  style={{
                    display: "flex",
                    justifyContent: isMobile ? "flex-start" : "center",
                    alignItems: isMobile ? "flex-start" : "center",
                    position: "relative",
                    minHeight: isMobile ? 20 : undefined,
                  }}
                >
                  <Text
                    size={isMobile ? "xs" : "sm"}
                    c={holiday ? "red" : "dimmed"}
                    mb={isMobile ? 0 : "xs"}
                    fw={800}
                  >
                    {format(day, "d", { locale: es })}
                  </Text>
                </Box>

                {/* Contador de citas (abajo centrado) */}
                {count > 0 && (
                  <Text
                    ta="center"
                    c="dimmed"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: "100%",
                      fontSize: isMobile ? 8 : 12,
                    }}
                  >
                    {count} {count === 1 ? "cita" : "citas"}
                  </Text>
                )}
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>

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
