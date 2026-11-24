// Agentes y referidores (rediseño, SuperadminAgentes): tipo en texto, código
// en mono con «Copiar enlace de registro», registros que abren el panel de
// referidos (con la tasa de conversión) y formulario en diálogo.
import { useEffect, useState } from "react";
import { ActionIcon, Button, CopyButton, Drawer, Modal, NumberInput, Select, Skeleton, TextInput, Textarea, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconEdit, IconLink, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import {
  agentService,
  Agent,
  AgentReferral,
  AgentType,
  AGENT_TYPE_LABELS,
  CreateAgentPayload,
} from "../../services/agentService";

const AGENT_TYPE_OPTIONS = Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const MEMBERSHIP_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "ag-badge--success" },
  trial: { label: "Prueba", cls: "ag-badge--info" },
  suspended: { label: "Suspendida", cls: "ag-badge--danger" },
  none: { label: "Sin membresía", cls: "" },
  past_due: { label: "Vencida", cls: "ag-badge--warning" },
  grace_period: { label: "En gracia", cls: "ag-badge--warning" },
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
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

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
      notifications.show({ message: "El nombre, el correo y el tipo son obligatorios.", color: "red" });
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

  const q = search.trim().toLowerCase();
  const filtered = agents.filter((a) => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));

  const mono = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" } as const;
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");

  const refs = referralsData?.referrals ?? [];
  const conversions = refs.filter((r) => r.convertedToPayingAt).length;
  const rate = refs.length ? Math.round((conversions / refs.length) * 100) : null;

  const stat = (value: string | number, label: string) => (
    <div className="ag-card" style={{ padding: "10px 14px", flex: 1 }}>
      <div className="ag-num" style={{ font: "600 22px/28px var(--mantine-font-family)" }}>{value}</div>
      <div className="ag-subtle">{label}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Agentes y referidores</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Quién trae negocios a AgenditApp y cuántos terminan pagando.
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            <TextInput
              placeholder="Buscar por nombre, correo o código"
              aria-label="Buscar por nombre, correo o código"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <Button color="var(--platform)" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Nuevo agente
            </Button>
          </div>
        </div>

        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>Agente</th>
                <th>Tipo</th>
                <th>Código</th>
                <th style={{ textAlign: "right" }}>Registros</th>
                <th style={{ textAlign: "right" }}>Conversiones</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <Skeleton height={18} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                    {q ? "Ningún agente coincide con la búsqueda." : "Aún no hay agentes. Crea el primero con «Nuevo agente»."}
                  </td>
                </tr>
              ) : (
                filtered.map((agent) => (
                  <tr key={agent._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{agent.name}</div>
                      <div className="ag-subtle">{agent.email}</div>
                    </td>
                    <td>{AGENT_TYPE_LABELS[agent.type] ?? agent.type}</td>
                    <td>
                      <div className="ag-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <span style={{ ...mono, fontWeight: 600, fontSize: 13 }}>{agent.code}</span>
                        <CopyButton value={`${SIGNUP_BASE_URL}?ref=${agent.code}`}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? "¡Enlace copiado!" : "Copiar enlace de registro"}>
                              <ActionIcon size="sm" variant="subtle" color="gray" onClick={copy} aria-label="Copiar enlace de registro">
                                {copied ? <IconCheck size={14} /> : <IconLink size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="ag-link ag-num"
                        style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 14 }}
                        onClick={() => openReferrals(agent)}
                        aria-label={`Ver los ${agent.referralCount ?? 0} registros de ${agent.name}`}
                      >
                        {agent.referralCount ?? 0}
                      </button>
                    </td>
                    <td className="ag-num" style={{ textAlign: "right" }}>
                      {agent.conversionCount ?? 0}
                    </td>
                    <td>{agent.status === "active" ? <span className="ag-badge ag-badge--success">Activo</span> : <span className="ag-badge">Inactivo</span>}</td>
                    <td>
                      <div className="ag-row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <Button size="xs" variant="default" leftSection={<IconEdit size={14} />} onClick={() => openEdit(agent)}>
                          Editar
                        </Button>
                        <ActionIcon variant="subtle" color="gray" onClick={() => setDeleteTarget(agent)} aria-label={`Eliminar o desactivar a ${agent.name}`}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario de agente */}
      <Modal opened={modalOpen} onClose={() => !saving && setModalOpen(false)} title={<b>{editingAgent ? `Editar a ${editingAgent.name}` : "Nuevo agente"}</b>} centered>
        <div className="ag-stack" style={{ gap: 12 }}>
          <TextInput label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextInput label="Correo" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextInput label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Select label="Tipo" required data={AGENT_TYPE_OPTIONS} value={form.type} onChange={(v) => v && setForm({ ...form, type: v as AgentType })} allowDeselect={false} />
          {!editingAgent ? (
            <TextInput
              label="Código personalizado"
              description="Déjalo vacío para generar uno de 8 caracteres."
              placeholder="Ej.: MISALON23"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              styles={{ input: mono }}
            />
          ) : (
            <Select
              label="Estado"
              data={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
              ]}
              value={form.status}
              onChange={(v) => v && setForm({ ...form, status: v as "active" | "inactive" })}
              allowDeselect={false}
            />
          )}
          <NumberInput
            label="Días de prueba para sus referidos"
            description="Días de acceso completo que reciben los negocios que se registran con su código."
            min={1}
            max={365}
            value={form.trialDays ?? 7}
            onChange={(v) => setForm({ ...form, trialDays: typeof v === "number" ? v : 7 })}
          />
          <Textarea label="Notas" placeholder="Opcional" autosize minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button color="var(--platform)" loading={saving} onClick={handleSave}>
              {editingAgent ? "Guardar agente" : "Crear agente"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Panel de referidos */}
      <Drawer
        opened={referralsModal}
        onClose={() => setReferralsModal(false)}
        position="right"
        size={560}
        title={<b style={{ fontSize: 16 }}>{referralsData ? `Referidos de ${referralsData.agent.name}` : "Referidos"}</b>}
      >
        {loadingReferrals ? (
          <div className="ag-stack" style={{ gap: 8 }}>
            <Skeleton height={64} />
            <Skeleton height={18} />
            <Skeleton height={18} />
          </div>
        ) : referralsData ? (
          <div className="ag-stack" style={{ gap: 16 }}>
            <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap" }}>
              {stat(refs.length, "Registros")}
              {stat(conversions, "Conversiones")}
              {stat(rate === null ? "—" : `${rate} %`, "Tasa")}
            </div>
            {refs.length === 0 ? (
              <div className="ag-muted" style={{ textAlign: "center", padding: "24px 0", fontSize: 14 }}>
                Aún no hay registros con este código.
              </div>
            ) : (
              <div className="ag-card" style={{ overflowX: "auto" }}>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Membresía</th>
                      <th>Registro</th>
                      <th>Conversión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refs.map((r) => {
                      const m = MEMBERSHIP_STATUS[r.membershipStatus] ?? { label: r.membershipStatus, cls: "" };
                      return (
                        <tr key={r._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div className="ag-subtle">{r.slug}</div>
                          </td>
                          <td>
                            <span className={`ag-badge ${m.cls}`}>{m.label}</span>
                          </td>
                          <td className="ag-num" style={{ whiteSpace: "nowrap" }}>{fmt(r.referredAt)}</td>
                          <td className="ag-num" style={{ whiteSpace: "nowrap" }}>
                            {r.convertedToPayingAt ? fmt(r.convertedToPayingAt) : <span className="ag-muted">Sin convertir</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Eliminar o desactivar */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={<b>Eliminar a {deleteTarget?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-muted" style={{ fontSize: 14 }}>
            Si ya trajo negocios, se desactiva en lugar de borrarse, para no perder el historial de sus referidos.
          </div>
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={() => {
                const a = deleteTarget;
                setDeleteTarget(null);
                if (a) handleDelete(a);
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
