/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Group,
  Paper,
  Text,
  Notification,
  Loader,
  Divider,
  Center,
  SimpleGrid,
  UnstyledButton,
  ScrollArea,
  Button,
} from "@mantine/core";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
  ServiceTimeSelection,
} from "../../types/multiBooking";
import {
  getMultiServiceBlocks,
  getAvailableSlotsBatch,
  BatchSlotRequest,
} from "../../services/scheduleService";

interface StepMultiServiceTimeProps {
  organizationId: string;
  selectedServices: SelectedService[];
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  value: MultiServiceBlockSelection | ServiceTimeSelection[];
  onChange: (next: MultiServiceBlockSelection | ServiceTimeSelection[]) => void;
}

const StepMultiServiceTime: React.FC<StepMultiServiceTimeProps> = ({
  organizationId,
  selectedServices,
  services,
  employees,
  dates,
  value,
  onChange,
}) => {
  const [loading, setLoading] = useState(false);

  // Bloques encadenados (mismo dia)
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

  // Horarios por servicio (dias distintos)
  const [serviceTimes, setServiceTimes] = useState<
    { serviceId: string; options: string[] }[]
  >([]);

  // UI state: mostrar/ocultar grids
  const [showBlockPicker, setShowBlockPicker] = useState(true);
  const [showServicePicker, setShowServicePicker] = useState<
    Record<string, boolean>
  >({});

  // Detecta si hay fechas distintas
  const splitDates = useMemo(
    () =>
      dates.some(
        (d, _i, arr) => d.date?.toDateString() !== arr[0]?.date?.toDateString()
      ),
    [dates]
  );

  const dateMissing = dates.length === 0 || !dates[0]?.date;

  // Helpers seleccion actual
  const selectedBlock = !Array.isArray(value)
    ? (value as MultiServiceBlockSelection)
    : null;

  const splitValue = Array.isArray(value)
    ? (value as ServiceTimeSelection[])
    : [];

  const isBlockSelected = !!selectedBlock?.startTime;

  // Al seleccionar bloque: colapsar el grid
  useEffect(() => {
    if (!splitDates) setShowBlockPicker(!isBlockSelected);
  }, [splitDates, isBlockSelected]);

  // Seed inicial en modo split: copiar employeeId y date desde "dates"
  useEffect(() => {
    if (!splitDates) return;
    const val = Array.isArray(value) ? (value as ServiceTimeSelection[]) : [];
    const needsInit =
      val.length !== selectedServices.length ||
      selectedServices.some((s) => !val.find((v) => v.serviceId === s.serviceId));

    if (needsInit) {
      const seeded: ServiceTimeSelection[] = selectedServices.map((s) => {
        const d = dates.find((x) => x.serviceId === s.serviceId);
        return {
          serviceId: s.serviceId,
          employeeId: d?.employeeId ?? null,
          date: d?.date ?? null,
          time: null,
        };
      });
      onChange(seeded);
    }
  }, [splitDates, selectedServices, dates]);

  // Inicializa showServicePicker: por defecto, mostrar grid hasta que se seleccione hora
  useEffect(() => {
    if (!splitDates) return;
    setShowServicePicker((prev) => {
      const next = { ...prev };
      for (const s of selectedServices) {
        const sel = splitValue.find((v) => v.serviceId === s.serviceId);
        if (next[s.serviceId] === undefined) {
          next[s.serviceId] = !sel?.time;
        } else {
          if (sel?.time) next[s.serviceId] = false;
        }
      }
      return next;
    });
  }, [splitDates, selectedServices, value]);

  useEffect(() => {
    const load = async () => {
      if (dates.length === 0) return;
      setLoading(true);

      try {
        // =========================
        // Escenario 1: MISMO DIA
        // =========================
        if (!splitDates && dates[0]?.date) {
          // 1) servicios encadenados (algunos pueden venir con employeeId null)
          const chainServices = selectedServices.map((sel) => {
            const service = services.find((s) => s._id === sel.serviceId);
            return {
              serviceId: sel.serviceId,
              employeeId: sel.employeeId, // puede ser null
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
            // timeStr puede ser "09:00" o "9:00" o ya un ISO
            if (timeStr.includes("T") || timeStr.includes("-")) {
              // Ya es ISO
              return new Date(timeStr);
            }
            // Es solo hora HH:mm
            return dayjs(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm").toDate();
          };

          // Helper para formatear hora desde ISO string sin conversión de timezone
          const formatTimeFromISO = (isoStr: string): string => {
            const match = isoStr.match(/T(\d{2}):(\d{2})/);
            if (!match) return isoStr;
            const hour = parseInt(match[1]);
            const min = match[2];
            const period = hour >= 12 ? "PM" : "AM";
            const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${hour12}:${min} ${period}`;
          };

          // Mapear respuesta del backend
          const mapped = response.blocks.map((block) => ({
            intervals: block.intervals.map((interval: { serviceId: string; employeeId: string | null; start: string; end: string }) => ({
              serviceId: interval.serviceId,
              employeeId: interval.employeeId,
              from: toFullDate(interval.start),
              to: toFullDate(interval.end),
              // 🔧 FIX: Guardar los strings originales para mostrar sin conversión de timezone
              startStr: interval.start,
              endStr: interval.end,
            })),
            start: new Date(block.start),
            end: new Date(block.end),
            // 🔧 FIX: Guardar el string original del bloque para enviarlo al backend
            startStr: block.start,
            // 🔧 FIX: Formatear desde el string original sin conversión de timezone
            rangeLabel: `${formatTimeFromISO(block.start)} - ${formatTimeFromISO(block.end)}`,
          }));

          setBlockOptions(mapped);
        }

        // =========================
        // Escenario 2: DIAS DIFERENTES
        // =========================
        else if (splitDates) {
          // Construir requests para el batch
          const requests: BatchSlotRequest[] = dates
            .filter((d) => d.date)
            .map((d) => {
              const service = services.find((s) => s._id === d.serviceId);
              return {
                date: dayjs(d.date).format("YYYY-MM-DD"),
                serviceId: d.serviceId,
                employeeId: d.employeeId || null,
                duration: service?.duration ?? 0,
              };
            });

          // Llamar al backend
          const response = await getAvailableSlotsBatch(organizationId, requests);

          if (!response || !response.results) {
            setServiceTimes([]);
            return;
          }

          // Mapear respuesta
          const perService = response.results.map((result) => ({
            serviceId: result.serviceId,
            options: result.slots,
          }));

          setServiceTimes(perService);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!dateMissing) void load();
  }, [dates, selectedServices, services, organizationId, splitDates, dateMissing]);

  // Handler para bloque unico (todos el mismo dia)
  const handleBlockSelect = (start: Date, intervals: any[], startStr?: string) => {
    onChange({ startTime: start, intervals, startTimeStr: startStr });
    setShowBlockPicker(false);
  };

  // Handler para seleccion de hora individual (dias distintos)
  // El backend ya se encarga de asignar el mejor empleado si no hay preferencia
  const handleTimeSelect = async (serviceId: string, time: string) => {
    const current = splitValue || [];
    const fromDates = dates.find((d) => d.serviceId === serviceId);
    const prev = current.find((v) => v.serviceId === serviceId);

    const dateForService = fromDates?.date ?? prev?.date ?? null;
    const employeeId = fromDates?.employeeId ?? prev?.employeeId ?? null;

    const next: ServiceTimeSelection[] = [
      ...current.filter((v) => v.serviceId !== serviceId),
      {
        serviceId,
        time,
        employeeId,
        date: dateForService,
      },
    ];

    onChange(next);
    setShowServicePicker((p) => ({ ...p, [serviceId]: false }));
  };

  // Tile compacto para la grilla de opciones
  const TimeTile = ({
    label,
    active,
    onClick,
    tone = "blue",
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
    tone?: "blue" | "green";
  }) => {
    const bg = active
      ? tone === "green"
        ? "var(--mantine-color-green-light)"
        : "var(--mantine-color-blue-light)"
      : "white";

    const borderColor = active
      ? tone === "green"
        ? "var(--mantine-color-green-filled)"
        : "var(--mantine-color-blue-filled)"
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

  // Rango inicio-fin para modo split (con duracion)
  const toRangeLabel = (
    dateForService: Date | null,
    startLabel: string,
    durationMin: number
  ) => {
    if (!dateForService) return startLabel;
    
    // Asegurar que dateForService sea un Date valido
    const baseDate = dateForService instanceof Date 
      ? dateForService 
      : new Date(dateForService);
    
    if (isNaN(baseDate.getTime())) return startLabel;
    
    const base = dayjs(baseDate);
    const dateStr = base.format("YYYY-MM-DD");

    // Intentar varios formatos de hora
    let start = dayjs(`${dateStr} ${startLabel}`, "YYYY-MM-DD h:mm A");
    if (!start.isValid()) {
      start = dayjs(`${dateStr} ${startLabel}`, "YYYY-MM-DD HH:mm");
    }
    if (!start.isValid()) {
      start = dayjs(`${dateStr} ${startLabel}`, "YYYY-MM-DD H:mm");
    }

    if (!start.isValid()) return startLabel;

    const end = start.add(durationMin, "minute");
    return `${start.format("h:mm A")} - ${end.format("h:mm A")}`;
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
      <Center>
        <Text c="dimmed" size="sm">
          Selecciona primero al menos una fecha.
        </Text>
      </Center>
    );
  }

  const cols = { base: 2, sm: 3, md: 4, lg: 5 };

  return (
    <Stack gap="xs">
      <Text fw={800} size="md">
        Selecciona horarios
      </Text>
      <Divider />

      {/* ===== MODO 1: Todos el mismo dia ===== */}
      {!splitDates && (
        <>
          {blockOptions.length === 0 ? (
            <Notification color="red" title="Sin bloques disponibles">
              No hay bloques disponibles para la combinacion seleccionada
              (verifica empleados y duracion).
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
                      ? employees.find((e) => e._id === uniqueEmpIds[0])
                          ?.names ?? "Sin preferencia"
                      : "Multiples profesionales";

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
                    {(selectedBlock?.intervals ?? []).map((i: any, idx: number) => {
                      const svc = services.find((s) => s._id === i.serviceId);
                      const durationMin =
                        typeof svc?.duration === "number" ? svc.duration : null;

                      // 🔧 FIX: Usar strings originales si existen, sino usar Date
                      const startTime = i.startStr || dayjs(i.from).format("h:mm A");
                      const endTime = i.endStr || dayjs(i.to).format("h:mm A");

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
                          dayjs(selectedBlock!.startTime as Date).valueOf() ===
                            dayjs(block.start).valueOf();

                        return (
                          <TimeTile
                            key={block.start.toISOString()}
                            label={block.rangeLabel}
                            active={isSelected}
                            tone="green"
                            onClick={() => handleBlockSelect(block.start, block.intervals, (block as any).startStr)}
                          />
                        );
                      })}
                    </SimpleGrid>
                  </ScrollArea>
                </>
              )}
            </Paper>
          )}
        </>
      )}

      {/* ===== MODO 2: Servicios en dias diferentes ===== */}
      {splitDates &&
        serviceTimes.map((s) => {
          const sel = splitValue.find((v) => v.serviceId === s.serviceId);
          const service = services.find((sv) => sv._id === s.serviceId);

          const fallbackEmpId =
            dates.find((x) => x.serviceId === s.serviceId)?.employeeId ?? null;
          const effectiveEmpId = sel?.employeeId ?? fallbackEmpId;
          const emp = employees.find((e) => e._id === effectiveEmpId);

          const dateForService =
            sel?.date ??
            dates.find((x) => x.serviceId === s.serviceId)?.date ??
            null;

          const duration = service?.duration ?? 0;
          const pickerVisible = showServicePicker[s.serviceId] ?? !sel?.time;

          return (
            <Paper key={s.serviceId} withBorder p="sm">
              <Group justify="space-between" gap="xs" wrap="nowrap" mb={4}>
                <Text fw={800} size="sm" lineClamp={1}>
                  {service?.name ?? "Servicio"}
                </Text>
                <Text size="xs" c="dimmed">
                  {dateForService ? dayjs(dateForService).format("DD/MM/YYYY") : "-"}
                </Text>
              </Group>

              <Text size="xs" c="dimmed" mb="xs">
                {emp?.names ?? "Sin preferencia"} · {duration} min
              </Text>

              {sel?.time && !pickerVisible ? (
                <>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text fw={800} size="sm">
                      Hora seleccionada
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() =>
                        setShowServicePicker((p) => ({ ...p, [s.serviceId]: true }))
                      }
                    >
                      Cambiar hora
                    </Button>
                  </Group>

                  <Text size="sm">
                    {toRangeLabel(dateForService, sel.time, duration)}
                  </Text>
                </>
              ) : (
                <>
                  {s.options.length === 0 ? (
                    <Text c="red" size="sm">
                      No hay horarios disponibles para la fecha seleccionada.
                    </Text>
                  ) : (
                    <>
                      <Group justify="space-between" mb="xs">
                        <Text fw={700} size="sm">
                          Horas disponibles (inicio-fin)
                        </Text>
                        <Text size="xs" c="dimmed">
                          {s.options.length} opciones
                        </Text>
                      </Group>

                      <ScrollArea h={220} offsetScrollbars>
                        <SimpleGrid cols={cols} spacing="xs">
                          {s.options.map((h) => (
                            <TimeTile
                              key={h}
                              label={toRangeLabel(dateForService, h, duration)}
                              active={sel?.time === h}
                              onClick={() => void handleTimeSelect(s.serviceId, h)}
                            />
                          ))}
                        </SimpleGrid>
                      </ScrollArea>
                    </>
                  )}
                </>
              )}
            </Paper>
          );
        })}
    </Stack>
  );
};

export default StepMultiServiceTime;
