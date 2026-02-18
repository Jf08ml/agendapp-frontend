import {
  Stack,
  TextInput,
  Switch,
  Select,
  Group,
  Button,
  ActionIcon,
  Text,
  Badge,
  Paper,
  PasswordInput,
  Modal,
  NumberInput,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { BiPlus, BiTrash, BiCreditCard } from "react-icons/bi";
import { useEffect, useState } from "react";
import type { SuperadminFormValues } from "../schema";
import {
  createMembership,
  getAllPlans,
  type Plan,
} from "../../../services/membershipService";

export default function AdminTab({
  form,
  isEditing,
  isCreateMode,
  organizationId,
  currentMembershipId,
  onMembershipCreated,
}: {
  form: UseFormReturnType<SuperadminFormValues>;
  isEditing: boolean;
  isCreateMode: boolean;
  organizationId?: string;
  currentMembershipId?: string | null;
  onMembershipCreated?: () => void;
}) {
  const [newDomain, setNewDomain] = useState("");
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [creatingMembership, setCreatingMembership] = useState(false);

  const domains = form.values.domains || [];

  useEffect(() => {
    if (membershipModalOpen && plans.length === 0) {
      getAllPlans()
        .then(setPlans)
        .catch(() =>
          notifications.show({
            title: "Error",
            message: "No se pudieron cargar los planes",
            color: "red",
          })
        );
    }
  }, [membershipModalOpen, plans.length]);

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;
    if (domains.includes(trimmed)) return;
    form.setFieldValue("domains", [...domains, trimmed]);
    setNewDomain("");
  };

  const handleRemoveDomain = (index: number) => {
    form.setFieldValue(
      "domains",
      domains.filter((_, i) => i !== index)
    );
  };

  const handleCreateMembership = async () => {
    if (!organizationId || !selectedPlanId) return;

    try {
      setCreatingMembership(true);
      await createMembership({
        organizationId,
        planId: selectedPlanId,
        trialDays: trialDays > 0 ? trialDays : undefined,
      });
      notifications.show({
        title: "Membresía creada",
        message: "Se asignó la membresía correctamente",
        color: "green",
      });
      setMembershipModalOpen(false);
      setSelectedPlanId(null);
      setTrialDays(0);
      onMembershipCreated?.();
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error",
        message: "No se pudo crear la membresía",
        color: "red",
      });
    } finally {
      setCreatingMembership(false);
    }
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Dominios
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Dominios asociados a esta organización para el multi-tenant
        </Text>
        <Stack gap="xs">
          {domains.map((domain, index) => (
            <Group key={index} gap="xs">
              <Badge variant="light" color="blue" size="lg" style={{ flex: 1 }}>
                {domain}
              </Badge>
              {isEditing && (
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => handleRemoveDomain(index)}
                >
                  <BiTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          ))}
          {isEditing && (
            <Group gap="xs">
              <TextInput
                placeholder="nuevo-dominio.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button
                size="sm"
                variant="light"
                leftSection={<BiPlus size={14} />}
                onClick={handleAddDomain}
              >
                Agregar
              </Button>
            </Group>
          )}
          {domains.length === 0 && !isEditing && (
            <Text size="sm" c="dimmed" fs="italic">
              Sin dominios configurados
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Contraseña
        </Text>
        <PasswordInput
          label={isCreateMode ? "Contraseña" : "Nueva contraseña"}
          placeholder={
            isCreateMode
              ? "Contraseña para la organización"
              : "Dejar vacío para mantener la actual"
          }
          disabled={!isEditing}
          required={isCreateMode}
          {...form.getInputProps("password")}
        />
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Estado y acceso
        </Text>
        <Stack gap="md">
          <Switch
            label="Organización activa"
            description="Desactivar impedirá el acceso completo a la plataforma"
            checked={form.values.isActive ?? true}
            onChange={(e) =>
              form.setFieldValue("isActive", e.currentTarget.checked)
            }
            disabled={!isEditing}
            color="green"
          />

          <Switch
            label="Acceso bloqueado"
            description="Bloquea el acceso hasta que se active un plan de membresía"
            checked={form.values.hasAccessBlocked ?? true}
            onChange={(e) =>
              form.setFieldValue("hasAccessBlocked", e.currentTarget.checked)
            }
            disabled={!isEditing}
            color="red"
          />

          <Select
            label="Estado de membresía"
            value={form.values.membershipStatus || "none"}
            onChange={(value) =>
              form.setFieldValue(
                "membershipStatus",
                (value as SuperadminFormValues["membershipStatus"]) || "none"
              )
            }
            disabled={!isEditing}
            data={[
              { value: "active", label: "Activa" },
              { value: "trial", label: "Prueba" },
              { value: "suspended", label: "Suspendida" },
              { value: "none", label: "Sin membresía" },
            ]}
          />
        </Stack>
      </Paper>

      {!isCreateMode && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">
            Membresía
          </Text>
          {currentMembershipId ? (
            <Badge variant="light" color="green" size="lg">
              Tiene membresía asignada
            </Badge>
          ) : (
            <>
              <Text size="sm" c="dimmed" mb="md">
                Esta organización no tiene una membresía asignada
              </Text>
              <Button
                leftSection={<BiCreditCard size={16} />}
                onClick={() => setMembershipModalOpen(true)}
              >
                Asignar Membresía
              </Button>
            </>
          )}
        </Paper>
      )}

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          WhatsApp
        </Text>
        <TextInput
          label="Client ID de WhatsApp"
          placeholder="ID del cliente de WhatsApp (opcional)"
          disabled={!isEditing}
          {...form.getInputProps("clientIdWhatsapp")}
        />
      </Paper>

      <Modal
        opened={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        title="Asignar Membresía"
      >
        <Stack gap="md">
          <Select
            label="Plan"
            placeholder="Selecciona un plan"
            data={plans.map((p) => ({
              value: p._id,
              label: `${p.displayName} - $${p.price} ${p.currency}/${p.billingCycle}`,
            }))}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            required
          />
          <NumberInput
            label="Días de prueba"
            description="Dejar en 0 para activar inmediatamente como activa"
            value={trialDays}
            onChange={(val) => setTrialDays(Number(val) || 0)}
            min={0}
            max={90}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setMembershipModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateMembership}
              loading={creatingMembership}
              disabled={!selectedPlanId}
            >
              Crear Membresía
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
