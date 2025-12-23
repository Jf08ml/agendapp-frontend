import { FC, useMemo } from "react";
import { Box, Text, Stack, Group } from "@mantine/core";
import { Appointment } from "../../../../services/appointmentService";
import { Employee } from "../../../../services/employeeService";
import { format } from "date-fns";

interface DayModalCompactViewProps {
  appointments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
}

const HOUR_PX = 48; // más legible que 30
const PX_PER_MIN = HOUR_PX / 60;
const STEP_MIN = 15; // redondeo para recortar "vacíos"
const MIN_CARD_HEIGHT = 22;
const GUTTER_PX = 6;

const clampToStepDown = (minutes: number, step: number) =>
  Math.floor(minutes / step) * step;

const clampToStepUp = (minutes: number, step: number) =>
  Math.ceil(minutes / step) * step;

const toDayMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

const DayModalCompactView: FC<DayModalCompactViewProps> = ({
  appointments,
  onEditAppointment,
}) => {
  const getEmployeeName = (employee: Employee) => employee?.names || "Sin asignar";

  // Rango vertical real del día (recortado)
  const { startMin, endMin } = useMemo(() => {
    if (appointments.length === 0) {
      // 08:00 a 20:00 por defecto
      return { startMin: 8 * 60, endMin: 20 * 60 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const apt of appointments) {
      const s = toDayMinutes(new Date(apt.startDate));
      const e = toDayMinutes(new Date(apt.endDate));
      min = Math.min(min, s);
      max = Math.max(max, e);
    }

    // recortar vacíos con step (15min)
    const start = clampToStepDown(min, STEP_MIN);
    const end = clampToStepUp(max, STEP_MIN);

    // por seguridad, mínimo 1h de alto visual
    const minHeight = 60;
    return { startMin: start, endMin: Math.max(end, start + minHeight) };
  }, [appointments]);

  // Labels por hora (pero la vista puede empezar en :15 o :30)
  const hourTicks = useMemo(() => {
    const startHour = Math.floor(startMin / 60);
    const endHour = Math.ceil(endMin / 60);
    const ticks: number[] = [];
    for (let h = startHour; h <= endHour; h++) ticks.push(h);
    return ticks;
  }, [startMin, endMin]);

  const totalHeightPx = (endMin - startMin) * PX_PER_MIN;

  // Layout: agrupar solapes + asignar columnas greedy
  const appointmentsWithLayout = useMemo(() => {
    if (appointments.length === 0) return [];

    const sorted = [...appointments].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const overlaps = (a: Appointment, b: Appointment) => {
      const aS = new Date(a.startDate).getTime();
      const aE = new Date(a.endDate).getTime();
      const bS = new Date(b.startDate).getTime();
      const bE = new Date(b.endDate).getTime();
      return aS < bE && aE > bS;
    };

    // 1) construir grupos de componentes conexas por solape
    const groups: Appointment[][] = [];
    for (const apt of sorted) {
      const hitIdx: number[] = [];
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].some((g) => overlaps(apt, g))) hitIdx.push(i);
      }

      if (hitIdx.length === 0) {
        groups.push([apt]);
      } else if (hitIdx.length === 1) {
        groups[hitIdx[0]].push(apt);
      } else {
        // fusionar grupos
        const merged = [apt];
        hitIdx.sort((a, b) => b - a);
        for (const idx of hitIdx) {
          merged.push(...groups[idx]);
          groups.splice(idx, 1);
        }
        groups.push(merged);
      }
    }

    // 2) por grupo: greedy de columnas (interval graph coloring)
    const out: Array<{
      appointment: Appointment;
      column: number;
      totalColumns: number;
      top: number;
      height: number;
    }> = [];

    for (const group of groups) {
      const groupSorted = [...group].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      // cada columna guarda el endTime (ms) del último item puesto ahí
      const colEndTimes: number[] = [];
      const localPlaced: Array<{ appointment: Appointment; column: number }> = [];

      for (const apt of groupSorted) {
        const s = new Date(apt.startDate).getTime();
        const e = new Date(apt.endDate).getTime();

        // buscar primera columna libre (si su end <= start)
        let placedCol = -1;
        for (let c = 0; c < colEndTimes.length; c++) {
          if (colEndTimes[c] <= s) {
            placedCol = c;
            break;
          }
        }
        if (placedCol === -1) {
          placedCol = colEndTimes.length;
          colEndTimes.push(e);
        } else {
          colEndTimes[placedCol] = e;
        }

        localPlaced.push({ appointment: apt, column: placedCol });
      }

      const totalColumns = colEndTimes.length;

      for (const { appointment, column } of localPlaced) {
        const start = new Date(appointment.startDate);
        const end = new Date(appointment.endDate);

        const sMin = toDayMinutes(start);
        const eMin = toDayMinutes(end);

        const top = (sMin - startMin) * PX_PER_MIN;
        const height = Math.max((eMin - sMin) * PX_PER_MIN, MIN_CARD_HEIGHT);

        out.push({ appointment, column, totalColumns, top, height });
      }
    }

    return out;
  }, [appointments, startMin]);

  return (
    <Box p="sm">
      {appointments.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No hay citas programadas para este día
        </Text>
      ) : (
        <Group align="flex-start" gap="xs" wrap="nowrap">
          {/* Eje de tiempo */}
          <Box style={{ width: 56, flex: "0 0 56px" }}>
            <Stack gap={0}>
              {hourTicks.map((h) => (
                <Box
                  key={h}
                  style={{
                    height: `${60 * PX_PER_MIN}px`,
                    paddingTop: 2,
                    position: "relative",
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {String(h).padStart(2, "0")}:00
                  </Text>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Área de citas */}
          <Box style={{ flex: 1, position: "relative", minHeight: totalHeightPx }}>
            {/* grid: líneas cada 30min + 1h */}
            {Array.from({ length: Math.ceil((endMin - startMin) / 30) + 1 }).map(
              (_, i) => {
                const minsFromStart = i * 30;
                const y = minsFromStart * PX_PER_MIN;
                const isHour = (minsFromStart % 60) === 0;

                return (
                  <Box
                    key={i}
                    style={{
                      position: "absolute",
                      top: y,
                      left: 0,
                      right: 0,
                      borderTop: `1px solid ${isHour ? "#e9ecef" : "#f1f3f5"}`,
                      opacity: isHour ? 1 : 0.8,
                    }}
                  />
                );
              }
            )}

            {/* Citas */}
            {appointmentsWithLayout.map(({ appointment, column, totalColumns, top, height }) => {
              const startTime = new Date(appointment.startDate);
              const endTime = new Date(appointment.endDate);

              const employeeColor = appointment.employee?.color || "#228be6";

              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              const darkenColor = (hex: string) => {
                const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 50);
                const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 50);
                const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 50);
                return `rgb(${r}, ${g}, ${b})`;
              };

              // 👉 ancho igual por columna del grupo (todas las cards en ese grupo son iguales)
              const colW = 100 / totalColumns;

              // Usamos gutter real para que no parezcan “pegadas” sin deformar el ancho
              const left = `calc(${colW * column}% + ${GUTTER_PX / 2}px)`;
              const width = `calc(${colW}% - ${GUTTER_PX}px)`;

              return (
                <Box
                  key={appointment._id}
                  p={6}
                  style={{
                    position: "absolute",
                    top,
                    height,
                    left,
                    width,
                    cursor: "pointer",
                    borderRadius: 6,
                    border: `2px solid ${employeeColor}`,
                    backgroundColor: hexToRgba(employeeColor, 0.35),
                    transition: "transform 0.12s ease, box-shadow 0.12s ease",
                    overflow: "hidden",
                    zIndex: 1,
                  }}
                  onClick={() => onEditAppointment(appointment)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)";
                    e.currentTarget.style.zIndex = "10";
                    e.currentTarget.style.transform = "scale(1.01)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.zIndex = "1";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <Text size="xs" fw={800} lineClamp={1} style={{ color: darkenColor(employeeColor) }}>
                    {getEmployeeName(appointment.employee)}
                  </Text>
                  <Text size="xs" fw={600} lineClamp={1} style={{ color: darkenColor(employeeColor) }}>
                    {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Group>
      )}
    </Box>
  );
};

export default DayModalCompactView;
