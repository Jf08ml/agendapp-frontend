// StepMultiServiceSummary.tsx
import {
  Paper,
  Stack,
  Text,
  Group,
  Divider,
  Badge,
  Avatar,
  Box,
} from "@mantine/core";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  ServiceWithDate,
  MultiServiceBlockSelection,
} from "../../types/multiBooking";
import { formatCurrency } from "../../utils/formatCurrency";
import type { RecurrencePattern, SeriesPreview } from "../../services/appointmentService";
import { IconRepeat } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

// Helper para asegurar Date válido
const ensureDate = (d: unknown): Date | null => {
  if (!d) return null;

  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof d === "string") {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;

    const dj = dayjs(d);
    if (dj.isValid()) return dj.toDate();
  }

  if (typeof d === "number") {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

// Helper para formatear fecha con fallback
const safeFormat = (d: unknown, format: string, fallback = "-"): string => {
  const date = ensureDate(d);
  if (!date) return fallback;
  const dj = dayjs(date);
  return dj.isValid() ? dj.format(format) : fallback;
};

interface Props {
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  times: MultiServiceBlockSelection | null;
  currency?: string;
  recurrencePattern?: RecurrencePattern;
  seriesPreview?: SeriesPreview | null;
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// --- Helpers de precio ---
function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function StepMultiServiceSummary({
  services,
  employees,
  dates,
  times,
  currency,
  recurrencePattern,
  seriesPreview,
}: Props) {
  if (!times) return null;

  // Lookups
  const svcMap = Object.fromEntries(services.map((s) => [s._id, s]));
  const empMap = Object.fromEntries(employees.map((e) => [e._id, e]));

  const displayDate = dates[0]?.date
    ? capitalize(safeFormat(dates[0].date, "dddd, D MMM YYYY", "-"))
    : "-";

  // Usar el string original si existe para evitar conversiones de timezone
  let startText = "-";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((times as any).startTimeStr) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isoStr = (times as any).startTimeStr;
    const match = isoStr.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const hour = parseInt(match[1]);
      const min = match[2];
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      startText = `${hour12}:${min} ${period}`;
    }
  } else if (times.startTime) {
    startText = safeFormat(times.startTime, "h:mm A", "-");
  } else if (times.intervals?.[0]) {
    startText = safeFormat(times.intervals[0].from, "h:mm A", "-");
  }

  // Total del bloque
  const grandTotal = times.intervals.reduce((acc, iv) => {
    const svc = svcMap[iv.serviceId];
    return acc + toNumber(svc?.price);
  }, 0);

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Text fw={700} size="lg">
          Resumen de tu reserva
        </Text>

        <Group gap="xs" wrap="wrap">
          <Badge variant="light">
            {times.intervals.length} servicio
            {times.intervals.length === 1 ? "" : "s"}
          </Badge>
          {dates[0]?.date && (
            <Badge variant="outline">
              {capitalize(safeFormat(dates[0].date, "dddd, D MMM YYYY", "-"))}
            </Badge>
          )}
        </Group>
      </Group>

      <Divider />

      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Group gap="xs" wrap="wrap">
            <Badge size="sm" variant="filled">
              {displayDate}
            </Badge>
            <Badge size="sm" variant="outline">
              Inicio {startText}
            </Badge>
          </Group>

          <Divider my="xs" />

          <Stack gap="sm">
            {times.intervals.map((iv, idx) => {
              const svc = svcMap[iv.serviceId];
              const emp = iv.employeeId ? empMap[iv.employeeId] : undefined;
              const price = toNumber(svc?.price);

              // Usar strings originales si existen
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ivAny = iv as any;
              const fromText =
                ivAny.startStr || safeFormat(iv.from, "h:mm A", "-");
              const toText = ivAny.endStr || safeFormat(iv.to, "h:mm A", "-");

              return (
                <Group
                  key={`${iv.serviceId}-${idx}`}
                  align="center"
                  wrap="nowrap"
                >
                  <Box style={{ width: 40 }}>
                    {emp ? (
                      <Avatar
                        radius="xl"
                        size="sm"
                        src={emp.profileImage || undefined}
                      >
                        {!emp.profileImage && emp.names
                          ? emp.names.charAt(0)
                          : null}
                      </Avatar>
                    ) : (
                      <Badge size="xs" variant="dot">
                        Libre
                      </Badge>
                    )}
                  </Box>

                  <Stack gap={2} style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={600} size="sm">
                        {svc?.name ?? "Servicio"}
                      </Text>
                      <Text fw={600} size="sm" c={price === 0 ? "green" : undefined}>
                        {price === 0 ? "Gratis" : formatCurrency(price, currency)}
                      </Text>
                    </Group>
                    <Text c="dimmed" size="sm">
                      {fromText} - {toText}
                      {emp ? ` · ${emp.names}` : " · Sin preferencia"}
                    </Text>
                  </Stack>
                </Group>
              );
            })}
          </Stack>
        </Stack>
      </Paper>

      {/* 🔁 Info de recurrencia */}
      {recurrencePattern?.type === 'weekly' && seriesPreview && (
        <Paper withBorder p="md" radius="md" style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
          <Group gap="xs" mb="xs">
            <IconRepeat size={18} />
            <Text fw={700} size="sm">Citas recurrentes</Text>
          </Group>
          <Stack gap={4}>
            <Text size="sm">
              Cada {recurrencePattern.intervalWeeks === 1 ? 'semana' : `${recurrencePattern.intervalWeeks} semanas`}
              {' · '}
              {recurrencePattern.weekdays?.map(d => WEEKDAY_LABELS[d]).join(', ')}
            </Text>
            <Text size="sm" c="dimmed">
              Se crearán <Text span fw={700} c="green">{seriesPreview.availableCount}</Text> de {seriesPreview.totalOccurrences} citas
            </Text>
          </Stack>
        </Paper>
      )}

      <Paper p="md" shadow="sm" radius="md" withBorder>
        <Group justify="space-between">
          <Text fw={700} size="md">
            {recurrencePattern?.type === 'weekly' && seriesPreview
              ? `Total estimado (${seriesPreview.availableCount} citas)`
              : 'Total a pagar'
            }
          </Text>
          <Text fw={800} size="lg" c="green">
            {(() => {
              const multiplier = recurrencePattern?.type === 'weekly' && seriesPreview
                ? seriesPreview.availableCount
                : 1;
              const total = grandTotal * multiplier;
              return total === 0 ? "Gratis" : formatCurrency(total, currency);
            })()}
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
