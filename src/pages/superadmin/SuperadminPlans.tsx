/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/superadmin/SuperadminPlans.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Table,
  Badge,
  Group,
  Button,
  Text,
  Stack,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Tabs,
  Textarea,
  Divider,
  Paper,
  Alert,
  Loader,
  Code,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconBuildingBank,
  IconCreditCard,
  IconTag,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { BiBuildings, BiArrowBack } from "react-icons/bi";
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  Plan,
  PlanInput,
} from "../../services/membershipService";

const EMPTY_PLAN: PlanInput = {
  name: "",
  slug: "",
  displayName: "",
  price: 0,
  currency: "USD",
  billingCycle: "monthly",
  domainType: "subdomain",
  description: "",
  characteristics: [],
  isActive: true,
  lsVariantId: "",
  limits: {
    maxEmployees: null,
    maxServices: null,
    maxAppointmentsPerMonth: null,
    maxStorageGB: 5,
    customBranding: false,
    whatsappIntegration: true,
    analyticsAdvanced: false,
    prioritySupport: false,
    autoReminders: false,
    autoConfirmations: false,
    servicePackages: false,
  },
};

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function SuperadminPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit
  const [modalOpened, setModalOpened] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanInput>(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  // Nuevo característica input
  const [newChar, setNewChar] = useState("");

  // Modal delete
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getAllPlans();
      setPlans(data);
    } catch {
      notifications.show({ title: "Error", message: "No se pudieron cargar los planes", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  // ── Abrir modal ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_PLAN);
    setNewChar("");
    setModalOpened(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      displayName: plan.displayName,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      domainType: plan.domainType,
      description: plan.description || "",
      characteristics: [...plan.characteristics],
      isActive: plan.isActive,
      lsVariantId: plan.lsVariantId ?? "",
      limits: {
        maxEmployees: plan.limits.maxEmployees,
        maxServices: plan.limits.maxServices,
        maxAppointmentsPerMonth: plan.limits.maxAppointmentsPerMonth,
        maxStorageGB: plan.limits.maxStorageGB,
        customBranding: plan.limits.customBranding,
        whatsappIntegration: plan.limits.whatsappIntegration,
        analyticsAdvanced: plan.limits.analyticsAdvanced,
        prioritySupport: plan.limits.prioritySupport,
        autoReminders: plan.limits.autoReminders,
        autoConfirmations: plan.limits.autoConfirmations,
        servicePackages: plan.limits.servicePackages ?? false,
      },
    });
    setNewChar("");
    setModalOpened(true);
  };

  // ── Formulario helpers ─────────────────────────────────────────────────────
  const setField = (key: keyof PlanInput, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setLimit = (key: keyof PlanInput["limits"], value: any) =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: value } }));

  const handleDisplayNameChange = (val: string) => {
    setField("displayName", val);
    if (!editingPlan) {
      // Auto-generar slug y name al crear
      setField("slug", toSlug(val));
      setField("name", toSlug(val));
    }
  };

  const addCharacteristic = () => {
    const trimmed = newChar.trim();
    if (!trimmed) return;
    setField("characteristics", [...form.characteristics, trimmed]);
    setNewChar("");
  };

  const removeCharacteristic = (index: number) => {
    setField(
      "characteristics",
      form.characteristics.filter((_, i) => i !== index)
    );
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.displayName || !form.slug || form.price < 0) {
      notifications.show({ title: "Campos requeridos", message: "displayName, slug y precio son obligatorios", color: "orange" });
      return;
    }
    setSaving(true);
    try {
      const payload: PlanInput = {
        ...form,
        lsVariantId: form.lsVariantId?.trim() || null,
      };
      if (editingPlan) {
        await updatePlan(editingPlan._id, payload);
        notifications.show({ title: "Éxito", message: "Plan actualizado", color: "green" });
      } else {
        await createPlan(payload);
        notifications.show({ title: "Éxito", message: "Plan creado", color: "green" });
      }
      setModalOpened(false);
      fetchPlans();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err?.response?.data?.message || "No se pudo guardar el plan",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget._id);
      notifications.show({ title: "Éxito", message: "Plan eliminado", color: "green" });
      setDeleteTarget(null);
      fetchPlans();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err?.response?.data?.message || "No se pudo eliminar el plan",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const rows = plans.map((p) => (
    <Table.Tr key={p._id}>
      <Table.Td>
        <Stack gap={2}>
          <Text fw={600} size="sm">{p.displayName}</Text>
          <Code style={{ fontSize: 11 }}>{p.slug}</Code>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Text fw={700}>${p.price} {p.currency}</Text>
        <Text size="xs" c="dimmed">{p.billingCycle === "monthly" ? "Mensual" : p.billingCycle}</Text>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={p.domainType === "custom_domain" ? "grape" : "blue"} size="sm">
          {p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}
        </Badge>
      </Table.Td>
      <Table.Td>
        {p.lsVariantId ? (
          <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={10} />}>
            {p.lsVariantId}
          </Badge>
        ) : (
          <Badge color="red" variant="light" size="sm" leftSection={<IconX size={10} />}>
            Sin configurar
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={p.isActive ? "green" : "gray"} variant="dot" size="sm">
          {p.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label="Editar">
            <ActionIcon variant="light" color="blue" onClick={() => openEdit(p)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Eliminar">
            <ActionIcon variant="light" color="red" onClick={() => setDeleteTarget(p)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">

        {/* Navegación superadmin */}
        <Group gap="xs">
          <Button variant="light" leftSection={<BiArrowBack size={16} />} size="sm" onClick={() => navigate("/superadmin")}>
            Membresías
          </Button>
          <Button variant="light" leftSection={<BiBuildings size={16} />} size="sm" onClick={() => navigate("/superadmin/orgs")}>
            Organizaciones
          </Button>
          <Button variant="filled" leftSection={<IconTag size={16} />} size="sm">
            Planes
          </Button>
        </Group>

        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Gestión de Planes</Title>
            <Text c="dimmed" size="sm">
              Crea y edita los planes de la plataforma, incluyendo la configuración de Lemon Squeezy
            </Text>
          </div>
          <Group gap="xs">
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchPlans}>
              Actualizar
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Nuevo Plan
            </Button>
          </Group>
        </Group>

        {/* Aviso Lemon Squeezy */}
        <Alert color="blue" variant="light" icon={<IconCreditCard size={18} />}>
          <Text size="sm">
            El <strong>Variant ID de Lemon Squeezy</strong> es necesario para habilitar el pago con tarjeta en cada plan.
            Ve a tu dashboard de LS → Products → [Producto] → [Variante] para obtener el ID.
          </Text>
        </Alert>

        {/* Tabla */}
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
            <Text c="dimmed">Cargando planes...</Text>
          </Stack>
        ) : (
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Plan</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Dominio</Table.Th>
                  <Table.Th>LS Variant ID</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? rows : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="lg">No hay planes. Crea uno nuevo.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      {/* ── Modal Crear / Editar ──────────────────────────────────────────── */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Text fw={700} size="lg">
            {editingPlan ? `Editar: ${editingPlan.displayName}` : "Nuevo Plan"}
          </Text>
        }
        size="xl"
        centered
      >
        <Tabs defaultValue="general">
          <Tabs.List mb="md">
            <Tabs.Tab value="general" leftSection={<IconTag size={14} />}>General</Tabs.Tab>
            <Tabs.Tab value="caracteristicas">Características</Tabs.Tab>
            <Tabs.Tab value="limites">Límites</Tabs.Tab>
          </Tabs.List>

          {/* ── TAB GENERAL ─────────────────────────────────────── */}
          <Tabs.Panel value="general">
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Nombre visible"
                  placeholder="Plan Esencial"
                  required
                  value={form.displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                />
                <Switch
                  label="Plan activo"
                  description="Los planes inactivos no se muestran al público"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.currentTarget.checked)}
                  mt="lg"
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Slug"
                  placeholder="plan-esencial"
                  description="Identificador único en URL (auto-generado)"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                />
                <TextInput
                  label="Name (interno)"
                  placeholder="plan-esencial"
                  description="Igual al slug, usado internamente"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </Group>

              <Divider label="Precio y ciclo" />

              <Group grow>
                <NumberInput
                  label="Precio"
                  placeholder="15"
                  required
                  min={0}
                  value={form.price}
                  onChange={(v) => setField("price", Number(v) || 0)}
                />
                <Select
                  label="Moneda"
                  data={["USD", "COP", "MXN", "EUR", "BRL", "CLP", "CRC", "ARS"]}
                  value={form.currency}
                  onChange={(v) => setField("currency", v || "USD")}
                />
                <Select
                  label="Ciclo de facturación"
                  data={[
                    { value: "monthly", label: "Mensual" },
                    { value: "yearly", label: "Anual" },
                    { value: "lifetime", label: "De por vida" },
                  ]}
                  value={form.billingCycle}
                  onChange={(v) => setField("billingCycle", v || "monthly")}
                />
              </Group>

              <Select
                label="Tipo de dominio"
                data={[
                  { value: "subdomain", label: "Subdominio (ej: minegocio.agenditapp.com)" },
                  { value: "custom_domain", label: "Dominio propio (ej: miagenda.com)" },
                ]}
                value={form.domainType}
                onChange={(v) => setField("domainType", v || "subdomain")}
              />

              <Divider label="Lemon Squeezy" />

              <TextInput
                label="Variant ID de Lemon Squeezy"
                placeholder="1330373"
                description="ID de la variante en el dashboard de LS. Necesario para pago con tarjeta."
                leftSection={<IconBuildingBank size={16} />}
                value={form.lsVariantId ?? ""}
                onChange={(e) => setField("lsVariantId", e.target.value)}
                styles={{ input: { fontFamily: "monospace" } }}
              />

              <Divider label="Descripción interna" />

              <Textarea
                label="Descripción"
                placeholder="Descripción interna del plan (no visible al público)"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </Stack>
          </Tabs.Panel>

          {/* ── TAB CARACTERÍSTICAS ──────────────────────────────── */}
          <Tabs.Panel value="caracteristicas">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Lista de características visibles en la tarjeta del plan. Cada ítem aparece como un punto de la lista.
              </Text>

              {form.characteristics.map((c, i) => (
                <Group key={i} gap="xs">
                  <TextInput
                    style={{ flex: 1 }}
                    value={c}
                    onChange={(e) => {
                      const updated = [...form.characteristics];
                      updated[i] = e.target.value;
                      setField("characteristics", updated);
                    }}
                  />
                  <ActionIcon color="red" variant="light" onClick={() => removeCharacteristic(i)}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              ))}

              <Group gap="xs">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Ej: Hasta 5 empleados"
                  value={newChar}
                  onChange={(e) => setNewChar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCharacteristic()}
                />
                <Button variant="light" leftSection={<IconPlus size={14} />} onClick={addCharacteristic}>
                  Agregar
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* ── TAB LÍMITES ──────────────────────────────────────── */}
          <Tabs.Panel value="limites">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Los valores numéricos en <strong>null</strong> significan ilimitado.
                Deja el campo vacío para ilimitado.
              </Text>

              <Group grow>
                <NumberInput
                  label="Máx. empleados"
                  description="null = ilimitado"
                  placeholder="Ilimitado"
                  min={0}
                  value={form.limits.maxEmployees ?? ""}
                  onChange={(v) => setLimit("maxEmployees", v === "" ? null : Number(v))}
                />
                <NumberInput
                  label="Máx. servicios"
                  placeholder="Ilimitado"
                  min={0}
                  value={form.limits.maxServices ?? ""}
                  onChange={(v) => setLimit("maxServices", v === "" ? null : Number(v))}
                />
                <NumberInput
                  label="Máx. citas/mes"
                  placeholder="Ilimitado"
                  min={0}
                  value={form.limits.maxAppointmentsPerMonth ?? ""}
                  onChange={(v) => setLimit("maxAppointmentsPerMonth", v === "" ? null : Number(v))}
                />
                <NumberInput
                  label="Almacenamiento (GB)"
                  min={1}
                  value={form.limits.maxStorageGB ?? 5}
                  onChange={(v) => setLimit("maxStorageGB", Number(v) || 5)}
                />
              </Group>

              <Divider label="Funcionalidades" />

              <Group>
                {([
                  ["customBranding", "Branding personalizado"],
                  ["whatsappIntegration", "Integración WhatsApp"],
                  ["analyticsAdvanced", "Analíticas avanzadas"],
                  ["prioritySupport", "Soporte prioritario"],
                  ["autoReminders", "Recordatorios automáticos"],
                  ["autoConfirmations", "Confirmaciones automáticas"],
                  ["servicePackages", "Paquetes de sesiones"],
                ] as [keyof PlanInput["limits"], string][]).map(([key, label]) => (
                  <Switch
                    key={key}
                    label={label}
                    checked={form.limits[key] as boolean}
                    onChange={(e) => setLimit(key, e.currentTarget.checked)}
                  />
                ))}
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Divider mt="xl" mb="md" />
        <Group justify="flex-end">
          <Button variant="light" color="gray" onClick={() => setModalOpened(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            leftSection={<IconCheck size={16} />}
          >
            {editingPlan ? "Guardar cambios" : "Crear plan"}
          </Button>
        </Group>
      </Modal>

      {/* ── Modal Eliminar ────────────────────────────────────────────────── */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={<Text fw={700} c="red">Eliminar plan</Text>}
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            ¿Estás seguro de que quieres eliminar el plan{" "}
            <strong>{deleteTarget?.displayName}</strong>? Esta acción no se puede deshacer.
          </Text>
          <Alert color="orange" variant="light">
            <Text size="xs">
              Asegúrate de que ninguna organización tenga este plan asignado antes de eliminarlo.
            </Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Sí, eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
