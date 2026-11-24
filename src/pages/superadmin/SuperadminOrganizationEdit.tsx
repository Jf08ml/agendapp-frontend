/* eslint-disable @typescript-eslint/no-explicit-any */
// Ficha de una organización del superadmin (rediseño, SuperadminOrganizacionDetalle):
// «← Organizaciones», encabezado con estado de membresía y actividad, «Entrar
// como admin», «⋯» y «Guardar cambios». Edición directa (sin modo «Editar»),
// pestañas en una línea y Administración en tarjetas. El modo creación
// (/superadmin/organizaciones/nueva) usa la misma pantalla.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Avatar, Button, Menu, Modal, Skeleton, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "../../utils/zodResolver";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IconAlertTriangle, IconArrowLeft, IconDots, IconLink, IconTrash } from "@tabler/icons-react";
import { apiGeneral } from "../../services/axiosConfig";
import { getAllMemberships, getAllPlans, type Membership, type Plan } from "../../services/membershipService";
import { getOrganizationsActivityOverview, type OrganizationActivityItem } from "../../services/platformAnalyticsService";
import { getOrgUrl } from "../../utils/domainUtils";
import ImpersonateDialog from "./components/ImpersonateDialog";
import { EditMembershipModal } from "./EditMembershipModal";
import { ACTIVITY_META, MEMBERSHIP_META, activityStatus, badgeClass } from "./organizationsModel";

import {
  getOrganizationById,
  updateOrganization,
  createOrganization,
  Organization,
} from "../../services/organizationService";
import { uploadImage } from "../../services/imageService";

// Reuse existing tab components
import ContactTab from "../admin/OrganizationInfo/components/tabs/ContactTab";
import OpeningHoursTab from "../admin/OrganizationInfo/components/tabs/OpeningHoursTab";
import SocialMediaTab from "../admin/OrganizationInfo/components/tabs/SocialMediaTab";
import LocationTab from "../admin/OrganizationInfo/components/tabs/LocationTab";
import FidelityTab from "../admin/OrganizationInfo/components/tabs/FidelityTab";
import BrandingTab from "../admin/OrganizationInfo/components/tabs/BrandingTab";
import PaymentMethodsTab from "../admin/OrganizationInfo/components/tabs/PaymentMethodsTab";
import CancellationPolicyTab from "../admin/OrganizationInfo/components/tabs/CancellationPolicyTab";
import ReminderSettingsTab from "../admin/OrganizationInfo/components/tabs/ReminderSettingsTab";
import OnlineBookingTab from "../admin/OrganizationInfo/components/tabs/OnlineBookingTab";
import StickyActionBar from "../admin/OrganizationInfo/components/StickyActionBar";
import { ensureBranding } from "../admin/OrganizationInfo/utils";

// Superadmin-exclusive
import AdminTab from "./components/AdminTab";
import { superadminSchema, SuperadminFormValues } from "./schema";

const DEFAULT_VALUES: SuperadminFormValues = {
  name: "",
  email: "",
  phoneNumber: "",
  password: "",
  default_country: "CO",
  timezone: "America/Bogota",
  currency: "COP",
  address: "",
  location: { lat: 0, lng: 0 },
  domains: [],
  isActive: true,
  hasAccessBlocked: true,
  membershipStatus: "none",
  clientIdWhatsapp: "",
  facebookUrl: "",
  instagramUrl: "",
  whatsappUrl: "",
  tiktokUrl: "",
  showLoyaltyProgram: true,
  enableOnlineBooking: true,
  blockHolidaysForReservations: false,
  allowedHolidayDates: [],
  welcomeTitle: "¡Hola! Bienvenido",
  welcomeDescription:
    "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás!",
  homeLayout: "modern",
  openingHours: {
    start: "08:00",
    end: "18:00",
    businessDays: [1, 2, 3, 4, 5],
    breaks: [],
  },
  weeklySchedule: {
    enabled: false,
    schedule: [],
    stepMinutes: 30,
  },
  branding: {},
  paymentMethods: [],
  requireReservationDeposit: false,
  reservationDepositPercentage: 50,
  reminderSettings: {
    enabled: true,
    hoursBefore: 24,
    sendTimeStart: "07:00",
    sendTimeEnd: "20:00",
    secondReminder: { enabled: false, hoursBefore: 2 },
  },
  cancellationPolicy: {
    minHoursBeforeAppointment: 0,
    preventCancellingConfirmed: false,
  },
  referredCount: 0,
  referredReward: "",
  serviceCount: 0,
  serviceReward: "",
  serviceTiers: [],
  referralTiers: [],
};

export default function SuperadminOrganizationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreateMode = id === "nueva";

  const [loading, setLoading] = useState(!isCreateMode);
  const [tab, setTab] = useState("admin");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activity, setActivity] = useState<OrganizationActivityItem | null>(null);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [editMembershipOpen, setEditMembershipOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [org, setOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  // Upload loaders
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);

  const isBlockingRef = useRef(false);
  // Últimos valores guardados: «Descartar» vuelve a ellos.
  const savedRef = useRef<SuperadminFormValues | null>(null);

  const form = useForm<SuperadminFormValues>({
    validate: zodResolver(superadminSchema),
    initialValues: isCreateMode ? { ...DEFAULT_VALUES } : ({} as any),
    validateInputOnChange: true,
  });

  useEffect(() => {
    if (isCreateMode) return;
    if (!id) return;

    const fetchOrg = async () => {
      try {
        const response = await getOrganizationById(id);
        if (!response) throw new Error("Organización no encontrada");

        const ensureArray = <T,>(arr: T[] | undefined, fallback: T[] = []) =>
          Array.isArray(arr) ? [...arr] : [...fallback];
        const ensureBreaks = (arr: any[] | undefined) =>
          Array.isArray(arr) ? arr.map((b: any) => ({ ...b })) : [];

        const normalized = {
          ...response,
          branding: ensureBranding(response.branding),
          domains: ensureArray(response.domains, []),
          default_country: response.default_country ?? "CO",
          timezone: response.timezone || undefined,
          showLoyaltyProgram: response.showLoyaltyProgram ?? true,
          enableOnlineBooking: response.enableOnlineBooking ?? true,
          blockHolidaysForReservations:
            response.blockHolidaysForReservations ?? false,
          allowedHolidayDates: Array.isArray(response.allowedHolidayDates)
            ? [...response.allowedHolidayDates]
            : [],
          welcomeTitle: response.welcomeTitle ?? "¡Hola! Bienvenido",
          welcomeDescription:
            response.welcomeDescription ??
            "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás!",
          homeLayout: response.homeLayout ?? "modern",
          paymentMethods: ensureArray(response.paymentMethods, []),
          requireReservationDeposit:
            response.requireReservationDeposit ?? false,
          reservationDepositPercentage:
            response.reservationDepositPercentage ?? 50,
          reminderSettings: {
            enabled: response.reminderSettings?.enabled ?? true,
            hoursBefore: response.reminderSettings?.hoursBefore ?? 24,
            sendTimeStart:
              response.reminderSettings?.sendTimeStart ?? "07:00",
            sendTimeEnd: response.reminderSettings?.sendTimeEnd ?? "20:00",
            secondReminder: {
              enabled:
                response.reminderSettings?.secondReminder?.enabled ?? false,
              hoursBefore:
                response.reminderSettings?.secondReminder?.hoursBefore ?? 2,
            },
          },
          openingHours: {
            start: response.openingHours?.start ?? "",
            end: response.openingHours?.end ?? "",
            businessDays: ensureArray(
              response.openingHours?.businessDays,
              [1, 2, 3, 4, 5]
            ),
            breaks: ensureBreaks(response.openingHours?.breaks),
          },
          weeklySchedule: response.weeklySchedule ?? {
            enabled: false,
            schedule: [],
            stepMinutes: 30,
          },
          currency: response.currency ?? "COP",
          cancellationPolicy: {
            minHoursBeforeAppointment:
              response.cancellationPolicy?.minHoursBeforeAppointment ?? 0,
            preventCancellingConfirmed:
              response.cancellationPolicy?.preventCancellingConfirmed ?? false,
          },
          // Superadmin fields
          password: "",
          isActive: response.isActive ?? true,
          hasAccessBlocked: response.hasAccessBlocked ?? true,
          membershipStatus: response.membershipStatus ?? "none",
          clientIdWhatsapp: response.clientIdWhatsapp ?? "",
        };

        setOrg(response);
        form.setValues(
          structuredClone
            ? structuredClone(normalized as any)
            : JSON.parse(JSON.stringify(normalized))
        );
        savedRef.current = JSON.parse(JSON.stringify(normalized));
        form.resetDirty();
      } catch (e) {
        console.error(e);
        notifications.show({
          title: "Error",
          message: "No se pudo cargar la organización",
          color: "red",
        });
        navigate("/superadmin/orgs");
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreateMode]);

  // Membresía (tarjeta de Administración) y actividad (encabezado)
  const loadMembership = useCallback(async () => {
    if (isCreateMode || !id) return;
    try {
      const [all, allPlans] = await Promise.all([getAllMemberships(), getAllPlans()]);
      setPlans(allPlans);
      setMembership(
        all.find((m: Membership) => (typeof m.organizationId === "string" ? m.organizationId : (m.organizationId as unknown as { _id?: string } | null)?._id) === id) ?? null
      );
    } catch {
      /* la tarjeta queda sin datos */
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    loadMembership();
    if (isCreateMode || !id) return;
    getOrganizationsActivityOverview()
      .then((list) => setActivity(list.find((a) => a.organizationId === id) ?? null))
      .catch(() => {});
  }, [id, isCreateMode, loadMembership]);

  // Aviso al salir con cambios sin guardar
  isBlockingRef.current = form.isDirty();

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const onUpload = async (
    file: File | null,
    key: "logoUrl" | "faviconUrl" | "pwaIcon"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifications.show({
        title: "Archivo inválido",
        message: "Debe ser una imagen",
        color: "red",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notifications.show({
        title: "Archivo muy grande",
        message: "Máximo 2MB",
        color: "red",
      });
      return;
    }

    if (key === "logoUrl") setUploadingLogo(true);
    if (key === "faviconUrl") setUploadingFavicon(true);
    if (key === "pwaIcon") setUploadingPwaIcon(true);

    try {
      const url = await uploadImage(file);
      form.setFieldValue("branding", {
        ...form.values.branding,
        [key]: url,
        ...(key === "logoUrl" && {
          faviconUrl: form.values.branding?.faviconUrl ?? url,
          pwaIcon: form.values.branding?.pwaIcon ?? url,
        }),
      } as any);
      notifications.show({
        title: "Imagen actualizada",
        message: "Se subió correctamente",
        color: "green",
      });
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error",
        message: "No se pudo subir la imagen",
        color: "red",
      });
    } finally {
      if (key === "logoUrl") setUploadingLogo(false);
      if (key === "faviconUrl") setUploadingFavicon(false);
      if (key === "pwaIcon") setUploadingPwaIcon(false);
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      navigate("/superadmin/orgs");
      return;
    }
    if (savedRef.current) form.setValues(JSON.parse(JSON.stringify(savedRef.current)));
    form.resetDirty();
  };

  const handleSave = async () => {
    const validationResult = superadminSchema.safeParse(form.values);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error("Errores de validación:", errors);
      notifications.show({
        title: "Revisa los campos",
        message:
          (Object.values(errors.fieldErrors).flat()[0] as string) ||
          "Hay errores de validación",
        color: "red",
      });
      return;
    }

    if (isCreateMode && !form.values.password) {
      notifications.show({
        title: "Error",
        message: "La contraseña es requerida para nuevas organizaciones",
        color: "red",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = { ...validationResult.data } as any;

      // Remove password if empty (edit mode)
      if (!payload.password) {
        delete payload.password;
      }

      if (isCreateMode) {
        const created = await createOrganization(payload as Organization);
        if (!created) throw new Error("Error al crear");
        notifications.show({
          title: "Organización creada",
          message: `${created.name} creada correctamente`,
          color: "green",
        });
        navigate("/superadmin/orgs");
      } else {
        if (!id) return;
        // Remove _id from payload
        delete payload._id;
        const updated = await updateOrganization(id, payload);
        if (!updated) throw new Error("Actualización vacía");

        setOrg(updated);
        const normalized = {
          ...updated,
          branding: ensureBranding(updated.branding),
          domains: Array.isArray(updated.domains) ? updated.domains : [],
          password: "",
        };
        form.setValues(normalized as any);
        savedRef.current = JSON.parse(JSON.stringify(normalized));
        form.resetDirty();

        notifications.show({
          title: "Guardado",
          message: "Organización actualizada correctamente",
          color: "green",
        });
      }
    } catch (e) {
      console.error(e);
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      notifications.show({
        title: "Error",
        message:
          err.response?.data?.message || err.message || "No se pudo guardar la organización",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px" }}>
        <Skeleton height={14} width={120} mb={16} />
        <Skeleton height={48} width="50%" mb={20} />
        <Skeleton height={36} mb={16} />
        <Skeleton height={240} />
      </div>
    );
  }

  const membershipMeta = membership ? MEMBERSHIP_META[membership.status] ?? { label: membership.status, tone: "neutral" as const } : null;
  const activityMeta = !isCreateMode && org ? ACTIVITY_META[activityStatus(org.setupCompleted, activity ?? undefined)] : null;
  const web = org ? getOrgUrl(org) : null;
  const dirty = form.isDirty();

  const copyLink = async () => {
    if (!web) return;
    try {
      await navigator.clipboard.writeText(web);
      notifications.show({ message: `Enlace copiado: ${web}` });
    } catch {
      notifications.show({ message: "No se pudo copiar el enlace.", color: "red" });
    }
  };

  const handleDelete = async () => {
    if (!org?._id) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiGeneral.delete(`/admin/organizations/${org._id}`);
      notifications.show({ message: `${org.name} se eliminó.` });
      navigate("/superadmin/orgs");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setDeleteError(e?.response?.data?.message || "No se pudo eliminar la organización.");
      setDeleting(false);
    }
  };

  const TABS: { value: string; label: string }[] = [
    { value: "admin", label: "Administración" },
    { value: "contact", label: "Contacto" },
    { value: "openingsHours", label: "Horario" },
    { value: "socialMedia", label: "Redes" },
    { value: "location", label: "Ubicación" },
    { value: "onlineBooking", label: "Reservas" },
    { value: "fidelity", label: "Fidelidad" },
    { value: "branding", label: "Marca" },
    { value: "payments", label: "Pagos" },
    { value: "cancellation", label: "Cancelación" },
    { value: "reminders", label: "Recordatorios" },
  ];

  const f = form as any;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 16px 48px" }}>
      <style>{`
        .sa-tabs { display: flex; gap: 20px; border-bottom: 1px solid var(--line); overflow-x: auto; scrollbar-width: none; }
        .sa-tabs::-webkit-scrollbar { display: none; }
        .sa-tabs button { flex: none; border: 0; background: none; padding: 0 0 10px; margin-bottom: -1px; border-bottom: 2px solid transparent; color: var(--ink-muted); font: 500 14px/20px var(--font-sans); cursor: pointer; white-space: nowrap; }
        .sa-tabs button[aria-selected="true"] { color: var(--ink); border-color: var(--ink); font-weight: 600; }
      `}</style>

      <Link to="/superadmin/orgs" className="ag-link ag-row" style={{ gap: 4, display: "inline-flex", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Organizaciones
      </Link>

      <div className="ag-row" style={{ justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
        <div className="ag-row" style={{ gap: 12, flexWrap: "nowrap", minWidth: 0 }}>
          {!isCreateMode && (
            <Avatar
              src={org?.branding?.logoUrl || undefined}
              size={48}
              radius="xl"
              styles={{ root: { background: "var(--surface-hover)", flex: "none" }, placeholder: { color: "var(--ink-muted)", fontWeight: 600 } }}
            >
              {(org?.name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
            </Avatar>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="ag-row" style={{ gap: 8 }}>
              <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>
                {isCreateMode ? "Nueva organización" : org?.name || "Organización"}
              </h1>
              {membershipMeta && <span className={badgeClass(membershipMeta.tone)}>Membresía: {membershipMeta.label}</span>}
              {activityMeta && <span className={badgeClass(activityMeta.tone)}>{activityMeta.label}</span>}
            </div>
            {!isCreateMode && (
              <div className="ag-muted" style={{ fontSize: 14, marginTop: 2 }}>
                {[org?.email, web?.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap" }}>
          {!isCreateMode && org && (
            <>
              <Button variant="default" onClick={() => setImpersonateOpen(true)}>
                Entrar como admin
              </Button>
              <Menu position="bottom-end" withinPortal width={200}>
                <Menu.Target>
                  <ActionIcon variant="default" size={36} aria-label="Más acciones">
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconLink size={16} />} disabled={!web} onClick={copyLink}>
                    {web ? "Copiar enlace" : "Sin dirección web"}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => {
                      setDeleteOpen(true);
                      setDeleteConfirm("");
                      setDeleteError("");
                    }}
                  >
                    Eliminar organización
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </>
          )}
          <Button color="var(--platform)" onClick={handleSave} loading={saving} disabled={!isCreateMode && !dirty}>
            {isCreateMode ? "Crear organización" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="sa-tabs" role="tablist" aria-label="Secciones de la organización">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 20 }}>
        {tab === "admin" && (
          <AdminTab
            form={form}
            isCreateMode={isCreateMode}
            organizationId={org?._id}
            membership={membership}
            onEditMembership={membership ? () => setEditMembershipOpen(true) : undefined}
            onMembershipCreated={loadMembership}
          />
        )}
        {tab === "contact" && <ContactTab form={f} isEditing domains={form.values.domains || []} />}
        {tab === "openingsHours" && <OpeningHoursTab form={f} isEditing />}
        {tab === "socialMedia" && <SocialMediaTab form={f} isEditing />}
        {tab === "location" && <LocationTab form={f} isEditing />}
        {tab === "onlineBooking" && <OnlineBookingTab form={f} isEditing />}
        {tab === "fidelity" && <FidelityTab form={f} isEditing />}
        {tab === "branding" && (
          <BrandingTab
            form={f}
            isEditing
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
          />
        )}
        {tab === "payments" && <PaymentMethodsTab form={f} isEditing organizationId={org?._id} />}
        {tab === "cancellation" && <CancellationPolicyTab form={f} isEditing />}
        {tab === "reminders" && <ReminderSettingsTab form={f} isEditing />}
      </div>

      {!isCreateMode && <StickyActionBar isDirty={dirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />}

      <ImpersonateDialog org={impersonateOpen ? org : null} onClose={() => setImpersonateOpen(false)} />

      <EditMembershipModal
        opened={editMembershipOpen}
        onClose={() => setEditMembershipOpen(false)}
        membership={membership}
        plans={plans}
        onSuccess={loadMembership}
      />

      <Modal opened={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title={<b>Eliminar {org?.name}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-alert ag-alert--danger">
            <IconAlertTriangle size={20} />
            <div style={{ fontSize: 14 }}>No se puede deshacer. Se borran todos sus datos: citas, clientes, empleados, servicios, membresías, campañas y más.</div>
          </div>
          <TextInput
            label={
              <span>
                Para confirmar, escribe <b>{org?.name}</b>
              </span>
            }
            placeholder={org?.name}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.currentTarget.value)}
            disabled={deleting}
            error={deleteError || undefined}
          />
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting} disabled={deleteConfirm !== org?.name}>
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
