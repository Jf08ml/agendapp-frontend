/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Tabs,
  rem,
  Group,
  Title,
  Button,
  Text,
  Divider,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { notifications } from "@mantine/notifications";
import { useNavigate, useParams } from "react-router-dom";

import { GrOrganization } from "react-icons/gr";
import { RiGlobalLine } from "react-icons/ri";
import {
  BiLocationPlus,
  BiCreditCard,
  BiCalendar,
  BiArrowBack,
  BiEdit,
} from "react-icons/bi";
import {
  MdBrandingWatermark,
  MdBlock,
  MdNotifications,
  MdAdminPanelSettings,
} from "react-icons/md";

import {
  getOrganizationById,
  updateOrganization,
  createOrganization,
  Organization,
} from "../../services/organizationService";
import { uploadImage } from "../../services/imageService";
import CustomLoader from "../../components/customLoader/CustomLoader";

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
    stepMinutes: 5,
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
};

export default function SuperadminOrganizationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreateMode = id === "nueva";

  const [loading, setLoading] = useState(!isCreateMode);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [org, setOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  // Upload loaders
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);

  const isBlockingRef = useRef(false);

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
            stepMinutes: response.openingHours?.stepMinutes ?? 5,
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
        form.resetDirty();
      } catch (e) {
        console.error(e);
        notifications.show({
          title: "Error",
          message: "No se pudo cargar la organización",
          color: "red",
        });
        navigate("/superadmin");
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreateMode]);

  // Track dirty for exit warning
  const isDirty = useMemo(() => form.isDirty(), [form]);
  useEffect(() => {
    isBlockingRef.current = isEditing && isDirty;
  }, [isEditing, isDirty]);

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

    key === "logoUrl" && setUploadingLogo(true);
    key === "faviconUrl" && setUploadingFavicon(true);
    key === "pwaIcon" && setUploadingPwaIcon(true);

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
      key === "logoUrl" && setUploadingLogo(false);
      key === "faviconUrl" && setUploadingFavicon(false);
      key === "pwaIcon" && setUploadingPwaIcon(false);
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      navigate("/superadmin");
      return;
    }
    form.setValues((org || {}) as any);
    form.resetDirty();
    setIsEditing(false);
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
        navigate("/superadmin");
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
        form.resetDirty();
        setIsEditing(false);

        notifications.show({
          title: "Guardado",
          message: "Organización actualizada correctamente",
          color: "green",
        });
      }
    } catch (e) {
      console.error(e);
      const err = e as { response?: { data?: { message?: string } } };
      notifications.show({
        title: "Error",
        message:
          err.response?.data?.message || "No se pudo guardar la organización",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <CustomLoader loadingText="Cargando organización..." />;

  const iconStyle = { width: rem(12), height: rem(12) };

  return (
    <Container size="lg" py="md">
      {/* Header */}
      <Stack gap="xs" mb="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Button
              variant="subtle"
              size="compact-sm"
              leftSection={<BiArrowBack size={16} />}
              onClick={() => navigate("/superadmin")}
            >
              Volver
            </Button>
            <Title order={3}>
              {isCreateMode
                ? "Nueva organización"
                : org?.name || "Organización"}
            </Title>
          </Group>
          {!isCreateMode && !isEditing && (
            <Button
              leftSection={<BiEdit size={16} />}
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
          )}
        </Group>
        {!isCreateMode && org?.email && (
          <Text c="dimmed" size="sm" ml={90}>
            {org.email}
          </Text>
        )}
      </Stack>

      <Divider my="sm" />

      <Tabs defaultValue="admin" keepMounted={false}>
        <Tabs.List style={{ flexWrap: "wrap" }}>
          <Tabs.Tab
            value="admin"
            leftSection={<MdAdminPanelSettings style={iconStyle} />}
          >
            Administración
          </Tabs.Tab>
          <Tabs.Tab
            value="contact"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Contacto
          </Tabs.Tab>
          <Tabs.Tab
            value="openingsHours"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Horario
          </Tabs.Tab>
          <Tabs.Tab
            value="socialMedia"
            leftSection={<RiGlobalLine style={iconStyle} />}
          >
            Redes
          </Tabs.Tab>
          <Tabs.Tab
            value="location"
            leftSection={<BiLocationPlus style={iconStyle} />}
          >
            Ubicación
          </Tabs.Tab>
          <Tabs.Tab
            value="onlineBooking"
            leftSection={<BiCalendar style={iconStyle} />}
          >
            Reservas
          </Tabs.Tab>
          <Tabs.Tab
            value="fidelity"
            leftSection={<GrOrganization style={iconStyle} />}
          >
            Fidelidad
          </Tabs.Tab>
          <Tabs.Tab
            value="branding"
            leftSection={<MdBrandingWatermark style={iconStyle} />}
          >
            Branding
          </Tabs.Tab>
          <Tabs.Tab
            value="payments"
            leftSection={<BiCreditCard style={iconStyle} />}
          >
            Pagos
          </Tabs.Tab>
          <Tabs.Tab
            value="cancellation"
            leftSection={<MdBlock style={iconStyle} />}
          >
            Cancelación
          </Tabs.Tab>
          <Tabs.Tab
            value="reminders"
            leftSection={<MdNotifications style={iconStyle} />}
          >
            Recordatorios
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="admin" pt="md">
          <AdminTab
            form={form}
            isEditing={isEditing}
            isCreateMode={isCreateMode}
            organizationId={org?._id}
            currentMembershipId={org?.currentMembershipId}
            onMembershipCreated={async () => {
              if (!id) return;
              const updated = await getOrganizationById(id);
              if (updated) setOrg(updated);
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="contact" pt="md">
          <ContactTab
            form={form as any}
            isEditing={isEditing}
            domains={form.values.domains || []}
          />
        </Tabs.Panel>

        <Tabs.Panel value="openingsHours" pt="md">
          <OpeningHoursTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="socialMedia" pt="md">
          <SocialMediaTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="location" pt="md">
          <LocationTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="onlineBooking" pt="md">
          <OnlineBookingTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="fidelity" pt="md">
          <FidelityTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="branding" pt="md">
          <BrandingTab
            form={form as any}
            isEditing={isEditing}
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
          />
        </Tabs.Panel>

        <Tabs.Panel value="payments" pt="md">
          <PaymentMethodsTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="cancellation" pt="md">
          <CancellationPolicyTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="reminders" pt="md">
          <ReminderSettingsTab form={form as any} isEditing={isEditing} />
        </Tabs.Panel>
      </Tabs>

      {isEditing && (
        <StickyActionBar
          isDirty={isDirty}
          saving={saving}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      )}
    </Container>
  );
}
