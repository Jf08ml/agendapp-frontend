import React, { useMemo, useCallback, useState } from "react";
import { Grid, Box, Paper, Text, Group, Tooltip, Button } from "@mantine/core";
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
  onToday?: () => void; // opcional
}

const COLOR = {
  today: "#6366f1",
  holiday: "#ef4444",
  weekend: "rgba(0,0,0,0.03)",
};

const LegendDot: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <Group gap={8} align="center">
    <Box
      style={{ width: 10, height: 10, borderRadius: 999, background: color }}
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

  // Navegación con teclado: ← / →
  const onContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") onPrevMonth();
    if (e.key === "ArrowRight") onNextMonth();
  };

  // Estado visual de flechas (hover / touch)
  const [leftActive, setLeftActive] = useState(false);
  const [rightActive, setRightActive] = useState(false);

  // Dimensiones y posición (desktop vs mobile)
  const SIDE_ARROW_HEIGHT = 88; // más altas en desktop
  const SIDE_ARROW_WIDTH = 40;
  const DESKTOP_OFFSET_LEFT = -45; // ligeramente fuera
  const DESKTOP_OFFSET_RIGHT = -35;

  const baseArrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 5,
    height: SIDE_ARROW_HEIGHT,
    width: SIDE_ARROW_WIDTH,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    transition:
      "opacity 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  };

  // Opacidad por estado
  const idleOpacity = 0.35;
  const activeOpacity = 0.9;

  return (
    <Box
      style={{ position: "relative" }}
      onKeyDown={onContainerKeyDown}
      tabIndex={0}
    >
      {/* Header: sólo mes/año centrado */}
      <Group justify="center" align="center" mb="xs">
        <Paper
          withBorder
          px="md"
          py={6}
          radius="md"
          style={{ textTransform: "uppercase" }}
        >
          <Text ta="center" fw={700} style={{ fontSize: isMobile ? 14 : 18 }}>
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </Text>
        </Paper>
      </Group>

      {/* Leyenda */}
      <Group justify="center" gap="xl" my={8}>
        <LegendDot color={COLOR.today} label="Hoy" />
        <LegendDot color={COLOR.holiday} label="Festivo" />
        <LegendDot color="#9ca3af" label="Fin de semana" />
      </Group>

      {/* Encabezado días de la semana */}
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

      {/* FLECHAS LATERALES (sólo DESKTOP) */}
      {!isMobile && (
        <>
          <Tooltip label="Mes anterior" openDelay={200}>
            <Box
              aria-label="Mes anterior"
              role="button"
              onClick={onPrevMonth}
              onMouseEnter={() => setLeftActive(true)}
              onMouseLeave={() => setLeftActive(false)}
              style={{
                ...baseArrowStyle,
                left: DESKTOP_OFFSET_LEFT,
                opacity: leftActive ? activeOpacity : idleOpacity,
                background: leftActive ? "rgba(0,0,0,0.06)" : "transparent",
                boxShadow: leftActive ? "0 6px 16px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <BsChevronCompactLeft size={50} />
            </Box>
          </Tooltip>

          <Tooltip label="Mes siguiente" openDelay={200}>
            <Box
              aria-label="Mes siguiente"
              role="button"
              onClick={onNextMonth}
              onMouseEnter={() => setRightActive(true)}
              onMouseLeave={() => setRightActive(false)}
              style={{
                ...baseArrowStyle,
                right: DESKTOP_OFFSET_RIGHT,
                opacity: rightActive ? activeOpacity : idleOpacity,
                background: rightActive ? "rgba(0,0,0,0.06)" : "transparent",
                boxShadow: rightActive ? "0 6px 16px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <BsChevronCompactRight size={50} />
            </Box>
          </Tooltip>
        </>
      )}

      {/* GRID del calendario */}
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
            ? "rgba(255, 99, 71, 0.08)"
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
                {/* Número del día */}
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

                {/* Contador de citas */}
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

      {/* BARRA DE NAVEGACIÓN (sólo MOBILE) */}
      {isMobile && (
        <Group mt="sm" grow>
          <Button
            variant="light"
            leftSection={<BsChevronCompactLeft />}
            onClick={onPrevMonth}
            aria-label="Mes anterior"
          >
            Anterior
          </Button>
          <Button
            variant="light"
            rightSection={<BsChevronCompactRight />}
            onClick={onNextMonth}
            aria-label="Mes siguiente"
          >
            Siguiente
          </Button>
        </Group>
      )}

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
