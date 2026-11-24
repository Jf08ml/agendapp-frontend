// Comprobantes de pago (rediseño, ComprobantesPanel): pestaña de Caja y pagos.
// Cola en tabla (cliente, qué paga, monto, validación IA, enviado, estado) y el
// detalle en un panel lateral. Con 2 o más por revisar, «Revisar uno a uno»
// abre el primero y, al aprobar, rechazar o saltar, pasa al siguiente. Mismos
// endpoints de siempre (listReceiptOrders / reviewReceiptOrder).
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Group,
  Image,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconEye,
  IconHelpCircle,
  IconRefresh,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import type { RootState } from "../../../app/store";
import { listReceiptOrders, reviewReceiptOrder, type ReceiptOrder } from "../../../services/collectionService";
import { formatCurrency } from "../../../utils/formatCurrency";
import CashSubtabs from "../../../components/cash/CashSubtabs";

const TYPE_LABEL: Record<string, string> = {
  reservation: "Reserva",
  class: "Clase",
  package: "Paquete",
};

// Verbo de la acción principal según lo que se paga
const APPROVE_LABEL: Record<string, string> = {
  reservation: "Aprobar y confirmar reserva",
  class: "Aprobar y confirmar inscripción",
  package: "Aprobar y asignar paquete",
};

type Tone = "success" | "warning" | "danger" | "info";

const VERDICT: Record<string, { label: string; tone: Tone; icon: Icon }> = {
  match: { label: "Coincide", tone: "success", icon: IconCircleCheck },
  mismatch: { label: "Discrepancia", tone: "warning", icon: IconAlertTriangle },
  unreadable: { label: "Ilegible", tone: "danger", icon: IconHelpCircle },
};

const STATUS: Record<string, { label: string; tone?: Tone }> = {
  in_review: { label: "Por revisar", tone: "warning" },
  paid: { label: "Aprobado", tone: "success" },
  failed: { label: "Rechazado", tone: "danger" },
  expired: { label: "Expirado" },
  pending: { label: "Pendiente" },
  created: { label: "Sin pagar" },
  refunded: { label: "Reembolsado", tone: "info" },
};

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <>
      <dt>{label}</dt>
      <dd style={{ wordBreak: "break-word" }}>{value}</dd>
    </>
  );
}

/** Quién paga y qué, a partir del pedido vinculado */
function describe(order: ReceiptOrder): { who: string; what: string } {
  if (order.linkedReservation) {
    const first = order.linkedReservation.items[0];
    return {
      who: order.linkedReservation.customerName,
      what: [first?.service, order.linkedReservation.items.length > 1 ? `+${order.linkedReservation.items.length - 1}` : null]
        .filter(Boolean)
        .join(" "),
    };
  }
  if (order.linkedPackage) {
    return {
      who: order.linkedPackage.customerName || "Cliente sin nombre",
      what: [order.linkedPackage.packageName, order.linkedPackage.tierLabel].filter(Boolean).join(" · "),
    };
  }
  if (order.linkedClass) {
    const first = order.linkedClass.items[0];
    return { who: order.linkedClass.customerName, what: first?.className ?? "" };
  }
  return { who: order.receipt?.extracted?.senderName || "—", what: "" };
}

export default function ReceiptReviewPage() {
  const [orders, setOrders] = useState<ReceiptOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ReceiptOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [filter, setFilter] = useState<"in_review" | "all">("in_review");
  // Detalle abierto y cola «uno a uno» (ids por revisar, en orden)
  const [openId, setOpenId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [reviewedInQueue, setReviewedInQueue] = useState(0);
  const organization = useSelector((s: RootState) => s.organization.organization);
  const isMobile = useMediaQuery("(max-width: 48em)");
  // Desde el aviso de Caja: ?abrir=<id> abre uno; ?revisar=1 arranca la cola
  const [params, setParams] = useSearchParams();

  const load = async (status: "in_review" | "all" = filter) => {
    setLoading(true);
    try {
      const data = await listReceiptOrders(status);
      setOrders(data);
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudieron cargar los comprobantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const pending = useMemo(() => orders.filter((o) => o.status === "in_review"), [orders]);
  const pendingTotal = pending.reduce((sum, o) => sum + (o.amount || 0), 0);
  const current = openId ? orders.find((o) => o._id === openId) ?? null : null;

  // Pasa al siguiente de la cola (o cierra si se terminó)
  const advance = (fromId: string) => {
    if (!queue) {
      setOpenId(null);
      return;
    }
    const idx = queue.indexOf(fromId);
    const next = queue[idx + 1];
    if (next) setOpenId(next);
    else {
      setOpenId(null);
      setQueue(null);
      notifications.show({ color: "teal", message: `Revisaste ${reviewedInQueue + 1} comprobante${reviewedInQueue + 1 === 1 ? "" : "s"}.` });
      setReviewedInQueue(0);
    }
  };

  const startQueue = () => {
    const ids = pending.map((o) => o._id);
    if (ids.length === 0) return;
    setQueue(ids);
    setReviewedInQueue(0);
    setOpenId(ids[0]);
  };

  useEffect(() => {
    if (loading) return;
    const abrir = params.get("abrir");
    const revisar = params.get("revisar");
    if (!abrir && !revisar) return;
    if (abrir && orders.some((o) => o._id === abrir)) setOpenId(abrir);
    else if (revisar) startQueue();
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // reviewReceiptOrder lanza el error del servidor (handleAxiosError): antes no se
  // atrapaba, el botón quedaba "cargando" para siempre y el motivo nunca se veía.
  const handleApprove = async (order: ReceiptOrder) => {
    setProcessing(order._id);
    let ok = false;
    try {
      await reviewReceiptOrder(order._id, "approve");
      ok = true;
      notifications.show({ color: "teal", message: "Pago aprobado y reserva confirmada." });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo aprobar",
        message: e instanceof Error ? e.message : "No se pudo procesar la revisión.",
        autoClose: 10000,
      });
    } finally {
      setProcessing(null);
      load();
    }
    if (ok) {
      setReviewedInQueue((n) => n + 1);
      advance(order._id);
    }
  };

  const handleReject = async () => {
    if (!rejectFor) return;
    const order = rejectFor;
    setProcessing(order._id);
    let ok = false;
    try {
      await reviewReceiptOrder(order._id, "reject", rejectNotes.trim() || undefined);
      ok = true;
      notifications.show({ color: "orange", message: "Comprobante rechazado." });
      setRejectFor(null);
      setRejectNotes("");
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo rechazar",
        message: e instanceof Error ? e.message : "No se pudo procesar la revisión.",
        autoClose: 10000,
      });
    } finally {
      setProcessing(null);
      load();
    }
    if (ok) {
      setReviewedInQueue((n) => n + 1);
      advance(order._id);
    }
  };

  const timezone = organization?.timezone || "America/Bogota";
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  const money = (n: number, currency?: string) => formatCurrency(n, currency || organization?.currency);

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Caja y pagos</h1>
      <CashSubtabs />

      <div className="ag-pagehead">
        <span className="ag-muted" style={{ fontSize: 14 }}>
          Pagos por transferencia validados con IA.
        </span>
        <span className="grow" />
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as "in_review" | "all")}
          data={[
            { label: "Por revisar", value: "in_review" },
            { label: "Todos", value: "all" },
          ]}
        />
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => load()}>
          Actualizar
        </Button>
      </div>

      {/* Aviso de la cola: 1 → acciones directas; 2 o más → «Revisar uno a uno» */}
      {!loading && pending.length > 0 && (
        <div className="ag-alert ag-alert--info" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <IconAlertTriangle size={20} stroke={1.75} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>
              {pending.length === 1
                ? `1 comprobante por revisar · ${money(pendingTotal, pending[0].currency)}`
                : `${pending.length} comprobantes por revisar · ${money(pendingTotal, pending[0].currency)}`}
            </b>
            <div className="ag-muted" style={{ fontSize: 13 }}>
              {pending.filter((o) => o.receipt?.aiVerdict === "match").length} marcados como válidos por la IA
            </div>
          </div>
          {pending.length === 1 ? (
            <Group gap="xs">
              <Button size="xs" variant="default" leftSection={<IconEye size={14} />} onClick={() => setOpenId(pending[0]._id)}>
                Ver comprobante
              </Button>
              <Button size="xs" loading={processing === pending[0]._id} onClick={() => handleApprove(pending[0])}>
                Aprobar
              </Button>
            </Group>
          ) : (
            <Button size="xs" onClick={startQueue}>
              Revisar uno a uno
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="ag-card" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <span className="ag-skeleton" style={{ width: "30%" }} />
              <span className="ag-skeleton" style={{ width: "20%" }} />
              <span className="ag-skeleton" style={{ width: "15%" }} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
              <IconCircleCheck size={24} />
            </div>
            <h3>{filter === "in_review" ? "No hay comprobantes pendientes" : "Aún no hay comprobantes"}</h3>
            <p>
              {filter === "in_review"
                ? "Los pagos que requieran tu revisión aparecerán aquí."
                : "Cuando tus clientes paguen por transferencia, los verás aquí."}
            </p>
          </div>
        </div>
      ) : (
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Qué paga</th>
                <th className="num">Monto</th>
                <th>Validación IA</th>
                <th>Enviado</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const { who, what } = describe(order);
                const detected = order.receipt?.extracted?.amount;
                const differs = typeof detected === "number" && detected !== order.amount;
                const verdict = order.receipt?.aiVerdict ? VERDICT[order.receipt.aiVerdict] : null;
                const VerdictIcon = verdict?.icon;
                const confidence = order.receipt?.aiConfidence;
                const status = STATUS[order.status];
                return (
                  <tr key={order._id} aria-selected={order._id === openId} style={{ cursor: "pointer" }} onClick={() => setOpenId(order._id)}>
                    <td>
                      <b>{who}</b>
                    </td>
                    <td>
                      <div>{TYPE_LABEL[order.type] || order.type}</div>
                      {what && <div className="ag-subtle">{what}</div>}
                    </td>
                    <td className="num">
                      <b>{money(order.amount, order.currency)}</b>
                      {differs && <div className="ag-subtle">Detectado {money(detected, order.currency)}</div>}
                    </td>
                    <td>
                      {verdict && VerdictIcon ? (
                        <span className={`ag-badge ag-badge--${verdict.tone}`}>
                          <VerdictIcon size={14} stroke={2} />
                          {verdict.label}
                          {typeof confidence === "number" && ` · ${Math.round(confidence * 100)} %`}
                        </span>
                      ) : (
                        <span className="ag-subtle">—</span>
                      )}
                    </td>
                    <td className="ag-subtle" style={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(order.receipt?.uploadedAt || order.createdAt)}
                    </td>
                    <td>
                      {status && <span className={`ag-badge${status.tone ? ` ag-badge--${status.tone}` : ""}`}>{status.label}</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                      <Button size="xs" variant="subtle" onClick={() => setOpenId(order._id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Detalle (panel lateral; uno a uno con «Saltar») ─── */}
      <Drawer
        opened={!!current}
        onClose={() => {
          setOpenId(null);
          setQueue(null);
        }}
        position={isMobile ? "bottom" : "right"}
        size={isMobile ? "100%" : 520}
        title={
          current ? (
            <div>
              <Text fw={600}>{describe(current).who}</Text>
              <Text size="xs" c="var(--ink-muted)">
                {TYPE_LABEL[current.type] || current.type} · {money(current.amount, current.currency)}
                {queue && ` · ${queue.indexOf(current._id) + 1} de ${queue.length}`}
              </Text>
            </div>
          ) : null
        }
        styles={{ body: { display: "flex", flexDirection: "column", height: "calc(100% - 64px)" } }}
      >
        {current && (
          <>
            <div className="ag-drawer__body" style={{ gap: "var(--space-4)" }}>
              {current.receipt?.fulfillError && current.status === "in_review" && (
                <div className="ag-alert ag-alert--danger">
                  <IconAlertTriangle size={20} />
                  <div style={{ flex: 1 }}>
                    El pago es válido, pero no se pudo{" "}
                    {current.type === "package"
                      ? "asignar el paquete"
                      : current.type === "class"
                        ? "confirmar la inscripción"
                        : "confirmar la reserva"}
                    : {current.receipt.fulfillError}
                    {current.type === "reservation" && (
                      <div style={{ marginTop: 6 }}>
                        <Link to="/gestionar-reservas-online" className="ag-link">
                          Resolver en Reservas online
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {current.receipt?.imageUrl && (
                <a href={current.receipt.imageUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir el comprobante en tamaño completo">
                  <Image
                    src={current.receipt.imageUrl}
                    alt="Comprobante"
                    mah={isMobile ? 320 : 420}
                    fit="contain"
                    radius="md"
                    style={{ background: "var(--surface-muted)" }}
                  />
                </a>
              )}

              {/* Qué se está aprobando */}
              {current.linkedReservation && (
                <div className="ag-card" style={{ padding: "var(--space-3)" }}>
                  <b>{current.linkedReservation.customerName}</b>{" "}
                  {current.linkedReservation.customerPhone && <span className="ag-subtle">{current.linkedReservation.customerPhone}</span>}
                  {current.linkedReservation.items.map((it) => (
                    <div key={it.reservationId} className="ag-subtle">
                      {it.service} · {it.employee || "Sin profesional"} · {formatDateTime(it.startDate)}
                    </div>
                  ))}
                </div>
              )}
              {current.linkedPackage && (
                <div className="ag-card" style={{ padding: "var(--space-3)" }}>
                  <b>{current.linkedPackage.customerName || "Cliente sin nombre"}</b>{" "}
                  {current.linkedPackage.customerPhone && <span className="ag-subtle">{current.linkedPackage.customerPhone}</span>}
                  {current.linkedPackage.customerDocumentId && <div className="ag-subtle">Doc. {current.linkedPackage.customerDocumentId}</div>}
                  <div className="ag-subtle">
                    {current.linkedPackage.packageName}
                    {current.linkedPackage.tierLabel && ` · ${current.linkedPackage.tierLabel}`}
                  </div>
                </div>
              )}
              {current.linkedClass && (
                <div className="ag-card" style={{ padding: "var(--space-3)" }}>
                  <b>{current.linkedClass.customerName}</b>{" "}
                  {current.linkedClass.customerPhone && <span className="ag-subtle">{current.linkedClass.customerPhone}</span>}
                  {current.linkedClass.items.map((it) => (
                    <div key={it.enrollmentId} className="ag-subtle">
                      {it.attendee} · {it.className}
                      {it.startDate && ` · ${formatDateTime(it.startDate)}`}
                    </div>
                  ))}
                </div>
              )}

              {/* Validación IA */}
              <div className="ag-row">
                {current.receipt?.aiVerdict && VERDICT[current.receipt.aiVerdict] && (() => {
                  const v = VERDICT[current.receipt.aiVerdict!];
                  const VIcon = v.icon;
                  return (
                    <span className={`ag-badge ag-badge--${v.tone}`}>
                      <VIcon size={14} stroke={2} />
                      {v.label}
                    </span>
                  );
                })()}
                {typeof current.receipt?.aiConfidence === "number" && (
                  <span className="ag-badge">Confianza {Math.round(current.receipt.aiConfidence * 100)} %</span>
                )}
              </div>

              <dl className="ag-kv" style={{ margin: 0 }}>
                <DataRow label="Monto esperado" value={money(current.amount, current.currency)} />
                <DataRow
                  label="Monto detectado"
                  value={typeof current.receipt?.extracted?.amount === "number" ? money(current.receipt.extracted.amount, current.currency) : undefined}
                />
                <DataRow label="Referencia" value={current.receipt?.extracted?.reference} />
                <DataRow label="De" value={current.receipt?.extracted?.senderName} />
                <DataRow label="Cuenta destino" value={current.receipt?.extracted?.destinationAccount} />
                <DataRow label="Banco" value={current.receipt?.extracted?.bank} />
                <DataRow label="Fecha" value={current.receipt?.extracted?.date} />
                <DataRow label="Enviado" value={formatDateTime(current.receipt?.uploadedAt || current.createdAt)} />
              </dl>

              {current.receipt?.aiNotes && (
                <div className="ag-alert ag-alert--warning">
                  <IconAlertTriangle size={20} />
                  <div>{current.receipt.aiNotes}</div>
                </div>
              )}
            </div>

            {current.status === "in_review" ? (
              <div className="ag-drawer__foot" style={{ margin: "0 calc(-1 * var(--mantine-spacing-md)) calc(-1 * var(--mantine-spacing-md))", flexWrap: "wrap" }}>
                <Button
                  color="red"
                  variant="default"
                  leftSection={<IconCircleX size={16} />}
                  loading={processing === current._id}
                  onClick={() => setRejectFor(current)}
                >
                  Rechazar
                </Button>
                {queue && (
                  <Button variant="subtle" color="gray" onClick={() => advance(current._id)}>
                    Saltar
                  </Button>
                )}
                <Button
                  leftSection={<IconCircleCheck size={16} />}
                  loading={processing === current._id}
                  onClick={() => handleApprove(current)}
                >
                  {APPROVE_LABEL[current.type] || "Aprobar"}
                </Button>
              </div>
            ) : (
              <div className="ag-drawer__foot" style={{ margin: "0 calc(-1 * var(--mantine-spacing-md)) calc(-1 * var(--mantine-spacing-md))" }}>
                <Button variant="default" leftSection={<IconX size={16} />} onClick={() => setOpenId(null)}>
                  Cerrar
                </Button>
              </div>
            )}
          </>
        )}
      </Drawer>

      <Modal opened={!!rejectFor} onClose={() => setRejectFor(null)} title="Rechazar comprobante" centered zIndex={400}>
        <Stack>
          <Text size="sm" c="var(--ink-muted)">
            Se cancelará la reserva/inscripción asociada. Opcionalmente indica el motivo.
          </Text>
          <Textarea
            label="Motivo del rechazo (opcional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejectFor(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={!!processing} onClick={handleReject}>
              Rechazar comprobante
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
