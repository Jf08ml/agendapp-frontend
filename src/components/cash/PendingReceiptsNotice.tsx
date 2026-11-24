// Aviso de comprobantes por validar dentro de Caja (design system, CajaPanel ·
// Fase 2). Escala con la cantidad: 0 → nada; 1 → quién, cuánto, la IA y
// «Ver comprobante» / «Aprobar»; 2 o más → total, cuántos validó la IA, cuánto
// espera el más antiguo y «Revisar uno a uno» (la cola de Comprobantes).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconEye, IconReceipt } from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { usePermissions } from "../../hooks/usePermissions";
import { computeNavPermissions } from "../../layouts/adminNavigation";
import { listReceiptOrders, reviewReceiptOrder, type ReceiptOrder } from "../../services/collectionService";
import { formatCurrency } from "../../utils/formatCurrency";
import { aiVerdictText, pendingReceiptsSummary, waitingText } from "./pendingReceipts";

function payer(o: ReceiptOrder): string {
  return (
    o.linkedReservation?.customerName ||
    o.linkedClass?.customerName ||
    o.linkedPackage?.customerName ||
    o.receipt?.extracted?.senderName ||
    "Cliente"
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export default function PendingReceiptsNotice() {
  const { hasPermission } = usePermissions();
  const planLimits = useSelector((s: RootState) => s.organization.organization?.planLimits);
  const allowed = computeNavPermissions(hasPermission, planLimits).onlineRes;
  const [orders, setOrders] = useState<ReceiptOrder[]>([]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    listReceiptOrders("in_review")
      .then((list) => alive && setOrders(list))
      .catch(() => alive && setOrders([])); // sin permiso o sin conexión: no se muestra
    return () => {
      alive = false;
    };
  }, [allowed]);

  const summary = pendingReceiptsSummary(orders);
  if (!allowed || !summary) return null;
  const money = (n: number) => formatCurrency(n, summary.currency);

  const approve = async (o: ReceiptOrder) => {
    setApproving(true);
    try {
      await reviewReceiptOrder(o._id, "approve");
      setOrders((list) => list.filter((x) => x._id !== o._id));
      notifications.show({ color: "teal", message: `Aprobaste el comprobante de ${payer(o)}.` });
    } catch (e) {
      notifications.show({ color: "red", message: e instanceof Error ? e.message : "No se pudo aprobar. Ábrelo para revisarlo." });
    } finally {
      setApproving(false);
    }
  };

  if (summary.count === 1) {
    const o = orders[0];
    return (
      <div className="ag-alert ag-alert--info" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <IconReceipt size={20} stroke={1.75} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>1 comprobante por validar</b>
          <div className="ag-muted" style={{ fontSize: 13 }}>
            {payer(o)} · <span className="ag-num">{money(o.amount)}</span> · {aiVerdictText(o.receipt?.aiVerdict)} ·{" "}
            {waitingText(o.receipt?.uploadedAt || o.createdAt)}
          </div>
        </div>
        <Group gap="xs">
          <Button size="xs" variant="default" leftSection={<IconEye size={14} />} component={Link} to={`/gestionar-pagos?abrir=${o._id}`}>
            Ver comprobante
          </Button>
          <Button size="xs" loading={approving} onClick={() => approve(o)}>
            Aprobar
          </Button>
        </Group>
      </div>
    );
  }

  return (
    <div className="ag-alert ag-alert--info" style={{ alignItems: "center", flexWrap: "wrap" }}>
      <IconReceipt size={20} stroke={1.75} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <b>
          {summary.count} comprobantes por validar · <span className="ag-num">{money(summary.total)}</span>
        </b>
        <div className="ag-muted" style={{ fontSize: 13 }}>
          {summary.aiMatches === 0
            ? "La IA no marcó ninguno como válido"
            : `${summary.aiMatches} marcado${summary.aiMatches === 1 ? "" : "s"} como válido${summary.aiMatches === 1 ? "" : "s"} por la IA`}{" "}
          · el más antiguo espera desde {summary.oldestWaiting}
        </div>
      </div>
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        {orders.slice(0, 4).map((o, i) => (
          <span
            key={o._id}
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              marginLeft: i ? -8 : 0,
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 600,
              background: "var(--surface-raised)",
              border: "2px solid var(--info-soft)",
              color: "var(--ink)",
            }}
          >
            {initials(payer(o))}
          </span>
        ))}
      </span>
      <Button size="xs" component={Link} to="/gestionar-pagos?revisar=1">
        Revisar uno a uno
      </Button>
    </div>
  );
}
