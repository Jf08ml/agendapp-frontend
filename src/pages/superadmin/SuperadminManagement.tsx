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
  TextInput,
  Stack,
  ActionIcon,
  Tooltip,
  Paper,
  Tabs,
  rem,
  Modal,
  Select,
  NumberInput,
  Textarea,
  Alert,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  getOrganizations,
  Organization,
} from "../../services/organizationService";
import { getAllMemberships, Membership, getAllPlans, Plan } from "../../services/membershipService";
import { apiGeneral } from "../../services/axiosConfig";
import { notifications } from "@mantine/notifications";
import { BiEdit, BiCreditCard, BiRefresh } from "react-icons/bi";
import { GrOrganization } from "react-icons/gr";
import { FaUsers } from "react-icons/fa";
import { IoAlertCircle } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

export default function SuperadminManagement() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("organizations");

  // Modal de membresía
  const [membershipModalOpened, setMembershipModalOpened] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [membershipForm, setMembershipForm] = useState({
    planId: "",
    paymentAmount: 0,
    paymentMethod: "manual",
    adminNotes: "",
    currentPeriodEnd: new Date(),
  });
  const [savingMembership, setSavingMembership] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgs, plansData, allMemberships] = await Promise.all([
        getOrganizations(),
        getAllPlans(),
        getAllMemberships(),
      ]);
      setOrganizations(orgs || []);
      setPlans(plansData || []);

      // Mapear membresías por organizationId (una sola request)
      const membershipMap = new Map<string, Membership>();
      for (const m of (allMemberships || [])) {
        // organizationId viene poblado como objeto o como string
        const orgId = typeof m.organizationId === "object"
          ? (m.organizationId as any)?._id
          : m.organizationId;
        if (orgId) {
          membershipMap.set(orgId, m);
        }
      }
      setMemberships(membershipMap);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      notifications.show({
        title: "Error",
        message: "No se pudieron cargar las organizaciones",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMembershipStatusBadge = (orgId: string) => {
    const membership = memberships.get(orgId);
    if (!membership) {
      return <Badge color="gray">Sin membresía</Badge>;
    }

    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: "green", label: "Activa" },
      trial: { color: "blue", label: "Prueba" },
      grace_period: { color: "orange", label: "Gracia" },
      suspended: { color: "red", label: "Suspendida" },
      pending: { color: "yellow", label: "Pendiente" },
      cancelled: { color: "gray", label: "Cancelada" },
      expired: { color: "red", label: "Expirada" },
    };

    const config = statusConfig[membership.status] || {
      color: "gray",
      label: membership.status,
    };
    return (
      <Badge color={config.color} variant="filled">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPlanName = (orgId: string) => {
    const membership = memberships.get(orgId);
    return membership?.planId?.displayName || "-";
  };

  const handleOpenMembershipModal = (org: Organization) => {
    setSelectedOrg(org);
    const currentMembership = org._id ? memberships.get(org._id) : null;
    
    if (currentMembership) {
      // Editar membresía existente
      setMembershipForm({
        planId: currentMembership.planId._id,
        paymentAmount: 0,
        paymentMethod: "manual",
        adminNotes: "",
        currentPeriodEnd: new Date(currentMembership.currentPeriodEnd),
      });
    } else {
      // Nueva membresía
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setMembershipForm({
        planId: plans[0]?._id || "",
        paymentAmount: plans[0]?.price || 0,
        paymentMethod: "manual",
        adminNotes: "",
        currentPeriodEnd: nextMonth,
      });
    }
    setMembershipModalOpened(true);
  };

  const handleSaveMembership = async () => {
    if (!selectedOrg?._id) return;

    const amount = Number(membershipForm.paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notifications.show({
        title: "Monto inválido",
        message: "Ingresa un monto mayor a 0",
        color: "red",
      });
      return;
    }

    setSavingMembership(true);
    try {
      const currentMembership = memberships.get(selectedOrg._id);
      let membershipId = currentMembership?._id;

      // 1. Crear o renovar membresía usando endpoints existentes
      if (currentMembership) {
        // Si ya existe membresía, renovar
        const renewResponse = await apiGeneral.post(
          `/memberships/${currentMembership._id}/renew`,
          {
            paymentAmount: amount,
          }
        );
        membershipId = renewResponse.data.data._id;
      } else {
        // Si no existe, crear nueva membresía
        const createResponse = await apiGeneral.post(`/memberships`, {
          organizationId: selectedOrg._id,
          planId: membershipForm.planId,
        });
        membershipId = createResponse.data.data._id;
      }

      // 2. Registrar pago manual
      await apiGeneral.post(`/payments/manual-payment`, {
        organizationId: selectedOrg._id,
        membershipId,
        planId: membershipForm.planId,
        amount,
        currency: "USD",
        paymentMethod: membershipForm.paymentMethod,
        adminNotes: membershipForm.adminNotes,
      });

      // 3. Actualizar currentPeriodEnd si es necesario
      if (membershipForm.currentPeriodEnd) {
        await apiGeneral.patch(`/memberships/superadmin/${membershipId}`, {
          currentPeriodEnd: membershipForm.currentPeriodEnd.toISOString(),
        });
      }

      notifications.show({
        title: "Éxito",
        message: "Membresía asignada correctamente",
        color: "green",
      });

      setMembershipModalOpened(false);
      setSelectedOrg(null);
      fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.message || "No se pudo asignar la membresía",
        color: "red",
      });
    } finally {
      setSavingMembership(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const search = searchTerm.toLowerCase();
    return (
      org.name?.toLowerCase().includes(search) ||
      org.email?.toLowerCase().includes(search) ||
      org.phoneNumber?.toLowerCase().includes(search)
    );
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Panel de Superadmin</Title>
            <Text c="dimmed" size="sm">
              Gestiona organizaciones y sus membresías
            </Text>
          </div>
          <Button
            leftSection={<BiRefresh size={16} />}
            onClick={fetchData}
            variant="light"
            loading={loading}
          >
            Actualizar
          </Button>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab
              value="organizations"
              leftSection={<GrOrganization style={{ width: rem(14), height: rem(14) }} />}
            >
              Organizaciones
            </Tabs.Tab>
            <Tabs.Tab
              value="memberships"
              leftSection={<FaUsers style={{ width: rem(14), height: rem(14) }} />}
            >
              Membresías
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab: Organizaciones */}
          <Tabs.Panel value="organizations" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Group>
                  <TextInput
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Button onClick={() => navigate("/superadmin/organizaciones/nueva")}>
                    Nueva organización
                  </Button>
                </Group>
              </Paper>

              <Paper withBorder>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nombre</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Teléfono</Table.Th>
                      <Table.Th>Plan</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th>Vencimiento</Table.Th>
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {loading ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Text ta="center" c="dimmed" py="xl">
                            Cargando...
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : filteredOrganizations.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Text ta="center" c="dimmed" py="xl">
                            No hay organizaciones
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredOrganizations.map((org) => {
                        const membership = org._id ? memberships.get(org._id) : null;
                        return (
                          <Table.Tr key={org._id}>
                            <Table.Td>{org.name}</Table.Td>
                            <Table.Td>{org.email}</Table.Td>
                            <Table.Td>{org.phoneNumber}</Table.Td>
                            <Table.Td>{org._id ? getPlanName(org._id) : "-"}</Table.Td>
                            <Table.Td>{org._id ? getMembershipStatusBadge(org._id) : "-"}</Table.Td>
                            <Table.Td>
                              {membership?.currentPeriodEnd
                                ? formatDate(membership.currentPeriodEnd)
                                : "-"}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Tooltip label="Editar organización">
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    onClick={() => navigate(`/superadmin/organizaciones/${org._id}`)}
                                  >
                                    <BiEdit size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Gestionar membresía">
                                  <ActionIcon
                                    variant="light"
                                    color="green"
                                    onClick={() => handleOpenMembershipModal(org)}
                                  >
                                    <BiCreditCard size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Tab: Membresías (vista resumida) */}
          <Tabs.Panel value="memberships" pt="md">
            <Paper p="md" withBorder>
              <Text c="dimmed" ta="center" py="xl">
                Vista de membresías en construcción...
              </Text>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Modal de gestión de membresía */}
        <Modal
          opened={membershipModalOpened}
          onClose={() => setMembershipModalOpened(false)}
          title="Gestionar Membresía"
          size="lg"
          centered
        >
          {selectedOrg && (
            <Stack gap="md">
              <Alert icon={<IoAlertCircle size={18} />} color="blue">
                <Text size="sm" fw={600}>
                  {selectedOrg.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {selectedOrg.email}
                </Text>
              </Alert>

              <Select
                label="Plan"
                placeholder="Selecciona un plan"
                value={membershipForm.planId}
                onChange={(value) =>
                  setMembershipForm({
                    ...membershipForm,
                    planId: value || "",
                    paymentAmount: plans.find((p) => p._id === value)?.price || 0,
                  })
                }
                data={plans.map((plan) => ({
                  value: plan._id,
                  label: `${plan.displayName} - $${plan.price} ${plan.currency}`,
                }))}
                required
              />

              <NumberInput
                label="Monto del pago"
                placeholder="0"
                value={membershipForm.paymentAmount}
                onChange={(value) =>
                  setMembershipForm({
                    ...membershipForm,
                    paymentAmount: typeof value === "number" ? value : 0,
                  })
                }
                min={1}
                required
              />

              <Select
                label="Método de pago"
                value={membershipForm.paymentMethod}
                onChange={(value) =>
                  setMembershipForm({
                    ...membershipForm,
                    paymentMethod: value || "manual",
                  })
                }
                data={[
                  { value: "manual", label: "Pago manual / Transferencia" },
                ]}
              />

              <DateInput
                label="Fecha de vencimiento"
                value={membershipForm.currentPeriodEnd}
                onChange={(value) =>
                  setMembershipForm({
                    ...membershipForm,
                    currentPeriodEnd: value || new Date(),
                  })
                }
                required
              />

              <Textarea
                label="Notas administrativas"
                placeholder="Notas opcionales sobre este pago..."
                value={membershipForm.adminNotes}
                onChange={(e) =>
                  setMembershipForm({
                    ...membershipForm,
                    adminNotes: e.currentTarget.value,
                  })
                }
                rows={3}
              />

              <Group justify="end" mt="md">
                <Button
                  variant="light"
                  onClick={() => setMembershipModalOpened(false)}
                  disabled={savingMembership}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveMembership}
                  loading={savingMembership}
                >
                  Asignar y registrar pago
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>

      </Stack>
    </Container>
  );
}
