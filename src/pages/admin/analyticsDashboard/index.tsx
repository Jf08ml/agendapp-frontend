/* eslint-disable react-hooks/exhaustive-deps */
// AdminAnalyticsDashboard.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Select, Skeleton, Tooltip } from "@mantine/core";
import { Link } from "react-router-dom";
import { IconInfoCircle, IconPhoneCall, IconSpeakerphone, IconStar, IconTrendingUp } from "@tabler/icons-react";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import weekOfYear from "dayjs/plugin/weekOfYear";
import minMax from "dayjs/plugin/minMax";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");
dayjs.extend(weekOfYear);

import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { formatCurrency } from "../../../utils/formatCurrency";
import { getAppointmentsAggregatedByOrganizationId } from "../../../services/appointmentService";

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

/* ------------------ Mapa de calor (día x hora) ------------------ */
const hours = Array.from({ length: 12 }).map((_, i) => 8 + i); // 8 a. m. – 7 p. m.
const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// 5 niveles de ink (el 0 es «sin citas», en surface-hover)
const HEAT_OPACITY = [0, 0.15, 0.32, 0.5, 0.72, 0.95];

/* ------------------ MAIN ------------------ */
const AdminAnalyticsDashboard: React.FC<{ title?: string }> = ({ title = "Analíticas" }) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const currency = organization?.currency || "COP";
  const tz = organization?.timezone || "America/Bogota";
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
      setLoadError(false);
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
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization?._id, range[0], range[1], reloadKey]);

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

  // Cifras principales (todas las citas)
  const totalAppts = filtered.length;
  const totalCustomers = new Set(filtered.map((a) => (a.client as any)?._id ?? a.client)).size;
  
  // Ingresos totales
  const totalRevenue = filtered.reduce((acc, a) => acc + getAppointmentPrice(a, services), 0);
  
  const ticketAvg = totalAppts ? totalRevenue / totalAppts : 0;

  // Serie temporal (TODAS las citas) - preferimos buckets del backend (timezone-aware)
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [, setLoadingBuckets] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!organization?._id || !range[0] || !range[1]) return;
      setLoadingBuckets(true);
      try {
        const buckets = await getAppointmentsAggregatedByOrganizationId(
          organization._id,
          dayjs(range[0]).format('YYYY-MM-DD'),
          dayjs(range[1]).format('YYYY-MM-DD'),
          granularity,
          undefined
        );
        if (buckets && buckets.length > 0) {
          setTimeSeries(buckets.map((b: any) => ({ key: b.key, ingresos: b.ingresos, citas: b.citas, timestamp: b.timestamp })));
        } else {
          setTimeSeries(buildTimeBuckets(filtered, services, range, granularity));
        }
      } catch (err) {
        console.error('Error cargando buckets:', err);
        setTimeSeries(buildTimeBuckets(filtered, services, range, granularity));
      } finally {
        setLoadingBuckets(false);
      }
    };
    void load();
  }, [organization?._id, range[0], range[1], granularity, filtered, services]);

  // Por profesional (TODAS las citas)
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

  // Por servicio con más métricas
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

  // Análisis de clientes
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
      const d = dayjs(a.startDate).tz(tz);
      const dow = (d.day() + 6) % 7; // 0->Lun ... 6->Dom
      const hr = d.hour();
      const idx = hours.indexOf(hr);
      if (idx >= 0) matrix[dow][idx] += 1;
    });
    const max = Math.max(1, ...matrix.flat());
    const norm = matrix.map((row) => row.map((v) => v / max));
    return { raw: matrix, norm };
  }, [filtered, tz]);

  // Consejos automáticos (tarjetas neutras con ícono Tabler)
  const insights = useMemo(() => {
    const tips: { icon: "phone" | "speaker" | "star" | "trend"; title: string; message: string; action?: { label: string; to: string } }[] = [];

    const clientesEnRiesgo = byClient.filter((c) => c.esRecurrente && c.diasDesdeUltimaCita > 60).length;
    if (clientesEnRiesgo > 0) {
      tips.push({
        icon: "phone",
        title: "Clientes inactivos",
        message: `${clientesEnRiesgo} clientes que solían volver no vienen hace más de 60 días. Escríbeles con una promoción.`,
        action: { label: "Crear campaña", to: "/admin/campaigns/new" },
      });
    }

    const serviciosBajaDemanda = byService.filter((s) => s.citas < 3 && services.length > 5);
    if (serviciosBajaDemanda.length > 0) {
      tips.push({
        icon: "speaker",
        title: "Servicios poco vendidos",
        message: `${serviciosBajaDemanda.length} servicios tienen poca demanda. Prueba con paquetes o un descuento.`,
      });
    }

    const servicioMasRentable = byService.reduce((prev, curr) => (curr.ingresosPorHora > prev.ingresosPorHora ? curr : prev), byService[0]);
    if (servicioMasRentable && byService.length > 2) {
      tips.push({
        icon: "star",
        title: "Servicio estrella",
        message: `«${servicioMasRentable.svc.name}» deja ${formatCurrency(servicioMasRentable.ingresosPorHora, currency)} por hora. Vale la pena promocionarlo.`,
      });
    }

    if (range[0] && range[1]) {
      const dias = dayjs(range[1]).diff(dayjs(range[0]), "day") + 1;
      const ingresosDia = totalRevenue / dias;
      const diasRestantes = dayjs(range[1]).endOf("month").diff(dayjs(), "day");
      if (diasRestantes > 0 && dias >= 7) {
        const proyeccion = totalRevenue + ingresosDia * diasRestantes;
        tips.push({
          icon: "trend",
          title: "Proyección del mes",
          message: `A este ritmo cerrarás con ${formatCurrency(proyeccion, currency)} (faltan ${diasRestantes} días).`,
        });
      }
    }
    return tips;
  }, [totalAppts, byClient, byService, totalRevenue, services.length, range]);

  const TIP_ICONS = { phone: IconPhoneCall, speaker: IconSpeakerphone, star: IconStar, trend: IconTrendingUp };
  const days = range[0] && range[1] ? dayjs(range[1]).diff(dayjs(range[0]), "day") + 1 : 1;
  const hasFilters = !!employeeId || !!serviceId;
  const resetFilters = () => {
    setEmployeeId(null);
    setServiceId(null);
    setGranularity("day");
  };
  const newClients = byClient.filter((c) => !c.esRecurrente).length;
  const vipClients = byClient.filter((c) => c.citas >= 5).length;

  const kpis = [
    { label: "Ingresos", value: formatCurrency(totalRevenue, currency), hint: `${formatCurrency(totalRevenue / days, currency)} por día` },
    { label: "Citas", value: String(totalAppts), hint: `${(totalAppts / days).toFixed(1)} por día` },
    { label: "Clientes únicos", value: String(totalCustomers), hint: `${newClients} nuevos · ${vipClients} VIP` },
    { label: "Ticket promedio", value: formatCurrency(ticketAvg, currency), hint: "Por cita" },
  ];

  const axisTick = { fill: "var(--ink-subtle)", fontSize: 11 };

  return (
    <Box p={{ base: "sm", md: "lg" }}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{title}</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Cómo le va a tu negocio en el periodo que elijas.
          </div>
        </div>

        {/* Filtros */}
        <div className="ag-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DatePickerInput
            type="range"
            aria-label="Rango de fechas"
            placeholder="Rango de fechas"
            value={range}
            onChange={setRange}
            locale="es"
            dropdownType={isMobile ? "modal" : "popover"}
            valueFormat="D MMM YYYY"
            w={isMobile ? "100%" : 260}
          />
          <Select
            aria-label="Profesional"
            data={[{ value: "", label: "Profesional: todos" }, ...employees.map((e) => ({ value: e._id, label: e.names }))]}
            value={employeeId ?? ""}
            onChange={(v) => setEmployeeId(v || null)}
            searchable
            nothingFoundMessage="Sin resultados"
            w={isMobile ? "calc(50% - 4px)" : 200}
          />
          <Select
            aria-label="Servicio"
            data={[{ value: "", label: "Servicio: todos" }, ...services.map((s) => ({ value: s._id, label: s.name }))]}
            value={serviceId ?? ""}
            onChange={(v) => setServiceId(v || null)}
            searchable
            nothingFoundMessage="Sin resultados"
            w={isMobile ? "calc(50% - 4px)" : 200}
          />
          <div className="ag-segment" role="group" aria-label="Agrupar por" style={{ marginLeft: isMobile ? 0 : "auto" }}>
            {(["day", "week", "month"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={granularity === g} onClick={() => setGranularity(g)}>
                {g === "day" ? "Día" : g === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar las analíticas.</div>
            <Button size="xs" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          </div>
        )}

        {/* Cifras */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} className="ag-card" style={{ padding: 16 }}>
              {loading ? (
                <>
                  <Skeleton height={12} width="50%" mb={10} />
                  <Skeleton height={24} width="70%" mb={8} />
                  <Skeleton height={10} width="40%" />
                </>
              ) : (
                <>
                  <div className="ag-subtle">{k.label}</div>
                  <div className="ag-num" style={{ font: "600 22px/30px var(--font-sans)", margin: "2px 0" }}>
                    {k.value}
                  </div>
                  <div className="ag-subtle">{k.hint}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {!loading && totalAppts === 0 ? (
          <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <b style={{ display: "block", marginBottom: 8 }}>Sin datos en este rango</b>
            {hasFilters ? (
              <Button size="xs" variant="outline" onClick={resetFilters}>
                Quitar filtros
              </Button>
            ) : (
              <span className="ag-muted" style={{ fontSize: 14 }}>Prueba con otro rango de fechas.</span>
            )}
          </div>
        ) : (
          <>
            {/* Tendencia */}
            <div className="ag-card" style={{ padding: 20 }}>
              <div className="ag-row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h2 className="ag-h" style={{ margin: 0 }}>Ingresos y citas</h2>
                <div className="ag-row" style={{ gap: 14 }}>
                  <span className="ag-subtle" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 2, background: "var(--ink)" }} /> Ingresos
                  </span>
                  <span className="ag-subtle" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 0, borderTop: "2px dashed var(--ink-subtle)" }} /> Citas
                  </span>
                </div>
              </div>
              {loading ? (
                <Skeleton height={280} />
              ) : (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer key={`chart-${granularity}-${range[0]?.getTime()}-${range[1]?.getTime()}`}>
                    <LineChart data={timeSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis
                        dataKey="key"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: "var(--line)" }}
                        tickFormatter={(v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? dayjs(v).format("D MMM") : v)}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))}
                      />
                      <YAxis yAxisId="right" orientation="right" tick={axisTick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <RTooltip
                        formatter={(value: number, name: string) => (name === "Ingresos" ? formatCurrency(value, currency) : value)}
                        contentStyle={{ borderRadius: 8, border: "1px solid var(--line)", fontSize: 12 }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--ink)" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="citas" name="Citas" stroke="var(--ink-subtle)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Consejos */}
            {!loading && insights.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {insights.map((tip) => {
                  const Icon = TIP_ICONS[tip.icon];
                  return (
                    <div key={tip.title} className="ag-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ flex: "none", width: 32, height: 32, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--surface-hover)", color: "var(--ink-muted)" }}>
                        <Icon size={17} />
                      </span>
                      <div style={{ flex: 1 }}>
                        <b style={{ display: "block", fontSize: 14 }}>{tip.title}</b>
                        <div className="ag-muted" style={{ fontSize: 13, lineHeight: "18px" }}>{tip.message}</div>
                        {tip.action && (
                          <Link to={tip.action.to} className="ag-link" style={{ fontSize: 13, display: "inline-block", marginTop: 6 }}>
                            {tip.action.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
              {/* Mapa de calor */}
              <div className="ag-card" style={{ padding: 20, overflowX: "auto" }}>
                <h2 className="ag-h" style={{ margin: "0 0 12px" }}>Demanda por día y hora</h2>
                <div style={{ display: "grid", gridTemplateColumns: `36px repeat(${hours.length}, minmax(22px, 1fr))`, gap: 3, minWidth: 360 }}>
                  <span />
                  {hours.map((h) => (
                    <span key={h} className="ag-subtle" style={{ fontSize: 11, textAlign: "center" }}>
                      {h}
                    </span>
                  ))}
                  {dayNames.map((d, rowIdx) => (
                    <React.Fragment key={d}>
                      <span className="ag-subtle" style={{ fontSize: 11, alignSelf: "center" }}>
                        {d}
                      </span>
                      {hours.map((h, colIdx) => {
                        const raw = heat.raw[rowIdx]?.[colIdx] ?? 0;
                        const level = raw === 0 ? 0 : Math.min(5, Math.ceil((heat.norm[rowIdx]?.[colIdx] ?? 0) * 5));
                        return (
                          <Tooltip key={colIdx} label={`${d} ${h}:00 · ${raw} ${raw === 1 ? "cita" : "citas"}`} withArrow>
                            <span
                              style={{
                                height: 22,
                                borderRadius: 4,
                                background: level === 0 ? "var(--surface-hover)" : "var(--ink)",
                                opacity: level === 0 ? 1 : HEAT_OPACITY[level],
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                <div className="ag-row" style={{ gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
                  <span className="ag-subtle" style={{ fontSize: 11 }}>Menos</span>
                  {[1, 2, 3, 4, 5].map((l) => (
                    <span key={l} style={{ width: 14, height: 14, borderRadius: 3, background: "var(--ink)", opacity: HEAT_OPACITY[l] }} />
                  ))}
                  <span className="ag-subtle" style={{ fontSize: 11 }}>Más</span>
                </div>
              </div>

              {/* Rendimiento por profesional */}
              <div className="ag-card" style={{ padding: 20 }}>
                <h2 className="ag-h" style={{ margin: "0 0 8px" }}>Rendimiento por profesional</h2>
                {byEmployee.length === 0 ? (
                  <div className="ag-muted" style={{ fontSize: 14, padding: "16px 0" }}>No hay datos para estos filtros.</div>
                ) : (
                  byEmployee.map((row, i) => (
                    <div key={row.emp._id} className="ag-list-row" style={{ gap: 12 }}>
                      <span className="ag-appt__pro" style={{ flex: 1, minWidth: 0, color: "var(--ink)", fontSize: 14 }}>
                        <i style={{ background: `var(--pro-${(i % 6) + 1})` }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.emp.names}</span>
                        {!row.emp.isActive && <span className="ag-badge" style={{ height: 20, fontSize: 11 }}>Inactivo</span>}
                      </span>
                      <span className="ag-subtle ag-num">{row.citas} {row.citas === 1 ? "cita" : "citas"}</span>
                      <b className="ag-num" style={{ minWidth: 100, textAlign: "right" }}>{formatCurrency(row.ingresos || 0, currency)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
              {/* Servicios */}
              <div className="ag-card" style={{ padding: 20 }}>
                <h2 className="ag-h" style={{ margin: "0 0 8px" }}>Servicios</h2>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {byService.map((row) => (
                    <div key={row.svc._id} className="ag-list-row" style={{ gap: 12, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 14 }}>{row.svc.name}</b>
                        <div className="ag-subtle">
                          {row.citas} {row.citas === 1 ? "cita" : "citas"} · {formatCurrency(row.ingresosPorHora || 0, currency)} por hora
                          {row.additionalItems > 0 ? ` · ${row.additionalItems} adicionales` : ""}
                        </div>
                      </div>
                      <b className="ag-num">{formatCurrency(row.ingresos || 0, currency)}</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mejores clientes */}
              <div className="ag-card" style={{ padding: 20 }}>
                <div className="ag-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                  <h2 className="ag-h" style={{ margin: 0 }}>Mejores clientes</h2>
                  <span className="ag-subtle">{byClient.filter((c) => c.esRecurrente).length} recurrentes</span>
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {byClient.slice(0, 10).map((client, idx) => (
                    <div key={client.clientId} className="ag-list-row" style={{ gap: 12, alignItems: "flex-start" }}>
                      <span className="ag-subtle ag-num" style={{ width: 18 }}>{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 14 }}>{client.clientName}</b>
                        <div className="ag-subtle">
                          {client.citas} citas · {client.servicios} servicios
                          {client.diasDesdeUltimaCita > 60 ? ` · ${client.diasDesdeUltimaCita} días sin venir` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <b className="ag-num">{formatCurrency(client.ingresos || 0, currency)}</b>
                        <div className="ag-subtle">prom. {formatCurrency(client.ticketPromedio || 0, currency)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Box>
  );
};

export default AdminAnalyticsDashboard;
