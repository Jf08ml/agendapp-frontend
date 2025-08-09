/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Group,
  Paper,
  Text,
  Select,
  Badge,
  Grid,
  Notification,
  Loader,
  Divider,
  Center,
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
} from "./bookingUtilsMulti";

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
      time: string;
      intervals: {
        serviceId: string;
        employeeId: string | null;
        from: Date;
        to: Date;
      }[];
      start: Date;
    }[]
  >([]);

  // Horarios por servicio (días distintos)
  const [serviceTimes, setServiceTimes] = useState<
    { serviceId: string; options: string[] }[]
  >([]);

  // Detecta si hay fechas distintas
  const splitDates = useMemo(
    () => dates.some((d, _i, arr) => d.date?.toDateString() !== arr[0]?.date?.toDateString()),
    [dates]
  );

  const dateMissing = dates.length === 0 || !dates[0]?.date;

  // 🔹 Seed inicial en modo split: copiar employeeId y date desde "dates"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitDates, selectedServices, dates]);

  useEffect(() => {
    const load = async () => {
      if (dates.length === 0) return;
      setLoading(true);

      try {
        // Escenario 1: Todos el mismo día
        if (!splitDates && dates[0]?.date) {
          const empIds = selectedServices
            .map((s) => s.employeeId)
            .filter((e): e is string => !!e);

          // Si no hay empleados definidos, no se puede calcular bloque encadenado correctamente
          if (empIds.length !== selectedServices.length) {
            setBlockOptions([]);
            setLoading(false);
            return;
          }

          const startISO = dayjs(dates[0].date).startOf("day").toISOString();
          const endISO = dayjs(dates[0].date).endOf("day").toISOString();

          const allAppointments = await getAppointmentsByOrganizationId(
            organizationId,
            startISO,
            endISO
          );

          const appointmentsByEmp: Record<string, Appointment[]> = {};
          empIds.forEach((id) => {
            appointmentsByEmp[id] = allAppointments.filter(
              (a) => a.employee && a.employee._id === id
            );
          });

          // Estructura para findAvailableMultiServiceSlots
          const chainServices = selectedServices.map((sel) => {
            const service = services.find((s) => s._id === sel.serviceId);
            return {
              employeeId: sel.employeeId,
              duration: service?.duration ?? 0,
              serviceId: sel.serviceId,
            };
          });

          const bloques = findAvailableMultiServiceSlots(
            dates[0].date!,
            chainServices,
            appointmentsByEmp
          );

          setBlockOptions(
            bloques.map((block) => ({
              time: dayjs(block.start).format("h:mm A"),
              intervals: block.times.map((t, idx) => ({
                serviceId: chainServices[idx].serviceId,
                employeeId: t.employeeId,
                from: t.from,
                to: t.to,
              })),
              start: block.start,
            }))
          );
        }
        // Escenario 2: Por días independientes
        else if (splitDates) {
          const perService: { serviceId: string; options: string[] }[] = [];

          for (const d of dates) {
            if (!d.date) continue;
            const service = services.find((s) => s._id === d.serviceId);
            const empId = d.employeeId;
            if (!service || !empId) {
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

            const appts = allAppointments.filter(
              (appt) => appt.employee && appt.employee._id === empId
            );

            const availableTimes = generateAvailableTimes(
              d.date,
              service.duration,
              appts
            );
            perService.push({ serviceId: d.serviceId, options: availableTimes });
          }

          setServiceTimes(perService);
        }
      } finally {
        setLoading(false);
      }
    };

    // Evita llamadas sin fecha
    if (!dateMissing) void load();
  }, [dates, selectedServices, services, organizationId, splitDates, dateMissing]);

  // Handler para bloque único (todos el mismo día)
  const handleBlockSelect = (start: Date, intervals: any[]) => {
    onChange({
      startTime: start,
      intervals,
    });
  };

  // Handler para selección de hora individual (días distintos)
  const handleTimeSelect = (serviceId: string, time: string) => {
    const current = (Array.isArray(value) ? (value as ServiceTimeSelection[]) : []) || [];

    const fromDates = dates.find((d) => d.serviceId === serviceId);
    const prev = current.find((v) => v.serviceId === serviceId);

    const next: ServiceTimeSelection[] = [
      ...current.filter((v) => v.serviceId !== serviceId),
      {
        serviceId,
        time,
        employeeId: fromDates?.employeeId ?? prev?.employeeId ?? null,
        date: fromDates?.date ?? prev?.date ?? null,
      },
    ];
    onChange(next);
  };

  // === RENDER ===
  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }}>
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

  return (
    <Stack>
      <Text fw={600} size="lg">
        Selecciona los horarios disponibles
      </Text>
      <Divider />

      {/* Todos los servicios el mismo día */}
      {!splitDates && (
        <>
          {blockOptions.length === 0 ? (
            <Notification color="red" title="Sin bloques disponibles">
              No hay bloques disponibles para la combinación seleccionada (verifica empleados y duración).
            </Notification>
          ) : (
            <Grid gutter="sm">
              {blockOptions.map((block) => {
                const isSelected =
                  !Array.isArray(value) &&
                  (value as MultiServiceBlockSelection)?.startTime &&
                  dayjs((value as MultiServiceBlockSelection).startTime as Date).valueOf() ===
                    dayjs(block.start).valueOf();

                return (
                  <Grid.Col key={block.time} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                    <Paper
                      withBorder
                      p="md"
                      onClick={() => handleBlockSelect(block.start, block.intervals)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "var(--mantine-color-green-light)" : undefined,
                        borderColor: isSelected ? "var(--mantine-color-green-filled)" : undefined,
                        transition: "background 120ms ease",
                      }}
                    >
                      <Group align="center" mb={6} wrap="nowrap">
                        <Badge color="green" variant={isSelected ? "filled" : "light"}>
                          {block.time}
                        </Badge>
                        <Text size="sm" fw={600}>
                          Inicio
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {block.intervals
                          .map((i) => {
                            const service = services.find((s) => s._id === i.serviceId);
                            const emp = employees.find((e) => e._id === i.employeeId);
                            return `${service?.name}: ${dayjs(i.from).format("h:mm A")} - ${dayjs(
                              i.to
                            ).format("h:mm A")} (${emp?.names ?? "Sin preferencia"})`;
                          })
                          .join(" | ")}
                      </Text>
                    </Paper>
                  </Grid.Col>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* Servicios en días diferentes */}
      {splitDates &&
        serviceTimes.map((s) => {
          const arr = Array.isArray(value) ? (value as ServiceTimeSelection[]) : [];
          const sel = arr.find((v) => v.serviceId === s.serviceId);

          const service = services.find((sv) => sv._id === s.serviceId);

          // Fallback: si el value no trae employeeId, uso el de "dates"
          const fallbackEmpId = dates.find((x) => x.serviceId === s.serviceId)?.employeeId ?? null;
          const effectiveEmpId = sel?.employeeId ?? fallbackEmpId;
          const emp = employees.find((e) => e._id === effectiveEmpId);

          const dateForService =
            sel?.date ??
            dates.find((x) => x.serviceId === s.serviceId)?.date ??
            null;

          return (
            <Paper key={s.serviceId} withBorder p="md" mt="sm">
              <Text fw={600} mb={6}>
                {service?.name ?? "Servicio"} —{" "}
                {dateForService ? dayjs(dateForService).format("DD/MM/YYYY") : "—"} — (
                {emp?.names ?? "Sin preferencia"})
              </Text>

              {s.options.length === 0 ? (
                <Text c="red" size="sm">
                  No hay horarios disponibles para la fecha seleccionada.
                </Text>
              ) : (
                <Select
                  label="Horario"
                  placeholder="Selecciona una hora"
                  data={s.options.map((h) => ({ value: h, label: h }))}
                  value={sel?.time || null}
                  onChange={(time) => time && handleTimeSelect(s.serviceId, time)}
                  searchable
                  nothingFoundMessage="Sin horarios"
                />
              )}
            </Paper>
          );
        })}
    </Stack>
  );
};

export default StepMultiServiceTime;
