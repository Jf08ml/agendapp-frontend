import { useEffect, useMemo, useState } from "react";
import {
  Stack, Card, Text, Badge, Group, Center, Loader,
  Progress, ThemeIcon, Alert, Paper, Divider, Button, CloseButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";
import {
  IconCalendar, IconAlertCircle, IconClock, IconCheck, IconRepeat,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassSession, ClassType } from "../../../services/classService";
import ClassRepeatPanel from "./ClassRepeatPanel";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

// Mismo tope que el backend (MAX_SESSIONS_PER_BOOKING en enrollmentService).
const MAX_SESSIONS_PER_BOOKING = 31;

interface Props {
  sessions: ClassSession[];
  loading: boolean;
  selected: ClassSession[];
  onChange: (sessions: ClassSession[]) => void;
  selectedClass: ClassType | null;
  timezone?: string;
  /** Créditos del paquete con que se reserva: tope de sesiones a marcar. */
  maxSelectable?: number | null;
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

const byStart = (a: ClassSession, b: ClassSession) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

export default function StepSelectSession({
  sessions, loading, selected, onChange, selectedClass, timezone: tz = "America/Bogota",
  maxSelectable = null,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const limit = Math.min(maxSelectable ?? MAX_SESSIONS_PER_BOOKING, MAX_SESSIONS_PER_BOOKING);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s._id)), [selected]);
  const atLimit = selected.length >= limit;

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

  const selectedDays = useMemo(
    () => new Set(selected.map((s) => dayjs(s.startDate).tz(tz).format("YYYY-MM-DD"))),
    [selected, tz]
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  // Sesión desde la que se abrió "Repetir…" (una a la vez).
  const [repeatBaseId, setRepeatBaseId] = useState<string | null>(null);

  // Preseleccionar el día de la primera sesión marcada (al volver a este paso)
  // o, si no hay ninguna, el primer día con disponibilidad.
  useEffect(() => {
    if (selected.length) {
      setSelectedDayKey(dayjs([...selected].sort(byStart)[0].startDate).tz(tz).format("YYYY-MM-DD"));
      return;
    }
    setSelectedDayKey(availableDays[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDays.join(","), tz]);

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

  const toggle = (s: ClassSession) => {
    if (selectedIds.has(s._id)) {
      onChange(selected.filter((x) => x._id !== s._id));
      if (repeatBaseId === s._id) setRepeatBaseId(null);
    } else if (!atLimit) {
      onChange([...selected, s].sort(byStart));
    }
  };

  const addSessions = (toAdd: ClassSession[]) => {
    const next = [...selected];
    for (const s of toAdd) {
      if (next.length >= limit) break;
      if (!next.some((x) => x._id === s._id)) next.push(s);
    }
    onChange(next.sort(byStart));
  };

  const repeatBase = repeatBaseId ? selected.find((s) => s._id === repeatBaseId) ?? null : null;

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
    if (selectedDays.has(key)) {
      return {
        style: {
          backgroundColor: "var(--mantine-color-blue-1)",
          color: "var(--mantine-color-blue-8)",
          fontWeight: 700,
          boxShadow: "inset 0 0 0 2px var(--mantine-color-blue-5)",
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
      <Text fw={600} size="lg">Elige tus sesiones</Text>
      <Text size="sm" c="dimmed">{selectedClass.name} · {selectedClass.duration} min</Text>
      <Text size="xs" c="dimmed">
        Puedes marcar una o varias sesiones, o repetir una cada semana. Los días en{" "}
        <Text span c="green" fw={600}>verde</Text> tienen sesiones disponibles y los
        marcados en <Text span c="blue" fw={600}>azul</Text> ya tienen sesiones elegidas.
      </Text>

      {maxSelectable != null && (
        <Alert color="grape" variant="light" p="xs">
          <Text size="xs">
            Tu paquete cubre hasta {maxSelectable} {maxSelectable === 1 ? "sesión" : "sesiones"} de esta clase.
          </Text>
        </Alert>
      )}

      <Paper withBorder radius="md" p={isMobile ? "sm" : "md"}>
        <DatePicker
          value={selectedDayKey ? dayKeyToDate(selectedDayKey) : null}
          onChange={(d) => d && setSelectedDayKey(dateToKey(d))}
          defaultDate={
            selectedDayKey ? dayKeyToDate(selectedDayKey)
            : availableDays[0] ? dayKeyToDate(availableDays[0]) : undefined
          }
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
            const isSelected = selectedIds.has(s._id);
            const disabled = !isSelected && atLimit;
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
                onClick={() => toggle(s)}
                style={{
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.55 : 1,
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
                      variant={isSelected ? "filled" : "light"}
                      color={isSelected ? "blue" : "gray"}
                      radius="xl"
                    >
                      {isSelected ? <IconCheck size={16} /> : <IconClock size={16} />}
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
                  <Badge size="sm" color={isSelected ? "blue" : STATUS_COLOR[s.status] ?? "gray"} variant="light">
                    {isSelected ? "Elegida" : STATUS_LABEL[s.status] ?? s.status}
                  </Badge>
                </Group>

                {/* Repetir: mismo horario otros días/semanas (como las citas recurrentes) */}
                {isSelected && !atLimit && repeatBaseId !== s._id && (
                  <Button
                    mt="sm"
                    size="xs"
                    variant="light"
                    leftSection={<IconRepeat size={14} />}
                    onClick={(e) => { e.stopPropagation(); setRepeatBaseId(s._id); }}
                  >
                    Repetir esta clase…
                  </Button>
                )}
              </Card>
            );
          })}
        </Stack>
      )}

      {repeatBase && (
        <ClassRepeatPanel
          key={repeatBase._id}
          base={repeatBase}
          sessions={sessions}
          selectedIds={selectedIds}
          remainingSlots={limit - selected.length}
          hasCreditLimit={maxSelectable != null}
          tz={tz}
          onAdd={addSessions}
          onClose={() => setRepeatBaseId(null)}
        />
      )}

      {/* Sesiones elegidas */}
      {selected.length > 0 && (
        <Paper withBorder radius="md" p="sm">
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={600}>
              {selected.length} {selected.length === 1 ? "sesión elegida" : "sesiones elegidas"}
              {maxSelectable != null && ` de ${maxSelectable}`}
            </Text>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => onChange([])}>
              Quitar todas
            </Button>
          </Group>
          <Stack gap={4}>
            {selected.map((s) => {
              const start = dayjs(s.startDate).tz(tz);
              return (
                <Group key={s._id} justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="xs">
                    {start.format("ddd D [de] MMM")} · {start.format("HH:mm")}
                  </Text>
                  <CloseButton size="sm" aria-label="Quitar sesión" onClick={() => toggle(s)} />
                </Group>
              );
            })}
          </Stack>
          {atLimit && (
            <Text size="xs" c="dimmed" mt={6}>
              {maxSelectable != null
                ? "Llegaste al máximo de sesiones de tu paquete."
                : `Puedes reservar hasta ${MAX_SESSIONS_PER_BOOKING} sesiones a la vez.`}
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
