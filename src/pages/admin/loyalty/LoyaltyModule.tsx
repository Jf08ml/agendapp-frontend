// Clientes › Fidelidad (decisión 6): un solo módulo para todo el programa de
// fidelidad, que antes estaba repartido entre Ajustes (programa y tarjeta),
// WhatsApp › Mensajes (plantillas) y Clientes (registrar, canjear, premio listo).
// Solo frontend: mismos endpoints, mismo guardado de la configuración del negocio.
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";

import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { computeNavPermissions } from "../../../layouts/adminNavigation";
import CustomLoader from "../../../components/customLoader/CustomLoader";
import ClientsDashboard from "../manageClients";
import WhatsappTemplateEditor from "../WhatsappTemplateEditor";
import FidelityTab from "../OrganizationInfo/components/tabs/FidelityTab";
import StickyActionBar from "../OrganizationInfo/components/StickyActionBar";
import { useOrganizationSettings } from "../OrganizationInfo/useOrganizationSettings";
import { LOYALTY_TABS, resolveLoyaltyTab, type LoyaltyTabKey } from "./loyaltyTabs";

/** Programa y Tarjeta comparten la carga y el guardado de Ajustes. */
function LoyaltySettingsPart({ part }: { part: "program" | "card" }) {
  const { org, loading, form, isDirty, saving, handleSave, handleCancel } = useOrganizationSettings();
  if (loading || !org) return <CustomLoader loadingText="Cargando fidelidad..." />;
  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", maxWidth: 820 }}>
      <FidelityTab form={form} isEditing part={part} />
      <StickyActionBar isDirty={isDirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );
}

export default function LoyaltyModule() {
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const { hasPermission } = usePermissions();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const can = computeNavPermissions(hasPermission, organization?.planLimits);
  const programOn = organization?.showLoyaltyProgram !== false;

  const visible: Record<LoyaltyTabKey, boolean> = {
    clientes: can.clientsRead,
    programa: can.businessInfo,
    tarjeta: can.businessInfo,
    mensajes: can.whatsappRead,
  };
  const tabs = LOYALTY_TABS.filter((t) => visible[t.key]);
  const current = resolveLoyaltyTab(searchParams.get("tab"), tabs.map((t) => t.key));

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <div>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Fidelidad</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Premios por servicios y referidos: tus clientes, el programa, la tarjeta virtual y los mensajes.
        </p>
      </div>

      {tabs.length > 1 && (
        <nav className="ag-subtabs" aria-label="Fidelidad">
          {tabs.map((t) => (
            <Link key={t.key} to={`?tab=${t.key}`} aria-current={t.key === current ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {!programOn && current !== "programa" && current !== null && (
        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div>
            El programa de fidelidad está oculto para tus clientes.{" "}
            {visible.programa && <Link to="?tab=programa">Actívalo en Programa</Link>}
          </div>
        </div>
      )}

      {current === null && (
        <div className="ag-empty">
          <h3>Sin acceso</h3>
          <p>Tu rol no tiene permisos para ver el programa de fidelidad.</p>
        </div>
      )}
      {current === "clientes" && <ClientsDashboard variant="loyalty" />}
      {current === "programa" && <LoyaltySettingsPart part="program" />}
      {current === "tarjeta" && <LoyaltySettingsPart part="card" />}
      {current === "mensajes" && <WhatsappTemplateEditor scope="loyalty" />}
    </div>
  );
}
