import {
  Stack, Card, Text, Badge, Group, Center, Loader,
  Progress, ThemeIcon, Alert,
} from "@mantine/core";
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

export default function StepSelectSession({
  sessions, loading, selected, onSelect, selectedClass, timezone: tz = "America/Bogota",
}: Props) {
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

  const availableSessions = sessions.filter(
    (s) => s.status === "open" && dayjs(s.startDate).isAfter(dayjs())
  );

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

  // Agrupar por mes para mejorar legibilidad
  const grouped = availableSessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
    const month = dayjs(s.startDate).tz(tz).format("MMMM YYYY");
    if (!acc[month]) acc[month] = [];
    acc[month].push(s);
    return acc;
  }, {});

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Elige una sesión</Text>
      <Text size="sm" c="dimmed">{selectedClass.name} · {selectedClass.duration} min</Text>

      {Object.entries(grouped).map(([month, monthSessions]) => (
        <Stack key={month} gap="xs">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mt="xs">{month}</Text>
          {monthSessions.map((s) => {
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
                      <IconCalendar size={16} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Text fw={600} size="sm">
                        {start.format("dddd D [de] MMMM")}
                      </Text>
                      <Group gap="xs">
                        <ThemeIcon size="xs" variant="transparent" color="gray">
                          <IconClock size={12} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed">
                          {start.format("HH:mm")} – {end.format("HH:mm")}
                        </Text>
                        {employee && (
                          <Text size="xs" c="dimmed">· {employee.names}</Text>
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
      ))}
    </Stack>
  );
}
