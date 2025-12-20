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
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
  ServiceTimeSelection,
} from "../../types/multiBooking";
import {
  getAppointmentsByOrganizationId,
  Appointment,
} from "../../services/appointmentService";
import {
  generateAvailableTimes,
  findAvailableMultiServiceSlots,
  findAvailableMultiServiceSlotsAuto,
  OpeningConstraints,
  buildStartFrom, // ✅ IMPORTANTE (ya existe en tu bookingUtilsMulti.ts)
} from "./bookingUtilsMulti";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

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
      rangeLabel: string; // "9:00 AM – 10:30 AM"
    }[]
  >([]);

  // Horarios por servicio (días distintos)
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

  const org = useSelector((s: RootState) => s.organization.organization);

  const opening: OpeningConstraints = {
    start: org?.openingHours?.start || "",
    end: org?.openingHours?.end || "",
    businessDays: org?.openingHours?.businessDays || [1, 2, 3, 4, 5],
    breaks: org?.openingHours?.breaks || [],
    stepMinutes: (org as any)?.openingHours?.stepMinutes || 5,
  };

  // Helpers selección actual
  const selectedBlock = !Array.isArray(value)
    ? (value as MultiServiceBlockSelection)
    : null;

  const splitValue = Array.isArray(value)
    ? (value as ServiceTimeSelection[])
    : [];

  const isBlockSelected = !!selectedBlock?.startTime;

  // =========================
  // ✅ Helpers: auto-asignación
  // =========================
  const getEligibleEmployeeIdsForService = (serviceId: string) => {
    return employees
      .filter((e) => e.isActive)
      .filter((e) => {
        const svcIds = (e.services || []).map((svc: any) =>
          typeof svc === "string" ? svc : svc._id
        );
        return svcIds.includes(serviceId);
      })
      .map((e) => e._id);
  };

  const isSlotFree = (
    appts: Appointment[],
    from: dayjs.Dayjs,
    to: dayjs.Dayjs
  ) => {
    return !appts.some(
      (a) =>
        dayjs(a.startDate).isBefore(to) && dayjs(a.endDate).isAfter(from)
    );
  };

  const pickEmployeeLeastAppointmentsAndFree = (args: {
    candidateIds: string[];
    appointmentsByEmp: Record<string, Appointment[]>;
    from: dayjs.Dayjs;
    to: dayjs.Dayjs;
  }): string | null => {
    const { candidateIds, appointmentsByEmp, from, to } = args;
    if (!candidateIds.length) return null;

    const candidatesFree = candidateIds
      .filter((id) => isSlotFree(appointmentsByEmp[id] ?? [], from, to))
      .map((id) => ({
        id,
        count: (appointmentsByEmp[id] ?? []).length,
      }));

    if (candidatesFree.length === 0) return null;

    candidatesFree.sort((a, b) => a.count - b.count);
    return candidatesFree[0].id;
  };

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
        // Escenario 1: MISMO DÍA
        // =========================
        if (!splitDates && dates[0]?.date) {
          const startISO = dayjs(dates[0].date).startOf("day").toISOString();
          const endISO = dayjs(dates[0].date).endOf("day").toISOString();

          const allAppointments = await getAppointmentsByOrganizationId(
            organizationId,
            startISO,
            endISO
          );

          // 1) servicios encadenados (algunos pueden venir con employeeId null)
          const chainServices = selectedServices.map((sel) => {
            const service = services.find((s) => s._id === sel.serviceId);
            return {
              employeeId: sel.employeeId, // puede ser null
              duration: service?.duration ?? 0,
              serviceId: sel.serviceId,
            };
          });

          // 2) elegibles por servicio (empleados activos que prestan el servicio)
          const eligibleByService: Record<string, string[]> = {};
          for (const sel of selectedServices) {
            eligibleByService[sel.serviceId] = getEligibleEmployeeIdsForService(
              sel.serviceId
            );
          }

          // 3) appointmentsByEmp para la unión de todos los elegibles (y también los fijos)
          const unionEmpIds = new Set<string>();
          for (const sel of selectedServices) {
            if (sel.employeeId) unionEmpIds.add(sel.employeeId);
            (eligibleByService[sel.serviceId] || []).forEach((id) =>
              unionEmpIds.add(id)
            );
          }

          const appointmentsByEmp: Record<string, Appointment[]> = {};
          for (const id of unionEmpIds) {
            appointmentsByEmp[id] = allAppointments.filter(
              (a) => a.employee && a.employee._id === id
            );
          }

          // 4) si TODOS traen empleado fijo => normal; si NO => AUTO
          const hasAnyNull = chainServices.some((s) => !s.employeeId);

          const bloques = hasAnyNull
            ? findAvailableMultiServiceSlotsAuto(
                dates[0].date!,
                chainServices,
                appointmentsByEmp,
                eligibleByService,
                opening
              )
            : findAvailableMultiServiceSlots(
                dates[0].date!,
                chainServices,
                appointmentsByEmp,
                opening
              );

          const mapped = bloques.map((block) => {
            const start = block.start;
            const end = block.times?.[block.times.length - 1]?.to ?? block.start;

            return {
              intervals: block.times.map((t, idx) => ({
                serviceId: chainServices[idx].serviceId,
                employeeId: t.employeeId, // ✅ ya viene asignado incluso si era “Sin preferencia”
                from: t.from,
                to: t.to,
              })),
              start,
              end,
              rangeLabel: `${dayjs(start).format("h:mm A")} – ${dayjs(end).format(
                "h:mm A"
              )}`,
            };
          });

          setBlockOptions(mapped);
        }

        // =========================
        // Escenario 2: DÍAS DIFERENTES
        // =========================
        else if (splitDates) {
          const perService: { serviceId: string; options: string[] }[] = [];

          for (const d of dates) {
            if (!d.date) continue;

            const service = services.find((s) => s._id === d.serviceId);
            if (!service) {
              perService.push({ serviceId: d.serviceId, options: [] });
              continue;
            }

            const startISO = dayjs(d.date).startOf("day").toISOString();
            const endISO = dayjs(d.date).endOf("day").toISOString();

            const allAppointments = await getAppointmentsByOrganizationId(
              organizationId,
              startISO,
              endISO
            );

            // empleados elegibles para este servicio
            const eligibleEmpIds = getEligibleEmployeeIdsForService(d.serviceId);

            // appointmentsByEmp para todos los elegibles
            const appointmentsByEmp: Record<string, Appointment[]> = {};
            for (const empId of eligibleEmpIds) {
              appointmentsByEmp[empId] = allAppointments.filter(
                (a) => a.employee && a.employee._id === empId
              );
            }

            // Caso A: con empleado escogido
            if (d.employeeId) {
              const appts = appointmentsByEmp[d.employeeId] ?? [];
              const availableTimes = generateAvailableTimes(
                d.date,
                service.duration,
                appts,
                opening
              );
              perService.push({ serviceId: d.serviceId, options: availableTimes });
              continue;
            }

            // Caso B: Sin preferencia -> unión de horarios de todos los elegibles
            const set = new Set<string>();
            for (const empId of eligibleEmpIds) {
              const appts = appointmentsByEmp[empId] ?? [];
              const times = generateAvailableTimes(
                d.date,
                service.duration,
                appts,
                opening
              );
              times.forEach((t) => set.add(t));
            }

            // ordena por hora real
            const sorted = Array.from(set).sort((a, b) => {
              const A = dayjs(
                `${dayjs(d.date).format("YYYY-MM-DD")} ${a}`,
                "YYYY-MM-DD h:mm A"
              ).valueOf();
              const B = dayjs(
                `${dayjs(d.date).format("YYYY-MM-DD")} ${b}`,
                "YYYY-MM-DD h:mm A"
              ).valueOf();
              return A - B;
            });

            perService.push({ serviceId: d.serviceId, options: sorted });
          }

          setServiceTimes(perService);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!dateMissing) void load();
  }, [dates, selectedServices, services, organizationId, splitDates, dateMissing]);

  // Handler para bloque único (todos el mismo día)
  const handleBlockSelect = (start: Date, intervals: any[]) => {
    onChange({ startTime: start, intervals });
    setShowBlockPicker(false);
  };

  // ✅ Handler para selección de hora individual (días distintos)
  //    Si viene sin preferencia, asigna automáticamente “el que tenga menos citas ese día”,
  //    pero SOLO entre los que estén libres en ese slot.
  const handleTimeSelect = async (serviceId: string, time: string) => {
    const current = splitValue || [];
    const fromDates = dates.find((d) => d.serviceId === serviceId);
    const prev = current.find((v) => v.serviceId === serviceId);

    const dateForService = fromDates?.date ?? prev?.date ?? null;

    let employeeId = fromDates?.employeeId ?? prev?.employeeId ?? null;

    // ✅ auto-asignar si no hay empleado
    if (!employeeId && dateForService) {
      const svc = services.find((s) => s._id === serviceId);
      const duration = svc?.duration ?? 0;

      const start = buildStartFrom(dateForService, time); // dayjs
      const end = start.clone().add(duration, "minute");

      const startISO = dayjs(dateForService).startOf("day").toISOString();
      const endISO = dayjs(dateForService).endOf("day").toISOString();

      const allAppointments = await getAppointmentsByOrganizationId(
        organizationId,
        startISO,
        endISO
      );

      const eligibleEmpIds = getEligibleEmployeeIdsForService(serviceId);

      const appointmentsByEmp: Record<string, Appointment[]> = {};
      for (const empId of eligibleEmpIds) {
        appointmentsByEmp[empId] = allAppointments.filter(
          (a) => a.employee && a.employee._id === empId
        );
      }

      employeeId = pickEmployeeLeastAppointmentsAndFree({
        candidateIds: eligibleEmpIds,
        appointmentsByEmp,
        from: start,
        to: end,
      });

      // si nadie está libre, no bloqueamos el UI: dejamos null, pero igual guardamos hora.
      // (Opcional: podrías mostrar una notificación)
    }

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

  // Rango inicio–fin para modo split (con duración)
  const toRangeLabel = (
    dateForService: Date | null,
    startLabel: string,
    durationMin: number
  ) => {
    if (!dateForService) return startLabel;
    const base = dayjs(dateForService);

    const start = dayjs(
      `${base.format("YYYY-MM-DD")} ${startLabel}`,
      "YYYY-MM-DD h:mm A",
      true
    ).isValid()
      ? dayjs(
          `${base.format("YYYY-MM-DD")} ${startLabel}`,
          "YYYY-MM-DD h:mm A",
          true
        )
      : dayjs(
          `${base.format("YYYY-MM-DD")} ${startLabel}`,
          "YYYY-MM-DD HH:mm",
          true
        );

    if (!start.isValid()) return startLabel;

    const end = start.add(durationMin, "minute");
    return `${start.format("h:mm A")} – ${end.format("h:mm A")}`;
  };

  // === RENDER ===
  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }} gap="xs">
        <Loader />
        <Text size="sm">Buscando horarios disponibles…</Text>
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

      {/* ===== MODO 1: Todos el mismo día ===== */}
      {!splitDates && (
        <>
          {blockOptions.length === 0 ? (
            <Notification color="red" title="Sin bloques disponibles">
              No hay bloques disponibles para la combinación seleccionada
              (verifica empleados y duración).
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
                    : "—"}
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
                    {(selectedBlock?.intervals ?? []).map((i: any, idx: number) => {
                      const svc = services.find((s) => s._id === i.serviceId);
                      const durationMin =
                        typeof svc?.duration === "number" ? svc.duration : null;

                      return (
                        <Stack key={`${i.serviceId}-${idx}`} gap={2}>
                          <Text size="sm" fw={700} lineClamp={1}>
                            {svc?.name ?? "Servicio"}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {durationMin != null && `${durationMin} min · `}
                            {dayjs(i.from).format("h:mm A")} –{" "}
                            {dayjs(i.to).format("h:mm A")}
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
                      Horas disponibles (inicio–fin)
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
                            onClick={() => handleBlockSelect(block.start, block.intervals)}
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

      {/* ===== MODO 2: Servicios en días diferentes ===== */}
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
                  {dateForService ? dayjs(dateForService).format("DD/MM/YYYY") : "—"}
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
                          Horas disponibles (inicio–fin)
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
