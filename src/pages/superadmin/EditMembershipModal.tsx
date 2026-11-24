// Panel «Editar membresía» del superadmin (rediseño, SuperadminMembresias):
// antes un modal; ahora panel lateral con Plan, Estado, periodo, último pago,
// renovación automática y notas internas.
import { useState, useEffect } from "react";
import { Button, Drawer, NumberInput, Select, Switch, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { Membership, Plan } from "../../services/membershipService";
import { apiGeneral } from "../../services/axiosConfig";

interface EditMembershipModalProps {
  opened: boolean;
  onClose: () => void;
  membership: Membership | null;
  plans: Plan[];
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Activa" },
  { value: "trial", label: "Prueba" },
  { value: "pending", label: "Pendiente" },
  { value: "past_due", label: "Vencida (solo lectura)" },
  { value: "suspended", label: "Suspendida" },
  { value: "cancelled", label: "Cancelada" },
  { value: "expired", label: "Expirada" },
];

export function EditMembershipModal({ opened, onClose, membership, plans, onSuccess }: EditMembershipModalProps) {
  const [loading, setLoading] = useState(false);
  // Solo si se elige otra fecha se envía como día de calendario (el backend la guarda como
  // fin de ese día en la zona de la org); si no, se conserva la hora exacta del pago.
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [formData, setFormData] = useState({
    planId: "",
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    lastPaymentDate: null as Date | null,
    lastPaymentAmount: 0,
    autoRenew: false,
    adminNotes: "",
  });

  useEffect(() => {
    if (membership) {
      setFormData({
        planId: membership.planId._id,
        status: membership.status,
        currentPeriodStart: new Date(membership.currentPeriodStart),
        currentPeriodEnd: new Date(membership.currentPeriodEnd),
        lastPaymentDate: membership.lastPaymentDate ? new Date(membership.lastPaymentDate) : null,
        lastPaymentAmount: membership.lastPaymentAmount || 0,
        autoRenew: membership.autoRenew || false,
        adminNotes: membership.adminNotes || "",
      });
      setEndDateTouched(false);
    }
  }, [membership]);

  const handleSubmit = async () => {
    if (!membership) return;
    setLoading(true);
    try {
      await apiGeneral.patch(`/memberships/superadmin/${membership._id}`, {
        planId: formData.planId,
        status: formData.status,
        currentPeriodStart: formData.currentPeriodStart.toISOString(),
        currentPeriodEnd: endDateTouched ? dayjs(formData.currentPeriodEnd).format("YYYY-MM-DD") : formData.currentPeriodEnd.toISOString(),
        lastPaymentDate: formData.lastPaymentDate?.toISOString() || null,
        lastPaymentAmount: formData.lastPaymentAmount,
        autoRenew: formData.autoRenew,
        adminNotes: formData.adminNotes,
      });
      notifications.show({ message: "Membresía guardada." });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      notifications.show({ message: e.response?.data?.message || "No se pudo guardar la membresía.", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  const org = membership?.organizationId as unknown as { name?: string; email?: string } | undefined;

  return (
    <Drawer
      opened={opened && !!membership}
      onClose={() => !loading && onClose()}
      position="right"
      size={460}
      title={
        <div>
          <b style={{ fontSize: 16 }}>Editar membresía</b>
          <div className="ag-subtle">
            {org?.name ?? "—"}
            {org?.email ? ` · ${org.email}` : ""}
          </div>
        </div>
      }
    >
      <div className="ag-stack" style={{ gap: 14 }}>
        <Select
          label="Plan"
          value={formData.planId}
          onChange={(value) => setFormData({ ...formData, planId: value || "" })}
          data={plans.map((plan) => ({ value: plan._id, label: `${plan.displayName} · $${plan.price.toLocaleString()} ${plan.currency ?? ""}`.trim() }))}
          allowDeselect={false}
          required
        />
        <Select
          label="Estado"
          value={formData.status}
          onChange={(value) => setFormData({ ...formData, status: value || "active" })}
          data={STATUS_OPTIONS}
          allowDeselect={false}
          required
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DateInput
            label="Inicio del periodo"
            value={formData.currentPeriodStart}
            onChange={(date) => setFormData({ ...formData, currentPeriodStart: date || new Date() })}
            valueFormat="DD/MM/YYYY"
            required
          />
          <DateInput
            label="Vencimiento"
            value={formData.currentPeriodEnd}
            onChange={(date) => {
              setEndDateTouched(true);
              setFormData({ ...formData, currentPeriodEnd: date || new Date() });
            }}
            valueFormat="DD/MM/YYYY"
            required
          />
        </div>
        <div className="ag-subtle" style={{ marginTop: -6 }}>
          Tiene acceso completo hasta el final del día de vencimiento, en la zona horaria del negocio.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DateInput
            label="Último pago"
            value={formData.lastPaymentDate}
            onChange={(date) => setFormData({ ...formData, lastPaymentDate: date })}
            valueFormat="DD/MM/YYYY"
            clearable
          />
          <NumberInput
            label="Monto"
            value={formData.lastPaymentAmount}
            onChange={(value) => setFormData({ ...formData, lastPaymentAmount: Number(value) || 0 })}
            prefix="$"
            thousandSeparator=","
            min={0}
          />
        </div>
        <Switch
          label="Renovación automática"
          description="Se renueva sola al vencer."
          checked={formData.autoRenew}
          onChange={(event) => setFormData({ ...formData, autoRenew: event.currentTarget.checked })}
        />
        <Textarea
          label="Notas internas"
          placeholder="Solo las ve el equipo de AgenditApp"
          value={formData.adminNotes}
          onChange={(event) => setFormData({ ...formData, adminNotes: event.currentTarget.value })}
          minRows={3}
          autosize
        />
        <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <Button variant="default" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="var(--platform)" onClick={handleSubmit} loading={loading}>
            Guardar membresía
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
