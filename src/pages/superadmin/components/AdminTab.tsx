// Pestaña Administración de la ficha de organización (rediseño,
// SuperadminOrganizacionDetalle): tarjetas de Estado y acceso, Membresía,
// Dominios y Contraseña y WhatsApp. Edición directa (sin modo «Editar»).
import { Button, ActionIcon, NumberInput, PasswordInput, Select, Switch, TextInput, Modal } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode } from "react";
import type { SuperadminFormValues } from "../schema";
import { createMembership, getAllPlans, type Membership, type Plan } from "../../../services/membershipService";
import { formatCurrency } from "../../../utils/formatCurrency";
import { MEMBERSHIP_META, badgeClass } from "../organizationsModel";
import { daysCell, daysLeft, fmtDate } from "../membershipsModel";

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 className="ag-h" style={{ margin: 0 }}>{title}</h2>
        {description && <div className="ag-muted" style={{ fontSize: 14, marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </section>
  );
}

export default function AdminTab({
  form,
  isCreateMode,
  organizationId,
  membership,
  onEditMembership,
  onMembershipCreated,
}: {
  form: UseFormReturnType<SuperadminFormValues>;
  isCreateMode: boolean;
  organizationId?: string;
  /** Membresía actual (de getAllMemberships) o null si no tiene. */
  membership?: Membership | null;
  onEditMembership?: () => void;
  onMembershipCreated?: () => void;
}) {
  const [newDomain, setNewDomain] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [assigning, setAssigning] = useState(false);

  const domains = form.values.domains || [];

  useEffect(() => {
    if (assignOpen && plans.length === 0) {
      getAllPlans()
        .then(setPlans)
        .catch(() => notifications.show({ message: "No se pudieron cargar los planes.", color: "red" }));
    }
  }, [assignOpen, plans.length]);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!d || domains.includes(d)) return;
    form.setFieldValue("domains", [...domains, d]);
    setNewDomain("");
  };

  const assign = async () => {
    if (!organizationId || !planId) return;
    setAssigning(true);
    try {
      await createMembership({ organizationId, planId, trialDays: trialDays > 0 ? trialDays : undefined });
      notifications.show({ message: "Membresía asignada." });
      setAssignOpen(false);
      setPlanId(null);
      setTrialDays(0);
      onMembershipCreated?.();
    } catch {
      notifications.show({ message: "No se pudo asignar la membresía.", color: "red" });
    } finally {
      setAssigning(false);
    }
  };

  const meta = membership ? MEMBERSHIP_META[membership.status] ?? { label: membership.status, tone: "neutral" as const } : null;
  const days = membership ? daysCell(daysLeft(membership.currentPeriodEnd)) : null;

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "start" }}>
      <Card title="Estado y acceso">
        <Switch
          label="Organización activa"
          description="Si la desactivas, nadie del negocio puede entrar a la plataforma."
          checked={form.values.isActive ?? true}
          onChange={(e) => form.setFieldValue("isActive", e.currentTarget.checked)}
        />
        <Switch
          label="Acceso bloqueado"
          description="Bloquea el acceso hasta que se active un plan."
          checked={form.values.hasAccessBlocked ?? true}
          onChange={(e) => form.setFieldValue("hasAccessBlocked", e.currentTarget.checked)}
        />
        <Select
          label="Estado de membresía de la organización"
          value={form.values.membershipStatus || "none"}
          onChange={(value) => form.setFieldValue("membershipStatus", (value as SuperadminFormValues["membershipStatus"]) || "none")}
          allowDeselect={false}
          data={[
            { value: "active", label: "Activa" },
            { value: "trial", label: "Prueba" },
            { value: "suspended", label: "Suspendida" },
            { value: "none", label: "Sin membresía" },
          ]}
        />
      </Card>

      {!isCreateMode && (
        <Card title="Membresía">
          {membership && meta ? (
            <>
              <dl className="ag-kv" style={{ margin: 0 }}>
                <dt>Plan</dt>
                <dd>{membership.planId?.displayName ?? "—"}</dd>
                <dt>Estado</dt>
                <dd>
                  <span className={badgeClass(meta.tone)}>{meta.label}</span>
                </dd>
                <dt>Vence</dt>
                <dd className="ag-num">
                  {fmtDate(membership.currentPeriodEnd)}
                  {days && <span className="ag-subtle"> · {days.text}</span>}
                </dd>
                <dt>Último pago</dt>
                <dd className="ag-num">
                  {membership.lastPaymentDate
                    ? `${fmtDate(membership.lastPaymentDate)} · ${formatCurrency(membership.lastPaymentAmount || 0, membership.planId?.currency || "USD")}`
                    : "Sin pagos"}
                </dd>
              </dl>
              {onEditMembership && (
                <Button variant="default" onClick={onEditMembership} style={{ alignSelf: "flex-start" }}>
                  Editar membresía
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="ag-muted" style={{ fontSize: 14 }}>Esta organización no tiene una membresía asignada.</div>
              <Button variant="default" leftSection={<IconPlus size={16} />} onClick={() => setAssignOpen(true)} style={{ alignSelf: "flex-start" }}>
                Asignar membresía
              </Button>
            </>
          )}
        </Card>
      )}

      <Card title="Dominios" description="Las direcciones con las que se abre la web de este negocio.">
        {domains.length === 0 ? (
          <div className="ag-subtle">Sin dominios propios. Usa su subdominio de AgenditApp.</div>
        ) : (
          <div className="ag-stack" style={{ gap: 6 }}>
            {domains.map((domain, index) => (
              <div key={domain} className="ag-row" style={{ justifyContent: "space-between", gap: 8, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "var(--radius-md)" }}>
                <span className="ag-num" style={{ fontSize: 14 }}>{domain}</span>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Quitar ${domain}`}
                  onClick={() => form.setFieldValue("domains", domains.filter((_, i) => i !== index))}
                >
                  <IconX size={16} />
                </ActionIcon>
              </div>
            ))}
          </div>
        )}
        <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <TextInput
            placeholder="midominio.com"
            aria-label="Nuevo dominio"
            value={newDomain}
            onChange={(e) => setNewDomain(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button variant="default" leftSection={<IconPlus size={16} />} onClick={addDomain} disabled={!newDomain.trim()}>
            Agregar
          </Button>
        </div>
      </Card>

      <Card title="Contraseña y WhatsApp">
        <PasswordInput
          label={isCreateMode ? "Contraseña" : "Nueva contraseña"}
          placeholder={isCreateMode ? "Mínimo 6 caracteres" : "Déjala vacía para no cambiarla"}
          required={isCreateMode}
          autoComplete="new-password"
          {...form.getInputProps("password")}
        />
        <TextInput label="Client ID de WhatsApp" placeholder="Opcional" {...form.getInputProps("clientIdWhatsapp")} />
      </Card>

      <Modal opened={assignOpen} onClose={() => !assigning && setAssignOpen(false)} title={<b>Asignar membresía</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <Select
            label="Plan"
            placeholder="Elige el plan"
            data={plans.map((p) => ({ value: p._id, label: `${p.displayName} · $${p.price} ${p.currency}` }))}
            value={planId}
            onChange={setPlanId}
            required
          />
          <NumberInput
            label="Días de prueba"
            description="Déjalo en 0 para activarla de una vez."
            value={trialDays}
            onChange={(v) => setTrialDays(Number(v) || 0)}
            min={0}
            max={90}
          />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setAssignOpen(false)} disabled={assigning}>
              Cancelar
            </Button>
            <Button color="var(--platform)" onClick={assign} loading={assigning} disabled={!planId}>
              Asignar membresía
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
