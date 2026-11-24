// Pestañas de Catálogo (rediseño, ServiciosPanel / PaquetesPanel): Servicios ·
// Paquetes. Cada una apunta a su ruta de siempre (/gestionar-servicios y
// /gestionar-paquetes); se muestran con los mismos permisos y límites del menú.
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { usePermissions } from "../../hooks/usePermissions";
import { computeNavPermissions } from "../../layouts/adminNavigation";

export default function CatalogTabs({ counts }: { counts?: { services?: number; packages?: number } }) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const planLimits = useSelector((s: RootState) => s.organization.organization?.planLimits);
  const can = computeNavPermissions(hasPermission, planLimits);

  const tabs = [
    { key: "services", label: "Servicios", to: "/gestionar-servicios", visible: can.servicesRead, count: counts?.services },
    { key: "packages", label: "Paquetes", to: "/gestionar-paquetes", visible: can.packagesRead, count: counts?.packages },
  ].filter((t) => t.visible);

  return (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Catálogo</h1>
      {tabs.length > 1 && (
        <nav className="ag-subtabs" aria-label="Catálogo">
          {tabs.map((t) => (
            <Link key={t.key} to={t.to} aria-current={location.pathname.startsWith(t.to) ? "page" : undefined}>
              {t.label}
              {typeof t.count === "number" && <span className="ag-badge">{t.count}</span>}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
