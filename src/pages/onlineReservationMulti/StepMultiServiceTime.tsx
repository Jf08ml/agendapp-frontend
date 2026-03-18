/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import {
  Stack,
  Group,
  Paper,
  Text,
  Notification,
  Loader,
  Divider,
  ScrollArea,
  SimpleGrid,
  UnstyledButton,
  Button,
  Switch,
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

  // UI state: mostrar/ocultar grid
  const [showBlockPicker, setShowBlockPicker] = useState(true);

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

  // Al seleccionar bloque: colapsar el grid
  useEffect(() => {
    setShowBlockPicker(!isBlockSelected);
  }, [isBlockSelected]);

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
    setShowBlockPicker(false);
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
    const bg = active ? "var(--mantine-color-green-light)" : "white";
    const borderColor = active
      ? "var(--mantine-color-green-filled)"
      : "var(--mantine-color-gray-3)";

    return (
      <UnstyledButton
        onClick={onClick}
        style={{
          width: "100%",
          padding: 10,
          minHeight: 44,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          background: bg,
          cursor: "pointer",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        <Text fw={800} size="sm" style={{ lineHeight: 1.15 }}>
          {label}
        </Text>
      </UnstyledButton>
    );
  };

  // === RENDER ===
  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }} gap="xs">
        <Loader />
        <Text size="sm">Buscando horarios disponibles...</Text>
      </Stack>
    );
  }

  if (dates.length === 0) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }}>
        <Text c="dimmed" size="sm">
          Selecciona primero al menos una fecha.
        </Text>
      </Stack>
    );
  }

  const cols = { base: 2, sm: 3, md: 4, lg: 5 };

  return (
    <Stack gap="xs">
      <Text fw={800} size="md">
        Selecciona horarios
      </Text>
      <Divider />

      {blockOptions.length === 0 ? (
        <Notification color="red" title="Sin bloques disponibles">
          No hay bloques disponibles para la combinación seleccionada (verifica
          profesionales y duración).
        </Notification>
      ) : (
        <Paper withBorder p="sm">
          {/* Header */}
          <Group justify="space-between" gap="xs" wrap="nowrap" mb={4}>
            <Text fw={800} size="sm" lineClamp={1}>
              {selectedServices.length} servicios seleccionados
            </Text>

            <Text size="xs" c="dimmed">
              {dates?.[0]?.date
                ? dayjs(dates[0].date).format("DD/MM/YYYY")
                : "-"}
            </Text>
          </Group>

          {/* Subheader */}
          <Text size="xs" c="dimmed" mb="xs">
            {(() => {
              const totalMin = selectedServices.reduce((acc, sel) => {
                const svc = services.find((s) => s._id === sel.serviceId);
                return acc + (svc?.duration ?? 0);
              }, 0);

              const empIds = selectedServices
                .map((s) => s.employeeId)
                .filter(Boolean) as string[];
              const uniqueEmpIds = Array.from(new Set(empIds));

              const who =
                uniqueEmpIds.length === 1
                  ? employees.find((e) => e._id === uniqueEmpIds[0])?.names ??
                    "Sin preferencia"
                  : "Múltiples profesionales";

              return `${who} · ${totalMin} min`;
            })()}
          </Text>

          {/* Contenido */}
          {isBlockSelected && !showBlockPicker ? (
            <>
              <Group justify="space-between" align="center" mb="xs">
                <Text fw={800} size="sm">
                  Hora seleccionada
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setShowBlockPicker(true)}
                >
                  Cambiar hora
                </Button>
              </Group>

              <Stack gap="xs">
                {(value?.intervals ?? []).map((i: any, idx: number) => {
                  const svc = services.find((s) => s._id === i.serviceId);
                  const durationMin =
                    typeof svc?.duration === "number" ? svc.duration : null;

                  const startTime =
                    i.startStr ? formatTimeFromISO(i.startStr, timeFormat) : formatTime(i.from, timeFormat);
                  const endTime =
                    i.endStr ? formatTimeFromISO(i.endStr, timeFormat) : formatTime(i.to, timeFormat);

                  return (
                    <Stack key={`${i.serviceId}-${idx}`} gap={2}>
                      <Text size="sm" fw={700} lineClamp={1}>
                        {svc?.name ?? "Servicio"}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {durationMin != null && `${durationMin} min · `}
                        {startTime} - {endTime}
                      </Text>
                    </Stack>
                  );
                })}
              </Stack>
            </>
          ) : (
            <>
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="sm">
                  Horas disponibles (inicio-fin)
                </Text>
                <Text size="xs" c="dimmed">
                  {blockOptions.length} opciones
                </Text>
              </Group>

              <ScrollArea h={260} offsetScrollbars>
                <SimpleGrid cols={cols} spacing="xs">
                  {blockOptions.map((block) => {
                    const isSelected =
                      isBlockSelected &&
                      dayjs(value!.startTime as Date).valueOf() ===
                        dayjs(block.start).valueOf();

                    return (
                      <TimeTile
                        key={block.start.toISOString()}
                        label={block.rangeLabel}
                        active={isSelected}
                        onClick={() =>
                          handleBlockSelect(
                            block.start,
                            block.intervals,
                            (block as any).startStr
                          )
                        }
                      />
                    );
                  })}
                </SimpleGrid>
              </ScrollArea>
            </>
          )}
        </Paper>
      )}

      {/* 🔁 Sección de recurrencia (solo cuando ya hay horario seleccionado) */}
      {isBlockSelected && (
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
