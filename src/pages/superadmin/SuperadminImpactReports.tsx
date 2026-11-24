// Reportes de impacto (rediseño, SuperadminImpacto): vista interna de lo que
// AgenditApp le aportó a cada negocio, con la encuesta a los dueños. Cifras
// sin íconos de colores, distribuciones en barras neutras y una tarjeta por
// negocio con citas por mes en brand (el mejor mes resaltado).
import { useEffect, useMemo, useState } from "react";
import { Skeleton, Switch, Tooltip } from "@mantine/core";
import { IconBulb, IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getImpactReports,
  getImpactSurveyResponses,
  type ImpactReportsResponse,
  type ImpactReport,
  type ImpactSurveyResponseRow,
} from "../../services/impactReportService";
import {
  PREVIOUS_TOOL_OPTIONS,
  FEWER_NO_SHOWS_OPTIONS,
  BIGGEST_IMPROVEMENT_OPTIONS,
  PREVIOUS_TOOL_LABELS,
  FEWER_NO_SHOWS_LABELS,
  BIGGEST_IMPROVEMENT_LABELS,
} from "../../utils/impactSurveyOptions";

dayjs.locale("es");

const fmt = (n: number) => n.toLocaleString("es-CO");

/** Texto que vería el dueño del negocio (vista previa del mensaje). */
function buildPreviewText(r: ImpactReport): string {
  const parts: string[] = [];
  parts.push(`Llevas ${r.org.daysActive} días con AgenditApp.`);
  parts.push(`En ese tiempo gestionaste ${fmt(r.appointments.total)} citas`);
  if (r.onlineReservations.count > 0) {
    parts[parts.length - 1] += `, de las cuales ${fmt(r.onlineReservations.count)} (${r.onlineReservations.pct} %) llegaron solas por tu link de reservas`;
  }
  parts[parts.length - 1] += ".";
  if (r.noShow.applicable) parts.push(`Tu tasa de ausencias registrada es ${r.noShow.rate} %.`);
  parts.push("¿Qué usabas para agendar antes de AgenditApp?");
  return parts.join(" ");
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ag-card" style={{ padding: "12px 14px", minWidth: 0 }}>
      <div className="ag-muted" style={{ fontSize: 13 }}>{label}</div>
      <div className="ag-num" style={{ font: "600 22px/28px var(--mantine-font-family)" }}>{value}</div>
      {sub && <div className="ag-subtle">{sub}</div>}
    </div>
  );
}

/** Citas por mes (últimos 12), el mejor mes en brand y el resto atenuado. */
function TrendBars({ byMonth, peak }: { byMonth: ImpactReport["appointments"]["byMonth"]; peak?: string }) {
  const data = byMonth.slice(-12);
  const max = Math.max(1, ...data.map((m) => m.count));
  if (data.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }} aria-label="Citas por mes">
      {data.map((m) => (
        <Tooltip key={m.month} label={`${dayjs(m.month + "-01").format("MMM YYYY")}: ${m.count} citas`} withArrow>
          <div
            style={{
              width: 12,
              height: Math.max(3, (m.count / max) * 48),
              background: "var(--brand)",
              opacity: m.month === peak ? 1 : 0.4,
              borderRadius: 3,
            }}
          />
        </Tooltip>
      ))}
    </div>
  );
}

function ReportCard({ r }: { r: ImpactReport }) {
  return (
    <section className="ag-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "nowrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="ag-row" style={{ gap: 6 }}>
            <b style={{ fontSize: 16 }}>{r.org.name}</b>
            {!r.eligible && <span className="ag-badge">No elegible</span>}
            {r.noShow.applicable && <span className="ag-badge ag-badge--info">Con ausencias</span>}
          </div>
          <div className="ag-subtle">
            {r.org.businessVertical ? `${r.org.businessVertical} · ` : ""}
            {r.org.daysActive} días activo · desde {dayjs(r.org.registeredAt).format("D MMM YYYY")}
          </div>
        </div>
        <TrendBars byMonth={r.appointments.byMonth} peak={r.appointments.peakMonth?.month} />
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Stat label="Citas gestionadas" value={fmt(r.appointments.total)} sub={`~${r.appointments.avgPerMonth} al mes`} />
        <Stat label="Reservas que llegan solas" value={fmt(r.onlineReservations.count)} sub={`${r.onlineReservations.pct} % del total`} />
        <Stat
          label="Mejor mes"
          value={r.appointments.peakMonth ? fmt(r.appointments.peakMonth.count) : "—"}
          sub={r.appointments.peakMonth ? dayjs(r.appointments.peakMonth.month + "-01").format("MMM YYYY") : undefined}
        />
        <Stat label="Ausencias" value={r.noShow.applicable ? `${r.noShow.rate} %` : "Sin datos"} sub={r.noShow.applicable ? `${r.noShow.count} no asistieron` : "No las registran"} />
      </div>

      <div>
        <div className="ag-subtle" style={{ marginBottom: 6 }}>Vista previa del mensaje al dueño</div>
        <div className="ag-card" style={{ padding: "10px 14px", background: "var(--surface-muted)", fontSize: 14, fontStyle: "italic" }}>
          «{buildPreviewText(r)}»
        </div>
      </div>
    </section>
  );
}

function DistRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="ag-muted ag-num">
          {count} · {pct} %
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--surface-hover)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ink-subtle)" }} />
      </div>
    </div>
  );
}

function SurveyAnalysis({ rows, eligibleCount }: { rows: ImpactSurveyResponseRow[]; eligibleCount: number }) {
  const n = rows.length;
  const prev: Record<string, number> = {};
  const fewer: Record<string, number> = {};
  const impr: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.answers.previousTool) prev[r.answers.previousTool] = (prev[r.answers.previousTool] || 0) + 1;
    if (r.answers.fewerNoShows) fewer[r.answers.fewerNoShows] = (fewer[r.answers.fewerNoShows] || 0) + 1;
    (r.answers.biggestImprovement || []).forEach((b) => {
      impr[b] = (impr[b] || 0) + 1;
    });
  });
  const fewerYes = (fewer["mucho_menos"] || 0) + (fewer["algo_menos"] || 0);
  const fewerYesPct = n > 0 ? Math.round((fewerYes / n) * 100) : 0;
  const responseRate = eligibleCount > 0 ? Math.round((n / eligibleCount) * 100) : 0;

  const group = (title: string, options: { value: string; label: string }[], counts: Record<string, number>) => (
    <div className="ag-stack" style={{ gap: 10 }}>
      <b style={{ fontSize: 14 }}>{title}</b>
      {options
        .filter((o) => counts[o.value])
        .map((o) => (
          <DistRow key={o.value} label={o.label} count={counts[o.value]} total={n} />
        ))}
    </div>
  );

  return (
    <section className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="ag-h" style={{ margin: 0 }}>Respuestas de la encuesta</h2>
        <div className="ag-subtle">Auto-reportado y con muestra pequeña: todavía no sirve como dato de marketing.</div>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Stat label="Tasa de respuesta" value={`${responseRate} %`} sub={`${n} de ${eligibleCount} elegibles`} />
        <Stat label="Percibe menos ausencias" value={`${fewerYesPct} %`} sub={`${fewerYes} de ${n} (mucho o algo menos)`} />
        <Stat label="Respuestas" value={String(n)} />
      </div>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {group("¿Qué usaban antes?", PREVIOUS_TOOL_OPTIONS, prev)}
        {group("¿Menos inasistencias?", FEWER_NO_SHOWS_OPTIONS, fewer)}
        {group("¿Qué mejoró más?", BIGGEST_IMPROVEMENT_OPTIONS, impr)}
      </div>
    </section>
  );
}

function ResponsesTable({ rows }: { rows: ImpactSurveyResponseRow[] }) {
  return (
    <section className="ag-card" style={{ overflowX: "auto" }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <h2 className="ag-h" style={{ margin: 0 }}>
          Respuestas <span className="ag-muted ag-num" style={{ fontWeight: 400 }}>· {rows.length}</span>
        </h2>
      </div>
      {rows.length === 0 ? (
        <div className="ag-muted" style={{ padding: "8px 16px 20px", fontSize: 14 }}>Aún no hay respuestas de los dueños.</div>
      ) : (
        <table className="ag-table" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Usaba antes</th>
              <th>¿Menos inasistencias?</th>
              <th>Mejoró más</th>
              <th>Comentario</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const prev = r.answers.previousTool === "otro" ? `Otro: ${r.answers.previousToolOther || "—"}` : PREVIOUS_TOOL_LABELS[r.answers.previousTool || ""] || "—";
              return (
                <tr key={r.orgId}>
                  <td style={{ fontWeight: 600 }}>{r.orgName}</td>
                  <td>{prev}</td>
                  <td>{FEWER_NO_SHOWS_LABELS[r.answers.fewerNoShows || ""] || "—"}</td>
                  <td className="ag-muted">{(r.answers.biggestImprovement || []).map((b) => BIGGEST_IMPROVEMENT_LABELS[b] || b).join(", ") || "—"}</td>
                  <td className="ag-muted" style={{ maxWidth: 260 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.answers.comment || "—"}</span>
                  </td>
                  <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{dayjs(r.respondedAt).format("D MMM YY")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function SuperadminImpactReports() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [includeIneligible, setIncludeIneligible] = useState(false);
  const [data, setData] = useState<ImpactReportsResponse | null>(null);
  const [responses, setResponses] = useState<ImpactSurveyResponseRow[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    getImpactReports({ includeIneligible })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [includeIneligible, reload]);

  useEffect(() => {
    getImpactSurveyResponses()
      .then((res) => setResponses(res.responses))
      .catch(() => {
        /* la sección de encuesta queda vacía */
      });
  }, []);

  const c = data?.counts;
  const bestOnline = useMemo(() => {
    if (!data?.reports.length) return null;
    return [...data.reports].sort((a, b) => b.onlineReservations.pct - a.onlineReservations.pct)[0];
  }, [data]);
  const loading = status === "loading" && !data;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 20 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Reportes de impacto</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Lo que AgenditApp le aportó a cada negocio desde que se registró. Vista interna: ningún cliente la ve todavía.
            </div>
          </div>
          <Switch label="Incluir no elegibles" checked={includeIneligible} onChange={(e) => setIncludeIneligible(e.currentTarget.checked)} />
        </div>

        {status === "error" && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar los reportes.</div>
            <button type="button" className="ag-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => setReload((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {loading || !c ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={78} radius="md" />)
          ) : (
            <>
              <Stat label="Con citas" value={fmt(c.withAppointments)} />
              <Stat label="Elegibles" value={fmt(c.eligible)} sub="45 días o más y 20 citas o más" />
              <Stat label="Con reservas online" value={fmt(c.withOnline)} />
              <Stat label="Con registro de ausencias" value={fmt(c.withNoShowBlock)} />
            </>
          )}
        </div>

        {responses.length > 0 && <SurveyAnalysis rows={responses} eligibleCount={c?.eligible ?? 0} />}
        <ResponsesTable rows={responses} />

        {bestOnline && bestOnline.onlineReservations.count > 0 && (
          <div className="ag-alert ag-alert--success">
            <IconBulb size={20} />
            <div style={{ fontSize: 14 }}>
              <b>Titular más fuerte:</b> {bestOnline.org.name} recibió {fmt(bestOnline.onlineReservations.count)} reservas ({bestOnline.onlineReservations.pct} % de sus
              citas) por su link, sin que el equipo interviniera.
            </div>
          </div>
        )}

        {!loading && data?.reports.length === 0 && <div className="ag-muted" style={{ textAlign: "center", padding: "24px 0" }}>Ningún negocio cumple los criterios.</div>}

        <div className="ag-stack" style={{ gap: 14, opacity: status === "loading" && data ? 0.6 : 1 }}>
          {loading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={240} radius="md" />) : data?.reports.map((r) => <ReportCard key={r.org.id} r={r} />)}
        </div>
      </div>
    </div>
  );
}
