// Pestañas internas de Caja y pagos (rediseño, CajaPanel): Movimientos ·
// Comprobantes · Pedidos de tienda · Gastos · Arqueos. Cada pestaña apunta a
// una ruta que ya existe (Fase 1): la caja diaria, los comprobantes, los
// pedidos y dos vistas de la caja (?tab=movimientos y ?tab=arqueo). Solo se
// muestran las que el rol y el plan permiten, igual que el menú del panel.
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { usePermissions } from "../../hooks/usePermissions";
import { computeNavPermissions } from "../../layouts/adminNavigation";

interface SubTab {
  key: string;
  label: string;
  to: string;
  visible: boolean;
}

export default function CashSubtabs() {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const planLimits = useSelector((s: RootState) => s.organization.organization?.planLimits);
  const can = computeNavPermissions(hasPermission, planLimits);

  const tabs: SubTab[] = [
    { key: "movimientos", label: "Movimientos", to: "/gestion-caja", visible: can.cashRead },
    { key: "comprobantes", label: "Comprobantes", to: "/gestionar-pagos", visible: can.onlineRes },
    { key: "pedidos", label: "Pedidos de tienda", to: "/pedidos", visible: can.inventoryRead },
    { key: "gastos", label: "Gastos", to: "/gestion-caja?tab=movimientos", visible: can.cashRead },
    { key: "arqueos", label: "Arqueos", to: "/gestion-caja?tab=arqueo", visible: can.cashRead },
  ].filter((t) => t.visible);

  if (tabs.length < 2) return null;

  const tabParam = new URLSearchParams(location.search).get("tab");
  const activeKey =
    location.pathname.startsWith("/gestionar-pagos")
      ? "comprobantes"
      : location.pathname.startsWith("/pedidos")
        ? "pedidos"
        : tabParam === "movimientos"
          ? "gastos"
          : tabParam === "arqueo"
            ? "arqueos"
            : "movimientos";

  return (
    <nav className="ag-subtabs" aria-label="Caja y pagos">
      {tabs.map((t) => (
        <Link key={t.key} to={t.to} aria-current={t.key === activeKey ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
