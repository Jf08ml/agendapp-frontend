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
  if (!range[0] || !range[1]) return [];
  
  const start = dayjs(range[0]);
  const end = dayjs(range[1]);

  const buckets: { key: string; ingresos: number; citas: number; timestamp: number }[] = [];
  const bucketMap = new Map<string, { ingresos: number; citas: number; timestamp: number }>();

  // Función para generar la key según granularidad
  const getKey = (date: dayjs.Dayjs) => {
    if (granularity === "day") {
      return date.format("DD/MM");
    } else if (granularity === "week") {
      // Usar el inicio de semana como referencia
      const weekStart = date.startOf("week");
      return `Sem ${weekStart.format("DD/MM")}`;
    } else {
      // Mes: incluir año para evitar colisiones entre años
      return date.format("MMM YYYY");
    }
  };

  // Inicializar buckets según granularidad
  if (granularity === "day") {
    for (let d = start.startOf("day"); d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
      const key = getKey(d);
      bucketMap.set(key, { ingresos: 0, citas: 0, timestamp: d.valueOf() });
    }
  } else if (granularity === "week") {
    for (let d = start.startOf("week"); d.isBefore(end.endOf("week")); d = d.add(1, "week")) {
      const key = getKey(d);
      bucketMap.set(key, { ingresos: 0, citas: 0, timestamp: d.valueOf() });
    }
  } else {
    // month
    for (let d = start.startOf("month"); d.isBefore(end) || d.isSame(end, "month"); d = d.add(1, "month")) {
      const key = getKey(d);
      bucketMap.set(key, { ingresos: 0, citas: 0, timestamp: d.valueOf() });
    }
  }

  // Asignar citas a sus buckets
  items.forEach((a) => {
    const d = dayjs(a.startDate);
    const key = getKey(d);
    
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.citas += 1;
      bucket.ingresos += getAppointmentPrice(a, services);
    }
  });

  // Convertir a array y ordenar cronológicamente
  bucketMap.forEach((value, key) => {
    buckets.push({ key, ...value });
  });

  buckets.sort((a, b) => a.timestamp - b.timestamp);

  return buckets.map(({ key, ingresos, citas }) => ({ key, ingresos, citas }));
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

  // Ajustar rango cuando cambia granularidad
  useEffect(() => {
    if (granularity === "month") {
      // Últimos 6 meses
      setRange([
        dayjs().subtract(5, "month").startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ]);
    } else if (granularity === "week") {
      // Últimas 8 semanas
      setRange([
        dayjs().subtract(7, "week").startOf("week").toDate(),
        dayjs().endOf("week").toDate(),
      ]);
    } else {
      // Mes actual para días
      setRange([
        dayjs().startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ]);
    }
  }, [granularity]);

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

  // 🎯 KPIs Principales (todas las citas)
  const totalAppts = filtered.length;
  const totalCustomers = new Set(filtered.map((a) => (a.client as any)?._id ?? a.client)).size;
  
  // Ingresos totales
  const totalRevenue = filtered.reduce((acc, a) => acc + getAppointmentPrice(a, services), 0);
  
  const ticketAvg = totalAppts ? totalRevenue / totalAppts : 0;

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

  // 📊 Por servicio con más métricas
  const byService = useMemo(() => {
    const map = new Map<string, { 
      svc: ServiceLite; 
      citas: number; 
      ingresos: number;
      duracionTotal: number;
      additionalItems: number;
    }>();
    filtered.forEach((a) => {
      const svcId = (a.service as any)?._id;
      const svc = services.find((s) => s._id === svcId);
      if (!svc) return;
      const row = map.get(svc._id) ?? { 
        svc, 
        citas: 0, 
        ingresos: 0, 
        duracionTotal: 0,
        additionalItems: 0
      };
      row.citas += 1;
      const precio = getAppointmentPrice(a, services);
      row.ingresos += precio;
      row.duracionTotal += svc.duration || 0;
      row.additionalItems += (a.additionalItems?.length || 0);
      map.set(svc._id, row);
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      ingresosPorHora: r.duracionTotal > 0 ? (r.ingresos / (r.duracionTotal / 60)) : 0,
    })).sort((a, b) => b.citas - a.citas);
  }, [filtered, services]);

  // 👥 Análisis de clientes
  const byClient = useMemo(() => {
    const map = new Map<string, { 
      clientId: string;
      clientName: string; 
      citas: number; 
      ingresos: number;
      ultimaCita: Date;
      servicios: Set<string>;
    }>();
    filtered.forEach((a) => {
      const clientId = (a.client as any)?._id ?? a.client;
      const clientName = (a.client as any)?.name ?? "Desconocido";
      const row = map.get(clientId) ?? { 
        clientId,
        clientName, 
        citas: 0, 
        ingresos: 0,
        ultimaCita: new Date(a.startDate),
        servicios: new Set<string>()
      };
      row.citas += 1;
      row.ingresos += getAppointmentPrice(a, services);
      if (new Date(a.startDate) > row.ultimaCita) {
        row.ultimaCita = new Date(a.startDate);
      }
      row.servicios.add((a.service as any)?._id ?? a.service);
      map.set(clientId, row);
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      servicios: r.servicios.size,
      diasDesdeUltimaCita: dayjs().diff(dayjs(r.ultimaCita), 'day'),
      esRecurrente: r.citas > 1,
      ticketPromedio: r.ingresos / r.citas
    })).sort((a, b) => b.ingresos - a.ingresos);
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

  // 💡 Insights y recomendaciones automáticas
  const insights = useMemo(() => {
    const tips: { icon: string; title: string; message: string; color: string }[] = [];
    
    // Clientes en riesgo
    const clientesEnRiesgo = byClient.filter(c => c.esRecurrente && c.diasDesdeUltimaCita > 60).length;
    if (clientesEnRiesgo > 0) {
      tips.push({
        icon: "📞",
        title: "Clientes inactivos",
        message: `${clientesEnRiesgo} clientes recurrentes no visitan hace +60 días. Envía promociones para reactivarlos.`,
        color: "yellow"
      });
    }
    
    // Servicios de baja demanda
    const serviciosBajaDemanda = byService.filter(s => s.citas < 3 && services.length > 5);
    if (serviciosBajaDemanda.length > 0) {
      tips.push({
        icon: "📢",
        title: "Servicios poco vendidos",
        message: `${serviciosBajaDemanda.length} servicios tienen baja demanda. Considera paquetes o descuentos especiales.`,
        color: "blue"
      });
    }
    
    // Servicios rentables (ingresos/hora)
    const servicioMasRentable = byService.reduce((prev, curr) => 
      curr.ingresosPorHora > prev.ingresosPorHora ? curr : prev
    , byService[0]);
    if (servicioMasRentable && byService.length > 2) {
      tips.push({
        icon: "💎",
        title: "Servicio estrella",
        message: `"${servicioMasRentable.svc.name}" genera $${servicioMasRentable.ingresosPorHora.toFixed(0)}/hora. Promociónalo más.`,
        color: "green"
      });
    }
    
    // Proyección fin de mes
    if (range[0] && range[1]) {
      const dias = dayjs(range[1]).diff(dayjs(range[0]), 'day') + 1;
      const ingresosDia = totalRevenue / dias;
      const diasRestantes = dayjs(range[1]).endOf('month').diff(dayjs(), 'day');
      if (diasRestantes > 0 && dias >= 7) {
        const proyeccion = totalRevenue + (ingresosDia * diasRestantes);
        tips.push({
          icon: "📈",
          title: "Proyección del mes",
          message: `Al ritmo actual, terminarás con $${proyeccion.toLocaleString('es-CO')} (${diasRestantes} días restantes).`,
          color: "teal"
        });
      }
    }
    
    return tips;
  }, [totalAppts, byClient, byService, totalRevenue, services.length, range]);

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
            <div>
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
              {granularity === "month" && (
                <Text size="xs" c="dimmed" mt={4}>
                  Mostrando últimos 6 meses. Modifica el rango para ver más.
                </Text>
              )}
              {granularity === "week" && (
                <Text size="xs" c="dimmed" mt={4}>
                  Mostrando últimas 8 semanas. Modifica el rango para ver más.
                </Text>
              )}
            </div>
          </Group>
        </Stack>
      </Card>

      {/* KPIs Principales */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <KpiCard
          label="💰 Ingresos Totales"
          value={
            <NumberFormatter
              value={totalRevenue}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
            />
          }
          hint={`${totalAppts} citas en total`}
        />
        <KpiCard
          label="📊 Total Citas"
          value={<>{totalAppts}</>}
          hint={`${totalCustomers} clientes únicos`}
        />
        <KpiCard
          label="👥 Clientes Únicos"
          value={<>{totalCustomers}</>}
          hint={`${(totalAppts / (totalCustomers || 1)).toFixed(1)} citas/cliente`}
        />
        <KpiCard
          label="🎯 Ticket Promedio"
          value={
            <NumberFormatter
              value={ticketAvg}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
              decimalScale={0}
            />
          }
          hint="Por cita"
        />
      </SimpleGrid>
      
      {/* KPIs Secundarios */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
        <Paper withBorder p="xs" radius="md">
          <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed">Ingresos/Día:</Text>
            <Text size="sm" fw={600}>
              <NumberFormatter
                value={range[0] && range[1] ? totalRevenue / (dayjs(range[1]).diff(dayjs(range[0]), 'day') + 1) : 0}
                thousandSeparator="."
                decimalSeparator=","
                prefix="$"
                decimalScale={0}
              />
            </Text>
          </Group>
        </Paper>
        <Paper withBorder p="xs" radius="md">
          <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed">Citas/Día:</Text>
            <Text size="sm" fw={600}>
              {range[0] && range[1] ? (totalAppts / (dayjs(range[1]).diff(dayjs(range[0]), 'day') + 1)).toFixed(1) : 0}
            </Text>
          </Group>
        </Paper>
        <Paper withBorder p="xs" radius="md">
          <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed">Nuevos Clientes:</Text>
            <Text size="sm" fw={600}>
              {byClient.filter(c => !c.esRecurrente).length}
            </Text>
          </Group>
        </Paper>
        <Paper withBorder p="xs" radius="md">
          <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" c="dimmed">Clientes VIP:</Text>
            <Text size="sm" fw={600} c="grape">
              {byClient.filter(c => c.citas >= 5).length}
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 💡 Insights y Recomendaciones */}
      {insights.length > 0 && (
        <Card withBorder radius="md" p="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Text fw={700} size="lg" mb="sm" c="white">
            💡 Insights del Negocio
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {insights.map((insight, idx) => (
              <Paper key={idx} p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.95)' }}>
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Text size="xl">{insight.icon}</Text>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text fw={600} size="sm" c={insight.color}>
                      {insight.title}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                      {insight.message}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Card>
      )}

      {/* Serie temporal */}
      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="xs">
          <Text fw={700} size="lg">
            Tendencia: ingresos y citas
          </Text>
          <Badge variant="light" color="blue">
            {timeSeries.length} puntos
          </Badge>
        </Group>
        <Divider mb="sm" />
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer key={`chart-${granularity}-${range[0]?.getTime()}-${range[1]?.getTime()}`}>
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

      {/* 🏆 Top Clientes VIP */}
      <Card withBorder radius="md" p="md">
        <Group justify="space-between" mb="xs">
          <Text fw={700} size="lg">
            🏆 Top Clientes
          </Text>
          <Badge size="lg" variant="light" color="grape">
            {byClient.filter(c => c.esRecurrente).length} recurrentes
          </Badge>
        </Group>
        <Divider mb="sm" />
        <ScrollArea h={280}>
          <Stack gap="xs">
            {byClient.slice(0, 10).map((client, idx) => (
              <Paper key={client.clientId} withBorder p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm">
                    <Avatar size="md" radius="xl" color="grape">
                      {idx + 1}
                    </Avatar>
                    <Stack gap={0}>
                      <Text fw={600} size="sm">{client.clientName}</Text>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">{client.citas} citas</Text>
                        <Text size="xs" c="dimmed">•</Text>
                        <Text size="xs" c="dimmed">{client.servicios} servicios</Text>
                        {client.esRecurrente && (
                          <>
                            <Text size="xs" c="dimmed">•</Text>
                            <Badge size="xs" variant="light" color="green">Recurrente</Badge>
                          </>
                        )}
                        {client.diasDesdeUltimaCita > 60 && (
                          <>
                            <Text size="xs" c="dimmed">•</Text>
                            <Badge size="xs" variant="light" color="orange">⚠️ {client.diasDesdeUltimaCita}d sin visitar</Badge>
                          </>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  <Stack gap={0} align="flex-end">
                    <NumberFormatter
                      value={client.ingresos}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="$"
                      decimalScale={0}
                      style={{ fontWeight: 600, fontSize: '0.9rem' }}
                    />
                    <Text size="xs" c="dimmed">
                      Prom: <NumberFormatter value={client.ticketPromedio} thousandSeparator="." decimalSeparator="," prefix="$" decimalScale={0} />
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
            {byClient.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                No hay datos de clientes
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Servicios más vendidos */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">
            📊 Análisis de Servicios
          </Text>
          <Divider mb="sm" />
          <ScrollArea h={400}>
            <Stack gap="sm">
              {byService.map((row, idx) => (
                <Paper key={row.svc._id} withBorder p="sm" radius="md">
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm">
                        <Badge size="lg" variant="light" color="blue">{idx + 1}</Badge>
                        <Stack gap={0}>
                          <Text fw={600} size="sm">{row.svc.name}</Text>
                          <Text size="xs" c="dimmed">
                            {row.svc.duration}min • ${row.svc.price?.toLocaleString('es-CO')}
                          </Text>
                        </Stack>
                      </Group>
                      <Stack gap={0} align="flex-end">
                        <NumberFormatter
                          value={row.ingresos}
                          thousandSeparator="."
                          decimalSeparator=","
                          prefix="$"
                          decimalScale={0}
                          style={{ fontWeight: 600 }}
                        />
                        <Text size="xs" c="dimmed">{row.citas} citas</Text>
                      </Stack>
                    </Group>
                    <Group gap="xs" wrap="wrap">
                      <Badge size="sm" variant="light" color="green">
                        ${row.ingresosPorHora.toFixed(0)}/hora
                      </Badge>
                      <Badge size="sm" variant="light" color="blue">
                        {row.duracionTotal} min totales
                      </Badge>
                      {row.additionalItems > 0 && (
                        <Badge size="sm" variant="light" color="grape">
                          +{row.additionalItems} add-ons
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
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
