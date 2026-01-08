import React, { useMemo } from "react";
import { Grid, Box, Paper, Text, Group, Button, Badge } from "@mantine/core";
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
import { BsChevronCompactLeft, BsChevronCompactRight } from "react-icons/bs";

interface MonthViewProps {
  currentDate: Date;
  isMobile: boolean;
  handleDayClick: (day: Date) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  loadingMonth: boolean;
  holidayConfig?: HolidayConfig;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const COLOR = {
  today: "#6366f1",
  holiday: "#ef4444",
  weekendBg: "rgba(0,0,0,0.03)",
  selectedBg: "#eef2ff",
  selectedBorder: "#4f46e5",
};

const daysOfWeekFull = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const daysOfWeekShort = ["D", "L", "M", "X", "J", "V", "S"];

const LegendDot: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <Group gap={6} align="center">
    <Box
      style={{
        width: 8,
        height: 8,
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
  onPrevMonth,
  onNextMonth,
}) => {
  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfCalendarWeek(startMonth, { weekStartsOn: 0 }),
        end: endOfCalendarWeek(endMonth, { weekStartsOn: 0 }),
      }),
    [startMonth, endMonth]
  );

  const { isHoliday } = useHolidays(currentDate, holidayConfig);

  const apptCountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of daysInMonth) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, getAppointmentsForDay(d)?.length ?? 0);
    }
    return map;
  }, [daysInMonth, getAppointmentsForDay]);

  // 👥 Calcular el máximo de citas simultáneas por día (solo activas)
  const maxOverlapByKey = useMemo(() => {
    const map = new Map<string, number>();
    const calcMaxOverlap = (appointments: Appointment[]) => {
      if (!appointments || appointments.length === 0) return 0;
      const events = appointments
        .filter((a) => !a.status.includes('cancelled'))
        .map((a) => ({ start: new Date(a.startDate).getTime(), end: new Date(a.endDate).getTime() }))
        .sort((a, b) => a.start - b.start);
      let max = 0;
      let current = 0;
      const points: Array<{ t: number; type: 1 | -1 }> = [];
      events.forEach(e => {
        points.push({ t: e.start, type: 1 });
        points.push({ t: e.end, type: -1 });
      });
      points.sort((a, b) => a.t === b.t ? a.type - b.type : a.t - b.t);
      points.forEach(p => {
        current += p.type;
        if (current > max) max = current;
      });
      return max;
    };

    for (const d of daysInMonth) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, calcMaxOverlap(getAppointmentsForDay(d) || []));
    }
    return map;
  }, [daysInMonth, getAppointmentsForDay]);

  // Desktop: llenamos viewport. Mobile: dejamos que la altura sea natural.
  const calendarHeight = "calc(100vh - 180px)";
  const weekdayLabels = isMobile ? daysOfWeekShort : daysOfWeekFull;

  return (
    <Box
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : calendarHeight,
        overflow: "hidden",
      }}
    >
      {/* HEADER: Mes/Año + navegación */}
      <Group justify="space-between" align="center" mb={isMobile ? 2 : 4}>
        <Button
          variant="subtle"
          size={isMobile ? "xs" : "sm"}
          onClick={onPrevMonth}
          leftSection={<BsChevronCompactLeft />}
        >
          {isMobile ? "Ant." : "Anterior"}
        </Button>

        <Paper
          withBorder
          px={isMobile ? "xs" : "md"}
          py={isMobile ? 2 : 4}
          radius="lg"
          style={{ textTransform: "uppercase" }}
          shadow="xs"
        >
          <Text
            ta="center"
            fw={700}
            style={{
              fontSize: isMobile ? 12 : 17,
              letterSpacing: 1,
              lineHeight: 1.2,
            }}
          >
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </Text>
        </Paper>

        <Button
          variant="subtle"
          size={isMobile ? "xs" : "sm"}
          onClick={onNextMonth}
          rightSection={<BsChevronCompactRight />}
        >
          {isMobile ? "Sig." : "Siguiente"}
        </Button>
      </Group>

      {/* LEYENDA */}
      <Group
        justify="center"
        gap={isMobile ? 8 : "md"}
        mb={isMobile ? 4 : 6}
        wrap="wrap"
      >
        <LegendDot color={COLOR.today} label="Hoy" />
        <LegendDot color={COLOR.holiday} label="Festivo" />
        <LegendDot color="#9ca3af" label="Fin de semana" />
      </Group>

      {/* Encabezado días de la semana */}
      <Paper withBorder radius="md" shadow="xs" mb={isMobile ? 2 : 4}>
        <Grid columns={7} gutter={0}>
          {weekdayLabels.map((day) => (
            <Grid.Col span={1} key={day}>
              <Box py={isMobile ? 2 : 6}>
                <Text
                  ta="center"
                  fw={600}
                  c="dimmed"
                  style={{ fontSize: isMobile ? 10 : 11 }}
                >
                  {day}
                </Text>
              </Box>
            </Grid.Col>
          ))}
        </Grid>
      </Paper>

      {/* GRID DEL CALENDARIO */}
      <Box
        style={{
          flex: isMobile ? "initial" : 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridAutoRows: isMobile ? "auto" : "1fr",
          gap: 4,
          padding: 2
        }}
      >
        {daysInMonth.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const count = apptCountByKey.get(key) ?? 0;
          const maxOverlap = maxOverlapByKey.get(key) ?? 0;
          const hasSimultaneous = maxOverlap > 1;

          const selected = isSameDay(day, currentDate);
          const holiday = isHoliday(day);
          const weekend = [0, 6].includes(day.getDay());
          const outsideMonth = !isSameMonth(day, currentDate);
          const today = isToday(day);

          const baseBg = "white";
          const bgColor = selected
            ? COLOR.selectedBg
            : holiday
            ? "rgba(239, 68, 68, 0.08)"
            : weekend
            ? COLOR.weekendBg
            : baseBg;

          const borderColor = selected
            ? COLOR.selectedBorder
            : holiday
            ? "rgba(239, 68, 68, 0.6)"
            : "rgba(0,0,0,0.06)";

          const citasText =
            count > 0
              ? `${count} ${count === 1 ? "cita" : "citas"}`
              : "";

          return (
            <Box
              key={key}
              style={{
                minHeight: 0,
                position: isMobile ? "relative" : "static",
              }}
            >
              {/* MOBILE: celda cuadrada, sin badges */}
              {isMobile ? (
                <>
                  <Box
                    style={{
                      width: "100%",
                      paddingTop: "100%", // 1:1 aspect ratio
                    }}
                  />
                  <Paper
                    shadow="xs"
                    radius="md"
                    p={4}
                    withBorder
                    role="button"
                    onClick={() => handleDayClick(day)}
                    style={{
                      cursor: "pointer",
                      position: "absolute",
                      inset: 0,
                      backgroundColor: bgColor,
                      borderColor,
                      borderWidth: selected || holiday ? 2 : 1,
                      transition:
                        "background 0.15s ease, border-color 0.15s ease",
                      opacity: loadingMonth ? 0.7 : outsideMonth ? 0.6 : 1,
                      outline: today ? `2px solid ${COLOR.today}` : "none",
                      outlineOffset: today ? -2 : 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Número del día (sin badge Hoy en mobile) */}
                    <Group
                      justify="flex-start"
                      align="flex-start"
                      gap={4}
                      mb={2}
                    >
                      <Text
                        size="sm"
                        fw={800}
                        c={
                          holiday
                            ? "#dc2626"
                            : today
                            ? COLOR.today
                            : outsideMonth
                            ? "#9ca3af"
                            : "#111827"
                        }
                      >
                        {format(day, "d", { locale: es })}
                      </Text>
                    </Group>

                    <Box style={{ flex: 1 }} />

                    {/* Texto de citas en una sola línea, sin badge */}
                    {count > 0 && (
                      <Box
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: 2,
                        }}
                      >
                        <Text
                          size="xxxs"
                          c="dimmed"
                          style={{
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                          }}
                        >
                          {citasText}
                        </Text>
                      </Box>
                    )}
                    {hasSimultaneous && (
                      <Box
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: 2,
                        }}
                      >
                        <Text size="xxxs" c="#dc2626" style={{ lineHeight: 1 }}>
                          {maxOverlap} simultáneas
                        </Text>
                      </Box>
                    )}
                  </Paper>
                </>
              ) : (
                // DESKTOP / TABLET: con badges
                <Paper
                  shadow="xs"
                  radius="md"
                  p={6}
                  withBorder
                  role="button"
                  onClick={() => handleDayClick(day)}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    height: "100%",
                    backgroundColor: bgColor,
                    borderColor,
                    borderWidth: selected || holiday ? 2 : 1,
                    transition:
                      "background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, box-shadow 0.1s ease",
                    opacity: loadingMonth ? 0.7 : outsideMonth ? 0.6 : 1,
                    outline: today ? `2px solid ${COLOR.today}` : "none",
                    outlineOffset: today ? -2 : 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 10px rgba(15,23,42,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow =
                      "var(--mantine-shadow-xs)";
                  }}
                >
                  <Group
                    justify="center"
                    align="flex-start"
                    gap="xs"
                    mb={4}
                  >
                    <Text
                      size="md"
                      fw={800}
                      c={
                        holiday
                          ? "#dc2626"
                          : today
                          ? COLOR.today
                          : outsideMonth
                          ? "#9ca3af"
                          : "#111827"
                      }
                    >
                      {format(day, "d", { locale: es })}
                    </Text>
                  </Group>

                  <Box style={{ flex: 1 }} />

                  {/* Badge de citas solo en desktop */}
                  {count > 0 && (
                    <Box
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: 2,
                      }}
                    >
                      <Badge
                        size="sm"
                        radius="xl"
                        variant={selected ? "filled" : "light"}
                        style={{
                          fontSize: 11,
                          textTransform: "none",
                        }}
                      >
                        {citasText}
                      </Badge>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          );
        })}
      </Box>

      {/* LOADER OVERLAY */}
      {loadingMonth && (
        <Box
          style={{
            position: "absolute",
            inset: 0,
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

export default React.memo(MonthView);
