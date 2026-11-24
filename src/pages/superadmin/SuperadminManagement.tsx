// Membresías de todos los negocios (rediseño, SuperadminMembresias; ruta
// /superadmin): chips de estado con conteo (incluye «Vencen en 7 días o
// menos», calculado en el navegador), tabla densa con una acción principal
// por fila y «⋯», organizaciones sin membresía aparte y edición en panel.
import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Button, Menu, Modal, NumberInput, Select, Skeleton, TextInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import {
  IconAlertTriangle,
  IconBan,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconDots,
  IconEdit,
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import {
  getAllMemberships,
  getAllPlans,
  renewMembership,
  suspendMembership,
  reactivateMembership,
  activatePlanSuperadmin,
  createMembership,
  Membership,
  Plan,
} from "../../services/membershipService";
import { getOrganizations, Organization } from "../../services/organizationService";
import { formatCurrency } from "../../utils/formatCurrency";
import { EditMembershipModal } from "./EditMembershipModal";
import { MEMBERSHIP_META, badgeClass, type Tone } from "./organizationsModel";
import {
  MEMBERSHIP_FILTERS,
  PRIMARY_LABEL,
  daysCell,
  daysLeft,
  filterCounts,
  fmtDate,
  matchesFilter,
  primaryAction,
  type MembershipFilter,
} from "./membershipsModel";

const TONE_ICON: Record<Tone, typeof IconCircleCheck> = {
  success: IconCircleCheck,
  info: IconClock,
  warning: IconAlertTriangle,
  danger: IconCircleX,
  neutral: IconMinus,
};

type OrgRef = { _id?: string; name?: string; email?: string } | null;
const orgOf = (m: Membership | null) => (m?.organizationId as unknown as OrgRef) ?? null;
const orgIdOf = (m: Membership) => (typeof m.organizationId === "string" ? m.organizationId : orgOf(m)?._id);
const errMsg = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function SuperadminManagement() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orgsWithout, setOrgsWithout] = useState<Organization[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [filter, setFilter] = useState<MembershipFilter>("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Membership | null>(null);
  const [dialog, setDialog] = useState<null | "renew" | "reactivate" | "activate" | "suspend" | "edit">(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [newPeriodEnd, setNewPeriodEnd] = useState<string>("");
  const [activatePlanId, setActivatePlanId] = useState("");

  const [createOrg, setCreateOrg] = useState<Organization | null>(null);
  const [createPlanId, setCreatePlanId] = useState("");
  const [createTrialDays, setCreateTrialDays] = useState(0);

  const fetchData = async () => {
    setStatus("loading");
    try {
      const [membershipsData, plansData, orgsData] = await Promise.all([getAllMemberships(), getAllPlans(), getOrganizations()]);
      setMemberships(membershipsData);
      setPlans(plansData);
      const withMembership = new Set(membershipsData.map(orgIdOf));
      setOrgsWithout((orgsData || []).filter((o) => !withMembership.has(o._id)));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const paidPlans = plans.filter((p) => p.slug !== "plan-demo" && p.price > 0);
  const counts = useMemo(() => filterCounts(memberships), [memberships]);
  const q = search.trim().toLowerCase();
  const shown = memberships.filter(
    (m) => matchesFilter(m, filter) && (!q || (orgOf(m)?.name ?? "").toLowerCase().includes(q) || (m.planId?.displayName ?? "").toLowerCase().includes(q))
  );
  const shownWithout = orgsWithout.filter((o) => !q || o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q));

  const open = (m: Membership, d: NonNullable<typeof dialog>) => {
    setSelected(m);
    setDialog(d);
    if (d === "renew") setAmount(m.planId?.price || 0);
    if (d === "reactivate") setNewPeriodEnd("");
    if (d === "activate") {
      setActivatePlanId("");
      setAmount(0);
    }
  };
  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setSelected(null);
  };

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true);
    try {
      await fn();
      notifications.show({ message: ok });
      setDialog(null);
      setSelected(null);
      fetchData();
    } catch (e) {
      notifications.show({ message: errMsg(e, fail), color: "red" });
    } finally {
      setBusy(false);
    }
  };

  const handleRenew = () => {
    if (!selected || !(amount > 0)) {
      notifications.show({ message: "Escribe un monto mayor a 0.", color: "red" });
      return;
    }
    run(() => renewMembership(selected._id, amount), "Membresía renovada.", "No se pudo renovar la membresía.");
  };
  const handleReactivate = () =>
    selected && run(() => reactivateMembership(selected._id, newPeriodEnd || undefined), "Membresía reactivada.", "No se pudo reactivar la membresía.");
  const handleSuspend = () =>
    selected && run(() => suspendMembership(selected._id, "Suspendida manualmente por administrador"), "Membresía suspendida.", "No se pudo suspender la membresía.");
  const handleActivate = () =>
    selected && activatePlanId && run(() => activatePlanSuperadmin(selected._id, activatePlanId, amount), "Plan activado.", "No se pudo activar el plan.");

  const handleCreate = async () => {
    if (!createOrg?._id || !createPlanId) return;
    setBusy(true);
    try {
      await createMembership({ organizationId: createOrg._id, planId: createPlanId, trialDays: createTrialDays > 0 ? createTrialDays : undefined });
      notifications.show({ message: `Membresía asignada a ${createOrg.name}.` });
      setCreateOrg(null);
      fetchData();
    } catch (e) {
      notifications.show({ message: errMsg(e, "No se pudo asignar la membresía."), color: "red" });
    } finally {
      setBusy(false);
    }
  };

  const planOption = (p: Plan) => ({ value: p._id, label: `${p.displayName} · $${p.price.toLocaleString()} ${p.currency ?? ""}`.trim() });

  const dialogHead = (
    <div className="ag-card" style={{ padding: "10px 12px", background: "var(--surface-muted)", fontSize: 14 }}>
      <b>{orgOf(selected)?.name ?? "—"}</b>
      <div className="ag-subtle">Plan actual: {selected?.planId?.displayName ?? "—"}</div>
    </div>
  );

  const actions = (onCancel: () => void, label: string, onOk: () => void, disabled = false, color = "var(--platform)") => (
    <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
      <Button variant="default" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
      <Button color={color} onClick={onOk} loading={busy} disabled={disabled}>
        {label}
      </Button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Membresías</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              El plan, el estado y el vencimiento de cada negocio.
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            <TextInput
              placeholder="Buscar por organización o plan"
              aria-label="Buscar por organización o plan"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 280 }}
            />
            <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={fetchData} loading={status === "loading"}>
              Actualizar
            </Button>
          </div>
        </div>

        <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Filtrar por estado">
          {MEMBERSHIP_FILTERS.map((f) => (
            <button key={f.value} type="button" className="ag-chip" style={{ cursor: "pointer" }} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label} <span className="count">{status === "ok" ? counts[f.value] : "–"}</span>
            </button>
          ))}
        </div>

        {status === "error" ? (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar las membresías.</div>
            <Button size="xs" variant="default" onClick={fetchData}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="ag-card" style={{ overflowX: "auto" }}>
            <table className="ag-table" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Días</th>
                  <th>Último pago</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {status === "loading" ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <Skeleton height={18} />
                      </td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                      {q ? "Ninguna membresía coincide con la búsqueda." : "No hay membresías en este filtro."}
                    </td>
                  </tr>
                ) : (
                  shown.map((m) => {
                    const org = orgOf(m);
                    const meta = MEMBERSHIP_META[m.status] ?? { label: m.status, tone: "neutral" as Tone };
                    const Icon = TONE_ICON[meta.tone];
                    const days = daysCell(daysLeft(m.currentPeriodEnd));
                    const action = primaryAction(m.status);
                    const currency = m.planId?.currency || "USD";
                    return (
                      <tr key={m._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{org?.name || m._id}</div>
                          {org?.email && <div className="ag-subtle">{org.email}</div>}
                        </td>
                        <td>{m.planId?.displayName ?? "—"}</td>
                        <td>
                          <span className={badgeClass(meta.tone)} style={{ gap: 4 }}>
                            <Icon size={13} stroke={2} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="ag-num">{fmtDate(m.currentPeriodEnd)}</td>
                        <td className="ag-num" style={{ whiteSpace: "nowrap" }}>
                          {days.tone === "neutral" ? <span className="ag-muted">{days.text}</span> : <span className={`ag-badge ag-badge--${days.tone}`}>{days.text}</span>}
                        </td>
                        <td>
                          {m.lastPaymentDate ? (
                            <>
                              <div className="ag-num">{fmtDate(m.lastPaymentDate)}</div>
                              <div className="ag-subtle ag-num">{formatCurrency(m.lastPaymentAmount || 0, currency)}</div>
                            </>
                          ) : (
                            <span className="ag-muted">Sin pagos</span>
                          )}
                        </td>
                        <td>
                          <div className="ag-row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                            <Button size="xs" variant="default" onClick={() => open(m, action)}>
                              {PRIMARY_LABEL[action]}
                            </Button>
                            <Menu position="bottom-end" withinPortal width={200}>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" aria-label={`Más acciones para ${org?.name ?? "la membresía"}`}>
                                  <IconDots size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => open(m, "edit")}>
                                  Editar
                                </Menu.Item>
                                {action !== "renew" && (
                                  <Menu.Item leftSection={<IconRefresh size={16} />} onClick={() => open(m, "renew")}>
                                    Renovar
                                  </Menu.Item>
                                )}
                                {m.status !== "suspended" && (
                                  <Menu.Item color="red" leftSection={<IconBan size={16} />} onClick={() => open(m, "suspend")}>
                                    Suspender
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {status === "ok" && filter === "all" && shownWithout.length > 0 && (
          <div className="ag-card" style={{ overflowX: "auto" }}>
            <div style={{ padding: "14px 16px 4px" }}>
              <h2 className="ag-h" style={{ margin: 0 }}>
                Organizaciones sin membresía <span className="ag-muted ag-num" style={{ fontWeight: 400 }}>· {orgsWithout.length}</span>
              </h2>
            </div>
            <table className="ag-table">
              <tbody>
                {shownWithout.map((o) => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td className="ag-muted">{o.email}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        size="xs"
                        variant="default"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => {
                          setCreateOrg(o);
                          setCreatePlanId("");
                          setCreateTrialDays(0);
                        }}
                      >
                        Asignar membresía
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renovar */}
      <Modal opened={dialog === "renew"} onClose={closeDialog} title={<b>Renovar membresía</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          {dialogHead}
          <NumberInput
            label="Monto del pago"
            value={amount}
            onChange={(v) => setAmount(Number(v) || 0)}
            prefix="$"
            thousandSeparator=","
            min={1}
            required
          />
          {actions(closeDialog, "Renovar", handleRenew, !(amount > 0))}
        </div>
      </Modal>

      {/* Reactivar */}
      <Modal opened={dialog === "reactivate"} onClose={closeDialog} title={<b>Reactivar membresía</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          {dialogHead}
          <DateInput
            label="Nuevo vencimiento (opcional)"
            description="Si lo dejas vacío, queda un mes desde hoy."
            placeholder="DD/MM/AAAA"
            value={newPeriodEnd ? dayjs(newPeriodEnd, "YYYY-MM-DD").toDate() : null}
            onChange={(d) => setNewPeriodEnd(d ? dayjs(d).format("YYYY-MM-DD") : "")}
            valueFormat="DD/MM/YYYY"
            clearable
          />
          {actions(closeDialog, "Reactivar", handleReactivate)}
        </div>
      </Modal>

      {/* Activar plan pago */}
      <Modal opened={dialog === "activate"} onClose={closeDialog} title={<b>Activar plan pago</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          {dialogHead}
          <Select
            label="Plan de pago"
            placeholder="Elige el plan"
            value={activatePlanId}
            onChange={(v) => {
              setActivatePlanId(v || "");
              const p = paidPlans.find((x) => x._id === v);
              if (p) setAmount(p.price);
            }}
            data={paidPlans.map(planOption)}
            required
          />
          <NumberInput label="Monto recibido" value={amount} onChange={(v) => setAmount(Number(v) || 0)} prefix="$" thousandSeparator="," min={0} />
          <div className="ag-subtle">Queda Activa con este plan y el periodo dura un mes desde hoy.</div>
          {actions(closeDialog, "Activar plan", handleActivate, !activatePlanId)}
        </div>
      </Modal>

      {/* Suspender */}
      <Modal opened={dialog === "suspend"} onClose={closeDialog} title={<b>Suspender membresía</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          {dialogHead}
          <div className="ag-alert ag-alert--warning">
            <IconAlertTriangle size={20} />
            <div style={{ fontSize: 14 }}>El negocio pierde el acceso completo hasta que la reactives.</div>
          </div>
          {actions(closeDialog, "Suspender", handleSuspend, false, "red")}
        </div>
      </Modal>

      {/* Asignar membresía */}
      <Modal opened={!!createOrg} onClose={() => !busy && setCreateOrg(null)} title={<b>Asignar membresía a {createOrg?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <Select label="Plan" placeholder="Elige el plan" value={createPlanId} onChange={(v) => setCreatePlanId(v || "")} data={plans.map(planOption)} required />
          <NumberInput
            label="Días de prueba"
            description="Déjalo en 0 para activarla de una vez."
            value={createTrialDays}
            onChange={(v) => setCreateTrialDays(Number(v) || 0)}
            min={0}
            max={90}
          />
          {actions(() => setCreateOrg(null), "Asignar membresía", handleCreate, !createPlanId)}
        </div>
      </Modal>

      {/* Editar (panel lateral) */}
      <EditMembershipModal opened={dialog === "edit"} onClose={closeDialog} membership={selected} plans={plans} onSuccess={fetchData} />
    </div>
  );
}
