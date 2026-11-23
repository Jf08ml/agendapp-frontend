// Tienda e inventario › Pedidos (rediseño, PedidosPanel), en /pedidos.
// Buscador y segmento Por entregar / Todos; tabla (tarjetas en móvil) y detalle
// lateral con una sola acción principal según el caso: «Registrar cobro y
// entregar» (contraentrega pendiente) o «Marcar como entregado» (pagado);
// «Cancelar pedido» como secundaria y «Eliminar pedido» en «⋯». Mismas
// llamadas y reglas que la bandeja anterior.
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { ActionIcon, Button, Drawer, Menu, Modal, SegmentedControl, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCash,
  IconCircleCheck,
  IconCircleX,
  IconDots,
  IconLock,
  IconMapPin,
  IconReceipt,
  IconSearch,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatCurrency } from "../../../utils/formatCurrency";
import { toSpanishMeridiem } from "../../../utils/timeFormatUtils";
import {
  listStoreOrders,
  deliverStoreOrder,
  collectStoreOrder,
  cancelStoreOrder,
  deleteStoreOrderPermanently,
  type StoreOrder,
  type CodCollectMethod,
} from "../../../services/storeOrderService";
import StoreTabs from "../../../components/store/StoreTabs";
import CashSubtabs from "../../../components/cash/CashSubtabs";
import StateBadge from "../inventory/components/StoreStateBadge";
import {
  PROVIDER_LABEL,
  orderActions,
  orderFulfillmentState,
  orderNumber,
  orderPaymentState,
} from "../inventory/storeView";

const COD_METHOD_OPTIONS: { value: CodCollectMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const formatDate = (iso?: string) => (iso ? toSpanishMeridiem(dateFormatter.format(new Date(iso))) : "");

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

const modeLabel = (o: StoreOrder) => (o.store?.delivery?.mode === "delivery" ? "Domicilio" : "Retiro en el local");

export default function StoreOrdersPage() {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const { hasPermission } = usePermissions();
  const canRead = hasPermission("inventory:read");
  const canManage = hasPermission("inventory:manage");
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  // Desde Caja y pagos (?desde=caja) la página se ve como parte de Caja y
  // arranca en «Cobro pendiente» si hay; si no, en «Por entregar».
  const [searchParams] = useSearchParams();
  const fromCash = searchParams.get("desde") === "caja";
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [onlyCollect, setOnlyCollect] = useState(fromCash);
  const [collectDefaultChecked, setCollectDefaultChecked] = useState(!fromCash);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectFor, setCollectFor] = useState<StoreOrder | null>(null);
  const [collectMethod, setCollectMethod] = useState<CodCollectMethod>("cash");

  const load = async (fulfillment: "pending" | "all" = filter) => {
    setLoading(true);
    setLoadError(false);
    try {
      setOrders(await listStoreOrders(fulfillment));
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, canRead]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = onlyCollect ? orders.filter((o) => orderActions(o, true).primary === "collect") : orders;
    if (!q) return base;
    return base.filter((o) => {
      const c = o.store?.customer;
      return (
        (c?.name || "").toLowerCase().includes(q) ||
        (c?.phone || "").includes(q) ||
        orderNumber(o).toLowerCase().includes(q) ||
        (o.store?.items || []).some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [orders, search, onlyCollect]);

  useEffect(() => {
    if (collectDefaultChecked || loading) return;
    setCollectDefaultChecked(true);
    if (!orders.some((o) => orderActions(o, true).primary === "collect")) setOnlyCollect(false);
  }, [collectDefaultChecked, loading, orders]);

  const header = fromCash ? (
    <>
      <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Caja y pagos</h1>
      <CashSubtabs />
    </>
  ) : null;

  const selected = orders.find((o) => o._id === selectedId) || null;

  const handleDeliver = async (order: StoreOrder) => {
    setProcessing(order._id);
    try {
      await deliverStoreOrder(order._id);
      notifications.show({ color: "teal", message: "Pedido marcado como entregado." });
      await load();
    } catch (e) {
      notifications.show({ color: "red", message: e instanceof Error ? e.message : "No se pudo marcar la entrega." });
    } finally {
      setProcessing(null);
    }
  };

  const handleCollect = async () => {
    if (!collectFor) return;
    setProcessing(collectFor._id);
    try {
      await collectStoreOrder(collectFor._id, collectMethod);
      notifications.show({ color: "teal", message: "Cobro registrado y pedido entregado. La venta quedó en caja." });
      setCollectFor(null);
      await load();
    } catch (e) {
      // Incluye el 400 de stock insuficiente: se muestra el mensaje del backend.
      notifications.show({ color: "red", message: e instanceof Error ? e.message : "No se pudo registrar el cobro." });
    } finally {
      setProcessing(null);
    }
  };

  const doCancel = async (order: StoreOrder) => {
    setProcessing(order._id);
    try {
      await cancelStoreOrder(order._id);
      notifications.show({ color: "orange", message: "Pedido cancelado." });
      await load();
    } catch (e) {
      notifications.show({ color: "red", message: e instanceof Error ? e.message : "No se pudo cancelar el pedido." });
    } finally {
      setProcessing(null);
    }
  };

  const confirmCancel = (order: StoreOrder) => {
    modals.openConfirmModal({
      title: "Cancelar pedido",
      centered: true,
      children: (
        <Text size="sm">
          ¿Deseas cancelar el pedido de {order.store?.customer?.name || "este cliente"} por{" "}
          {formatCurrency(order.amount, order.currency)}? Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: "Cancelar pedido", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: () => doCancel(order),
    });
  };

  const doDelete = async (order: StoreOrder) => {
    setProcessing(order._id);
    try {
      await deleteStoreOrderPermanently(order._id);
      notifications.show({ color: "red", message: "Pedido eliminado definitivamente." });
      setSelectedId(null);
      await load();
    } catch (e) {
      notifications.show({ color: "red", message: e instanceof Error ? e.message : "No se pudo eliminar el pedido." });
    } finally {
      setProcessing(null);
    }
  };

  const confirmDelete = (order: StoreOrder) => {
    modals.openConfirmModal({
      title: "Eliminar pedido definitivamente",
      centered: true,
      children: (
        <Text size="sm">
          ¿Eliminar definitivamente el pedido de {order.store?.customer?.name || "este cliente"} por{" "}
          {formatCurrency(order.amount, order.currency)}? Desaparecerá de la bandeja y <strong>no se puede deshacer</strong>.
          No afecta el stock ni las ventas ya registradas en caja.
        </Text>
      ),
      labels: { confirm: "Eliminar definitivamente", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: () => doDelete(order),
    });
  };

  const pendingCount = filter === "pending" && !loading && !loadError ? orders.length : undefined;

  if (!canRead) {
    return (
      <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
        {header ?? <StoreTabs pendingOrders={0} />}
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon"><IconLock size={22} /></div>
            <h3>No tienes permisos para ver los pedidos de la tienda</h3>
          </div>
        </div>
      </div>
    );
  }

  const itemsSummary = (o: StoreOrder) => {
    const items = o.store?.items || [];
    const first = items[0];
    if (!first) return "Sin productos";
    const units = items.reduce((n, i) => n + i.quantity, 0);
    return items.length === 1 ? `${first.name} × ${first.quantity}` : `${first.name} y ${items.length - 1} más · ${units} unidades`;
  };

  const primaryButton = (o: StoreOrder, full = false) => {
    const a = orderActions(o, canManage);
    if (a.primary === "collect") {
      return (
        <Button
          fullWidth={full}
          leftSection={<IconCash size={16} />}
          loading={processing === o._id}
          onClick={() => {
            setCollectMethod("cash");
            setCollectFor(o);
          }}
        >
          Registrar cobro y entregar
        </Button>
      );
    }
    if (a.primary === "deliver") {
      return (
        <Button fullWidth={full} leftSection={<IconCircleCheck size={16} />} loading={processing === o._id} onClick={() => handleDeliver(o)}>
          Marcar como entregado
        </Button>
      );
    }
    if (a.inReview) {
      return (
        <Button fullWidth={full} variant="default" component={Link} to="/gestionar-pagos" leftSection={<IconReceipt size={16} />}>
          Revisar comprobante
        </Button>
      );
    }
    return null;
  };

  const detail = selected && (() => {
    const o = selected;
    const a = orderActions(o, canManage);
    const customer = o.store?.customer;
    const delivery = o.store?.delivery;
    const items = o.store?.items || [];
    const custom = Object.entries(o.store?.customFieldValues || {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
    const primary = primaryButton(o, isMobile);
    return (
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <div className="ag-stack" style={{ gap: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: 18 }}>{customer?.name || "Cliente"}</b>
              <span className="ag-subtle">
                {orderNumber(o)} · {formatDate(o.createdAt)} · {PROVIDER_LABEL[o.provider] || o.provider}
              </span>
            </div>
            {a.canDelete && (
              <Menu shadow="lg" withinPortal position="bottom-end" zIndex={400}>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" aria-label="Más acciones del pedido">
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmDelete(o)}>
                    Eliminar pedido
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </div>
          <div className="ag-row" style={{ gap: 4 }}>
            <StateBadge info={orderPaymentState(o)} />
            <StateBadge info={orderFulfillmentState(o)} />
          </div>
        </div>

        {/* Productos */}
        <div className="ag-card" style={{ overflow: "hidden" }}>
          {items.map((item, idx) => (
            <div key={`${item.productId}-${idx}`} className="ag-list-row" style={{ padding: "10px 12px" }}>
              <span style={{ flex: 1, fontSize: 14 }}>
                {item.name} <span className="ag-subtle">× {item.quantity}</span>
              </span>
              <span className="ag-num" style={{ fontSize: 14 }}>{formatCurrency(item.unitPrice * item.quantity, o.currency)}</span>
            </div>
          ))}
          <div className="ag-list-row" style={{ padding: "10px 12px", background: "var(--surface-muted)" }}>
            <b style={{ flex: 1 }}>Total</b>
            <b className="ag-num">{formatCurrency(o.amount, o.currency)}</b>
          </div>
        </div>

        {/* Cliente y entrega */}
        <div className="ag-stack" style={{ gap: 6 }}>
          <h3 style={{ margin: 0, font: "600 15px/22px var(--mantine-font-family)" }}>Cliente y entrega</h3>
          {customer?.phone && (
            <a href={waLink(customer.phone)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--ink)", fontSize: 14 }}>
              <IconBrandWhatsapp size={16} /> {customer.phone}
            </a>
          )}
          {customer?.email && <span className="ag-subtle">{customer.email}</span>}
          {customer?.documentId && <span className="ag-subtle">Documento: {customer.documentId}</span>}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 14 }}>
            {delivery?.mode === "delivery" ? <IconMapPin size={16} /> : <IconBuildingStore size={16} />}
            {modeLabel(o)}
          </span>
          {delivery?.mode === "delivery" && delivery.address && (
            <span style={{ fontSize: 14 }}>
              {delivery.address}
              {delivery.lat != null && delivery.lng != null && (
                <>
                  {" · "}
                  <a href={`https://www.google.com/maps?q=${delivery.lat},${delivery.lng}`} target="_blank" rel="noopener noreferrer">
                    Ver en mapa
                  </a>
                </>
              )}
            </span>
          )}
          {delivery?.notes && <span className="ag-subtle">Notas: {delivery.notes}</span>}
          {custom.map(([key, value]) => {
            const def = organization?.storeFormConfig?.fields?.find((f) => f.key === key);
            return (
              <span key={key} className="ag-subtle">
                {def?.label || key}: {String(value)}
              </span>
            );
          })}
        </div>

        {/* Acciones: una principal y, si aplica, cancelar */}
        {(primary || a.canCancel) && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 8,
              padding: "12px 0",
              background: "var(--surface-raised)",
              borderTop: "1px solid var(--line)",
            }}
          >
            {primary}
            {a.canCancel && (
              <Button
                variant="subtle"
                color="red"
                fullWidth={isMobile}
                leftSection={<IconCircleX size={16} />}
                loading={processing === o._id}
                onClick={() => confirmCancel(o)}
              >
                Cancelar pedido
              </Button>
            )}
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      {header ?? <StoreTabs pendingOrders={pendingCount} />}

      <div className="ag-row" style={{ gap: 12 }}>
        <div className="ag-search" style={{ flex: isMobile ? "1 1 100%" : "0 1 320px" }}>
          <input
            className="ag-input"
            type="search"
            placeholder="Buscar por cliente, teléfono, producto o número"
            aria-label="Buscar pedidos"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <span aria-hidden="true">
            <IconSearch size={16} stroke={1.75} />
          </span>
        </div>
        <SegmentedControl
          size="xs"
          value={onlyCollect ? "collect" : filter}
          onChange={(v) => {
            setOnlyCollect(v === "collect");
            setFilter(v === "all" ? "all" : "pending");
          }}
          data={[
            ...(fromCash ? [{ label: "Cobro pendiente", value: "collect" }] : []),
            { label: "Por entregar", value: "pending" },
            { label: "Todos", value: "all" },
          ]}
        />
      </div>

      {loadError ? (
        <div className="ag-alert ag-alert--danger" role="alert">
          <IconAlertTriangle size={18} />
          <div style={{ flex: 1 }}>No se pudieron cargar los pedidos. Revisa tu conexión e inténtalo de nuevo.</div>
          <Button size="xs" variant="default" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="ag-card" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", gap: 16 }}>
              <span className="ag-skeleton" style={{ width: "15%" }} />
              <span className="ag-skeleton" style={{ width: "30%" }} />
              <span className="ag-skeleton" style={{ width: "20%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon"><IconTruckDelivery size={22} /></div>
            <h3>
              {search
                ? "Ningún pedido coincide con la búsqueda"
                : onlyCollect
                  ? "No hay pedidos con cobro pendiente"
                  : filter === "pending"
                  ? "No hay pedidos por entregar"
                  : "Aún no hay pedidos"}
            </h3>
            {!search && filter === "all" && <p>Cuando tus clientes compren en la tienda, los verás aquí.</p>}
          </div>
        </div>
      ) : isMobile ? (
        <div className="ag-card">
          {filtered.map((o) => (
            <div
              key={o._id}
              className="ag-list-row"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(o._id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedId(o._id)}
              style={{ padding: "var(--space-3)", cursor: "pointer", flexDirection: "column", alignItems: "stretch", gap: 4 }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <b style={{ flex: 1, fontSize: 15 }}>{o.store?.customer?.name || "Cliente"}</b>
                <b className="ag-num">{formatCurrency(o.amount, o.currency)}</b>
              </div>
              <span className="ag-subtle">
                {orderNumber(o)} · {modeLabel(o)} · {itemsSummary(o)}
              </span>
              <div className="ag-row" style={{ gap: 4 }}>
                <StateBadge info={orderPaymentState(o)} small />
                <StateBadge info={orderFulfillmentState(o)} small />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th className="num">Total</th>
                <th>Pago</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id} aria-selected={o._id === selectedId} onClick={() => setSelectedId(o._id)} style={{ cursor: "pointer" }}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <b className="ag-num" style={{ display: "block" }}>{orderNumber(o)}</b>
                    <span className="ag-subtle">{formatDate(o.createdAt)}</span>
                  </td>
                  <td>
                    <b style={{ display: "block" }}>{o.store?.customer?.name || "—"}</b>
                    <span className="ag-subtle ag-num">{o.store?.customer?.phone}</span>
                  </td>
                  <td>
                    <span style={{ display: "block" }}>{itemsSummary(o)}</span>
                    <span className="ag-subtle">
                      {modeLabel(o)} · {PROVIDER_LABEL[o.provider] || o.provider}
                    </span>
                  </td>
                  <td className="num"><b>{formatCurrency(o.amount, o.currency)}</b></td>
                  <td><StateBadge info={orderPaymentState(o)} /></td>
                  <td><StateBadge info={orderFulfillmentState(o)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        opened={!!selected}
        onClose={() => setSelectedId(null)}
        position="right"
        size={isMobile ? "100%" : 480}
        title="Detalle del pedido"
      >
        {detail}
      </Drawer>

      <Modal opened={!!collectFor} onClose={() => setCollectFor(null)} title="Registrar cobro y entregar" centered zIndex={400}>
        <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
          <span className="ag-muted" style={{ fontSize: 14 }}>
            Se registra la venta en caja por {collectFor ? formatCurrency(collectFor.amount, collectFor.currency) : ""} y el
            pedido queda pagado y entregado.
          </span>
          <div>
            <Text size="sm" fw={500} mb={6}>
              Método de pago
            </Text>
            <div className="ag-row" style={{ gap: 6 }} role="radiogroup" aria-label="Método de pago">
              {COD_METHOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  className="ag-chip"
                  aria-checked={collectMethod === m.value}
                  aria-selected={collectMethod === m.value}
                  onClick={() => setCollectMethod(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8, justifyContent: "flex-end" }}>
            <Button variant="default" onClick={() => setCollectFor(null)}>
              Cancelar
            </Button>
            <Button loading={!!processing} onClick={handleCollect}>
              Confirmar cobro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
