/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/superadmin/SuperadminManagement.tsx
import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Table,
  Badge,
  Group,
  Button,
  Text,
  Select,
  TextInput,
  Paper,
  Stack,
  ActionIcon,
  Tooltip,
  Modal,
  NumberInput,
  Loader,
  Alert,
  CheckIcon,
} from "@mantine/core";
import {
  getAllMemberships,
  getAllPlans,
  renewMembership,
  suspendMembership,
  reactivateMembership,
  activatePlanSuperadmin,
  Membership,
  Plan,
} from "../../services/membershipService";
import { notifications } from "@mantine/notifications";
import { BiRefresh, BiX, BiEdit, BiCreditCard } from "react-icons/bi";
import { IoAlertCircle } from "react-icons/io5";
import { EditMembershipModal } from "./EditMembershipModal";

export default function SuperadminManagement() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de renovación
  const [renewModalOpened, setRenewModalOpened] = useState(false);
  const [selectedMembership, setSelectedMembership] =
    useState<Membership | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Modal de edición
  const [editModalOpened, setEditModalOpened] = useState(false);

  // Modal de reactivación
  const [reactivateModalOpened, setReactivateModalOpened] = useState(false);
  const [newPeriodEnd, setNewPeriodEnd] = useState<string>("");

  // Modal de activación de plan
  const [activateModalOpened, setActivateModalOpened] = useState(false);
  const [activatePlanId, setActivatePlanId] = useState<string>("");
  const [activatePaymentAmount, setActivatePaymentAmount] = useState<number>(0);
  const [activateLoading, setActivateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membershipsData, plansData] = await Promise.all([
        getAllMemberships(filterStatus ? { status: filterStatus } : undefined),
        getAllPlans(),
      ]);
      setMemberships(membershipsData);
      setPlans(plansData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      notifications.show({
        title: "Error",
        message: "No se pudieron cargar las membresías",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    const amount = Number(paymentAmount);
    if (!selectedMembership || !Number.isFinite(amount) || amount <= 0) {
      notifications.show({
        title: "Monto inválido",
        message: "Ingresa un monto mayor a 0",
        color: "red",
      });
      return;
    }

    try {
      await renewMembership(selectedMembership._id, amount);
      notifications.show({
        title: "Éxito",
        message: "Membresía renovada correctamente",
        color: "green",
      });
      setRenewModalOpened(false);
      setSelectedMembership(null);
      setPaymentAmount(0);
      fetchData();
    } catch (error) {
      console.error("Error al renovar la membresía:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo renovar la membresía",
        color: "red",
      });
    }
  };

  const handleSuspend = async (membership: Membership) => {
    try {
      await suspendMembership(
        membership._id,
        "Suspendida manualmente por administrador"
      );
      notifications.show({
        title: "Éxito",
        message: "Membresía suspendida",
        color: "orange",
      });
      fetchData();
    } catch (error) {
      console.error("Error al suspender la membresía:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo suspender la membresía",
        color: "red",
      });
    }
  };

  const handleReactivate = async () => {
    if (!selectedMembership) return;

    try {
      await reactivateMembership(
        selectedMembership._id,
        newPeriodEnd || undefined
      );
      notifications.show({
        title: "Éxito",
        message: "Membresía reactivada correctamente",
        color: "green",
      });
      setReactivateModalOpened(false);
      setSelectedMembership(null);
      setNewPeriodEnd("");
      fetchData();
    } catch (error) {
      console.error("Error al reactivar la membresía:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo reactivar la membresía",
        color: "red",
      });
    }
  };

  const handleActivatePlan = async () => {
    if (!selectedMembership || !activatePlanId) {
      notifications.show({
        title: "Error",
        message: "Selecciona un plan",
        color: "red",
      });
      return;
    }

    setActivateLoading(true);
    try {
      await activatePlanSuperadmin(
        selectedMembership._id,
        activatePlanId,
        activatePaymentAmount
      );
      notifications.show({
        title: "Plan activado",
        message: "La membresía fue activada exitosamente",
        color: "green",
      });
      setActivateModalOpened(false);
      setSelectedMembership(null);
      setActivatePlanId("");
      setActivatePaymentAmount(0);
      fetchData();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "No se pudo activar el plan",
        color: "red",
      });
    } finally {
      setActivateLoading(false);
    }
  };

  const paidPlans = plans.filter((p) => p.slug !== "plan-demo" && p.price > 0);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: "green", label: "Activa" },
      trial: { color: "blue", label: "Prueba" },
      past_due: { color: "orange", label: "Vencida" },
      suspended: { color: "red", label: "Suspendida" },
      pending: { color: "yellow", label: "Pendiente" },
      cancelled: { color: "gray", label: "Cancelada" },
      expired: { color: "red", label: "Expirada" },
    };

    const config = statusConfig[status] || { color: "gray", label: status };
    return (
      <Badge color={config.color} variant="filled">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredMemberships = memberships.filter((m) => {
    const orgName = (m.organizationId as any)?.name?.toLowerCase() || "";
    const planName = m.planId?.displayName?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return orgName.includes(search) || planName.includes(search);
  });

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Cargando membresías...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Gestión de Membresías</Title>
            <Text c="dimmed" size="sm">
              Administra todas las membresías del sistema
            </Text>
          </div>
          <Button
            leftSection={<BiRefresh size={16} />}
            onClick={fetchData}
            variant="light"
          >
            Actualizar
          </Button>
        </Group>

        {/* Filtros */}
        <Paper p="md" withBorder>
          <Group>
            <TextInput
              placeholder="Buscar por organización o plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filtrar por estado"
              value={filterStatus}
              onChange={(value) => setFilterStatus(value || "")}
              data={[
                { value: "", label: "Todos" },
                { value: "active", label: "Activas" },
                { value: "trial", label: "Prueba" },
                { value: "past_due", label: "Vencidas" },
                { value: "suspended", label: "Suspendidas" },
              ]}
              clearable
              style={{ width: 200 }}
            />
          </Group>
        </Paper>

        {/* Tabla */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Organización</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Vencimiento</Table.Th>
                <Table.Th>Días Restantes</Table.Th>
                <Table.Th>Último Pago</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredMemberships.map((membership) => {
                const org = membership.organizationId as any;
                const daysLeft = getDaysUntilExpiration(
                  membership.currentPeriodEnd
                );

                return (
                  <Table.Tr key={membership._id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>
                          {org?.name || "N/A"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {org?.email || ""}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{membership.planId?.displayName}</Text>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(membership.status)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {formatDate(membership.currentPeriodEnd)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          daysLeft <= 3
                            ? "red"
                            : daysLeft <= 7
                            ? "yellow"
                            : "gray"
                        }
                        variant="light"
                      >
                        {daysLeft > 0 ? `${daysLeft} días` : `Vencida`}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {membership.lastPaymentDate ? (
                        <Stack gap={2}>
                          <Text size="sm">
                            {formatDate(membership.lastPaymentDate)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            $
                            {membership.lastPaymentAmount?.toLocaleString() ||
                              0}
                          </Text>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">
                          Sin pagos
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {["trial", "past_due", "expired"].includes(membership.status) && (
                          <Tooltip label="Activar Plan">
                            <ActionIcon
                              color="grape"
                              variant="light"
                              onClick={() => {
                                setSelectedMembership(membership);
                                setActivatePlanId("");
                                setActivatePaymentAmount(0);
                                setActivateModalOpened(true);
                              }}
                            >
                              <BiCreditCard size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}

                        <Tooltip label="Editar">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => {
                              setSelectedMembership(membership);
                              setEditModalOpened(true);
                            }}
                          >
                            <BiEdit size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Renovar">
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => {
                              setSelectedMembership(membership);
                              setPaymentAmount(membership.planId?.price || 0);
                              setRenewModalOpened(true);
                            }}
                          >
                            <CheckIcon size={16} />
                          </ActionIcon>
                        </Tooltip>

                        {membership.status === "suspended" ? (
                          <Tooltip label="Reactivar">
                            <ActionIcon
                              color="cyan"
                              variant="light"
                              onClick={() => {
                                setSelectedMembership(membership);
                                setReactivateModalOpened(true);
                              }}
                            >
                              <BiRefresh size={16} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Suspender">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleSuspend(membership)}
                            >
                              <BiX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {filteredMemberships.length === 0 && (
            <Stack align="center" py="xl">
              <IoAlertCircle size={48} color="gray" />
              <Text c="dimmed">No se encontraron membresías</Text>
            </Stack>
          )}
        </Paper>
      </Stack>

      {/* Modal de Renovación */}
      <Modal
        opened={renewModalOpened}
        onClose={() => {
          setRenewModalOpened(false);
          setSelectedMembership(null);
        }}
        title="Renovar Membresía"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IoAlertCircle size={18} />} color="blue">
            <Text size="sm">
              Organización:{" "}
              <strong>
                {(selectedMembership?.organizationId as any)?.name}
              </strong>
            </Text>
            <Text size="sm">
              Plan: <strong>{selectedMembership?.planId?.displayName}</strong>
            </Text>
          </Alert>

          <NumberInput
            label="Monto del Pago"
            placeholder="Ingresa el monto"
            value={paymentAmount}
            onChange={(value) => {
              const numValue = typeof value === "string" ? parseFloat(value) : value;
              setPaymentAmount(Number.isFinite(numValue) ? numValue : 0);
            }}
            prefix="$"
            thousandSeparator=","
            min={1}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRenewModalOpened(false)}>
              Cancelar
            </Button>
            <Button color="green" onClick={handleRenew}>
              Renovar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Reactivación */}
      <Modal
        opened={reactivateModalOpened}
        onClose={() => {
          setReactivateModalOpened(false);
          setSelectedMembership(null);
        }}
        title="Reactivar Membresía"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IoAlertCircle size={18} />} color="blue">
            <Text size="sm">
              Organización:{" "}
              <strong>
                {(selectedMembership?.organizationId as any)?.name}
              </strong>
            </Text>
          </Alert>

          <TextInput
            label="Nueva Fecha de Vencimiento (opcional)"
            placeholder="2025-02-09"
            type="date"
            value={newPeriodEnd}
            onChange={(e) => setNewPeriodEnd(e.currentTarget.value)}
            description="Si no se especifica, se añadirá 1 mes desde hoy"
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => setReactivateModalOpened(false)}
            >
              Cancelar
            </Button>
            <Button color="blue" onClick={handleReactivate}>
              Reactivar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Activación de Plan */}
      <Modal
        opened={activateModalOpened}
        onClose={() => {
          setActivateModalOpened(false);
          setSelectedMembership(null);
        }}
        title="Activar Plan Pago"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IoAlertCircle size={18} />} color="grape">
            <Text size="sm">
              Organización:{" "}
              <strong>
                {(selectedMembership?.organizationId as any)?.name}
              </strong>
            </Text>
            <Text size="sm">
              Plan actual:{" "}
              <strong>{selectedMembership?.planId?.displayName}</strong>
            </Text>
            <Text size="sm">
              Estado actual:{" "}
              <Badge size="sm" color={selectedMembership?.status === "trial" ? "blue" : "orange"}>
                {selectedMembership?.status === "trial" ? "Prueba" : selectedMembership?.status}
              </Badge>
            </Text>
          </Alert>

          <Select
            label="Nuevo Plan"
            placeholder="Selecciona el plan a activar"
            value={activatePlanId}
            onChange={(value) => {
              setActivatePlanId(value || "");
              const selected = paidPlans.find((p) => p._id === value);
              if (selected) setActivatePaymentAmount(selected.price);
            }}
            data={paidPlans.map((plan) => ({
              value: plan._id,
              label: `${plan.displayName} - $${plan.price.toLocaleString()} ${plan.currency}`,
            }))}
            required
          />

          <NumberInput
            label="Monto del Pago Recibido"
            description="Ingresa el monto que pagó el cliente"
            placeholder="Ingresa el monto"
            value={activatePaymentAmount}
            onChange={(value) => {
              const numValue = typeof value === "string" ? parseFloat(value) : value;
              setActivatePaymentAmount(Number.isFinite(numValue) ? numValue : 0);
            }}
            prefix="$"
            thousandSeparator=","
            min={0}
          />

          <Alert color="blue" variant="light">
            <Text size="sm">
              Al activar, la membresía cambiará a estado <strong>Activa</strong>{" "}
              con el plan seleccionado. El período se establece a 1 mes desde hoy.
            </Text>
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => setActivateModalOpened(false)}
              disabled={activateLoading}
            >
              Cancelar
            </Button>
            <Button
              color="grape"
              onClick={handleActivatePlan}
              loading={activateLoading}
              disabled={!activatePlanId}
            >
              Activar Plan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Edición Completa */}
      <EditMembershipModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedMembership(null);
        }}
        membership={selectedMembership}
        plans={plans}
        onSuccess={fetchData}
      />
    </Container>
  );
}
