/* eslint-disable react-hooks/exhaustive-deps */
// AdminAnalyticsDashboard.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Group,
  Stack,
  Text,
  NumberFormatter,
  SimpleGrid,
  Paper,
  Badge,
  Avatar,
  Table,
  Divider,
  Select,
  SegmentedControl,
  Loader,
  Tooltip,
  ScrollArea,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import weekOfYear from "dayjs/plugin/weekOfYear";
import minMax from "dayjs/plugin/minMax";

dayjs.extend(minMax);
dayjs.locale("es");
dayjs.extend(weekOfYear);

import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

import {
  getAppointmentsByOrganizationId,
  type Appointment,
} from "../../../services/appointmentService";
import {
  getEmployeesByOrganizationId,
  type Employee as EmployeeLite,
} from "../../../services/employeeService";
import {
  getServicesByOrganizationId,
  type Service as ServiceLite,
} from "../../../services/serviceService";

/* ------------------ Utils ------------------ */
// Precio “de verdad” de una cita (prioriza totalPrice > customPrice > precio del servicio)
function getAppointmentPrice(a: Appointment, services: ServiceLite[]) {
  if (typeof a.totalPrice === "number") return a.totalPrice;
  if (typeof a.customPrice === "number") return a.customPrice;
  const svcId = (a.service as any)?._id ?? a.service;
  const svc = services.find((s) => s._id === svcId);
  return svc?.price ?? 0;
}

const within = (d: Date, from?: Date | null, to?: Date | null) => {
  if (from && dayjs(d).isBefore(from, "day")) return false;
  if (to && dayjs(d).isAfter(to, "day")) return false;
  return true;
};

// Genera buckets [key] entre el rango, llenando ceros
function buildTimeBuckets(
  items: Appointment[],
  services: ServiceLite[],
  range: [Date | null, Date | null],
  granularity: "day" | "week" | "month"
) {
  const start =
    range[0] ? dayjs(range[0]) : dayjs.min(items.map((i) => dayjs(i.startDate)));
  const end =
    range[1] ? dayjs(range[1]) : dayjs.max(items.map((i) => dayjs(i.startDate)));
  if (!start || !end) return [];

  const cursor =
    granularity === "day"
      ? start.startOf("day")
      : granularity === "week"
      ? start.startOf("week")
      : start.startOf("month");
  const last =
    granularity === "day"
      ? end.endOf("day")
      : granularity === "week"
      ? end.endOf("week")
      : end.endOf("month");

  const step =
    granularity === "day"
      ? { unit: "day", fmt: "DD/MM" as const }
      : granularity === "week"
      ? { unit: "week", fmt: "[Sem] WW" as const }
      : { unit: "month", fmt: "MMM" as const };

  const map = new Map<string, { key: string; ingresos: number; citas: number }>();

  // Inicializa buckets en 0
  for (let c = cursor.clone(); c.isBefore(last) || c.isSame(last); c = c.add(1, step.unit as any)) {
    const key = c.format(step.fmt);
    map.set(key, { key, ingresos: 0, citas: 0 });
  }

  // Suma datos (TODAS las citas, sin importar estado)
  items.forEach((a) => {
    const d = dayjs(a.startDate);
    const key =
      granularity === "day"
        ? d.format("DD/MM")
        : granularity === "week"
        ? d.startOf("week").format("[Sem] WW")
        : d.format("MMM");

    const row = map.get(key);
    if (!row) return;
    row.citas += 1;
    row.ingresos += getAppointmentPrice(a, services);
  });

  return Array.from(map.values());
}

/* ------------------ HEATMAP simple (día x hora) ------------------ */
const hours = Array.from({ length: 12 }).map((_, i) => 8 + i); // 08-19
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function HeatCell({ intensity }: { intensity: number }) {
  const alpha = Math.min(0.1 + intensity, 1);
  return (
    <div
      style={{
        width: "100%",
        height: 26,
        borderRadius: 6,
        background: `rgba(34, 197, 94, ${alpha})`,
      }}
    />
  );
}

/* ------------------ KPI Card ------------------ */
function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Text fw={700} size="xl">
          {value}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

/* ------------------ MAIN ------------------ */
const AdminAnalyticsDashboard: React.FC<{ title?: string }> = ({
  title = "Informe del negocio",
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [services, setServices] = useState<ServiceLite[]>([]);

  // Filtros
  const [range, setRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf("month").toDate(),
    dayjs().endOf("month").toDate(),
  ]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  // Carga datos
  useEffect(() => {
    const load = async () => {
      if (!organization?._id) return;
      setLoading(true);
      try {
        const [emps, svcs] = await Promise.all([
          getEmployeesByOrganizationId(organization._id),
          getServicesByOrganizationId(organization._id),
        ]);
        setEmployees(emps);
        setServices(svcs);

        const startISO = range[0] ? dayjs(range[0]).startOf("day").toISOString() : undefined;
        const endISO = range[1] ? dayjs(range[1]).endOf("day").toISOString() : undefined;

        const appts = await getAppointmentsByOrganizationId(
          organization._id,
          startISO,
          endISO
        );
        setAppointments(appts);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization?._id, range[0], range[1]]);

  // Opciones selects
  const employeeOptions = useMemo(
    () => [{ value: "", label: "Todos" }, ...employees.map((e) => ({ value: e._id, label: e.names }))],
    [employees]
  );

  const serviceOptions = useMemo(
    () => [{ value: "", label: "Todos" }, ...services.map((s) => ({ value: s._id, label: s.name }))],
    [services]
  );

  // Filtrado por rango + selects (TODAS las citas)
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.startDate);
      if (!within(d, range[0], range[1])) return false;
      if (employeeId && (a.employee as any)?._id !== employeeId) return false;
      if (serviceId && (a.service as any)?._id !== serviceId) return false;
      return true;
    });
  }, [appointments, range, employeeId, serviceId]);

  // KPIs (TODAS las citas)
  const totalAppts = filtered.length;
  const totalCustomers = new Set(filtered.map((a) => (a.client as any)?._id ?? a.client)).size;
  const totalRevenue = filtered.reduce((acc, a) => acc + getAppointmentPrice(a, services), 0);
  const ticketAvg = totalAppts ? totalRevenue / totalAppts : 0;
  // Mantengo la “tasa de cancelación” informativa sobre el total filtrado
  const cancelRate =
    totalAppts === 0
      ? 0
      : (filtered.filter((a) => a.status === "cancelled").length / totalAppts) * 100;

  // Serie temporal (TODAS las citas)
  const timeSeries = useMemo(
    () => buildTimeBuckets(filtered, services, range, granularity),
    [filtered, services, range, granularity]
  );

  // Por empleado (TODAS las citas)
  const byEmployee = useMemo(() => {
    const map = new Map<string, { emp: EmployeeLite; citas: number; ingresos: number }>();
    filtered.forEach((a) => {
      const empId = (a.employee as any)?._id;
      const emp = employees.find((e) => e._id === empId);
      if (!emp) return;
      const row = map.get(emp._id) ?? { emp, citas: 0, ingresos: 0 };
      row.citas += 1;
      row.ingresos += getAppointmentPrice(a, services);
      map.set(emp._id, row);
    });
    return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [filtered, employees, services]);

  // Por servicio (TODAS las citas)
  const byService = useMemo(() => {
    const map = new Map<string, { svc: ServiceLite; citas: number; ingresos: number }>();
    filtered.forEach((a) => {
      const svcId = (a.service as any)?._id;
      const svc = services.find((s) => s._id === svcId);
      if (!svc) return;
      const row = map.get(svc._id) ?? { svc, citas: 0, ingresos: 0 };
      row.citas += 1;
      row.ingresos += getAppointmentPrice(a, services);
      map.set(svc._id, row);
    });
    return Array.from(map.values()).sort((a, b) => b.citas - a.citas);
  }, [filtered, services]);

  // Heatmap demanda (día/ hora)
  const heat = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 7 }).map(() => Array(hours.length).fill(0));
    filtered.forEach((a) => {
      const d = dayjs(a.startDate);
      const dow = (d.day() + 6) % 7; // 0->Lun ... 6->Dom
      const hr = d.hour();
      const idx = hours.indexOf(hr);
      if (idx >= 0) matrix[dow][idx] += 1;
    });
    const max = Math.max(1, ...matrix.flat());
    const norm = matrix.map((row) => row.map((v) => v / max));
    return { raw: matrix, norm };
  }, [filtered]);

  return (
    <Stack>
      {/* Header + Filtros */}
      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={700} size="xl">
              {title}
            </Text>
            {loading && <Loader size="sm" />}
          </Group>

          <Group wrap="wrap" gap="sm" align="flex-end">
            <DatePickerInput
              type="range"
              label="Rango de fechas"
              placeholder="Selecciona un rango"
              value={range}
              onChange={setRange}
              locale="es"
              dropdownType="modal"
            />
            <Select
              label="Empleado"
              data={employeeOptions}
              value={employeeId ?? ""}
              onChange={(v) => setEmployeeId(v || null)}
              searchable
              nothingFoundMessage="Sin resultados"
            />
            <Select
              label="Servicio"
              data={serviceOptions}
              value={serviceId ?? ""}
              onChange={(v) => setServiceId(v || null)}
              searchable
              nothingFoundMessage="Sin resultados"
            />
            <SegmentedControl
              value={granularity}
              onChange={(v: any) => setGranularity(v)}
              data={[
                { label: "Día", value: "day" },
                { label: "Semana", value: "week" },
                { label: "Mes", value: "month" },
              ]}
              size={isMobile ? "xs" : "sm"}
            />
          </Group>
        </Stack>
      </Card>

      {/* KPIs */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4, xl: 5 }}>
        <KpiCard
          label="Ingresos"
          value={
            <NumberFormatter
              value={totalRevenue}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
            />
          }
          hint="Todas las citas"
        />
        <KpiCard label="Citas" value={<>{totalAppts}</>} />
        <KpiCard label="Clientes" value={<>{totalCustomers}</>} />
        <KpiCard
          label="Ticket promedio"
          value={
            <NumberFormatter
              value={ticketAvg || 0}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
            />
          }
          hint="Ingresos / citas"
        />
        <KpiCard
          label="Cancelaciones"
          value={<Text>{cancelRate.toFixed(1)}%</Text>}
          hint="Sobre el total filtrado"
        />
      </SimpleGrid>

      {/* Serie temporal */}
      <Card withBorder radius="md" p="md">
        <Text fw={700} size="lg" mb="xs">
          Tendencia: ingresos y citas
        </Text>
        <Divider mb="sm" />
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RTooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="citas"
                name="Citas"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Servicios más vendidos */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">
            Servicios más vendidos
          </Text>
          <Divider mb="sm" />
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart
                data={byService.map((r) => ({
                  name: r.svc.name,
                  citas: r.citas,
                  ingresos: r.ingresos,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RTooltip />
                <Legend />
                <Bar dataKey="citas" name="Citas" fill="#0ea5e9" />
                <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Heatmap día x hora */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">
            Demanda por día y hora
          </Text>
          <Divider mb="sm" />
          <Stack gap="xs">
            <Group gap="xs" wrap="nowrap" align="center" justify="space-between">
              <div style={{ width: 40 }} />
              {hours.map((h) => (
                <Text key={h} size="xs" ta="center" style={{ width: 32 }}>
                  {String(h).padStart(2, "0")}
                </Text>
              ))}
            </Group>

            {days.map((d, rowIdx) => (
              <Group key={d} gap="xs" wrap="nowrap" align="center">
                <Text size="xs" w={40}>
                  {d}
                </Text>
                {hours.map((_, colIdx) => {
                  const intensity = heat.norm[rowIdx]?.[colIdx] ?? 0;
                  const raw = heat.raw[rowIdx]?.[colIdx] ?? 0;
                  return (
                    <Tooltip label={`${raw} citas`} key={colIdx} withArrow>
                      <div style={{ width: 32 }}>
                        <HeatCell intensity={intensity} />
                      </div>
                    </Tooltip>
                  );
                })}
              </Group>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Rendimiento por empleado */}
      <Card withBorder radius="md" p="md">
        <Text fw={700} size="lg" mb="xs">
          Rendimiento por empleado
        </Text>
        <Divider mb="sm" />
        <ScrollArea>
          <Table withTableBorder striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Empleado</Table.Th>
                <Table.Th>Citas</Table.Th>
                <Table.Th>Ingresos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {byEmployee.map((row) => (
                <Table.Tr key={row.emp._id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar
                        src={row.emp.profileImage || undefined}
                        name={row.emp.names}
                        radius="xl"
                      />
                      <Stack gap={0} justify="center">
                        <Text fw={600}>{row.emp.names}</Text>
                        <Badge
                          size="xs"
                          variant="light"
                          color={row.emp.isActive ? "green" : "gray"}
                        >
                          {row.emp.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>{row.citas}</Table.Td>
                  <Table.Td>
                    <NumberFormatter
                      value={row.ingresos}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="$ "
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
              {byEmployee.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" ta="center">
                      No hay datos para los filtros seleccionados.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
};

export default AdminAnalyticsDashboard;
