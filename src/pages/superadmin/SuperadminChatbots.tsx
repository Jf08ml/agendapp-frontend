// pages/superadmin/SuperadminChatbots.tsx
// Chatbots IA (rediseño, SuperadminChatbots): 8 cifras sin emoji, pestañas
// Chat web / Agente admin por WhatsApp / Organizaciones con más uso, estados
// con ícono y la conversación con su revisión en panel lateral.
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Drawer, Pagination, Select, Skeleton, Textarea } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { IconAlertTriangle, IconCalendarCheck, IconCircleCheck, IconCircleX, IconClock } from "@tabler/icons-react";
import {
  getChatbotStats,
  getChatbotSessions,
  markChatLogSessionReviewed,
  getWaBotSessions,
  getWaBotSessionMessages,
  markWaBotSessionReviewed,
  REVIEW_CATEGORIES,
  type ChatbotStats,
  type ChatbotSession,
  type ChatSessionReview,
  type WaBotSession,
  type WaBotSessionMessage,
} from "../../services/chatbotAnalyticsService";

dayjs.locale("es");

function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="ag-card" style={{ padding: "12px 14px", minWidth: 0 }}>
      <div className="ag-muted" style={{ fontSize: 13 }}>{label}</div>
      <div className="ag-num" style={{ font: "600 22px/28px var(--mantine-font-family)" }}>{value}</div>
      {hint && <div className="ag-subtle">{hint}</div>}
    </div>
  );
}

const fmtNum = (n: number | undefined) => (n ?? 0).toLocaleString("es-CO");

type ModalMessage = { role: "user" | "assistant"; content: string };

/** Bloque de revisión del panel, para sesiones de ChatLog y del agente WhatsApp. */
function ReviewPanel({
  reviewed,
  onReviewedChange,
  category,
  onCategoryChange,
  notes,
  onNotesChange,
  onSave,
  saving,
  lastReview,
}: {
  reviewed: boolean;
  onReviewedChange: (v: boolean) => void;
  category: string | null;
  onCategoryChange: (v: string | null) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  lastReview?: ChatSessionReview;
}) {
  return (
    <section className="ag-card" style={{ padding: 14, background: "var(--surface-muted)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
        <b style={{ fontSize: 14 }}>Revisión</b>
        {lastReview?.reviewed && (
          <span className="ag-subtle">
            Revisada por {lastReview.reviewedBy || "—"}
            {lastReview.reviewedAt ? ` · ${dayjs(lastReview.reviewedAt).format("DD/MM/YYYY HH:mm")}` : ""}
          </span>
        )}
      </div>
      <Checkbox label="Marcada como revisada" checked={reviewed} onChange={(e) => onReviewedChange(e.currentTarget.checked)} />
      <Select label="Categoría del hallazgo" placeholder="Sin categoría" data={REVIEW_CATEGORIES} value={category} onChange={onCategoryChange} clearable />
      <Textarea label="Notas" placeholder="Qué se encontró y qué habría que ajustar" value={notes} onChange={(e) => onNotesChange(e.currentTarget.value)} autosize minRows={2} />
      <Button color="var(--platform)" loading={saving} onClick={onSave} style={{ alignSelf: "flex-end" }}>
        Guardar revisión
      </Button>
    </section>
  );
}

const STATE_META = {
  reviewed: { label: "Revisada", cls: "ag-badge--success", Icon: IconCircleCheck },
  converted: { label: "Convertida", cls: "ag-badge--success", Icon: IconCalendarCheck },
  prepared: { label: "Preparada", cls: "ag-badge--info", Icon: IconClock },
  limit: { label: "Límite de rondas", cls: "ag-badge--warning", Icon: IconAlertTriangle },
  error: { label: "Error", cls: "ag-badge--danger", Icon: IconCircleX },
} as const;

function StateBadge({ kind }: { kind: keyof typeof STATE_META }) {
  const { label, cls, Icon } = STATE_META[kind];
  return (
    <span className={`ag-badge ${cls}`} style={{ gap: 4 }}>
      <Icon size={13} stroke={2} />
      {label}
    </span>
  );
}

const TYPE_LABEL: Record<string, string> = { booking: "Reserva", admin: "Admin" };

export default function SuperadminChatbots() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>("web");

  // ── ChatLog (chat web / booking WhatsApp) ──────────────────────────────────
  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [reviewedFilter, setReviewedFilter] = useState<string | null>(null);
  const [onlyConverted, setOnlyConverted] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatbotSession | null>(null);

  // ── Agente admin por WhatsApp (WaBotMessage) ────────────────────────────────
  const [waSessions, setWaSessions] = useState<WaBotSession[]>([]);
  const [waSessionsLoading, setWaSessionsLoading] = useState(false);
  const [waPage, setWaPage] = useState(1);
  const [waPages, setWaPages] = useState(1);
  const [waReviewedFilter, setWaReviewedFilter] = useState<string | null>(null);
  const [selectedWaSession, setSelectedWaSession] = useState<WaBotSession | null>(null);
  const [waModalMessages, setWaModalMessages] = useState<WaBotSessionMessage[]>([]);
  const [waModalLoading, setWaModalLoading] = useState(false);

  // ── Panel de revisión (compartido entre ambas pestañas) ─────────────────────
  const [reviewChecked, setReviewChecked] = useState(false);
  const [reviewCategory, setReviewCategory] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const [range, setRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(29, "day").startOf("day").toDate(),
    dayjs().endOf("day").toDate(),
  ]);

  const dateParams = useMemo(() => {
    if (!range[0] || !range[1]) return null;
    return {
      startDate: dayjs(range[0]).format("YYYY-MM-DD"),
      endDate: dayjs(range[1]).format("YYYY-MM-DD"),
    };
  }, [range]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setLoading(true);
      try {
        setStats(await getChatbotStats(dateParams));
      } catch (err) {
        console.error("Error cargando métricas de chatbots:", err);
        notifications.show({
          color: "red",
          title: "Error",
          message: "No se pudieron cargar las métricas de chatbots",
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dateParams]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setSessionsLoading(true);
      try {
        const res = await getChatbotSessions({
          ...dateParams,
          type: (typeFilter as "admin" | "booking") || undefined,
          channel: (channelFilter as "web" | "whatsapp") || undefined,
          converted: onlyConverted || undefined,
          hasError: onlyErrors || undefined,
          reviewed: reviewedFilter === "true" ? true : reviewedFilter === "false" ? false : undefined,
          page,
          limit: 20,
        });
        setSessions(res.sessions);
        setPages(res.pages);
      } catch (err) {
        console.error("Error cargando sesiones de chat:", err);
      } finally {
        setSessionsLoading(false);
      }
    };
    void load();
  }, [dateParams, typeFilter, channelFilter, reviewedFilter, onlyConverted, onlyErrors, page]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setWaSessionsLoading(true);
      try {
        const res = await getWaBotSessions({
          ...dateParams,
          reviewed: waReviewedFilter === "true" ? true : waReviewedFilter === "false" ? false : undefined,
          page: waPage,
          limit: 20,
        });
        setWaSessions(res.sessions);
        setWaPages(res.pages);
      } catch (err) {
        console.error("Error cargando sesiones del agente WhatsApp:", err);
      } finally {
        setWaSessionsLoading(false);
      }
    };
    void load();
  }, [dateParams, waReviewedFilter, waPage]);

  // Resetea el borrador de revisión cada vez que se abre/cierra una sesión distinta
  useEffect(() => {
    const review = selectedSession?.review || selectedWaSession?.review;
    setReviewChecked(!!review?.reviewed);
    setReviewCategory(review?.category || null);
    setReviewNotes(review?.notes || "");
  }, [selectedSession, selectedWaSession]);

  const openSession = (s: ChatbotSession) => setSelectedSession(s);

  const openWaSession = async (s: WaBotSession) => {
    setSelectedWaSession(s);
    setWaModalLoading(true);
    try {
      setWaModalMessages(await getWaBotSessionMessages(s.sessionId));
    } catch (err) {
      console.error("Error cargando mensajes de la sesión:", err);
      notifications.show({ color: "red", message: "No se pudieron cargar los mensajes" });
    } finally {
      setWaModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSession(null);
    setSelectedWaSession(null);
    setWaModalMessages([]);
  };

  const handleSaveReview = async () => {
    setReviewSaving(true);
    try {
      const payload = {
        reviewed: reviewChecked,
        category: reviewCategory || undefined,
        notes: reviewNotes || undefined,
      };
      if (selectedSession) {
        const updated = await markChatLogSessionReviewed(selectedSession._id, payload);
        setSessions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        setSelectedSession(updated);
      } else if (selectedWaSession) {
        const res = await markWaBotSessionReviewed(selectedWaSession.sessionId, payload);
        setWaSessions((prev) =>
          prev.map((s) => (s.sessionId === res.sessionId ? { ...s, review: res.review } : s))
        );
        setSelectedWaSession((prev) => (prev ? { ...prev, review: res.review } : prev));
      }
      notifications.show({ color: "teal", message: "Revisión guardada." });
    } catch (err) {
      console.error("Error guardando revisión:", err);
      notifications.show({ color: "red", message: "No se pudo guardar la revisión." });
    } finally {
      setReviewSaving(false);
    }
  };

  const bookingStats = stats?.porTipo.find((t) => t._id === "booking");
  const adminStats = stats?.porTipo.find((t) => t._id === "admin");
  const totalTokens = (stats?.porTipo ?? []).reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
  const bookingFeedback = stats?.feedback.find((f) => f._id === "booking");
  const totalSesiones = (bookingStats?.sesiones ?? 0) + (adminStats?.sesiones ?? 0);
  const totalRevisadas = (bookingStats?.revisadas ?? 0) + (adminStats?.revisadas ?? 0);

  const modalMessages: ModalMessage[] = selectedSession
    ? [
        ...selectedSession.messages,
        ...(selectedSession.reply ? [{ role: "assistant" as const, content: selectedSession.reply }] : []),
      ]
    : waModalMessages;

  const modalOpen = !!selectedSession || !!selectedWaSession;

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const filterSelect = (value: string | null, onChange: (v: string | null) => void, placeholder: string, data: { value: string; label: string }[], w: number) => (
    <Select value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder} clearable data={data} w={w} />
  );

  const tabs: [string, string][] = [
    ["web", "Chat web"],
    ["wa", "Agente admin por WhatsApp"],
    ["orgs", "Organizaciones con más uso"],
  ];

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 20 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Chatbots</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Uso, conversión, costo y revisión de los asistentes: reservas, admin web y agente admin por WhatsApp.
            </div>
          </div>
          <DatePickerInput type="range" aria-label="Rango de fechas" value={range} onChange={setRange} locale="es" valueFormat="D MMM YYYY" dropdownType="modal" style={{ minWidth: 240 }} />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", opacity: loading && stats ? 0.6 : 1 }}>
          {loading && !stats ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={92} radius="md" />)
          ) : (
            <>
              <KpiCard label="Sesiones de reserva" value={fmtNum(bookingStats?.sesiones)} hint={`${fmtNum(adminStats?.sesiones)} del asistente admin`} />
              <KpiCard
                label="Conversión total"
                value={`${stats?.funnelBooking.tasaConversionTotal ?? 0} %`}
                hint={`${fmtNum(stats?.funnelBooking.reservasCreadas)} reservas de ${fmtNum(stats?.funnelBooking.sesiones)} sesiones`}
              />
              <KpiCard
                label="Reservas preparadas"
                value={`${stats?.funnelBooking.tasaPreparacion ?? 0} %`}
                hint={`${fmtNum(stats?.funnelBooking.conPayloadPreparado)} llegaron a confirmar; ${stats?.funnelBooking.tasaConversionPayload ?? 0} % convirtió`}
              />
              <KpiCard
                label="Tokens"
                value={fmtNum(totalTokens)}
                hint={`Entrada y salida${bookingFeedback ? ` · satisfacción ${bookingFeedback.ratingPromedio.toFixed(1)}/5 (${bookingFeedback.total})` : ""}`}
              />
              <KpiCard
                label="Rondas promedio (reserva)"
                value={(bookingStats?.rondasPromedio ?? 0).toFixed(1)}
                hint={`${((bookingStats?.duracionPromedioMs ?? 0) / 1000).toFixed(1)} s de duración promedio`}
              />
              <KpiCard label="Llegaron al límite" value={fmtNum((bookingStats?.conRoundLimit ?? 0) + (adminStats?.conRoundLimit ?? 0))} hint="Agotaron las rondas sin resolver" />
              <KpiCard label="Con error" value={fmtNum((bookingStats?.conError ?? 0) + (adminStats?.conError ?? 0))} hint="Fallaron al procesar" />
              <KpiCard label="Por revisar" value={fmtNum(totalSesiones - totalRevisadas)} hint={`${fmtNum(totalRevisadas)} de ${fmtNum(totalSesiones)} revisadas (chat web)`} />
            </>
          )}
        </div>

        <section className="ag-stack" style={{ gap: 14 }}>
          <nav className="ag-subtabs" aria-label="Vistas de chatbots" style={{ gap: 20 }}>
            {tabs.map(([v, l]) => (
              <a
                key={v}
                href={`#${v}`}
                aria-current={activeTab === v ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(v);
                }}
              >
                {l}
              </a>
            ))}
          </nav>

          {activeTab === "web" && (
            <>
              <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
                {filterSelect(typeFilter, resetPage(setTypeFilter), "Todos los tipos", [
                  { value: "booking", label: "Reserva" },
                  { value: "admin", label: "Admin" },
                ], 160)}
                {filterSelect(channelFilter, resetPage(setChannelFilter), "Todos los canales", [
                  { value: "web", label: "Web" },
                  { value: "whatsapp", label: "WhatsApp" },
                ], 170)}
                {filterSelect(reviewedFilter, resetPage(setReviewedFilter), "Revisadas y sin revisar", [
                  { value: "true", label: "Revisadas" },
                  { value: "false", label: "Sin revisar" },
                ], 200)}
                <Checkbox label="Solo convertidas" checked={onlyConverted} onChange={(e) => resetPage(setOnlyConverted)(e.currentTarget.checked)} />
                <Checkbox label="Solo con error" checked={onlyErrors} onChange={(e) => resetPage(setOnlyErrors)(e.currentTarget.checked)} />
              </div>
              <div className="ag-card" style={{ overflowX: "auto", opacity: sessionsLoading ? 0.6 : 1 }}>
                <table className="ag-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Organización</th>
                      <th>Tipo</th>
                      <th>Canal</th>
                      <th style={{ textAlign: "right" }}>Rondas</th>
                      <th style={{ textAlign: "right" }}>Tokens</th>
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="ag-muted" style={{ textAlign: "center", padding: "24px 16px" }}>
                          {sessionsLoading ? "Cargando…" : "No hay sesiones con estos filtros."}
                        </td>
                      </tr>
                    ) : (
                      sessions.map((s) => (
                        <tr key={s._id}>
                          <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{dayjs(s.createdAt).format("DD/MM HH:mm")}</td>
                          <td>{s.organizationId?.name || "—"}</td>
                          <td>{TYPE_LABEL[s.type] ?? s.type}</td>
                          <td className="ag-muted">{s.channel === "whatsapp" ? "WhatsApp" : "Web"}</td>
                          <td className="ag-num" style={{ textAlign: "right" }}>{s.rounds}</td>
                          <td className="ag-num" style={{ textAlign: "right" }}>{fmtNum(s.inputTokens + s.outputTokens)}</td>
                          <td>
                            <div className="ag-row" style={{ gap: 4 }}>
                              {s.review?.reviewed && <StateBadge kind="reviewed" />}
                              {s.reservationCreated && <StateBadge kind="converted" />}
                              {!s.reservationCreated && s.bookingPayload != null && <StateBadge kind="prepared" />}
                              {s.hitRoundLimit && <StateBadge kind="limit" />}
                              {s.error && <StateBadge kind="error" />}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Button size="xs" variant="default" onClick={() => openSession(s)}>
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {pages > 1 && <Pagination value={page} onChange={setPage} total={pages} size="sm" style={{ alignSelf: "center" }} />}
            </>
          )}

          {activeTab === "wa" && (
            <>
              <div className="ag-row" style={{ gap: 8, justifyContent: "space-between" }}>
                <div className="ag-subtle">Conversaciones del equipo de cada negocio con el agente IA por WhatsApp. Este canal no registra tokens ni rondas.</div>
                {filterSelect(
                  waReviewedFilter,
                  (v) => {
                    setWaReviewedFilter(v);
                    setWaPage(1);
                  },
                  "Revisadas y sin revisar",
                  [
                    { value: "true", label: "Revisadas" },
                    { value: "false", label: "Sin revisar" },
                  ],
                  200
                )}
              </div>
              <div className="ag-card" style={{ overflowX: "auto", opacity: waSessionsLoading ? 0.6 : 1 }}>
                <table className="ag-table" style={{ minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th>Última actividad</th>
                      <th>Organización</th>
                      <th style={{ textAlign: "right" }}>Mensajes</th>
                      <th>Estado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {waSessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="ag-muted" style={{ textAlign: "center", padding: "24px 16px" }}>
                          {waSessionsLoading ? "Cargando…" : "No hay sesiones con estos filtros."}
                        </td>
                      </tr>
                    ) : (
                      waSessions.map((s) => (
                        <tr key={s.sessionId}>
                          <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{dayjs(s.lastMessageAt).format("DD/MM HH:mm")}</td>
                          <td>{s.organizationId?.name || "—"}</td>
                          <td className="ag-num" style={{ textAlign: "right" }}>{s.messageCount}</td>
                          <td>{s.review?.reviewed ? <StateBadge kind="reviewed" /> : <span className="ag-muted">Sin revisar</span>}</td>
                          <td style={{ textAlign: "right" }}>
                            <Button size="xs" variant="default" onClick={() => void openWaSession(s)}>
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {waPages > 1 && <Pagination value={waPage} onChange={setWaPage} total={waPages} size="sm" style={{ alignSelf: "center" }} />}
            </>
          )}

          {activeTab === "orgs" && (
            <div className="ag-card" style={{ overflowX: "auto" }}>
              <table className="ag-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Organización</th>
                    <th style={{ textAlign: "right" }}>Sesiones</th>
                    <th style={{ textAlign: "right" }}>Reserva</th>
                    <th style={{ textAlign: "right" }}>Admin</th>
                    <th style={{ textAlign: "right" }}>Reservas creadas</th>
                    <th style={{ textAlign: "right" }}>Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.porOrganizacion ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="ag-muted" style={{ textAlign: "center", padding: "24px 16px" }}>
                        No hay datos en este rango.
                      </td>
                    </tr>
                  ) : (
                    stats!.porOrganizacion.map((row) => (
                      <tr key={row.organizationId}>
                        <td style={{ fontWeight: 600 }}>{row.nombre}</td>
                        <td className="ag-num" style={{ textAlign: "right" }}>{row.sesiones}</td>
                        <td className="ag-num" style={{ textAlign: "right" }}>{row.booking}</td>
                        <td className="ag-num" style={{ textAlign: "right" }}>{row.admin}</td>
                        <td className="ag-num" style={{ textAlign: "right" }}>
                          {row.convertidas}
                          {row.conPayload > 0 && <span className="ag-subtle"> / {row.conPayload} preparadas</span>}
                        </td>
                        <td className="ag-num" style={{ textAlign: "right" }}>{fmtNum(row.inputTokens + row.outputTokens)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Panel: conversación y revisión */}
      <Drawer
        opened={modalOpen}
        onClose={closeModal}
        position="right"
        size={560}
        title={
          <div>
            <b style={{ fontSize: 16 }}>Conversación</b>
            <div className="ag-subtle">
              {selectedSession
                ? `${selectedSession.organizationId?.name || "—"} · ${TYPE_LABEL[selectedSession.type] ?? selectedSession.type}`
                : selectedWaSession
                  ? `${selectedWaSession.organizationId?.name || "—"} · agente WhatsApp`
                  : ""}
            </div>
          </div>
        }
      >
        {(selectedSession || selectedWaSession) && (
          <div className="ag-stack" style={{ gap: 14 }}>
            {selectedSession && (
              <div className="ag-row" style={{ gap: 6 }}>
                <span className="ag-badge ag-badge--outline">{selectedSession.rounds} rondas</span>
                <span className="ag-badge ag-badge--outline">{fmtNum(selectedSession.inputTokens + selectedSession.outputTokens)} tokens</span>
                {selectedSession.toolsUsed?.length > 0 && <span className="ag-badge ag-badge--outline">{selectedSession.toolsUsed.join(", ")}</span>}
              </div>
            )}
            {selectedSession?.error && (
              <div className="ag-alert ag-alert--danger">
                <IconCircleX size={20} />
                <div style={{ fontSize: 14 }}>Error: {selectedSession.error}</div>
              </div>
            )}
            {waModalLoading ? (
              <div className="ag-stack" style={{ gap: 8 }}>
                <Skeleton height={40} width="70%" />
                <Skeleton height={40} width="60%" style={{ alignSelf: "flex-end" }} />
              </div>
            ) : (
              <div className="ag-stack" style={{ gap: 8 }}>
                {modalMessages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "8px 12px",
                      borderRadius: 12,
                      fontSize: 14,
                      lineHeight: "20px",
                      whiteSpace: "pre-wrap",
                      background: m.role === "user" ? "var(--brand-soft)" : "var(--surface-muted)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}
            <ReviewPanel
              reviewed={reviewChecked}
              onReviewedChange={setReviewChecked}
              category={reviewCategory}
              onCategoryChange={setReviewCategory}
              notes={reviewNotes}
              onNotesChange={setReviewNotes}
              onSave={() => void handleSaveReview()}
              saving={reviewSaving}
              lastReview={selectedSession?.review || selectedWaSession?.review}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
