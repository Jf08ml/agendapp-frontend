/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
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
import { generateAvailableTimes, findAvailableMultiServiceSlots } from "./bookingUtilsMulti";

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
  const [serviceTimes, setServiceTimes] = useState<
    { serviceId: string; options: string[] }[]
  >([]);

  // Detecta si hay fechas distintas
  const splitDates = dates.some(
    (d, _i, arr) => d.date?.toDateString() !== arr[0].date?.toDateString()
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Escenario 1: Todos el mismo día
      if (!splitDates && dates[0]?.date) {
        const empIds = selectedServices
          .map((s) => s.employeeId)
          .filter((e): e is string => !!e);

        const start = dayjs(dates[0].date).startOf("day").toISOString();
        const end = dayjs(dates[0].date).endOf("day").toISOString();
        const allAppointments = await getAppointmentsByOrganizationId(
          organizationId,
          start,
          end
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

        // Esta función debe estar en bookingUtilsMulti.ts
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
          if (!service || !empId) continue;

          const start = dayjs(d.date).startOf("day").toISOString();
          const end = dayjs(d.date).endOf("day").toISOString();
          const allAppointments = await getAppointmentsByOrganizationId(
            organizationId,
            start,
            end
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
      setLoading(false);
    };
    load();
    // eslint-disable-next-line
  }, [dates, selectedServices, services, employees, organizationId]);

  // Handler para bloque único (todos el mismo día)
  const handleBlockSelect = (start: Date, intervals: any[]) => {
    onChange({
      startTime: start,
      intervals,
    });
  };

  // Handler para selección de hora individual (días distintos)
  const handleTimeSelect = (serviceId: string, time: string) => {
    const next = (value as ServiceTimeSelection[]).map((v) =>
      v.serviceId === serviceId ? { ...v, time } : v
    );
    onChange(next);
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 120 }}>
        <Loader />
        <Text size="sm">Buscando horarios disponibles…</Text>
      </Stack>
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
              No hay bloques disponibles para la combinación seleccionada.
            </Notification>
          ) : (
            <Grid>
              {blockOptions.map((block) => (
                <Grid.Col key={block.time} span={4}>
                  <Paper
                    withBorder
                    p="md"
                    style={{
                      cursor: "pointer",
                      background:
                        value &&
                        (
                          value as MultiServiceBlockSelection
                        ).startTime?.toString() === block.start.toString()
                          ? "#e6f4ea"
                          : undefined,
                    }}
                    onClick={() =>
                      handleBlockSelect(block.start, block.intervals)
                    }
                  >
                    <Group align="center">
                      <Badge color="green">{block.time}</Badge>
                      <Text size="sm">
                        {block.intervals
                          .map((i) => {
                            const service = services.find(
                              (s) => s._id === i.serviceId
                            );
                            const emp = employees.find(
                              (e) => e._id === i.employeeId
                            );
                            return `${service?.name}: ${dayjs(i.from).format(
                              "h:mm A"
                            )} - ${dayjs(i.to).format("h:mm A")} (${
                              emp?.names ?? "Sin preferencia"
                            })`;
                          })
                          .join(" | ")}
                      </Text>
                    </Group>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Servicios en días diferentes */}
      {splitDates &&
        serviceTimes.map((s) => {
          const sel = (value as ServiceTimeSelection[]).find(
            (v) => v.serviceId === s.serviceId
          );
          const service = services.find((sv) => sv._id === s.serviceId);
          const emp = employees.find((e) => e._id === sel?.employeeId);

          return (
            <Paper key={s.serviceId} withBorder p="md" mt="sm">
              <Text fw={600}>
                {service?.name} ({emp?.names ?? "Sin preferencia"})
              </Text>
              {s.options.length === 0 ? (
                <Text color="red" size="sm">
                  No hay horarios disponibles para la fecha seleccionada.
                </Text>
              ) : (
                <Select
                  label="Horario"
                  placeholder="Selecciona una hora"
                  data={s.options.map((h) => ({ value: h, label: h }))}
                  value={sel?.time || null}
                  onChange={(time) => handleTimeSelect(s.serviceId, time!)}
                />
              )}
            </Paper>
          );
        })}
    </Stack>
  );
};

export default StepMultiServiceTime;
