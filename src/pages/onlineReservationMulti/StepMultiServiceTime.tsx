/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
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
} from "../../types/multiBooking";
import { getMultiServiceBlocks } from "../../services/scheduleService";

interface StepMultiServiceTimeProps {
  organizationId: string;
  selectedServices: SelectedService[];
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  value: MultiServiceBlockSelection | null;
  onChange: (next: MultiServiceBlockSelection | null) => void;
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

  const dateMissing = dates.length === 0 || !dates[0]?.date;

  const isBlockSelected = !!value?.startTime;

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
        const formatTimeFromISO = (isoStr: string): string => {
          const match = isoStr.match(/T(\d{2}):(\d{2})/);
          if (!match) return isoStr;
          const hour = parseInt(match[1]);
          const min = match[2];
          const period = hour >= 12 ? "PM" : "AM";
          const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          return `${hour12}:${min} ${period}`;
        };

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
          rangeLabel: `${formatTimeFromISO(block.start)} - ${formatTimeFromISO(block.end)}`,
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
          empleados y duración).
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
                    i.startStr || dayjs(i.from).format("h:mm A");
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
    </Stack>
  );
};

export default StepMultiServiceTime;
