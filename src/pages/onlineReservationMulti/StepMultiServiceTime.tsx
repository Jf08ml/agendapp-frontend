/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import {
  Stack,
  Text,
  Paper,
  Loader,
  Divider,
  SimpleGrid,
  UnstyledButton,
  Anchor,
  Button,
  Switch,
  useMatches,
} from "@mantine/core";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { formatTimeFromISO, formatTime } from "../../utils/timeFormatUtils";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
} from "../../types/multiBooking";
import { getMultiServiceBlocks } from "../../services/scheduleService";
import type { RecurrencePattern, SeriesPreview as SeriesPreviewType } from "../../services/appointmentService";
import RecurrenceSelector from "../../components/customCalendar/components/RecurrenceSelector";
import SeriesPreviewComponent from "../../components/customCalendar/components/SeriesPreview";
import { previewRecurringReservations } from "../../services/reservationService";
import StepHeading from "./StepHeading";

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

interface StepMultiServiceTimeProps {
  organizationId: string;
  selectedServices: SelectedService[];
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  value: MultiServiceBlockSelection | null;
  onChange: (next: MultiServiceBlockSelection | null) => void;
  // 🔁 Recurrencia
  recurrencePattern: RecurrencePattern;
  onRecurrenceChange: (pattern: RecurrencePattern) => void;
  seriesPreview: SeriesPreviewType | null;
  onSeriesPreviewChange: (preview: SeriesPreviewType | null) => void;
  timeFormat?: string;
}

const StepMultiServiceTime: React.FC<StepMultiServiceTimeProps> = ({
  organizationId,
  selectedServices,
  services,
  employees,
  dates,
  value,
  onChange,
  recurrencePattern,
  onRecurrenceChange,
  seriesPreview,
  onSeriesPreviewChange,
  timeFormat,
}) => {
  const [loading, setLoading] = useState(false);

  // Bloques encadenados (mismo día)
  const [blockOptions, setBlockOptions] = useState<
    {
      intervals: {
        serviceId: string;
        employeeId: string | null;
        from: Date;
        to: Date;
      }[];
      start: Date;
      end: Date;
      rangeLabel: string;
    }[]
  >([]);

  // La recurrencia es poco usada: queda plegada tras un enlace
  const [showRecurrence, setShowRecurrence] = useState(false);

  // Cada franja (Mañana/Tarde/Noche) muestra 2 filas y el resto tras "Ver más"
  const cols = useMatches({ base: 3, sm: 4, md: 5, lg: 6 });
  const visiblePerPeriod = cols * 2;
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const togglePeriod = (period: string) =>
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });

  const [previewLoading, setPreviewLoading] = useState(false);

  const dateMissing = dates.length === 0 || !dates[0]?.date;

  const isBlockSelected = !!value?.startTime;
  const isRecurrenceActive = recurrencePattern.type === 'weekly';

  // Fetch preview cuando cambia el patrón de recurrencia
  const fetchPreview = useCallback(async () => {
    if (!isRecurrenceActive || !isBlockSelected || !dates[0]?.date) return;
    if (!recurrencePattern.weekdays || recurrencePattern.weekdays.length === 0) return;

    const block = value as MultiServiceBlockSelection;
    let startDateStr: string;
    if ((block as any).startTimeStr) {
      startDateStr = (block as any).startTimeStr;
    } else {
      const startDateTime = block.startTime ?? block.intervals[0].from;
      startDateStr = dayjs(startDateTime).format("YYYY-MM-DDTHH:mm:ss");
    }

    setPreviewLoading(true);
    try {
      const preview = await previewRecurringReservations({
        services: block.intervals.map(iv => ({
          serviceId: iv.serviceId,
          employeeId: iv.employeeId ?? null,
        })),
        startDate: startDateStr,
        recurrencePattern,
        organizationId,
      });
      onSeriesPreviewChange(preview ?? null);
    } catch {
      onSeriesPreviewChange(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [isRecurrenceActive, isBlockSelected, recurrencePattern, value, dates, organizationId, onSeriesPreviewChange]);

  useEffect(() => {
    if (isRecurrenceActive && isBlockSelected) {
      fetchPreview();
    } else {
      onSeriesPreviewChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrencePattern, isBlockSelected, isRecurrenceActive]);

  useEffect(() => {
    const load = async () => {
      if (dates.length === 0 || !dates[0]?.date) return;
      setLoading(true);

      try {
        // Servicios encadenados (algunos pueden venir con employeeId null)
        const chainServices = selectedServices.map((sel) => {
          const service = services.find((s) => s._id === sel.serviceId);
          return {
            serviceId: sel.serviceId,
            employeeId: sel.employeeId,
            duration: service?.duration ?? 0,
          };
        });

        // Llamar al backend para obtener bloques
        const response = await getMultiServiceBlocks(
          dayjs(dates[0].date).format("YYYY-MM-DD"),
          organizationId,
          chainServices
        );

        if (!response || !response.blocks) {
          setBlockOptions([]);
          return;
        }

        // Helper para combinar fecha + hora "HH:mm" -> Date
        const dateStr = dayjs(dates[0].date).format("YYYY-MM-DD");
        const toFullDate = (timeStr: string): Date => {
          if (timeStr.includes("T") || timeStr.includes("-")) {
            return new Date(timeStr);
          }
          return dayjs(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm").toDate();
        };

        // Helper para formatear hora desde ISO string sin conversión de timezone
        const formatTimeFromISOLocal = (isoStr: string): string =>
          formatTimeFromISO(isoStr, timeFormat);

        // Mapear respuesta del backend
        const mapped = response.blocks.map((block) => ({
          intervals: block.intervals.map(
            (interval: {
              serviceId: string;
              employeeId: string | null;
              start: string;
              end: string;
            }) => ({
              serviceId: interval.serviceId,
              employeeId: interval.employeeId,
              from: toFullDate(interval.start),
              to: toFullDate(interval.end),
              startStr: interval.start,
              endStr: interval.end,
            })
          ),
          start: new Date(block.start),
          end: new Date(block.end),
          startStr: block.start,
          rangeLabel: `${formatTimeFromISOLocal(block.start)} - ${formatTimeFromISOLocal(block.end)}`,
        }));

        setBlockOptions(mapped);
        setExpandedPeriods(new Set());
      } finally {
        setLoading(false);
      }
    };

    if (!dateMissing) void load();
  }, [dates, selectedServices, services, organizationId, dateMissing]);

  // Handler para selección de bloque
  const handleBlockSelect = (
    start: Date,
    intervals: any[],
    startStr?: string
  ) => {
    onChange({ startTime: start, intervals, startTimeStr: startStr });
  };

  // Tile compacto para la grilla de opciones
  const TimeTile = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => {
    return (
      <UnstyledButton
        onClick={onClick}
        aria-pressed={active}
        style={{
          width: "100%",
          padding: 10,
          minHeight: 46,
          borderRadius: 10,
          border: `1px solid ${
            active
              ? "var(--brand-text)"
              : "var(--mantine-color-default-border)"
          }`,
          background: active
            ? "var(--mantine-primary-color-filled)"
            : "var(--mantine-color-body)",
          color: active ? "var(--mantine-primary-color-contrast)" : undefined,
          cursor: "pointer",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        <Text fw={700} size="sm" inherit style={{ lineHeight: 1.15 }}>
          {label}
        </Text>
      </UnstyledButton>
    );
  };

  // === RENDER ===
  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }} gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Buscando horas libres…</Text>
      </Stack>
    );
  }

  if (dateMissing) return null;

  const totalMin = selectedServices.reduce((acc, sel) => {
    const svc = services.find((s) => s._id === sel.serviceId);
    return acc + (svc?.duration ?? 0);
  }, 0);
  const uniqueEmpIds = Array.from(
    new Set(selectedServices.map((s) => s.employeeId).filter(Boolean) as string[])
  );
  const who =
    uniqueEmpIds.length === 1
      ? employees.find((e) => e._id === uniqueEmpIds[0])?.names
      : undefined;

  // Agrupar por franja usando la hora del string del backend (sin conversión de timezone)
  const periodOf = (block: (typeof blockOptions)[number]): string => {
    const startStr = (block as any).startStr as string | undefined;
    const match = startStr?.match(/T(\d{2}):/);
    const hour = match ? Number(match[1]) : block.start.getHours();
    if (hour < 12) return "Mañana";
    if (hour < 18) return "Tarde";
    return "Noche";
  };
  const groups = ["Mañana", "Tarde", "Noche"]
    .map((period) => ({
      period,
      blocks: blockOptions.filter((b) => periodOf(b) === period),
    }))
    .filter((g) => g.blocks.length > 0);

  return (
    <Stack gap="sm">
      <StepHeading
        title="Elige la hora"
        hint={[
          capitalize(dayjs(dates[0].date).format("dddd D [de] MMMM")),
          `${totalMin} min`,
          who ? `con ${who}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      {blockOptions.length === 0 ? (
        <Paper withBorder radius="md" p="md" ta="center">
          <Text size="sm" c="dimmed">
            Este día ya no tiene horarios. Elige otro día en el calendario.
          </Text>
        </Paper>
      ) : (
        <Stack gap="sm">
          {groups.map(({ period, blocks }) => {
            const isSelectedBlock = (block: (typeof blocks)[number]) =>
              isBlockSelected &&
              dayjs(value!.startTime as Date).valueOf() === dayjs(block.start).valueOf();
            // Si sobraría un solo horario no vale la pena esconderlo
            const hidden = blocks.length - visiblePerPeriod;
            const collapsible = hidden > 1;
            // La hora elegida nunca queda escondida tras "Ver más"
            const selectedIsHidden = blocks.slice(visiblePerPeriod).some(isSelectedBlock);
            const expanded = !collapsible || expandedPeriods.has(period) || selectedIsHidden;
            const shown = expanded ? blocks : blocks.slice(0, visiblePerPeriod);

            return (
            <Stack key={period} gap={6}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {period}
              </Text>
              <SimpleGrid cols={cols} spacing="xs">
                {shown.map((block) => {
                  const startStr = (block as any).startStr as string | undefined;
                  const isSelected = isSelectedBlock(block);

                  return (
                    <TimeTile
                      key={block.start.toISOString()}
                      label={
                        startStr
                          ? formatTimeFromISO(startStr, timeFormat)
                          : formatTime(block.start, timeFormat)
                      }
                      active={isSelected}
                      onClick={() =>
                        handleBlockSelect(block.start, block.intervals, startStr)
                      }
                    />
                  );
                })}
              </SimpleGrid>
              {collapsible && !selectedIsHidden && (
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => togglePeriod(period)}
                  style={{ alignSelf: "center" }}
                >
                  {expanded
                    ? "Ver menos"
                    : `Ver ${hidden} ${hidden === 1 ? "horario" : "horarios"} más`}
                </Button>
              )}
            </Stack>
            );
          })}
        </Stack>
      )}

      {/* 🔁 Sección de recurrencia (solo cuando ya hay horario seleccionado) */}
      {isBlockSelected && !showRecurrence && !isRecurrenceActive && (
        <Anchor
          component="button"
          type="button"
          size="sm"
          ta="left"
          mt="xs"
          onClick={() => setShowRecurrence(true)}
        >
          ¿Quieres repetir esta cita cada semana?
        </Anchor>
      )}

      {isBlockSelected && (showRecurrence || isRecurrenceActive) && (
        <>
          <Divider my="xs" />
          <Switch
            label="Repetir esta cita semanalmente"
            checked={isRecurrenceActive}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                const dayOfWeek = dates[0]?.date ? new Date(dates[0].date).getDay() : 1;
                onRecurrenceChange({
                  type: 'weekly',
                  intervalWeeks: 1,
                  weekdays: [dayOfWeek],
                  endType: 'count',
                  count: 4,
                });
              } else {
                onRecurrenceChange({
                  type: 'none',
                  intervalWeeks: 1,
                  weekdays: [],
                  endType: 'count',
                  count: 1,
                });
                onSeriesPreviewChange(null);
              }
            }}
          />

          {isRecurrenceActive && (
            <Stack gap="md">
              <RecurrenceSelector
                value={recurrencePattern}
                onChange={onRecurrenceChange}
                startDate={dates[0]?.date ? new Date(dates[0].date) : null}
              />

              {previewLoading && (
                <Stack align="center" gap="xs">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Verificando disponibilidad...</Text>
                </Stack>
              )}

              {!previewLoading && seriesPreview && (
                <SeriesPreviewComponent preview={seriesPreview} />
              )}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
};

export default StepMultiServiceTime;
