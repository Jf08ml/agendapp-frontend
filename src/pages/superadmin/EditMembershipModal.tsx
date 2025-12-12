/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/superadmin/EditMembershipModal.tsx
import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  Text,
  Alert,
  Switch,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { Membership, Plan } from "../../services/membershipService";
import { apiGeneral } from "../../services/axiosConfig";
import { IoAlertCircle } from "react-icons/io5";

interface EditMembershipModalProps {
  opened: boolean;
  onClose: () => void;
  membership: Membership | null;
  plans: Plan[];
  onSuccess: () => void;
}

export function EditMembershipModal({
  opened,
  onClose,
  membership,
  plans,
  onSuccess,
}: EditMembershipModalProps) {
  const [loading, setLoading] = useState(false);
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
        lastPaymentDate: membership.lastPaymentDate
          ? new Date(membership.lastPaymentDate)
          : null,
        lastPaymentAmount: membership.lastPaymentAmount || 0,
        autoRenew: membership.autoRenew || false,
        adminNotes: membership.adminNotes || "",
      });
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
        currentPeriodEnd: formData.currentPeriodEnd.toISOString(),
        lastPaymentDate: formData.lastPaymentDate?.toISOString() || null,
        lastPaymentAmount: formData.lastPaymentAmount,
        autoRenew: formData.autoRenew,
        adminNotes: formData.adminNotes,
      });

      notifications.show({
        title: "Éxito",
        message: "Membresía actualizada correctamente",
        color: "green",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Error al actualizar membresía",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!membership) return null;

  const org = membership.organizationId as any;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Editar Membresía"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Alert icon={<IoAlertCircle size={18} />} color="blue">
          <Text size="sm" fw={600}>
            {org?.name || "N/A"}
          </Text>
          <Text size="xs" c="dimmed">
            {org?.email || ""}
          </Text>
        </Alert>

        <Select
          label="Plan"
          placeholder="Selecciona un plan"
          value={formData.planId}
          onChange={(value) =>
            setFormData({ ...formData, planId: value || "" })
          }
          data={plans.map((plan) => ({
            value: plan._id,
            label: `${plan.displayName} - $${plan.price.toLocaleString()}`,
          }))}
          required
        />

        <Select
          label="Estado"
          value={formData.status}
          onChange={(value) =>
            setFormData({
              ...formData,
              status: value as any,
            })
          }
          data={[
            { value: "active", label: "Activa" },
            { value: "trial", label: "Prueba" },
            { value: "pending", label: "Pendiente" },
            { value: "grace_period", label: "Período de Gracia" },
            { value: "suspended", label: "Suspendida" },
            { value: "cancelled", label: "Cancelada" },
            { value: "expired", label: "Expirada" },
          ]}
          required
        />

        <DateInput
          label="Fecha de Inicio del Período"
          value={formData.currentPeriodStart}
          onChange={(date) =>
            setFormData({
              ...formData,
              currentPeriodStart: date || new Date(),
            })
          }
          valueFormat="DD/MM/YYYY"
          required
        />

        <DateInput
          label="Fecha de Vencimiento"
          value={formData.currentPeriodEnd}
          onChange={(date) =>
            setFormData({
              ...formData,
              currentPeriodEnd: date || new Date(),
            })
          }
          valueFormat="DD/MM/YYYY"
          required
        />

        <DateInput
          label="Fecha del Último Pago"
          value={formData.lastPaymentDate}
          onChange={(date) =>
            setFormData({ ...formData, lastPaymentDate: date })
          }
          valueFormat="DD/MM/YYYY"
          clearable
        />

        <NumberInput
          label="Monto del Último Pago"
          value={formData.lastPaymentAmount}
          onChange={(value) =>
            setFormData({
              ...formData,
              lastPaymentAmount: Number(value),
            })
          }
          prefix="$"
          thousandSeparator=","
          min={0}
        />

        <Switch
          label="Auto-renovación"
          description="La membresía se renovará automáticamente al vencer"
          checked={formData.autoRenew}
          onChange={(event) =>
            setFormData({
              ...formData,
              autoRenew: event.currentTarget.checked,
            })
          }
        />

        <Textarea
          label="Notas Administrativas"
          placeholder="Notas internas sobre esta membresía..."
          value={formData.adminNotes}
          onChange={(event) =>
            setFormData({
              ...formData,
              adminNotes: event.currentTarget.value,
            })
          }
          minRows={3}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Guardar Cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
