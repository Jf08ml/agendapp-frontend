import { useEffect, useState } from "react";
import {
  Table,
  Button,
  TextInput,
  NumberInput,
  Textarea,
  Modal,
  Group,
  Loader,
  Text,
  Badge,
  ActionIcon,
  Select,
  Stack,
  Tooltip,
  Paper,
  CopyButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BiEdit, BiTrash, BiLink } from "react-icons/bi";
import SuperadminNav from "./SuperadminNav";
import {
  agentService,
  Agent,
  AgentReferral,
  AgentType,
  AGENT_TYPE_LABELS,
  AGENT_TYPE_COLORS,
  CreateAgentPayload,
} from "../../services/agentService";

const AGENT_TYPE_OPTIONS = Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Pago",
  trial: "Trial",
  suspended: "Suspendido",
  none: "Sin membresía",
  past_due: "Vencido",
  grace_period: "Gracia",
};
const MEMBERSHIP_STATUS_COLORS: Record<string, string> = {
  active: "green",
  trial: "blue",
  suspended: "red",
  none: "gray",
  past_due: "orange",
  grace_period: "yellow",
};

const SIGNUP_BASE_URL = import.meta.env.VITE_NODE_ENV === "production"
  ? "https://app.agenditapp.com/signup"
  : `${window.location.origin}/signup`;

const emptyForm = (): CreateAgentPayload & { status?: "active" | "inactive" } => ({
  name: "",
  email: "",
  phone: "",
  type: "vendedor_externo",
  notes: "",
  code: "",
  status: "active",
  trialDays: 7,
});

export default function SuperadminAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Modal referidos
  const [referralsModal, setReferralsModal] = useState(false);
  const [referralsData, setReferralsData] = useState<{ agent: Agent; referrals: AgentReferral[] } | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgents();
      setAgents(data);
    } catch {
      notifications.show({ message: "Error al cargar agentes", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgents(); }, []);

  const openCreate = () => {
    setEditingAgent(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      email: agent.email,
      phone: agent.phone ?? "",
      type: agent.type,
      notes: agent.notes ?? "",
      code: agent.code,
      status: agent.status,
      trialDays: agent.trialDays ?? 7,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.type) {
      notifications.show({ message: "Nombre, email y tipo son requeridos", color: "red" });
      return;
    }
    setSaving(true);
    try {
      if (editingAgent) {
        await agentService.updateAgent(editingAgent._id, {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          type: form.type as AgentType,
          notes: form.notes || undefined,
          status: form.status,
          trialDays: form.trialDays,
        });
        notifications.show({ message: "Agente actualizado", color: "green" });
      } else {
        await agentService.createAgent({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          type: form.type as AgentType,
          notes: form.notes || undefined,
          code: form.code || undefined,
          trialDays: form.trialDays,
        });
        notifications.show({ message: "Agente creado", color: "green" });
      }
      setModalOpen(false);
      loadAgents();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ message: msg || "Error al guardar", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!window.confirm(`¿Eliminar/desactivar a ${agent.name}?`)) return;
    try {
      await agentService.deleteAgent(agent._id);
      notifications.show({ message: "Agente eliminado o desactivado", color: "green" });
      loadAgents();
    } catch {
      notifications.show({ message: "Error al eliminar agente", color: "red" });
    }
  };

  const openReferrals = async (agent: Agent) => {
    setReferralsData(null);
    setReferralsModal(true);
    setLoadingReferrals(true);
    try {
      const data = await agentService.getAgentReferrals(agent._id);
      setReferralsData(data);
    } catch {
      notifications.show({ message: "Error al cargar referidos", color: "red" });
    } finally {
      setLoadingReferrals(false);
    }
  };

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: "auto", padding: 24 }}>
      {/* Navegación superadmin (compartida) */}
      <Group mb="lg">
        <SuperadminNav />
      </Group>

      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>Agentes / Referidores</Text>
        <Group>
          <TextInput
            placeholder="Buscar por nombre, email o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 280 }}
          />
          <Button onClick={openCreate}>Nuevo agente</Button>
        </Group>
      </Group>

      {loading ? (
        <Loader mt={40} />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Código</Table.Th>
              <Table.Th>Referidos</Table.Th>
              <Table.Th>Conversiones</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center" py={24}>No hay agentes registrados</Text>
                </Table.Td>
              </Table.Tr>
            )}
            {filtered.map((agent) => (
              <Table.Tr key={agent._id}>
                <Table.Td>
                  <Text fw={500}>{agent.name}</Text>
                  <Text size="xs" c="dimmed">{agent.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={AGENT_TYPE_COLORS[agent.type]} variant="light" size="sm">
                    {AGENT_TYPE_LABELS[agent.type]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text ff="monospace" size="sm" fw={600}>{agent.code}</Text>
                    <CopyButton value={`${SIGNUP_BASE_URL}?ref=${agent.code}`}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? "¡Enlace copiado!" : "Copiar enlace de registro"}>
                          <ActionIcon size="sm" variant="subtle" color={copied ? "green" : "blue"} onClick={copy}>
                            <BiLink size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => openReferrals(agent)}
                  >
                    {agent.referralCount ?? 0}
                  </Button>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={agent.conversionCount ? "green" : "dimmed"} fw={agent.conversionCount ? 600 : 400}>
                    {agent.conversionCount ?? 0}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={agent.status === "active" ? "green" : "gray"} variant="outline" size="sm">
                    {agent.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Tooltip label="Editar">
                      <ActionIcon variant="subtle" onClick={() => openEdit(agent)}>
                        <BiEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Eliminar / Desactivar">
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(agent)}>
                        <BiTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Modal crear/editar agente */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAgent ? "Editar agente" : "Nuevo agente"}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextInput
            label="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextInput
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="Tipo"
            required
            data={AGENT_TYPE_OPTIONS}
            value={form.type}
            onChange={(v) => v && setForm({ ...form, type: v as AgentType })}
          />
          {!editingAgent && (
            <TextInput
              label="Código personalizado"
              description="Déjalo vacío para auto-generar (8 caracteres)"
              placeholder="Ej: MISALON23"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          )}
          {editingAgent && (
            <Select
              label="Estado"
              data={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
              value={form.status}
              onChange={(v) => v && setForm({ ...form, status: v as "active" | "inactive" })}
            />
          )}
          <NumberInput
            label="Días de trial"
            description="Días de acceso completo que reciben los referidos de este agente"
            min={1}
            max={365}
            value={form.trialDays ?? 7}
            onChange={(v) => setForm({ ...form, trialDays: typeof v === "number" ? v : 7 })}
          />
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave}>
              {editingAgent ? "Guardar cambios" : "Crear agente"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal referidos del agente */}
      <Modal
        opened={referralsModal}
        onClose={() => setReferralsModal(false)}
        title={referralsData ? `Referidos de ${referralsData.agent.name}` : "Referidos"}
        size="lg"
      >
        {loadingReferrals && <Loader mt={16} />}
        {referralsData && (
          <Stack gap="xs">
            <Group gap="xl" mb="sm">
              <Paper withBorder p="xs" radius="md" style={{ minWidth: 100, textAlign: "center" }}>
                <Text size="xl" fw={700}>{referralsData.referrals.length}</Text>
                <Text size="xs" c="dimmed">Registros</Text>
              </Paper>
              <Paper withBorder p="xs" radius="md" style={{ minWidth: 100, textAlign: "center" }}>
                <Text size="xl" fw={700} c="green">
                  {referralsData.referrals.filter((r) => r.convertedToPayingAt).length}
                </Text>
                <Text size="xs" c="dimmed">Conversiones</Text>
              </Paper>
            </Group>

            {referralsData.referrals.length === 0 && (
              <Text c="dimmed" ta="center">Aún no hay registros con este código</Text>
            )}

            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Negocio</Table.Th>
                  <Table.Th>Membresía</Table.Th>
                  <Table.Th>Registro</Table.Th>
                  <Table.Th>Conversión</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {referralsData.referrals.map((r) => (
                  <Table.Tr key={r._id}>
                    <Table.Td>
                      <Text fw={500} size="sm">{r.name}</Text>
                      <Text size="xs" c="dimmed">{r.slug}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={MEMBERSHIP_STATUS_COLORS[r.membershipStatus] ?? "gray"}
                        variant="light"
                        size="sm"
                      >
                        {MEMBERSHIP_STATUS_LABELS[r.membershipStatus] ?? r.membershipStatus}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{r.referredAt ? new Date(r.referredAt).toLocaleDateString("es-CO") : "—"}</Text>
                    </Table.Td>
                    <Table.Td>
                      {r.convertedToPayingAt ? (
                        <Text size="xs" c="green" fw={600}>
                          {new Date(r.convertedToPayingAt).toLocaleDateString("es-CO")}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">Sin convertir</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
