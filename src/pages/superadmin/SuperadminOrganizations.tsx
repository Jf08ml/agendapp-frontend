// Organizaciones del superadmin (rediseño, SuperadminOrganizaciones): un solo
// filtro de actividad en chips con conteo, tabla densa con estados en palabra,
// ícono y color, «Entrar» + menú «⋯» por fila y diálogo de impersonación con
// auditoría. «Nueva organización» abre la ficha en modo creación.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Avatar, Button, Menu, Modal, PasswordInput, Skeleton, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconDots,
  IconEdit,
  IconInfoCircle,
  IconKey,
  IconLink,
  IconMinus,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { getOrganizations, Organization, updateOrganization } from "../../services/organizationService";
import { getAllMemberships, Membership } from "../../services/membershipService";
import { getOrganizationsActivityOverview, OrganizationActivityItem } from "../../services/platformAnalyticsService";
import { apiGeneral } from "../../services/axiosConfig";
import { getOrgUrl } from "../../utils/domainUtils";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_META,
  MEMBERSHIP_META,
  activityDetail,
  activityStatus,
  badgeClass,
  type ActivityStatus,
  type Tone,
} from "./organizationsModel";

const TONE_ICON: Record<Tone, typeof IconCircleCheck> = {
  success: IconCircleCheck,
  info: IconClock,
  warning: IconAlertTriangle,
  danger: IconCircleX,
  neutral: IconMinus,
};

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={badgeClass(tone)} style={{ gap: 4 }}>
      <Icon size={13} stroke={2} />
      {label}
    </span>
  );
}

const initials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const membershipOrgId = (m: Membership) =>
  typeof m.organizationId === "string" ? m.organizationId : (m.organizationId as unknown as { _id: string } | null)?._id;

export default function SuperadminOrganizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activity, setActivity] = useState<OrganizationActivityItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ActivityStatus>("all");

  // Impersonación
  const [impersonateOrg, setImpersonateOrg] = useState<Organization | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState("");

  // Cambiar contraseña
  const [passwordOrg, setPasswordOrg] = useState<Organization | null>(null);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Eliminar
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = async () => {
    setStatus("loading");
    try {
      const [orgsData, membershipsData, activityData] = await Promise.all([
        getOrganizations(),
        getAllMemberships().catch(() => [] as Membership[]),
        getOrganizationsActivityOverview().catch(() => [] as OrganizationActivityItem[]),
      ]);
      if (!orgsData) throw new Error("sin datos");
      setOrgs(orgsData);
      setMemberships(membershipsData);
      setActivity(activityData);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const membershipByOrg = useMemo(() => {
    const map = new Map<string, Membership>();
    memberships.forEach((m) => {
      const id = membershipOrgId(m);
      if (id) map.set(id, m);
    });
    return map;
  }, [memberships]);

  const activityByOrg = useMemo(() => new Map(activity.map((a) => [a.organizationId, a])), [activity]);

  const statusOf = (org: Organization) => activityStatus(org.setupCompleted, org._id ? activityByOrg.get(org._id) : undefined);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orgs.length, active: 0, inactive: 0, no_appointments: 0, unconfigured: 0 };
    orgs.forEach((o) => (c[statusOf(o)] += 1));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, activityByOrg]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orgs.filter(
      (o) => (!q || o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q)) && (filter === "all" || statusOf(o) === filter)
    );
    // Con un filtro, primero las más «dormidas» (sin actividad reciente).
    if (filter !== "all") {
      list = [...list].sort((a, b) => {
        const al = a._id ? activityByOrg.get(a._id)?.lastAppointmentAt : null;
        const bl = b._id ? activityByOrg.get(b._id)?.lastAppointmentAt : null;
        if (!al && !bl) return 0;
        if (!al) return -1;
        if (!bl) return 1;
        return new Date(al).getTime() - new Date(bl).getTime();
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs, search, filter, activityByOrg]);

  const handleImpersonate = async () => {
    if (!impersonateOrg || impersonateReason.trim().length < 5) {
      setImpersonateError("Escribe la razón del acceso (mínimo 5 caracteres).");
      return;
    }
    setImpersonating(true);
    setImpersonateError("");
    try {
      const res = await apiGeneral.post("/admin/impersonate", {
        organizationId: impersonateOrg._id,
        reason: impersonateReason.trim(),
      });
      const { exchangeCode, subdomain } = res.data.data;

      // Guardar el token de superadmin antes de ser reemplazado por el de la org
      const backupToken = localStorage.getItem("app_token");
      const backupUserId = localStorage.getItem("app_userId");
      const backupExpiresAt = localStorage.getItem("app_token_expires_at");
      if (backupToken && backupUserId) {
        localStorage.setItem("sa_backup", JSON.stringify({ token: backupToken, userId: backupUserId, expiresAt: backupExpiresAt }));
      }

      // Pestaña nueva: el panel del superadmin sigue abierto en esta.
      const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const url = isDev ? `/exchange?slug=${impersonateOrg.slug}&code=${exchangeCode}` : `https://${subdomain}/exchange?code=${exchangeCode}`;
      window.open(url, "_blank", "noopener,noreferrer");

      notifications.show({ message: `Se abrió ${impersonateOrg.name} en una pestaña nueva.` });
      setImpersonateOrg(null);
      setImpersonateReason("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setImpersonateError(e?.response?.data?.message || "No se pudo generar el acceso. Intenta de nuevo.");
    } finally {
      setImpersonating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordOrg) return;
    if (password.length < 6) {
      setPasswordError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    setSavingPassword(true);
    setPasswordError("");
    try {
      await updateOrganization(passwordOrg._id as string, { password });
      notifications.show({ message: `Contraseña de ${passwordOrg.name} actualizada.` });
      setPasswordOrg(null);
    } catch {
      setPasswordError("No se pudo actualizar la contraseña. Intenta de nuevo.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiGeneral.delete(`/admin/organizations/${deleteOrg._id}`);
      setOrgs((prev) => prev.filter((o) => o._id !== deleteOrg._id));
      notifications.show({ message: `${deleteOrg.name} se eliminó.` });
      setDeleteOrg(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setDeleteError(e?.response?.data?.message || "No se pudo eliminar la organización.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async (org: Organization) => {
    const url = getOrgUrl(org);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      notifications.show({ message: `Enlace copiado: ${url}` });
    } catch {
      notifications.show({ message: "No se pudo copiar el enlace.", color: "red" });
    }
  };

  const webLabel = (org: Organization) => getOrgUrl(org)?.replace(/^https?:\/\//, "") ?? null;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>
              Organizaciones {status === "ok" && <span className="ag-muted ag-num" style={{ fontWeight: 400 }}>· {orgs.length}</span>}
            </h1>
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            <TextInput
              placeholder="Buscar por nombre o correo"
              aria-label="Buscar por nombre o correo"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 280 }}
            />
            <Button leftSection={<IconPlus size={16} />} color="var(--platform)" onClick={() => navigate("/superadmin/organizaciones/nueva")}>
              Nueva organización
            </Button>
          </div>
        </div>

        <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Filtrar por actividad">
          {ACTIVITY_FILTERS.map((f) => (
            <button key={f.value} type="button" className="ag-chip" style={{ cursor: "pointer" }} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label} <span className="count">{status === "ok" ? counts[f.value] : "–"}</span>
            </button>
          ))}
        </div>

        {status === "error" ? (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>No pudimos cargar las organizaciones.</div>
            <Button size="xs" variant="default" onClick={load}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="ag-card" style={{ overflowX: "auto" }}>
            <table className="ag-table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Contacto</th>
                  <th>Membresía</th>
                  <th>Actividad</th>
                  <th>Acceso</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {status === "loading" ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <Skeleton height={18} />
                      </td>
                    </tr>
                  ))
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                      {search ? "Ninguna organización coincide con la búsqueda." : "No hay organizaciones en este filtro."}
                    </td>
                  </tr>
                ) : (
                  shown.map((org) => {
                    const st = statusOf(org);
                    const act = org._id ? activityByOrg.get(org._id) : undefined;
                    const detail = activityDetail(st, act?.lastAppointmentAt);
                    const m = org._id ? membershipByOrg.get(org._id) : undefined;
                    const mm = m ? MEMBERSHIP_META[m.status] ?? { label: m.status, tone: "neutral" as Tone } : { label: "Sin membresía", tone: "neutral" as Tone };
                    const bounces =
                      !!org.ownerEmailBounce?.address && org.ownerEmailBounce.address.toLowerCase() === String(org.email ?? "").toLowerCase();
                    const web = webLabel(org);
                    return (
                      <tr key={org._id}>
                        <td>
                          <div className="ag-row" style={{ gap: 10, flexWrap: "nowrap" }}>
                            <Avatar
                              src={org.branding?.logoUrl || undefined}
                              size={32}
                              radius="xl"
                              styles={{ root: { background: "var(--surface-hover)", flex: "none" }, placeholder: { color: "var(--ink-muted)", fontSize: 12, fontWeight: 600 } }}
                            >
                              {initials(org.name)}
                            </Avatar>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{org.name}</div>
                              {web && <div className="ag-subtle">{web}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="ag-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                            <span>{org.email}</span>
                            {bounces && (
                              <span
                                className="ag-badge ag-badge--danger"
                                title={`Rebota${org.ownerEmailBounce?.status ? ` (${org.ownerEmailBounce.status})` : ""}: ${org.ownerEmailBounce?.reason || "sin detalle"}`}
                              >
                                Correo rebota
                              </span>
                            )}
                          </div>
                          <div className="ag-subtle ag-num">{org.phoneNumber}</div>
                        </td>
                        <td>
                          <StatusBadge {...mm} />
                          {m?.planId?.displayName && <div className="ag-subtle" style={{ marginTop: 2 }}>{m.planId.displayName}</div>}
                        </td>
                        <td>
                          <StatusBadge {...ACTIVITY_META[st]} />
                          {detail && <div className="ag-subtle" style={{ marginTop: 2 }}>{detail}</div>}
                        </td>
                        <td>{org.isActive ? <span className="ag-muted">Activo</span> : <span className="ag-badge ag-badge--danger">Inactivo</span>}</td>
                        <td>
                          <div className="ag-row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                            <Button
                              size="xs"
                              variant="default"
                              onClick={() => {
                                setImpersonateOrg(org);
                                setImpersonateReason("");
                                setImpersonateError("");
                              }}
                            >
                              Entrar
                            </Button>
                            <Menu position="bottom-end" withinPortal width={220}>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" aria-label={`Más acciones para ${org.name}`}>
                                  <IconDots size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconLink size={16} />} disabled={!web} onClick={() => handleCopyLink(org)}>
                                  {web ? "Copiar enlace" : "Sin dirección web"}
                                </Menu.Item>
                                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => navigate(`/superadmin/organizaciones/${org._id}`)}>
                                  Editar organización
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconKey size={16} />}
                                  onClick={() => {
                                    setPasswordOrg(org);
                                    setPassword("");
                                    setPasswordError("");
                                  }}
                                >
                                  Cambiar contraseña
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={16} />}
                                  onClick={() => {
                                    setDeleteOrg(org);
                                    setDeleteConfirmName("");
                                    setDeleteError("");
                                  }}
                                >
                                  Eliminar organización
                                </Menu.Item>
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
      </div>

      {/* Entrar como administrador (impersonación) */}
      <Modal opened={!!impersonateOrg} onClose={() => !impersonating && setImpersonateOrg(null)} title={<b>Entrar como administrador de {impersonateOrg?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-alert ag-alert--info">
            <IconShieldCheck size={20} />
            <div style={{ fontSize: 14 }}>Se abre en una pestaña nueva y dura 60 minutos. El acceso y su razón quedan en el registro de auditoría.</div>
          </div>
          <Textarea
            label="Razón del acceso"
            required
            placeholder="Ej.: soporte, el negocio reportó un error en la agenda"
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.currentTarget.value)}
            minRows={2}
            autosize
            disabled={impersonating}
            error={impersonateError || undefined}
          />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setImpersonateOrg(null)} disabled={impersonating}>
              Cancelar
            </Button>
            <Button color="var(--platform)" onClick={handleImpersonate} loading={impersonating}>
              Entrar como admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cambiar contraseña */}
      <Modal opened={!!passwordOrg} onClose={() => !savingPassword && setPasswordOrg(null)} title={<b>Cambiar contraseña de {passwordOrg?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <PasswordInput
            label="Contraseña nueva"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={savingPassword}
            error={passwordError || undefined}
            autoComplete="new-password"
          />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setPasswordOrg(null)} disabled={savingPassword}>
              Cancelar
            </Button>
            <Button color="var(--platform)" onClick={handleChangePassword} loading={savingPassword} disabled={!password}>
              Cambiar contraseña
            </Button>
          </div>
        </div>
      </Modal>

      {/* Eliminar organización */}
      <Modal opened={!!deleteOrg} onClose={() => !deleting && setDeleteOrg(null)} title={<b>Eliminar {deleteOrg?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-alert ag-alert--danger">
            <IconAlertTriangle size={20} />
            <div style={{ fontSize: 14 }}>
              No se puede deshacer. Se borran todos sus datos: citas, clientes, empleados, servicios, membresías, campañas y más.
            </div>
          </div>
          <TextInput
            label={
              <span>
                Para confirmar, escribe <b>{deleteOrg?.name}</b>
              </span>
            }
            placeholder={deleteOrg?.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.currentTarget.value)}
            disabled={deleting}
            error={deleteError || undefined}
          />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setDeleteOrg(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting} disabled={deleteConfirmName !== deleteOrg?.name}>
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
