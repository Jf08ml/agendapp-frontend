// Embudo de activación por cohorte (rediseño, SuperadminActivacion): «Registrados
// entre», el hito que mejor predice la compra, el embudo en un solo color (el
// último en verde) con panel lateral de negocios por hito, y la conversión a
// pago por hito con su leyenda.
import { useEffect, useMemo, useState } from "react";
import { Drawer, ScrollArea, Skeleton } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconBulb, IconChevronRight, IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getOnboardingFunnel, type OnboardingFunnel } from "../../services/onboardingFunnelService";

dayjs.locale("es");

type Step = OnboardingFunnel["funnel"][number];

const rateClass = (t: number) => (t >= 50 ? "ag-badge ag-badge--success" : t >= 25 ? "ag-badge ag-badge--warning" : "ag-badge");

export default function SuperadminOnboarding() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [data, setData] = useState<OnboardingFunnel | null>(null);
  const [reload, setReload] = useState(0);
  const [openStep, setOpenStep] = useState<Step | null>(null);
  const [range, setRange] = useState<[Date | null, Date | null]>([dayjs().subtract(29, "day").startOf("day").toDate(), dayjs().endOf("day").toDate()]);

  const dateParams = useMemo(() => {
    if (!range[0] || !range[1]) return null;
    return { startDate: dayjs(range[0]).format("YYYY-MM-DD"), endDate: dayjs(range[1]).format("YYYY-MM-DD") };
  }, [range]);

  useEffect(() => {
    if (!dateParams) return;
    let alive = true;
    setStatus("loading");
    getOnboardingFunnel(dateParams)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [dateParams, reload]);

  // Hito con mayor tasa de conversión a pago (con base relevante)
  const bestPredictor = useMemo(() => {
    if (!data) return null;
    // Solo si alguien pagó: con 0 % en todos los hitos no hay nada que predecir.
    const candidates = data.conversionPorHito.filter((c) => c.base >= 3 && c.tasaPago > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (b.tasaPago > a.tasaPago ? b : a));
  }, [data]);

  const registered = data?.funnel.find((f) => f.clave === "registrados")?.total ?? 0;
  const loading = status === "loading" && !data;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 20 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Activación</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              De los negocios registrados en el rango, cuántos llegan a cada hito y cuál predice mejor que paguen.
            </div>
          </div>
          <DatePickerInput type="range" label="Registrados entre" value={range} onChange={setRange} locale="es" valueFormat="D MMM YYYY" dropdownType="modal" style={{ minWidth: 240 }} />
        </div>

        {status === "error" && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar el embudo.</div>
            <button type="button" className="ag-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => setReload((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {bestPredictor && (
          <div className="ag-alert ag-alert--success">
            <IconBulb size={20} />
            <div style={{ fontSize: 14 }}>
              <b>El hito que mejor predice la compra es «{bestPredictor.hito}».</b> Los negocios que llegan ahí pagan en un {bestPredictor.tasaPago} % ({bestPredictor.pagaron}{" "}
              de {bestPredictor.base}). Vale la pena empujar a los usuarios hacia ese hito.
            </div>
          </div>
        )}

        <section className="ag-card" style={{ padding: 20, opacity: status === "loading" && data ? 0.6 : 1 }}>
          <h2 className="ag-h" style={{ margin: "0 0 4px" }}>Embudo de activación</h2>
          <div className="ag-subtle" style={{ marginBottom: 14 }}>Toca un hito para ver los negocios que llegaron.</div>
          {loading ? (
            <div className="ag-stack" style={{ gap: 14 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} height={34} />
              ))}
            </div>
          ) : registered === 0 ? (
            <div className="ag-muted" style={{ textAlign: "center", padding: "16px 0", fontSize: 14 }}>No hay registros en este rango.</div>
          ) : (
            <div className="ag-stack" style={{ gap: 6 }}>
              {(data?.funnel ?? []).map((step) => {
                const last = step.clave === "convertidasPago";
                const clickable = !!step.orgs?.length;
                const Row = clickable ? "button" : "div";
                return (
                  <Row
                    key={step.clave}
                    {...(clickable ? { type: "button" as const, onClick: () => setOpenStep(step) } : {})}
                    className="sa-step"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      background: "none",
                      padding: "8px 6px",
                      borderRadius: "var(--radius-md)",
                      cursor: clickable ? "pointer" : "default",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "nowrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{step.hito}</span>
                      <span className="ag-row" style={{ gap: 10, flexWrap: "nowrap" }}>
                        <b className="ag-num">{step.total.toLocaleString("es-CO")}</b>
                        <span className="ag-num ag-muted" style={{ minWidth: 60, textAlign: "right", whiteSpace: "nowrap" }}>{step.pct} %</span>
                        {clickable ? <IconChevronRight size={16} color="var(--ink-subtle)" /> : <span style={{ width: 16 }} />}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--surface-hover)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, step.pct)}%`, height: "100%", background: last ? "var(--success)" : "var(--brand)" }} />
                    </div>
                  </Row>
                );
              })}
            </div>
          )}
          <style>{`.sa-step:hover { background: var(--surface-hover) !important; } button.sa-step:focus-visible { outline: 2px solid var(--brand); }`}</style>
        </section>

        <section className="ag-card" style={{ overflowX: "auto" }}>
          <div style={{ padding: "16px 16px 8px" }}>
            <h2 className="ag-h" style={{ margin: 0 }}>Conversión a pago por hito</h2>
            <div className="ag-subtle">De los negocios que llegaron a cada hito, cuántos terminaron pagando.</div>
          </div>
          <table className="ag-table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>Hito</th>
                <th style={{ textAlign: "right" }}>Negocios</th>
                <th style={{ textAlign: "right" }}>Pagaron</th>
                <th style={{ textAlign: "right" }}>Tasa</th>
              </tr>
            </thead>
            <tbody>
              {(data?.conversionPorHito ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="ag-muted" style={{ textAlign: "center", padding: "20px 16px" }}>
                    {loading ? "Cargando…" : "Sin datos en este rango."}
                  </td>
                </tr>
              ) : (
                data!.conversionPorHito.map((c) => (
                  <tr key={c.hito}>
                    <td style={{ fontWeight: 500 }}>{c.hito}</td>
                    <td className="ag-num" style={{ textAlign: "right" }}>{c.base}</td>
                    <td className="ag-num" style={{ textAlign: "right" }}>{c.pagaron}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={rateClass(c.tasaPago)}>{c.tasaPago} %</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="ag-row ag-subtle" style={{ gap: 14, padding: "10px 16px 14px" }}>
            <span className="ag-row" style={{ gap: 6 }}>
              <span className="ag-badge ag-badge--success">50 %</span> o más
            </span>
            <span className="ag-row" style={{ gap: 6 }}>
              <span className="ag-badge ag-badge--warning">25 %</span> o más
            </span>
            <span className="ag-row" style={{ gap: 6 }}>
              <span className="ag-badge">Neutro</span> menos de 25 %
            </span>
          </div>
        </section>

        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div style={{ fontSize: 14 }}>
            Los hitos se registran desde el 13/06/2026. Los negocios anteriores no los tienen, así que el embudo solo representa a quienes se registraron después.
          </div>
        </div>
      </div>

      <Drawer opened={!!openStep} onClose={() => setOpenStep(null)} position="right" size={420} title={<b style={{ fontSize: 16 }}>{openStep?.hito}</b>}>
        {openStep && (
          <div className="ag-stack" style={{ gap: 10 }}>
            <div className="ag-subtle">
              {openStep.total.toLocaleString("es-CO")} {openStep.total === 1 ? "negocio" : "negocios"} · {openStep.pct} % de los registrados
            </div>
            <ScrollArea.Autosize mah="calc(100dvh - 140px)">
              <div className="ag-card">
                {(openStep.orgs ?? []).map((o) => (
                  <div key={o.id} style={{ padding: "9px 14px", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                    {o.name}
                  </div>
                ))}
              </div>
            </ScrollArea.Autosize>
          </div>
        )}
      </Drawer>
    </div>
  );
}
