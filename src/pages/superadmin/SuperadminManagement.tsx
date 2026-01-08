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
  createOrganization,
  updateOrganization,
} from "../../services/organizationService";
import { getCurrentMembership, Membership, getAllPlans, Plan } from "../../services/membershipService";
import { apiGeneral } from "../../services/axiosConfig";
import { notifications } from "@mantine/notifications";
import { BiEdit, BiCreditCard, BiRefresh } from "react-icons/bi";
import { GrOrganization } from "react-icons/gr";
import { FaUsers } from "react-icons/fa";
import { IoAlertCircle } from "react-icons/io5";

const EMPTY_ORG_FORM = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  address: "",
  location: { lat: 0, lng: 0 },
  timezone: "America/Bogota",
  default_country: "CO",
  isActive: true,
};

export default function SuperadminManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("organizations");

  // Modal de organización
  const [orgModalOpened, setOrgModalOpened] = useState(false);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<Organization | null>(null);
  const [orgForm, setOrgForm] = useState(EMPTY_ORG_FORM);
  const [savingOrg, setSavingOrg] = useState(false);

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
      const [orgs, plansData] = await Promise.all([
        getOrganizations(),
        getAllPlans(),
      ]);
      setOrganizations(orgs || []);
      setPlans(plansData || []);

      // Cargar membresías para cada organización
      const membershipMap = new Map<string, Membership>();
      await Promise.all(
        (orgs || []).map(async (org) => {
          if (org._id) {
            try {
              const membership = await getCurrentMembership(org._id);
              if (membership) {
                membershipMap.set(org._id, membership);
              }
            } catch (e) {
              console.error(`Error cargando membresía para ${org._id}:`, e);
            }
          }
        })
      );
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

  const handleOpenOrgModal = (org?: Organization) => {
    if (org) {
      // Editar organización existente
      setSelectedOrgForEdit(org);
      setOrgForm({
        name: org.name || "",
        email: org.email || "",
        phoneNumber: org.phoneNumber || "",
        password: "", // No pre-llenar password por seguridad
        address: org.address || "",
        location: org.location || { lat: 0, lng: 0 },
        timezone: org.timezone || "America/Bogota",
        default_country: org.default_country || "CO",
        isActive: org.isActive !== false,
      });
    } else {
      // Nueva organización
      setSelectedOrgForEdit(null);
      setOrgForm(EMPTY_ORG_FORM);
    }
    setOrgModalOpened(true);
  };

  const handleSaveOrg = async () => {
    setSavingOrg(true);
    try {
      if (selectedOrgForEdit?._id) {
        // Actualizar organización existente
        const updateData: Partial<Organization> = {
          name: orgForm.name,
          email: orgForm.email,
          phoneNumber: orgForm.phoneNumber,
          address: orgForm.address,
          location: orgForm.location,
          timezone: orgForm.timezone,
          default_country: orgForm.default_country,
          isActive: orgForm.isActive,
        };
        // Solo incluir password si se proporcionó uno nuevo
        if (orgForm.password) {
          updateData.password = orgForm.password;
        }
        await updateOrganization(selectedOrgForEdit._id, updateData);
        notifications.show({
          title: "Éxito",
          message: "Organización actualizada correctamente",
          color: "green",
        });
      } else {
        // Crear nueva organización
        if (!orgForm.password) {
          notifications.show({
            title: "Error",
            message: "La contraseña es requerida para nuevas organizaciones",
            color: "red",
          });
          return;
        }
        await createOrganization({
          ...orgForm,
          role: "organization",
        } as Organization);
        notifications.show({
          title: "Éxito",
          message: "Organización creada correctamente",
          color: "green",
        });
      }

      setOrgModalOpened(false);
      setSelectedOrgForEdit(null);
      setOrgForm(EMPTY_ORG_FORM);
      fetchData();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "Error",
        message: err.response?.data?.message || "No se pudo guardar la organización",
        color: "red",
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveMembership = async () => {
    if (!selectedOrg?._id) return;

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
            planId: membershipForm.planId,
            skipPayment: true, // No crear checkout de Polar
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
        amount: membershipForm.paymentAmount,
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
                  <Button onClick={() => handleOpenOrgModal()}>
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
                                    onClick={() => handleOpenOrgModal(org)}
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
                    paymentAmount: Number(value),
                  })
                }
                min={0}
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
                  { value: "polar", label: "Polar (tarjeta)" },
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

        {/* Modal de organización */}
        <Modal
          opened={orgModalOpened}
          onClose={() => !savingOrg && setOrgModalOpened(false)}
          title={
            selectedOrgForEdit
              ? "Editar organización"
              : "Nueva organización"
          }
          size="lg"
        >
          <Stack gap="md">
            <TextInput
              label="Nombre"
              placeholder="Nombre de la organización"
              value={orgForm.name}
              onChange={(e) =>
                setOrgForm({ ...orgForm, name: e.currentTarget.value })
              }
              required
            />

            <TextInput
              label="Email"
              placeholder="email@ejemplo.com"
              type="email"
              value={orgForm.email}
              onChange={(e) =>
                setOrgForm({ ...orgForm, email: e.currentTarget.value })
              }
              required
            />

            <TextInput
              label="Teléfono"
              placeholder="+573001234567"
              value={orgForm.phoneNumber}
              onChange={(e) =>
                setOrgForm({ ...orgForm, phoneNumber: e.currentTarget.value })
              }
              required
            />

            <TextInput
              label="Contraseña"
              placeholder={
                selectedOrgForEdit
                  ? "Dejar vacío para mantener la actual"
                  : "Contraseña"
              }
              type="password"
              value={orgForm.password}
              onChange={(e) =>
                setOrgForm({ ...orgForm, password: e.currentTarget.value })
              }
              required={!selectedOrgForEdit}
            />

            <TextInput
              label="Dirección"
              placeholder="Dirección física"
              value={orgForm.address}
              onChange={(e) =>
                setOrgForm({ ...orgForm, address: e.currentTarget.value })
              }
            />

            <Group grow>
              <Select
                label="Zona horaria"
                value={orgForm.timezone}
                onChange={(value) =>
                  setOrgForm({ ...orgForm, timezone: value || "America/Bogota" })
                }
                data={[
                  { value: "America/Bogota", label: "Colombia (UTC-5)" },
                  { value: "America/Mexico_City", label: "México (UTC-6)" },
                  { value: "America/Lima", label: "Perú (UTC-5)" },
                  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
                  { value: "America/Santiago", label: "Chile (UTC-3)" },
                ]}
              />

              <Select
                label="País por defecto"
                value={orgForm.default_country}
                onChange={(value) =>
                  setOrgForm({ ...orgForm, default_country: value || "CO" })
                }
                data={[
                  { value: "CO", label: "Colombia" },
                  { value: "MX", label: "México" },
                  { value: "PE", label: "Perú" },
                  { value: "AR", label: "Argentina" },
                  { value: "CL", label: "Chile" },
                ]}
              />
            </Group>

            <Alert icon={<IoAlertCircle size={16} />} color="blue">
              La ubicación (lat/lng) puede configurarse después desde el panel de administración
            </Alert>

            <Group justify="end" mt="md">
              <Button
                variant="light"
                onClick={() => setOrgModalOpened(false)}
                disabled={savingOrg}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveOrg} loading={savingOrg}>
                {selectedOrgForEdit ? "Actualizar" : "Crear"} organización
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
