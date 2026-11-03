import { useMemo, useState } from "react";
import {
  Paper, Stack, Group, Text, Badge, Button, ScrollArea, Alert,
} from "@mantine/core";
import { IconRepeat, IconAlertCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import RecurrenceSelector from "../../../components/customCalendar/components/RecurrenceSelector";
import type { RecurrencePattern } from "../../../services/appointmentService";
import { ClassSession } from "../../../services/classService";
import { buildRepeatOccurrences, OccurrenceStatus } from "./classRepeat";

dayjs.extend(utc);
dayjs.extend(timezone);

const STATUS: Record<OccurrenceStatus, { label: string; color: string }> = {
  available: { label: "Se agregará", color: "green" },
  selected: { label: "Ya elegida", color: "blue" },
  full: { label: "Sin cupos", color: "red" },
  none: { label: "No hay clase a esa hora", color: "yellow" },
  over_limit: { label: "Excede tus créditos", color: "gray" },
};

interface Props {
  /** Sesión desde la que se repite (día de la semana y hora). */
  base: ClassSession;
  /** Sesiones de la clase, abiertas y llenas. */
  sessions: ClassSession[];
  selectedIds: Set<string>;
  /** Cuántas sesiones más se pueden agregar (créditos / tope por reserva). */
  remainingSlots: number;
  /** Se reserva con paquete: el fin por cantidad se ajusta a los créditos. */
  hasCreditLimit: boolean;
  tz: string;
  onAdd: (sessions: ClassSession[]) => void;
  onClose: () => void;
}

export default function ClassRepeatPanel({
  base, sessions, selectedIds, remainingSlots, hasCreditLimit, tz, onAdd, onClose,
}: Props) {
  const b = useMemo(() => dayjs(base.startDate).tz(tz), [base.startDate, tz]);
  const time = b.format("HH:mm");

  const [pattern, setPattern] = useState<RecurrencePattern>({
    type: "weekly",
    intervalWeeks: 1,
    weekdays: [b.day()],
    endType: "count",
    // Incluye la sesión base: con paquete, hasta agotar los créditos.
    count: hasCreditLimit ? remainingSlots + 1 : 4,
  });

  const occurrences = useMemo(
    () => buildRepeatOccurrences({ base, sessions, selectedIds, remainingSlots, pattern, tz }),
    [base, sessions, selectedIds, remainingSlots, pattern, tz]
  );

  const toAdd = occurrences.filter((o) => o.status === "available").map((o) => o.session!);
  const counts = occurrences.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Paper withBorder radius="md" p="sm" style={{ borderColor: "var(--mantine-color-blue-4)" }}>
      <Stack gap="sm">
        <Group gap={6}>
          <IconRepeat size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={600}>
            Repetir la clase de las {time} ({b.format("dddd D [de] MMMM")})
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Se buscan las sesiones de esta clase a la misma hora en los días que elijas.
        </Text>

        <RecurrenceSelector
          value={pattern}
          onChange={setPattern}
          startDate={b.toDate()}
          hideTypeSelector
          countLabel="sesiones"
          maxCount={31}
        />

        {occurrences.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light">
            Elige al menos un día para ver las fechas.
          </Alert>
        ) : (
          <>
            <Group gap="xs">
              {(Object.keys(STATUS) as OccurrenceStatus[])
                .filter((k) => counts[k])
                .map((k) => (
                  <Badge key={k} color={STATUS[k].color} variant="light" size="sm">
                    {counts[k]} · {STATUS[k].label}
                  </Badge>
                ))}
            </Group>
            <ScrollArea.Autosize mah={240} type="auto">
              <Stack gap={4}>
                {occurrences.map((o) => (
                  <Group
                    key={o.day.format("YYYY-MM-DD")}
                    justify="space-between"
                    wrap="nowrap"
                    gap="xs"
                    pl="xs"
                    style={{ borderLeft: `3px solid var(--mantine-color-${STATUS[o.status].color}-5)` }}
                  >
                    <Stack gap={0}>
                      <Text size="xs">
                        {o.day.format("ddd D [de] MMM")} · {time}
                      </Text>
                      {o.status === "none" && o.otherTimes.length > 0 && (
                        <Text size="xs" c="dimmed">
                          Ese día hay clase a las {o.otherTimes.join(", ")} (elígela en el calendario)
                        </Text>
                      )}
                    </Stack>
                    <Badge size="xs" color={STATUS[o.status].color} variant="light">
                      {STATUS[o.status].label}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </>
        )}

        <Group justify="flex-end" gap="xs">
          <Button size="xs" variant="default" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            size="xs"
            disabled={toAdd.length === 0}
            onClick={() => { onAdd(toAdd); onClose(); }}
          >
            {toAdd.length === 0
              ? "No hay sesiones para agregar"
              : `Agregar ${toAdd.length} ${toAdd.length === 1 ? "sesión" : "sesiones"}`}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
