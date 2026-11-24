/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/superadmin/SuperadminPlans.tsx
// Planes de la plataforma (rediseño, SuperadminPlanes): tabla con precio y
// ciclo, dominio en texto, PayPal en mono o «Sin configurar», y edición en
// panel lateral con General, Características y Límites.
import { useEffect, useState } from "react";
import { ActionIcon, Button, Drawer, Modal, NumberInput, Select, Skeleton, Switch, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconEdit, IconInfoCircle, IconPlus, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  Plan,
  PlanInput,
} from "../../services/membershipService";
import { billingLabel } from "../../utils/billingCycle";

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
  paypalPlanId: "",
  limits: {
    maxEmployees: null,
    maxServices: null,
    maxAppointmentsPerMonth: null,
    maxStorageGB: 5,
    customBranding: false,
    whatsappIntegration: false,
    analyticsAdvanced: true,
    prioritySupport: false,
    autoReminders: false,
    autoConfirmations: false,
    servicePackages: false,
    campaignsWhatsapp: false,
    classesModule: false,
    loyaltyProgram: false,
    professionalLanding: false,
    brandingVisible: false,
    maxRemindersPerAppointment: 0,
    maxWhatsappAppointmentsPerMonth: null,
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit
  const [modalOpened, setModalOpened] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanInput>(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  // Nuevo característica input
  const [newChar, setNewChar] = useState("");
  const [planTab, setPlanTab] = useState<"general" | "caracteristicas" | "limites">("general");

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
    setPlanTab("general");
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
      paypalPlanId: plan.paypalPlanId ?? "",
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
        campaignsWhatsapp: plan.limits.campaignsWhatsapp ?? false,
        classesModule: plan.limits.classesModule ?? false,
        loyaltyProgram: plan.limits.loyaltyProgram ?? false,
        professionalLanding: plan.limits.professionalLanding ?? false,
        brandingVisible: plan.limits.brandingVisible ?? false,
        maxRemindersPerAppointment: plan.limits.maxRemindersPerAppointment ?? 0,
        maxWhatsappAppointmentsPerMonth: plan.limits.maxWhatsappAppointmentsPerMonth ?? null,
      },
    });
    setNewChar("");
    setPlanTab("general");
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
      notifications.show({ title: "Campos requeridos", message: "El nombre visible, el slug y el precio son obligatorios.", color: "orange" });
      return;
    }
    setSaving(true);
    try {
      const payload: PlanInput = {
        ...form,
        paypalPlanId: form.paypalPlanId?.trim() || null,
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
  const mono = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)", fontSize: 12 } as const;
  const unlimited = (key: keyof PlanInput["limits"]) => ({
    placeholder: "Ilimitado",
    min: 0,
    value: (form.limits[key] as number | null) ?? "",
    onChange: (v: string | number) => setLimit(key, v === "" ? null : Number(v)),
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Planes</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Lo que se vende: precio, límites y el plan de PayPal de cada uno.
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={fetchPlans} loading={loading}>
              Actualizar
            </Button>
            <Button color="var(--platform)" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Nuevo plan
            </Button>
          </div>
        </div>

        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div style={{ fontSize: 14 }}>
            El <b>Plan ID de PayPal</b> habilita el pago con suscripción automática. Lo encuentras en PayPal › Productos y planes › el plan; tiene el formato{" "}
            <code style={mono}>P-XXXXX</code>.
          </div>
        </div>

        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Precio</th>
                <th>Dominio</th>
                <th>PayPal</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loading && plans.length === 0 ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <Skeleton height={18} />
                    </td>
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                    Aún no hay planes. Crea el primero con «Nuevo plan».
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.displayName}</div>
                      <div className="ag-subtle" style={mono}>{p.slug}</div>
                    </td>
                    <td>
                      <div className="ag-num" style={{ fontWeight: 600 }}>
                        ${p.price.toLocaleString()} {p.currency}
                      </div>
                      <div className="ag-subtle">{billingLabel(p.billingCycle)}</div>
                    </td>
                    <td>{p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}</td>
                    <td>{p.paypalPlanId ? <span style={mono}>{p.paypalPlanId}</span> : <span className="ag-badge ag-badge--warning">Sin configurar</span>}</td>
                    <td>{p.isActive ? <span className="ag-badge ag-badge--success">Activo</span> : <span className="ag-badge">Inactivo</span>}</td>
                    <td>
                      <div className="ag-row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <Button size="xs" variant="default" leftSection={<IconEdit size={14} />} onClick={() => openEdit(p)} aria-label={`Editar ${p.displayName}`}>
                          Editar
                        </Button>
                        <ActionIcon variant="subtle" color="gray" onClick={() => setDeleteTarget(p)} aria-label={`Eliminar ${p.displayName}`}>
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

      {/* ── Panel crear / editar ─────────────────────────────────────────── */}
      <Drawer
        opened={modalOpened}
        onClose={() => !saving && setModalOpened(false)}
        position="right"
        size={560}
        title={<b style={{ fontSize: 16 }}>{editingPlan ? `Editar ${editingPlan.displayName}` : "Nuevo plan"}</b>}
        styles={{ body: { display: "flex", flexDirection: "column", gap: 16 } }}
      >
        <div className="ag-subtabs" role="tablist" aria-label="Secciones del plan" style={{ gap: 20 }}>
          {(
            [
              ["general", "General"],
              ["caracteristicas", "Características"],
              ["limites", "Límites"],
            ] as const
          ).map(([value, label]) => (
            <a
              key={value}
              href={`#${value}`}
              role="tab"
              aria-current={planTab === value ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setPlanTab(value);
              }}
            >
              {label}
            </a>
          ))}
        </div>

        {planTab === "general" && (
          <div className="ag-stack" style={{ gap: 14 }}>
            <TextInput label="Nombre visible" placeholder="Plan Esencial" required value={form.displayName} onChange={(e) => handleDisplayNameChange(e.target.value)} />
            <Switch
              label="Plan activo"
              description="Los planes inactivos no se muestran al público."
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.currentTarget.checked)}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <TextInput
                label="Slug"
                placeholder="plan-esencial"
                description="Se genera del nombre."
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                styles={{ input: mono }}
              />
              <TextInput
                label="Nombre interno"
                placeholder="plan-esencial"
                description="Igual al slug."
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                styles={{ input: mono }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <NumberInput label="Precio" required min={0} value={form.price} onChange={(v) => setField("price", Number(v) || 0)} />
              <Select
                label="Moneda"
                data={["USD", "COP", "MXN", "EUR", "BRL", "CLP", "CRC", "ARS"]}
                value={form.currency}
                onChange={(v) => setField("currency", v || "USD")}
                allowDeselect={false}
              />
              <Select
                label="Ciclo"
                data={[
                  { value: "monthly", label: "Mensual" },
                  { value: "quarterly", label: "Trimestral" },
                  { value: "semiannual", label: "Semestral" },
                  { value: "yearly", label: "Anual" },
                  { value: "lifetime", label: "De por vida" },
                ]}
                value={form.billingCycle}
                onChange={(v) => setField("billingCycle", v || "monthly")}
                allowDeselect={false}
              />
            </div>
            <Select
              label="Tipo de dominio"
              data={[
                { value: "subdomain", label: "Subdominio (minegocio.agenditapp.com)" },
                { value: "custom_domain", label: "Dominio propio (miagenda.com)" },
              ]}
              value={form.domainType}
              onChange={(v) => setField("domainType", v || "subdomain")}
              allowDeselect={false}
            />
            <TextInput
              label="Plan ID de PayPal"
              placeholder="P-9RU26879V1709291PNHQBEWA"
              description="Necesario para el pago automático."
              value={form.paypalPlanId ?? ""}
              onChange={(e) => setField("paypalPlanId", e.target.value)}
              styles={{ input: mono }}
            />
            <Textarea
              label="Descripción interna"
              placeholder="No se muestra al público"
              autosize
              minRows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>
        )}

        {planTab === "caracteristicas" && (
          <div className="ag-stack" style={{ gap: 10 }}>
            <div className="ag-muted" style={{ fontSize: 14 }}>Cada línea aparece como un punto en la tarjeta del plan.</div>
            {form.characteristics.map((c, i) => (
              <div key={i} className="ag-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <TextInput
                  style={{ flex: 1 }}
                  aria-label={`Característica ${i + 1}`}
                  value={c}
                  onChange={(e) => {
                    const updated = [...form.characteristics];
                    updated[i] = e.target.value;
                    setField("characteristics", updated);
                  }}
                />
                <ActionIcon variant="subtle" color="gray" onClick={() => removeCharacteristic(i)} aria-label={`Quitar «${c}»`}>
                  <IconX size={16} />
                </ActionIcon>
              </div>
            ))}
            <div className="ag-row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <TextInput
                style={{ flex: 1 }}
                placeholder="Ej.: Hasta 5 profesionales"
                aria-label="Nueva característica"
                value={newChar}
                onChange={(e) => setNewChar(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCharacteristic();
                  }
                }}
              />
              <Button variant="default" leftSection={<IconPlus size={14} />} onClick={addCharacteristic} disabled={!newChar.trim()}>
                Agregar
              </Button>
            </div>
          </div>
        )}

        {planTab === "limites" && (
          <div className="ag-stack" style={{ gap: 14 }}>
            <div className="ag-muted" style={{ fontSize: 14 }}>Deja un número vacío para que sea ilimitado.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <NumberInput label="Máx. profesionales" {...unlimited("maxEmployees")} />
              <NumberInput label="Máx. servicios" {...unlimited("maxServices")} />
              <NumberInput label="Máx. citas al mes" {...unlimited("maxAppointmentsPerMonth")} />
              <NumberInput label="Máx. citas con WhatsApp al mes" {...unlimited("maxWhatsappAppointmentsPerMonth")} />
              <NumberInput label="Almacenamiento (GB)" min={1} value={form.limits.maxStorageGB ?? 5} onChange={(v) => setLimit("maxStorageGB", Number(v) || 5)} />
            </div>
            <h3 className="ag-h" style={{ margin: "6px 0 0" }}>Funciones</h3>
            <div className="ag-stack" style={{ gap: 10 }}>
              {(
                [
                  ["customBranding", "Marca personalizada"],
                  ["whatsappIntegration", "Integración con WhatsApp"],
                  ["analyticsAdvanced", "Analíticas avanzadas"],
                  ["prioritySupport", "Soporte prioritario"],
                  ["autoReminders", "Recordatorios automáticos"],
                  ["autoConfirmations", "Confirmaciones automáticas"],
                  ["servicePackages", "Paquetes de sesiones"],
                ] as [keyof PlanInput["limits"], string][]
              ).map(([key, label]) => (
                <Switch key={key} label={label} checked={form.limits[key] as boolean} onChange={(e) => setLimit(key, e.currentTarget.checked)} />
              ))}
            </div>
          </div>
        )}

        <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: "auto" }}>
          <Button variant="default" onClick={() => setModalOpened(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button color="var(--platform)" onClick={handleSave} loading={saving}>
            {editingPlan ? "Guardar plan" : "Crear plan"}
          </Button>
        </div>
      </Drawer>

      {/* ── Eliminar ─────────────────────────────────────────────────────── */}
      <Modal opened={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title={<b>Eliminar {deleteTarget?.displayName}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-alert ag-alert--warning">
            <IconAlertTriangle size={20} />
            <div style={{ fontSize: 14 }}>No se puede deshacer. Antes revisa que ninguna organización tenga este plan asignado.</div>
          </div>
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Eliminar plan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
