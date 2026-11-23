// Clientes y fidelidad › Programa de fidelidad / Tarjeta. Usa la misma carga y
// el mismo guardado que Ajustes (useOrganizationSettings), así que guarda igual
// que antes cuando estas opciones vivían en Configuración del negocio.
import CustomLoader from "../../../components/customLoader/CustomLoader";
import FidelityTab from "../OrganizationInfo/components/tabs/FidelityTab";
import StickyActionBar from "../OrganizationInfo/components/StickyActionBar";
import { useOrganizationSettings } from "../OrganizationInfo/useOrganizationSettings";

export default function LoyaltySettingsPart({ part }: { part: "program" | "card" }) {
  const { org, loading, form, isDirty, saving, handleSave, handleCancel } = useOrganizationSettings();
  if (loading || !org) return <CustomLoader loadingText="Cargando fidelidad..." />;
  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", maxWidth: 820 }}>
      <FidelityTab form={form} isEditing part={part} />
      <StickyActionBar isDirty={isDirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );
}
