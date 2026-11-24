// Analítica global de la plataforma (rediseño, SuperadminAnaliticas): rango y
// Día / Semana / Mes, 7 cifras neutras sin emoji, tendencia en cuatro mini
// gráficas (cada una con su escala), salud de membresías en barras neutras y
// las organizaciones con más actividad.
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { IconInfoCircle } from "@tabler/icons-react";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getPlatformOverview,
  getPlatformTimeSeries,
  getOrganizationRanking,
  type PlatformOverview,
  type PlatformTimeSeriesPoint,
  type OrganizationRankingItem,
} from "../../services/platformAnalyticsService";

dayjs.locale("es");

const MEMBERSHIP_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Activas", cls: "ag-badge--success" },
  trial: { label: "En prueba", cls: "ag-badge--info" },
  pending: { label: "Pendientes", cls: "ag-badge--warning" },
  past_due: { label: "Vencidas", cls: "ag-badge--warning" },
  suspended: { label: "Suspendidas", cls: "ag-badge--danger" },
  cancelled: { label: "Canceladas", cls: "" },
  expired: { label: "Expiradas", cls: "ag-badge--danger" },
};

const RANKING_LABEL: Record<string, string> = {
  active: "Activa",
  trial: "Prueba",
  pending: "Pendiente",
  past_due: "Vencida",
  suspended: "Suspendida",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const compactCop = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n);

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="ag-card ag-stat" style={{ minWidth: 0 }}>
      <span className="ag-stat__label">{label}</span>
      <span className="ag-stat__value" style={{ fontSize: 26, lineHeight: "32px" }}>{value}</span>
      {hint && <span className="ag-subtle">{hint}</span>}
    </div>
  );
}

function MiniChart({
  title,
  total,
  data,
  dataKey,
  money = false,
}: {
  title: string;
  total: string;
  data: PlatformTimeSeriesPoint[];
  dataKey: keyof PlatformTimeSeriesPoint;
  money?: boolean;
}) {
  return (
    <div className="ag-card" style={{ padding: 16 }}>
      <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="ag-muted" style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
        <b className="ag-num" style={{ fontSize: 18 }}>{total}</b>
      </div>
      <div style={{ width: "100%", height: 140, marginTop: 8 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--ink-subtle)" }} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={24} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--ink-subtle)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(v: number) => (money ? compactCop(v) : String(v))}
            />
            <RTooltip formatter={(v: number) => [money ? formatCurrency(v, "COP") : v, title]} labelStyle={{ color: "var(--ink)" }} />
            <Line type="monotone" dataKey={dataKey as string} stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function SuperadminAnalytics() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<PlatformTimeSeriesPoint[]>([]);
  const [ranking, setRanking] = useState<OrganizationRankingItem[]>([]);
  const [reload, setReload] = useState(0);

  const [range, setRange] = useState<[Date | null, Date | null]>([dayjs().subtract(29, "day").startOf("day").toDate(), dayjs().endOf("day").toDate()]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [rankingSortBy, setRankingSortBy] = useState<"citas" | "ingresos">("citas");

  useEffect(() => {
    if (granularity === "month") setRange([dayjs().subtract(5, "month").startOf("month").toDate(), dayjs().endOf("month").toDate()]);
    else if (granularity === "week") setRange([dayjs().subtract(7, "week").startOf("week").toDate(), dayjs().endOf("week").toDate()]);
    else setRange([dayjs().subtract(29, "day").startOf("day").toDate(), dayjs().endOf("day").toDate()]);
  }, [granularity]);

  useEffect(() => {
    if (!range[0] || !range[1]) return;
    let alive = true;
    (async () => {
      setStatus("loading");
      try {
        const startDate = dayjs(range[0]).format("YYYY-MM-DD");
        const endDate = dayjs(range[1]).format("YYYY-MM-DD");
        const [overviewData, seriesData, rankingData] = await Promise.all([
          getPlatformOverview({ startDate, endDate }),
          getPlatformTimeSeries({ startDate, endDate, granularity }),
          getOrganizationRanking({ startDate, endDate, sortBy: rankingSortBy, limit: 10 }),
        ]);
        if (!alive) return;
        setOverview(overviewData);
        setTimeSeries(seriesData);
        setRanking(rankingData);
        setStatus("ok");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range[0], range[1], granularity, rankingSortBy, reload]);

  const conversionRate = overview && overview.newOrganizations > 0 ? (overview.trialToActiveConversions / overview.newOrganizations) * 100 : 0;

  const totals = useMemo(() => {
    const sum = (k: keyof PlatformTimeSeriesPoint) => timeSeries.reduce((acc, p) => acc + (Number(p[k]) || 0), 0);
    return { citas: sum("citas"), cancelaciones: sum("cancelaciones"), ingresos: sum("ingresos"), newOrgs: sum("newOrgs") };
  }, [timeSeries]);

  const breakdown = Object.entries(overview?.membershipBreakdown ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const maxCount = Math.max(1, ...breakdown.map(([, c]) => Number(c)));
  const loading = status === "loading" && !overview;

  const segment = <T extends string>(value: T, onChange: (v: T) => void, options: [T, string][], label: string) => (
    <div className="ag-segment" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} style={{ cursor: "pointer" }}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 20 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Analítica de la plataforma</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Crecimiento, actividad, membresías e ingresos de todos los negocios.
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8, alignItems: "center" }}>
            <DatePickerInput type="range" aria-label="Rango de fechas" value={range} onChange={setRange} locale="es" valueFormat="D MMM YYYY" dropdownType="modal" style={{ minWidth: 240 }} />
            {segment(granularity, setGranularity, [["day", "Día"], ["week", "Semana"], ["month", "Mes"]], "Agrupar por")}
          </div>
        </div>

        {status === "error" && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar la analítica.</div>
            <button type="button" className="ag-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => setReload((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", opacity: status === "loading" && overview ? 0.6 : 1 }}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} height={104} radius="md" />)
          ) : (
            <>
              <Stat label="Nuevas organizaciones" value={overview?.newOrganizations ?? 0} hint="Registradas en el rango" />
              <Stat label="Conversión prueba → activa" value={`${conversionRate.toFixed(1)} %`} hint={`${overview?.trialToActiveConversions ?? 0} activaciones (estimado)`} />
              <Stat label="Citas totales" value={(overview?.appointments.total ?? 0).toLocaleString("es-CO")} hint={`${overview?.appointments.atendidas ?? 0} atendidas`} />
              <Stat label="MRR estimado" value={formatCurrency(overview?.mrr ?? 0, "USD")} hint="En USD, el precio de los planes; sin planes de por vida" />
              <Stat label="Reservas online" value={overview?.reservations ?? 0} hint="Solicitudes recibidas" />
              <Stat label="Cancelaciones" value={overview?.appointments.canceladas ?? 0} hint={`${overview?.appointments.noShows ?? 0} no asistieron`} />
              <Stat label="Ingresos por citas" value={formatCurrency(overview?.appointments.ingresos ?? 0, "COP")} hint="Suma del precio de las citas" />
            </>
          )}
        </div>

        <section className="ag-stack" style={{ gap: 10 }}>
          <h2 className="ag-h" style={{ margin: 0 }}>Tendencia</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={196} radius="md" />)
            ) : (
              <>
                <MiniChart title="Citas" total={totals.citas.toLocaleString("es-CO")} data={timeSeries} dataKey="citas" />
                <MiniChart title="Cancelaciones" total={totals.cancelaciones.toLocaleString("es-CO")} data={timeSeries} dataKey="cancelaciones" />
                <MiniChart title="Ingresos por citas" total={formatCurrency(totals.ingresos, "COP")} data={timeSeries} dataKey="ingresos" money />
                <MiniChart title="Nuevas organizaciones" total={totals.newOrgs.toLocaleString("es-CO")} data={timeSeries} dataKey="newOrgs" />
              </>
            )}
          </div>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section className="ag-card" style={{ padding: 20, maxWidth: 640 }}>
            <h2 className="ag-h" style={{ margin: "0 0 12px" }}>Salud de membresías</h2>
            {breakdown.length === 0 ? (
              <div className="ag-muted" style={{ fontSize: 14 }}>{loading ? "Cargando…" : "Sin datos de membresías."}</div>
            ) : (
              <div className="ag-stack" style={{ gap: 10 }}>
                {breakdown.map(([st, count]) => {
                  const meta = MEMBERSHIP_STATUS[st] ?? { label: st, cls: "" };
                  return (
                    <div key={st} style={{ display: "grid", gridTemplateColumns: "112px 1fr 48px", gap: 10, alignItems: "center" }}>
                      <span className={`ag-badge ${meta.cls}`} style={{ justifySelf: "start" }}>{meta.label}</span>
                      <div style={{ height: 8, borderRadius: 999, background: "var(--surface-hover)", overflow: "hidden" }}>
                        <div style={{ width: `${(Number(count) / maxCount) * 100}%`, height: "100%", background: "var(--ink-subtle)" }} />
                      </div>
                      <span className="ag-num" style={{ textAlign: "right", fontWeight: 600 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ag-card" style={{ overflowX: "auto" }}>
            <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, padding: "16px 16px 8px" }}>
              <h2 className="ag-h" style={{ margin: 0 }}>Organizaciones con más actividad</h2>
              {segment(rankingSortBy, setRankingSortBy, [["citas", "Por citas"], ["ingresos", "Por ingresos"]], "Ordenar")}
            </div>
            <table className="ag-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Organización</th>
                  <th style={{ textAlign: "right" }}>Citas</th>
                  <th style={{ textAlign: "right" }}>Ingresos</th>
                  <th>Membresía</th>
                  <th>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ag-muted" style={{ textAlign: "center", padding: "24px 16px" }}>
                      {loading ? "Cargando…" : "No hay actividad en este rango."}
                    </td>
                  </tr>
                ) : (
                  ranking.map((row) => (
                    <tr key={row.organizationId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div className="ag-subtle">{row.slug}</div>
                      </td>
                      <td className="ag-num" style={{ textAlign: "right" }}>{row.citas}</td>
                      <td className="ag-num" style={{ textAlign: "right" }}>{formatCurrency(row.ingresos || 0, "COP")}</td>
                      <td>{row.membershipStatus ? RANKING_LABEL[row.membershipStatus] ?? row.membershipStatus : <span className="ag-muted">Sin membresía</span>}</td>
                      <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{row.lastActivity ? dayjs(row.lastActivity).format("DD/MM/YYYY HH:mm") : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
