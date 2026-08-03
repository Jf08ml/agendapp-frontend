// src/pages/superadmin/SuperadminOrganizations.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  TextInput,
  Modal,
  Group,
  Loader,
  Text,
  PasswordInput,
  Notification,
  Checkbox,
  NumberInput,
  FileInput,
  Stack,
  Textarea,
  Badge,
  Tooltip,
  ActionIcon,
  SegmentedControl,
  Paper,
  UnstyledButton,
} from "@mantine/core";
import { BiEdit, BiKey, BiUserCheck, BiTrash, BiLink } from "react-icons/bi";
import { notifications } from "@mantine/notifications";
import SuperadminNav from "./SuperadminNav";
import {
  getOrganizations,
  Organization,
  updateOrganization,
  createOrganization,
} from "../../services/organizationService";
import { getAllMemberships, Membership } from "../../services/membershipService";
import {
  getOrganizationsActivityOverview,
  OrganizationActivityItem,
} from "../../services/platformAnalyticsService";
import { uploadImage } from "../../services/imageService";
import { TimeInput } from "@mantine/dates";
import { apiGeneral } from "../../services/axiosConfig";
import { MAIN_DOMAIN } from "../../utils/domainUtils";

// Enlace público de la organización: prioriza su primer dominio propio;
// si no tiene, cae al subdominio {slug}.agenditapp.com.
const getOrgUrl = (org: Organization): string | null => {
  if (Array.isArray(org.domains) && org.domains.length > 0 && org.domains[0]) {
    const domain = org.domains[0].replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}`;
  }
  if (org.slug) {
    return `https://${org.slug}.${MAIN_DOMAIN}`;
  }
  return null;
};

type ActivityStatus = "unconfigured" | "no_appointments" | "active" | "inactive";

const INACTIVITY_THRESHOLD_DAYS = 30;

const ACTIVITY_CONFIG: Record<ActivityStatus, { color: string; label: string }> = {
  unconfigured:   { color: "gray",   label: "Sin configurar" },
  no_appointments:{ color: "blue",   label: "Configurada, sin citas" },
  active:         { color: "green",  label: "Activa" },
  inactive:       { color: "orange", label: "Inactiva" },
};

const ACTIVITY_FILTER_OPTIONS: { value: "all" | ActivityStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Inactivas" },
  { value: "no_appointments", label: "Sin citas" },
  { value: "unconfigured", label: "Sin configurar" },
];

// Diferencia en días completos entre ahora y una fecha ISO (o null si no hay fecha)
const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const getActivityStatus = (
  org: Organization,
  activity: OrganizationActivityItem | undefined
): ActivityStatus => {
  if (!org.setupCompleted) return "unconfigured";
  if (!activity || activity.totalAppointments === 0) return "no_appointments";
  const days = daysSince(activity.lastAppointmentAt);
  if (days !== null && days <= INACTIVITY_THRESHOLD_DAYS) return "active";
  return "inactive";
};

type Notif = { msg: string; color: "red" | "green" | "yellow" | "blue" } | null;

const ROLE_ADMIN_ID = "67300257f3bc5c256d80e47b"; // tu RoleId admin

const emptyNewOrg = (): Partial<Organization> => ({
  name: "",
  email: "",
  phoneNumber: "",
  address: "",
  password: "",
  location: { lat: 0, lng: 0 },
  isActive: true,
  domains: [],
  branding: {},
});

// HH:mm simple validator
const isHHmm = (s?: string) => !!s && /^\d{2}:\d{2}$/.test(s);

export default function SuperadminOrganizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organization[] | null>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activity, setActivity] = useState<OrganizationActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | ActivityStatus>("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<Notif>(null);

  // Estado para impersonación
  const [impersonateOrg, setImpersonateOrg] = useState<Organization | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState("");

  const handleImpersonate = async () => {
    if (!impersonateOrg || impersonateReason.trim().length < 5) {
      setImpersonateError("La razón debe tener al menos 5 caracteres");
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
        localStorage.setItem(
          "sa_backup",
          JSON.stringify({ token: backupToken, userId: backupUserId, expiresAt: backupExpiresAt })
        );
      }

      const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isDev) {
        window.location.href = `/exchange?slug=${impersonateOrg.slug}&code=${exchangeCode}`;
      } else {
        window.location.href = `https://${subdomain}/exchange?code=${exchangeCode}`;
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setImpersonateError(e?.response?.data?.message || "Error al generar acceso");
      setImpersonating(false);
    }
  };

  // Estado para eliminar organización
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!deleteOrg) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiGeneral.delete(`/admin/organizations/${deleteOrg._id}`);
      setOrgs((prev) => prev?.filter((o) => o._id !== deleteOrg._id) ?? null);
      setDeleteOrg(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setDeleteError(e?.response?.data?.message || "Error al eliminar la organización");
    }
    setDeleting(false);
  };

  // Estado para crear organización
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrg, setNewOrg] = useState<Partial<Organization>>(emptyNewOrg());
  const [domainsInput, setDomainsInput] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createNotif, setCreateNotif] = useState<Notif>(null);

  // Horarios (strings "HH:mm")
  const [openingStart, setOpeningStart] = useState<string>("08:00");
  const [openingEnd, setOpeningEnd] = useState<string>("18:00");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [orgsData, membershipsData, activityData] = await Promise.all([
        getOrganizations(),
        getAllMemberships().catch(() => []),
        getOrganizationsActivityOverview().catch(() => []),
      ]);
      setOrgs(orgsData);
      setMemberships(membershipsData);
      setActivity(activityData);
      setLoading(false);
    })();
  }, []);

  // Map orgId → membership for quick lookup
  const membershipByOrg = new Map<string, Membership>(
    memberships
      .filter((m) => m.organizationId != null)
      .map((m) => [
        typeof m.organizationId === "string" ? m.organizationId : (m.organizationId as unknown as { _id: string })._id,
        m,
      ])
  );

  // Map orgId → actividad (última cita, totales) for quick lookup
  const activityByOrg = new Map<string, OrganizationActivityItem>(
    activity.map((a) => [a.organizationId, a])
  );

  const activityBadge = (org: Organization) => {
    const orgActivity = org._id ? activityByOrg.get(org._id) : undefined;
    const status = getActivityStatus(org, orgActivity);
    const { color, label } = ACTIVITY_CONFIG[status];
    const days = daysSince(orgActivity?.lastAppointmentAt);
    const detail =
      status === "unconfigured"
        ? null
        : days === null
        ? "Nunca ha agendado"
        : days === 0
        ? "Última cita: hoy"
        : `Última cita: hace ${days} día${days === 1 ? "" : "s"}`;
    return (
      <Stack gap={2}>
        <Badge color={color} variant="filled" size="sm">{label}</Badge>
        {detail && <Text size="xs" c="dimmed">{detail}</Text>}
      </Stack>
    );
  };

  const membershipBadge = (orgId?: string) => {
    if (!orgId) return <Badge color="gray" variant="light">Sin membresía</Badge>;
    const m = membershipByOrg.get(orgId);
    if (!m) return <Badge color="gray" variant="light">Sin membresía</Badge>;
    const cfg: Record<string, { color: string; label: string }> = {
      active:    { color: "green",  label: "Activa" },
      trial:     { color: "blue",   label: "Prueba" },
      past_due:  { color: "orange", label: "Vencida" },
      suspended: { color: "red",    label: "Suspendida" },
      cancelled: { color: "gray",   label: "Cancelada" },
      expired:   { color: "red",    label: "Expirada" },
      pending:   { color: "yellow", label: "Pendiente" },
    };
    const { color, label } = cfg[m.status] ?? { color: "gray", label: m.status };
    return (
      <Stack gap={2}>
        <Badge color={color} variant="filled" size="sm">{label}</Badge>
        {m.planId?.displayName && (
          <Text size="xs" c="dimmed">{m.planId.displayName}</Text>
        )}
      </Stack>
    );
  };

  // Conteos por estado de actividad, para la franja de resumen (sobre TODAS las orgs, sin aplicar el filtro de búsqueda)
  const activityCounts = (orgs || []).reduce(
    (acc, o) => {
      const status = getActivityStatus(o, o._id ? activityByOrg.get(o._id) : undefined);
      acc[status] += 1;
      return acc;
    },
    { unconfigured: 0, no_appointments: 0, active: 0, inactive: 0 } as Record<ActivityStatus, number>
  );

  let filteredOrgs = orgs?.filter(
    (o) =>
      (o.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.email?.toLowerCase().includes(search.toLowerCase())) &&
      (activityFilter === "all" ||
        getActivityStatus(o, o._id ? activityByOrg.get(o._id) : undefined) === activityFilter)
  );

  // Con un filtro de actividad activo, mostrar primero las orgs más "dormidas"
  // (sin actividad reciente primero) para orientar de inmediato a cuáles atender.
  if (filteredOrgs && activityFilter !== "all") {
    filteredOrgs = [...filteredOrgs].sort((a, b) => {
      const aLast = a._id ? activityByOrg.get(a._id)?.lastAppointmentAt : null;
      const bLast = b._id ? activityByOrg.get(b._id)?.lastAppointmentAt : null;
      if (!aLast && !bLast) return 0;
      if (!aLast) return -1;
      if (!bLast) return 1;
      return new Date(aLast).getTime() - new Date(bLast).getTime();
    });
  }

  const handleCopyLink = async (org: Organization) => {
    const url = getOrgUrl(org);
    if (!url) {
      notifications.show({ color: "red", message: "Esta organización no tiene dominio ni slug configurado." });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notifications.show({ color: "green", message: `Enlace copiado: ${url}` });
    } catch {
      notifications.show({ color: "red", message: "No se pudo copiar el enlace." });
    }
  };

  const handleOpenModal = (org: Organization) => {
    setSelectedOrg(org);
    setModalOpen(true);
    setPassword("");
    setNotif(null);
  };

  const handleChangePassword = async () => {
    if (!selectedOrg) return;
    if (!password || password.length < 6) {
      setNotif({ msg: "Contraseña muy corta (mínimo 6)", color: "red" });
      return;
    }
    setSaving(true);
    try {
      await updateOrganization(selectedOrg._id as string, { password });
      setNotif({ msg: "Contraseña actualizada", color: "green" });
      setTimeout(() => setModalOpen(false), 1200);
    } catch (e) {
      console.error("Error al actualizar contraseña:", e);
      setNotif({ msg: "Error al actualizar", color: "red" });
    }
    setSaving(false);
  };

  const openCreate = () => {
    setNewOrg(emptyNewOrg());
    setDomainsInput("");
    setLogoFile(null);
    setFaviconFile(null);
    setCreateNotif(null);
    setOpeningStart("08:00");
    setOpeningEnd("18:00");
    setCreateOpen(true);
  };

  const validateNewOrg = () => {
    if (!newOrg.name?.trim()) return "El nombre es obligatorio";
    if (!newOrg.email?.trim()) return "El email es obligatorio";
    if (!newOrg.phoneNumber?.trim()) return "El teléfono es obligatorio";
    if (!newOrg.password || newOrg.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (
      !newOrg.location ||
      isNaN(Number(newOrg.location.lat)) ||
      isNaN(Number(newOrg.location.lng))
    )
      return "Lat/Lng deben ser números";
    if (!isHHmm(openingStart) || !isHHmm(openingEnd))
      return "Horario inválido, usa formato HH:mm (ej: 08:00 y 18:00)";
    return null;
  };

  const handleCreate = async () => {
    const error = validateNewOrg();
    if (error) {
      setCreateNotif({ msg: error, color: "red" });
      return;
    }

    setCreating(true);
    try {
      // mapear dominios del input
      const domains =
        domainsInput
          ?.split(",")
          .map((d) => d.trim())
          .filter(Boolean) || [];

      // Subir imágenes si las hay
      let logoUrl: string | undefined;
      let faviconUrl: string | undefined;

      if (logoFile) {
        const url = await uploadImage(logoFile);
        if (url) logoUrl = url;
      }
      if (faviconFile) {
        const url = await uploadImage(faviconFile);
        if (url) faviconUrl = url;
      }

      const payload: Organization = {
        name: newOrg.name!.trim(),
        email: newOrg.email!.trim(),
        phoneNumber: newOrg.phoneNumber!.trim(),
        address: newOrg.address?.trim(),
        password: newOrg.password, // el backend debe hashearla
        role: ROLE_ADMIN_ID, 
        isActive: newOrg.isActive ?? true,
        location: {
          lat: Number(newOrg.location?.lat ?? 0),
          lng: Number(newOrg.location?.lng ?? 0),
        },
        domains: domains.length ? domains : undefined,
        branding: {
          ...(newOrg.branding || {}),
          logoUrl,
          faviconUrl,
        },
        openingHours: {
          start: openingStart,
          end: openingEnd,
        },
      };

      const created = await createOrganization(payload);
      if (!created) {
        setCreateNotif({
          msg: "No se pudo crear la organización",
          color: "red",
        });
        setCreating(false);
        return;
      }

      // Refrescar lista
      const refreshed = await getOrganizations();
      setOrgs(refreshed);

      setCreateNotif({ msg: "Organización creada", color: "green" });
      setTimeout(() => setCreateOpen(false), 1000);
    } catch (e) {
      console.error("Error al crear organización:", e);
      setCreateNotif({ msg: "Error al crear la organización", color: "red" });
    }
    setCreating(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "auto", padding: 24 }}>
      {/* Navegación superadmin (compartida) */}
      <Group mb="lg">
        <SuperadminNav />
      </Group>

      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>
          Organizaciones
        </Text>
        <Group>
          <TextInput
            placeholder="Buscar por nombre o correo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 250 }}
          />
          <Button onClick={openCreate}>Nueva organización</Button>
        </Group>
      </Group>

      {!loading && (
        <Paper withBorder p="sm" mb="md">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="lg">
              {(
                [
                  { status: "active" as ActivityStatus, label: "Activas" },
                  { status: "inactive" as ActivityStatus, label: `Inactivas (>${INACTIVITY_THRESHOLD_DAYS}d)` },
                  { status: "no_appointments" as ActivityStatus, label: "Sin citas" },
                  { status: "unconfigured" as ActivityStatus, label: "Sin configurar" },
                ] as const
              ).map(({ status, label }) => (
                <UnstyledButton
                  key={status}
                  onClick={() => setActivityFilter((prev) => (prev === status ? "all" : status))}
                >
                  <Group gap={6}>
                    <Badge color={ACTIVITY_CONFIG[status].color} variant={activityFilter === status ? "filled" : "light"} size="lg">
                      {activityCounts[status]}
                    </Badge>
                    <Text size="sm" c="dimmed">{label}</Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Group>
            <SegmentedControl
              value={activityFilter}
              onChange={(v) => setActivityFilter(v as "all" | ActivityStatus)}
              data={ACTIVITY_FILTER_OPTIONS}
              size="xs"
            />
          </Group>
        </Paper>
      )}

      {loading ? (
        <Loader mt={40} />
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Email / Teléfono</Table.Th>
              <Table.Th>Membresía</Table.Th>
              <Table.Th>Actividad</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredOrgs &&
              filteredOrgs.map((org) => (
                <Table.Tr key={org._id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>{org.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm">{org.email}</Text>
                      <Text size="xs" c="dimmed">{org.phoneNumber}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>{membershipBadge(org._id)}</Table.Td>
                  <Table.Td>{activityBadge(org)}</Table.Td>
                  <Table.Td>
                    <Badge color={org.isActive ? "green" : "red"} variant="light">
                      {org.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Tooltip label={getOrgUrl(org) ? "Copiar enlace" : "Sin dominio ni slug configurado"}>
                        <ActionIcon
                          color="grape"
                          variant="light"
                          size="sm"
                          disabled={!getOrgUrl(org)}
                          onClick={() => handleCopyLink(org)}
                        >
                          <BiLink size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Entrar como este admin">
                        <ActionIcon
                          color="teal"
                          variant="filled"
                          size="sm"
                          onClick={() => {
                            setImpersonateOrg(org);
                            setImpersonateReason("");
                            setImpersonateError("");
                          }}
                        >
                          <BiUserCheck size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar organización">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          size="sm"
                          onClick={() => navigate(`/superadmin/organizaciones/${org._id}`)}
                        >
                          <BiEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Cambiar contraseña">
                        <ActionIcon
                          color="gray"
                          variant="light"
                          size="sm"
                          onClick={() => handleOpenModal(org)}
                        >
                          <BiKey size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar organización">
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="sm"
                          onClick={() => {
                            setDeleteOrg(org);
                            setDeleteConfirmName("");
                            setDeleteError("");
                          }}
                        >
                          <BiTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Modal: Entrar como (impersonación) */}
      <Modal
        opened={!!impersonateOrg}
        onClose={() => setImpersonateOrg(null)}
        title={`Entrar como: ${impersonateOrg?.name}`}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Ingresarás como administrador de esta organización. La sesión expira en 60 minutos y quedará registrada en el log de auditoría.
          </Text>
          <Textarea
            label="Razón del acceso *"
            placeholder="Ej: Soporte técnico — cliente reportó error en agenda"
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.currentTarget.value)}
            minRows={2}
            autosize
            disabled={impersonating}
          />
          {impersonateError && (
            <Text size="sm" c="red">{impersonateError}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setImpersonateOrg(null)} disabled={impersonating}>
              Cancelar
            </Button>
            <Button color="teal" onClick={handleImpersonate} loading={impersonating}>
              Ingresar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Cambiar contraseña */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Cambiar contraseña de ${selectedOrg?.name}`}
        centered
      >
        <PasswordInput
          label="Nueva contraseña"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={saving}
          mb="md"
        />
        {notif && (
          <Notification
            color={notif.color}
            onClose={() => setNotif(null)}
            mb="md"
          >
            {notif.msg}
          </Notification>
        )}
        <Group justify="end">
          <Button
            onClick={handleChangePassword}
            loading={saving}
            disabled={!password}
          >
            Cambiar contraseña
          </Button>
        </Group>
      </Modal>

      {/* Modal: Eliminar organización */}
      <Modal
        opened={!!deleteOrg}
        onClose={() => setDeleteOrg(null)}
        title="Eliminar organización"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="red" fw={600}>
            ¡Esta acción es irreversible! Se eliminarán todos los datos asociados:
            citas, clientes, empleados, servicios, membresías, campañas y más.
          </Text>
          <Text size="sm">
            Para confirmar, escribe el nombre exacto de la organización:{" "}
            <Text component="span" fw={700}>{deleteOrg?.name}</Text>
          </Text>
          <TextInput
            placeholder={deleteOrg?.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.currentTarget.value)}
            disabled={deleting}
          />
          {deleteError && (
            <Text size="sm" c="red">{deleteError}</Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOrg(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleteConfirmName !== deleteOrg?.name}
            >
              Eliminar definitivamente
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Nueva organización */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva organización"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text fw={600}>Datos de la organización</Text>
          <TextInput
            label="Nombre *"
            value={newOrg.name || ""}
            onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))}
          />
          <TextInput
            label="Email *"
            type="email"
            value={newOrg.email || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, email: e.target.value }))
            }
          />
          <TextInput
            label="Teléfono *"
            value={newOrg.phoneNumber || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, phoneNumber: e.target.value }))
            }
          />
          <PasswordInput
            label="Contraseña inicial *"
            placeholder="Mínimo 6 caracteres"
            value={newOrg.password || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, password: e.target.value }))
            }
          />
          <TextInput
            label="Dirección"
            value={newOrg.address || ""}
            onChange={(e) =>
              setNewOrg((p) => ({ ...p, address: e.target.value }))
            }
          />
          <Group grow>
            <NumberInput
              label="Latitud"
              value={newOrg.location?.lat ?? 0}
              onChange={(v) =>
                setNewOrg((p) => ({
                  ...p,
                  location: { lat: Number(v ?? 0), lng: p.location?.lng ?? 0 },
                }))
              }
              decimalScale={8}
              allowDecimal
            />
            <NumberInput
              label="Longitud"
              value={newOrg.location?.lng ?? 0}
              onChange={(v) =>
                setNewOrg((p) => ({
                  ...p,
                  location: { lat: p.location?.lat ?? 0, lng: Number(v ?? 0) },
                }))
              }
              decimalScale={8}
              allowDecimal
            />
          </Group>

          {/* Horario requerido - ahora como strings */}
          <TimeInput
            label="Hora de apertura *"
            value={openingStart}
            onChange={(e) => setOpeningStart(e.currentTarget.value)}
          />
          <TimeInput
            label="Hora de cierre *"
            value={openingEnd}
            onChange={(e) => setOpeningEnd(e.currentTarget.value)}
          />

          <TextInput
            label="Dominios (separados por coma)"
            placeholder="ej: midominio.com, app.midominio.com"
            value={domainsInput}
            onChange={(e) => setDomainsInput(e.target.value)}
          />
          <Checkbox
            label="Activo"
            checked={newOrg.isActive ?? true}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setNewOrg((p) => ({ ...p, isActive: checked }));
            }}
          />

          <Text fw={600} mt="sm">
            Branding (opcional)
          </Text>
          <FileInput
            label="Logo"
            placeholder="Selecciona un archivo de imagen"
            value={logoFile}
            onChange={setLogoFile}
            accept="image/*"
            clearable
          />
          <FileInput
            label="Favicon"
            placeholder="Selecciona un archivo de imagen"
            value={faviconFile}
            onChange={setFaviconFile}
            accept="image/*"
            clearable
          />

          {createNotif && (
            <Notification
              color={createNotif.color}
              onClose={() => setCreateNotif(null)}
            >
              {createNotif.msg}
            </Notification>
          )}

          <Group justify="end" mt="xs">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Crear organización
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
