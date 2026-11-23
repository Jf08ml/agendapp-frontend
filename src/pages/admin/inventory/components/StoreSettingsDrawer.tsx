// Ajustes de la tienda pública en panel lateral (rediseño, InventarioPanel):
// activa, entrega (retiro, domicilio) y pagos (Mercado Pago, transferencia con
// comprobante, contraentrega). Mismas reglas de antes: debe quedar al menos una
// modalidad de entrega y una forma de pago; cada cambio se guarda al momento.
import { useState } from "react";
import { Button, Checkbox, Drawer, Loader, Switch } from "@mantine/core";
import { useClipboard, useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconLink } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../../../app/store";
import { fetchOrganizationConfig } from "../../../../features/organization/sliceOrganization";
import { updateOrganization } from "../../../../services/organizationService";

type StorePatch = {
  storeEnabled?: boolean;
  storeCodEnabled?: boolean;
  storePickupEnabled?: boolean;
  storeDeliveryEnabled?: boolean;
  storeMpEnabled?: boolean;
  storeTransferEnabled?: boolean;
};

export default function StoreSettingsDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const organization = useSelector((s: RootState) => s.organization.organization);
  const dispatch = useAppDispatch();
  const clipboard = useClipboard({ timeout: 1500 });
  const [saving, setSaving] = useState(false);

  const storeEnabled = !!organization?.storeEnabled;
  const storeCodEnabled = organization?.storeCodEnabled !== false;
  const storePickupEnabled = organization?.storePickupEnabled !== false;
  const storeDeliveryEnabled = organization?.storeDeliveryEnabled !== false;
  const mpConnected = !!organization?.mpCollect?.connected;
  const hasTransferAccounts = (organization?.paymentMethods?.length ?? 0) > 0;
  const storeMpOn = mpConnected && organization?.storeMpEnabled !== false;
  const storeTransferOn = hasTransferAccounts && organization?.storeTransferEnabled !== false;
  // Vías de pago que el cliente vería hoy (para no dejar la tienda sin ninguna)
  const activePayCount = [storeMpOn, storeTransferOn, storeCodEnabled].filter(Boolean).length;

  const save = async (patch: StorePatch) => {
    if (!organization?._id) return;
    setSaving(true);
    try {
      const updated = await updateOrganization(organization._id, patch);
      if (!updated) throw new Error("No se pudo actualizar la configuración de la tienda");
      // Refresco en segundo plano: no muestra el loader global
      await dispatch(fetchOrganizationConfig());
      showNotification({ title: "Tienda actualizada", message: "La configuración se guardó correctamente", color: "green" });
    } catch (error) {
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al actualizar la configuración de la tienda",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const section = (title: string) => (
    <h3 style={{ margin: "var(--space-2) 0 0", font: "600 15px/22px var(--mantine-font-family)" }}>{title}</h3>
  );

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size={isMobile ? "100%" : 440} title="Tienda pública">
      <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
        <div className="ag-switchrow" style={{ borderTop: "1px solid var(--line)" }}>
          <div>
            <b>Tienda activa</b>
            <span>Tus clientes ven y compran los productos marcados «Mostrar en tienda» en /tienda.</span>
          </div>
          {saving && <span style={{ flex: "none" }}><Loader size="xs" /></span>}
          <span style={{ flex: "none", paddingTop: 2 }}>
            <Switch
              checked={storeEnabled}
              disabled={saving}
              onChange={(e) => save({ storeEnabled: e.currentTarget.checked })}
              aria-label="Tienda activa"
            />
          </span>
        </div>

        {storeEnabled && (
          <Button
            variant="default"
            size="xs"
            style={{ alignSelf: "flex-start" }}
            leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconLink size={14} />}
            onClick={() => clipboard.copy(`${window.location.origin}/tienda`)}
          >
            {clipboard.copied ? "Link copiado" : "Copiar link de la tienda"}
          </Button>
        )}

        {storeEnabled ? (
          <>
            {section("Entrega")}
            <Checkbox
              label="Retiro en el local"
              checked={storePickupEnabled}
              disabled={saving || (storePickupEnabled && !storeDeliveryEnabled)}
              onChange={(e) => save({ storePickupEnabled: e.currentTarget.checked })}
            />
            <Checkbox
              label="Domicilio"
              checked={storeDeliveryEnabled}
              disabled={saving || (storeDeliveryEnabled && !storePickupEnabled)}
              onChange={(e) => save({ storeDeliveryEnabled: e.currentTarget.checked })}
            />
            {(!storePickupEnabled || !storeDeliveryEnabled) && (
              <span className="ag-help">Debe quedar al menos una modalidad de entrega.</span>
            )}

            {section("Pagos")}
            {mpConnected && (
              <Checkbox
                label="Mercado Pago"
                checked={storeMpOn}
                disabled={saving || (storeMpOn && activePayCount === 1)}
                onChange={(e) => save({ storeMpEnabled: e.currentTarget.checked })}
              />
            )}
            <Checkbox
              label="Transferencia (con comprobante)"
              description={hasTransferAccounts ? undefined : "Agrega tus cuentas en Información del negocio → Pagos"}
              checked={storeTransferOn}
              disabled={saving || !hasTransferAccounts || (storeTransferOn && activePayCount === 1)}
              onChange={(e) => save({ storeTransferEnabled: e.currentTarget.checked })}
            />
            <Checkbox
              label="Contraentrega"
              checked={storeCodEnabled}
              disabled={saving || (storeCodEnabled && activePayCount === 1)}
              onChange={(e) => save({ storeCodEnabled: e.currentTarget.checked })}
            />
            {activePayCount === 1 && <span className="ag-help">Debe quedar al menos una forma de pago activa.</span>}
          </>
        ) : (
          <span className="ag-muted" style={{ fontSize: 14 }}>
            Activa la tienda para elegir las formas de entrega y de pago.
          </span>
        )}
      </div>
    </Drawer>
  );
}
