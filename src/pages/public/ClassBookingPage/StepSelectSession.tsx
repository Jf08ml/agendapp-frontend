import { useEffect, useMemo, useState } from "react";
import {
  Stack, Card, Text, Badge, Group, Center, Loader,
  Progress, ThemeIcon, Alert, Paper, Divider,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";
import { IconCalendar, IconAlertCircle, IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassSession, ClassType } from "../../../services/classService";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

interface Props {
  sessions: ClassSession[];
  loading: boolean;
  selected: ClassSession | null;
  onSelect: (s: ClassSession) => void;
  selectedClass: ClassType | null;
  timezone?: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: "green",
  full: "red",
  cancelled: "gray",
  completed: "gray",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Disponible",
  full: "Sin cupos",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

// Un día del calendario es una etiqueta pura (YYYY-MM-DD), no un instante:
// se construye/lee con getters locales para que coincida siempre con las
// celdas del propio DatePicker, sin pasar por conversión de timezone.
const dateToKey = (date: Date) => dayjs(date).format("YYYY-MM-DD");
const dayKeyToDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function StepSelectSession({
  sessions, loading, selected, onSelect, selectedClass, timezone: tz = "America/Bogota",
}: Props) {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const availableSessions = useMemo(
    () => sessions.filter((s) => s.status === "open" && dayjs(s.startDate).isAfter(dayjs())),
    [sessions]
  );

  // Agrupar sesiones disponibles por día, en el timezone de la organización
  // (una sesión a las 11pm en Bogotá puede caer en otro día en UTC).
  const sessionsByDay = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    for (const s of availableSessions) {
      const key = dayjs(s.startDate).tz(tz).format("YYYY-MM-DD");
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [availableSessions, tz]);

  const availableDays = useMemo(
    () => Object.keys(sessionsByDay).sort(),
    [sessionsByDay]
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Preseleccionar el día de la sesión ya elegida (al volver a este paso) o,
  // si no hay ninguna, el primer día con disponibilidad.
  useEffect(() => {
    if (selected) {
      setSelectedDayKey(dayjs(selected.startDate).tz(tz).format("YYYY-MM-DD"));
      return;
    }
    setSelectedDayKey(availableDays[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id, availableDays.join(","), tz]);

  if (loading) {
    return <Center h={200}><Loader /></Center>;
  }

  if (!selectedClass) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="gray">
        Selecciona una clase primero.
      </Alert>
    );
  }

  if (availableSessions.length === 0) {
    return (
      <Center h={200}>
        <Stack align="center" gap="xs">
          <IconCalendar size={40} color="gray" />
          <Text c="dimmed">No hay sesiones disponibles para esta clase por el momento.</Text>
        </Stack>
      </Center>
    );
  }

  const sessionsOfSelectedDay = selectedDayKey ? sessionsByDay[selectedDayKey] ?? [] : [];

  const getDayProps = (date: Date) => {
    const key = dateToKey(date);
    if (!sessionsByDay[key]) {
      return { disabled: true };
    }
    if (key === selectedDayKey) {
      return {
        style: {
          backgroundColor: "var(--mantine-color-blue-6)",
          color: "#fff",
          fontWeight: 700,
        },
      };
    }
    return {
      style: {
        backgroundColor: "var(--mantine-color-green-1)",
        color: "var(--mantine-color-green-8)",
        fontWeight: 700,
      },
    };
  };

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Elige una sesión</Text>
      <Text size="sm" c="dimmed">{selectedClass.name} · {selectedClass.duration} min</Text>
      <Text size="xs" c="dimmed">
        Los días en <Text span c="green" fw={600}>verde</Text> tienen sesiones disponibles.
      </Text>

      <Paper withBorder radius="md" p={isMobile ? "sm" : "md"}>
        <DatePicker
          value={selectedDayKey ? dayKeyToDate(selectedDayKey) : null}
          onChange={(d) => d && setSelectedDayKey(dateToKey(d))}
          defaultDate={availableDays[0] ? dayKeyToDate(availableDays[0]) : undefined}
          minDate={new Date()}
          maxDate={dayKeyToDate(availableDays[availableDays.length - 1])}
          excludeDate={(d) => dayjs(d).isBefore(dayjs(), "day")}
          getDayProps={getDayProps}
          locale="es"
          size={isMobile ? "sm" : "md"}
          style={{ width: "100%" }}
        />
      </Paper>

      {selectedDayKey && sessionsOfSelectedDay.length > 0 && (
        <Stack gap="xs">
          <Divider
            label={dayjs(dayKeyToDate(selectedDayKey)).format("dddd D [de] MMMM")}
            labelPosition="left"
          />
          {sessionsOfSelectedDay.map((s) => {
            const isSelected = selected?._id === s._id;
            const start = dayjs(s.startDate).tz(tz);
            const end = dayjs(s.endDate).tz(tz);
            const remaining = s.capacity - s.enrolledCount;
            const pct = s.capacity > 0 ? Math.round((s.enrolledCount / s.capacity) * 100) : 0;
            const employee = typeof s.employeeId === "object" ? s.employeeId : null;
            const room = typeof s.roomId === "object" ? s.roomId : null;

            return (
              <Card
                key={s._id}
                withBorder
                radius="md"
                p="sm"
                onClick={() => onSelect(s)}
                style={{
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--mantine-color-blue-5)" : undefined,
                  borderWidth: isSelected ? 2 : 1,
                  boxShadow: isSelected ? "0 0 0 2px var(--mantine-color-blue-2)" : undefined,
                  transition: "all 0.15s ease",
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon
                      size="md"
                      variant="light"
                      color={isSelected ? "blue" : "gray"}
                      radius="xl"
                    >
                      <IconClock size={16} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text fw={600} size="sm">
                        {start.format("HH:mm")} – {end.format("HH:mm")}
                      </Text>
                      <Group gap="xs">
                        {employee && (
                          <Text size="xs" c="dimmed">{employee.names}</Text>
                        )}
                        {room && (
                          <Text size="xs" c="dimmed">· {room.name}</Text>
                        )}
                      </Group>

                      {/* Barra de ocupación */}
                      <Group gap="xs" mt={4} style={{ minWidth: 120 }}>
                        <Progress
                          value={pct}
                          size="xs"
                          color={pct >= 90 ? "red" : pct >= 70 ? "orange" : "blue"}
                          style={{ flex: 1 }}
                        />
                        <Text size="xs" c={remaining <= 3 ? "red" : "dimmed"} fw={remaining <= 3 ? 600 : 400}>
                          {remaining} {remaining === 1 ? "cupo" : "cupos"}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                  <Badge size="sm" color={STATUS_COLOR[s.status] ?? "gray"} variant="light">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
