import React, { useEffect, useMemo, useState } from "react";
import { Box, Group, Loader, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import dayjs from "dayjs";
import { format } from "date-fns";
import { Employee } from "../../../../services/employeeService";
import { getWeekAvailability, WeekAvailability } from "../../../../services/scheduleService";

// Cuántos rangos se listan por día antes de resumir con "+N más" (el detalle completo está en la vista por día)
const MAX_WINDOWS_PER_DAY = 6;

interface AvailabilityWeekViewProps {
  weekStart: Date;
  employees: Employee[];
  duration: number;
  timeFormat: string;
  onPickDay: (date: Date) => void;
}

// "YYYY-MM-DD" → Date local (sin el corrimiento de zona horaria de new Date("YYYY-MM-DD"))
const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const AvailabilityWeekView: React.FC<AvailabilityWeekViewProps> = ({
  weekStart,
  employees,
  duration,
  timeFormat,
  onPickDay,
}) => {
  const [data, setData] = useState<WeekAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // El input de duración dispara un cambio por tecla: se espera a que el usuario termine de escribir
  // y se acota al rango del propio input (al teclear "45" pasa por "4", que el backend rechaza).
  const [debouncedDuration] = useDebouncedValue(duration, 300);
  const requestDuration = Math.min(480, Math.max(5, Math.round(debouncedDuration) || 30));

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const employeeIdsKey = employees.map((e) => e._id).join(",");
  const employeeNameById = useMemo(
    () => new Map(employees.map((e) => [e._id, e.names?.trim()])),
    [employees],
  );

  useEffect(() => {
    if (employees.length === 0) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    getWeekAvailability(weekStartStr, employees.map((e) => e._id), requestDuration)
      .then((result) => {
        if (!cancelled) setData(result ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartStr, requestDuration, employeeIdsKey]);

  const formatTime = (time: string) => {
    if (time.startsWith("24")) return timeFormat === "24h" ? "24:00" : "12:00 AM";
    return dayjs(`2000-01-01T${time}`).format(timeFormat === "24h" ? "HH:mm" : "h:mm A");
  };

  if (employees.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No hay profesionales para mostrar.
      </Text>
    );
  }

  if (loading && !data) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (failed || !data) {
    return (
      <Text size="sm" c="red">
        No se pudo cargar la disponibilidad de la semana. Intenta de nuevo.
      </Text>
    );
  }

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 8,
        opacity: loading ? 0.6 : 1,
        transition: "opacity 120ms",
      }}
    >
      {data.days.map((day) => {
        const date = parseLocalDate(day.date);
        const weekday = date.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "");
        const shown = day.windows.slice(0, MAX_WINDOWS_PER_DAY);
        const hidden = day.windows.length - shown.length;
        const professionalNames = day.employeeIds
          .map((id) => employeeNameById.get(id))
          .filter(Boolean)
          .join(", ");

        return (
          <UnstyledButton
            key={day.date}
            onClick={() => onPickDay(date)}
            aria-label={`Ver detalle por profesional del ${date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}`}
            p="sm"
            style={{
              borderRadius: 8,
              border: day.isToday
                ? "2px solid var(--mantine-color-blue-5)"
                : "1px solid var(--mantine-color-default-border)",
              backgroundColor: "var(--mantine-color-gray-light)",
              opacity: day.isPast ? 0.55 : 1,
              // Un <button> centra su contenido en vertical si la celda es más alta: se fuerza arriba
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            <Group justify="space-between" align="baseline" mb="xs" wrap="nowrap">
              <Text size="xs" fw={700} tt="uppercase" c={day.isToday ? "blue" : "dimmed"}>
                {weekday}
                {day.isToday ? " · hoy" : ""}
              </Text>
              <Text size="lg" fw={700}>
                {date.getDate()}
              </Text>
            </Group>

            {day.isPast ? (
              <Text size="xs" c="dimmed">
                Día pasado
              </Text>
            ) : day.windows.length === 0 ? (
              <Text size="xs" c="dimmed">
                Sin horarios disponibles
              </Text>
            ) : (
              <Stack gap={4}>
                {shown.map((window) => (
                  <Box
                    key={window.start}
                    px={6}
                    py={4}
                    style={{
                      backgroundColor: "var(--mantine-color-body)",
                      borderRadius: 6,
                      border: "1px solid var(--mantine-color-blue-2)",
                    }}
                  >
                    <Text size="xs" fw={600}>
                      {formatTime(window.start)} – {formatTime(window.end)}
                    </Text>
                  </Box>
                ))}
                {hidden > 0 && (
                  <Text size="xs" c="dimmed">
                    +{hidden} más (ver el día)
                  </Text>
                )}
                <Tooltip label={professionalNames} disabled={!professionalNames} multiline maw={260} withArrow>
                  <Text size="xs" c="dimmed" mt={2}>
                    {day.employeeIds.length}{" "}
                    {day.employeeIds.length === 1 ? "profesional libre" : "profesionales libres"}
                  </Text>
                </Tooltip>
              </Stack>
            )}
          </UnstyledButton>
        );
      })}
    </Box>
  );
};

export default AvailabilityWeekView;
