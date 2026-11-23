// Encabezado de «Tienda e inventario» (rediseño, InventarioPanel / PedidosPanel):
// título, acciones de la pestaña y pestañas Productos · Pedidos. Cada pestaña
// apunta a su ruta de siempre (/inventario y /pedidos). Pedidos lleva el
// contador de los que están por entregar.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { listStoreOrders } from "../../services/storeOrderService";

interface Props {
  actions?: ReactNode;
  /** Si la página ya conoce los pedidos por entregar, evita otra petición. */
  pendingOrders?: number;
}

export default function StoreTabs({ actions, pendingOrders }: Props) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const canSeeOrders = hasPermission("inventory:read");
  const [fetched, setFetched] = useState<number | null>(null);

  useEffect(() => {
    if (!canSeeOrders || pendingOrders !== undefined) return;
    let alive = true;
    listStoreOrders("pending")
      .then((list) => alive && setFetched(list.length))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [canSeeOrders, pendingOrders]);

  const count = pendingOrders ?? fetched;
  const tabs = [
    { key: "productos", label: "Productos", to: "/inventario", visible: true },
    { key: "pedidos", label: "Pedidos", to: "/pedidos", visible: canSeeOrders },
  ].filter((t) => t.visible);

  return (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      <div className="ag-row" style={{ gap: 8 }}>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em", flex: 1 }}>
          Tienda e inventario
        </h1>
        {actions}
      </div>
      {tabs.length > 1 && (
        <nav className="ag-subtabs" aria-label="Tienda e inventario">
          {tabs.map((t) => (
            <Link key={t.key} to={t.to} aria-current={location.pathname.startsWith(t.to) ? "page" : undefined}>
              {t.label}
              {t.key === "pedidos" && !!count && <span className="ag-badge ag-badge--warning">{count}</span>}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
