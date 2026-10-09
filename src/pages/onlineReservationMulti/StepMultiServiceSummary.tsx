/* eslint-disable @typescript-eslint/no-explicit-any */
// StepMultiServiceSummary.tsx
// Tarjeta compacta "Tu cita" que encabeza el paso de datos + confirmación.
import { Paper, Stack, Text, Group, Divider, Anchor } from "@mantine/core";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  ServiceWithDate,
  MultiServiceBlockSelection,
} from "../../types/multiBooking";
import { formatCurrency } from "../../utils/formatCurrency";
import type { RecurrencePattern, SeriesPreview } from "../../services/appointmentService";
import { IconCalendarEvent, IconRepeat, IconPackage, IconPhone } from "@tabler/icons-react";
import { formatPhoneInternational } from "../../utils/phoneUtils";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatTimeFromISO, formatTime } from "../../utils/timeFormatUtils";

dayjs.locale("es");

interface Props {
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  times: MultiServiceBlockSelection | null;
  currency?: string;
  recurrencePattern?: RecurrencePattern;
  seriesPreview?: SeriesPreview | null;
  timeFormat?: string;
  // Se detectó un paquete de sesiones que cubre esta reserva — el costo es $0.
  usingPackage?: boolean;
  /** Volver a elegir fecha/hora */
  onEdit?: () => void;
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export default function StepMultiServiceSummary({
  services,
  employees,
  dates,
  times,
  currency,
  recurrencePattern,
  seriesPreview,
  timeFormat,
  usingPackage = false,
  onEdit,
}: Props) {
  if (!times) return null;

  const svcMap = Object.fromEntries(services.map((s) => [s._id, s]));
  const empMap = Object.fromEntries(employees.map((e) => [e._id, e]));

  const dateText = dates[0]?.date
    ? capitalize(dayjs(dates[0].date).format("dddd D [de] MMMM"))
    : "-";

  // Usar el string original si existe para evitar conversiones de timezone
  const startText = (times as any).startTimeStr
    ? formatTimeFromISO((times as any).startTimeStr, timeFormat)
    : times.startTime
    ? formatTime(times.startTime, timeFormat)
    : times.intervals?.[0]
    ? formatTime(times.intervals[0].from, timeFormat)
    : "-";

  const isRecurring = recurrencePattern?.type === "weekly" && !!seriesPreview;
  const occurrences = isRecurring ? seriesPreview!.availableCount : 1;

  const grandTotal = usingPackage
    ? 0
    : times.intervals.reduce((acc, iv) => acc + toNumber(svcMap[iv.serviceId]?.price), 0) *
      occurrences;

  // Si algún servicio tiene precio oculto, no mostrar precios ni total
  const anyHidePrice = times.intervals.some((iv) => svcMap[iv.serviceId]?.hidePrice);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <IconCalendarEvent
              size={20}
              color="var(--brand-text)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Stack gap={0}>
              <Text fw={700} lh={1.3}>
                {dateText}
              </Text>
              <Text fw={700} lh={1.3} c="var(--brand-text)">
                {startText}
              </Text>
            </Stack>
          </Group>
          {onEdit && (
            <Anchor component="button" type="button" size="sm" onClick={onEdit}>
              Cambiar
            </Anchor>
          )}
        </Group>

        <Divider />

        <Stack gap={8}>
          {times.intervals.map((iv, idx) => {
            const svc = svcMap[iv.serviceId];
            const emp = iv.employeeId ? empMap[iv.employeeId] : undefined;
            const price = usingPackage ? 0 : toNumber(svc?.price);
            const ivAny = iv as any;
            const fromText = ivAny.startStr
              ? formatTimeFromISO(ivAny.startStr, timeFormat)
              : formatTime(iv.from, timeFormat);
            const toText = ivAny.endStr
              ? formatTimeFromISO(ivAny.endStr, timeFormat)
              : formatTime(iv.to, timeFormat);

            return (
              <Group key={`${iv.serviceId}-${idx}`} justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} lh={1.3}>
                    {svc?.name ?? "Servicio"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {fromText} – {toText}
                    {emp ? ` · con ${emp.names}` : ""}
                  </Text>
                </Stack>
                {!svc?.hidePrice && (
                  <Text size="sm" fw={600} c={price === 0 ? "green" : undefined} style={{ whiteSpace: "nowrap" }}>
                    {price === 0 ? "Gratis" : formatCurrency(price, currency)}
                  </Text>
                )}
              </Group>
            );
          })}
        </Stack>

        {isRecurring && (
          <Group gap={6} wrap="nowrap">
            <IconRepeat size={16} style={{ flexShrink: 0 }} />
            <Text size="sm">
              Cada {recurrencePattern!.intervalWeeks === 1 ? "semana" : `${recurrencePattern!.intervalWeeks} semanas`}
              {" "}({recurrencePattern!.weekdays?.map((d) => WEEKDAY_LABELS[d]).join(", ")}) ·{" "}
              <Text span fw={700} inherit>
                {seriesPreview!.availableCount} citas
              </Text>
            </Text>
          </Group>
        )}

        {usingPackage && (
          <Group gap={6} wrap="nowrap">
            <IconPackage size={16} color="var(--mantine-color-green-7)" style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} c="green.8">
              Se paga con tu paquete de sesiones
            </Text>
          </Group>
        )}

        {!anyHidePrice && (
          <>
            <Divider />
            <Group justify="space-between">
              <Text fw={600}>{isRecurring ? `Total (${occurrences} citas)` : "Total"}</Text>
              <Text fw={800} size="lg">
                {grandTotal === 0 ? "Gratis" : formatCurrency(grandTotal, currency)}
              </Text>
            </Group>
          </>
        )}
      </Stack>
    </Paper>
  );
}

/** Línea que resalta el teléfono de confirmación para detectar un dígito mal escrito */
export function ConfirmationPhoneNote({ phone }: { phone?: string }) {
  if (!phone) return null;
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <IconPhone size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <Text size="sm">
        Te enviaremos la confirmación al{" "}
        <Text span fw={800} inherit style={{ whiteSpace: "nowrap" }}>
          {formatPhoneInternational(phone)}
        </Text>
        . Revisa que esté bien escrito.
      </Text>
    </Group>
  );
}
