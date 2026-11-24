// Pestañas de WhatsApp (rediseño, WhatsappPanel): Conexión · Mensajes automáticos ·
// Plantillas de Meta · Campañas · Asistentes IA. Cada una apunta a su ruta de
// siempre; Plantillas de Meta solo con la API oficial de Meta.
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { usePermissions } from "../../hooks/usePermissions";
import { computeNavPermissions } from "../../layouts/adminNavigation";
import { whatsappTabs, activeWhatsappTab } from "./whatsappTabsModel";

export default function WhatsappTabs({ subtitle }: { subtitle?: string }) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const can = computeNavPermissions(hasPermission, organization?.planLimits);
  const tabs = whatsappTabs({
    whatsappRead: can.whatsappRead,
    campaignsRead: can.campaignsRead,
    isMeta: organization?.waConnectionType === "meta",
  });
  const active = activeWhatsappTab(location.pathname, location.search);

  return (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      <div>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>WhatsApp</h1>
        {subtitle && (
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {tabs.length > 1 && (
        <nav className="ag-subtabs" aria-label="WhatsApp">
          {tabs.map((t) => (
            <Link key={t.key} to={t.to} aria-current={active === t.key ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
