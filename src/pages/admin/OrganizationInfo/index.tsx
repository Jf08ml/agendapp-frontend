/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Container, Divider, ScrollArea, Tabs, rem } from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import {
  IconBuilding,
  IconClock,
  IconWorld,
  IconMapPin,
  IconStar,
  IconPalette,
  IconCreditCard,
  IconBan,
  IconBell,
} from "@tabler/icons-react";

import { RootState } from "../../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../../services/organizationService";
import { uploadImage } from "../../../services/imageService";
import { updateOrganizationState } from "../../../features/organization/sliceOrganization";
import CustomLoader from "../../../components/customLoader/CustomLoader";

import HeaderBar from "./components/HeaderBar";
import StickyActionBar from "./components/StickyActionBar";

import ContactTab from "./components/tabs/ContactTab";
import OpeningHoursTab from "./components/tabs/OpeningHoursTab";
import SocialMediaTab from "./components/tabs/SocialMediaTab";
import LocationTab from "./components/tabs/LocationTab";
import FidelityTab from "./components/tabs/FidelityTab";
import BrandingTab from "./components/tabs/BrandingTab";
import PaymentMethodsTab from "./components/tabs/PaymentMethodsTab";
import CancellationPolicyTab from "./components/tabs/CancellationPolicyTab";
import ReminderSettingsTab from "./components/tabs/ReminderSettingsTab";

import { schema, FormValues } from "./schema";
import { normalizeOrg } from "./utils";

export default function OrganizationInfo() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const [org, setOrg] = useState<Organization | null>(null);

  // loaders específicos
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);
  const [saving, setSaving] = useState(false);

  // bloquear salida con cambios — actualizamos directo en render (ref siempre fresco)
  const isBlockingRef = useRef(false);

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {} as any,
    validateInputOnChange: true,
  });

  // Calcular isDirty directamente en cada render (sin useMemo con [form] estable)
  const isDirty = form.isDirty();
  // Mantener la ref sincronizada para el beforeunload handler
  isBlockingRef.current = isDirty;

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationId) return;
        const response = await getOrganizationById(organizationId);
        if (response) {
          const normalized = normalizeOrg(response);
          const clone = structuredClone
            ? structuredClone(normalized as any)
            : JSON.parse(JSON.stringify(normalized));

          setOrg(normalized);
          form.setValues(clone);
          // Pasar el clone explícitamente para evitar problemas de batching
          // entre setValues y resetDirty en React 18
          form.resetDirty(clone);
        }
      } catch (e) {
        console.error(e);
        showNotification({
          title: "Error",
          message: "No se pudo cargar la organización",
          color: "red",
          icon: <IoAlertCircle />,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrganization();

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // helper de upload con loaders por campo
  const onUpload = async (
    file: File | null,
    key: "logoUrl" | "faviconUrl" | "pwaIcon"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification({
        title: "Archivo inválido",
        message: "Debe ser una imagen",
        color: "red",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification({
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

      showNotification({
        title: "Imagen actualizada",
        message: "Se subió correctamente ✅",
        color: "green",
      });
    } catch (e) {
      console.error(e);
      showNotification({
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
    if (!org) return;
    const clone = structuredClone
      ? structuredClone(org as any)
      : JSON.parse(JSON.stringify(org));
    form.setValues(clone);
    form.resetDirty(clone);
  };

  const handleSave = async () => {
    if (!organizationId) return;

    // Validar usando Zod directamente para evitar problemas con zodResolver
    const validationResult = schema.safeParse(form.values);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error("Errores de validación:", errors);
      showNotification({
        title: "Revisa los campos",
        message:
          (Object.values(errors.fieldErrors).flat()[0] as string) ||
          "Hay errores de validación",
        color: "red",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = validationResult.data as Organization;
      const updated = await updateOrganization(organizationId, payload);
      if (!updated) throw new Error("Actualización vacía");

      dispatch(updateOrganizationState(updated));

      // Normalización completa (igual que en fetchOrganization) para que todos
      // los campos anidados tengan sus defaults y no queden como undefined.
      const normalized = normalizeOrg(updated);
      const clone = structuredClone
        ? structuredClone(normalized as any)
        : JSON.parse(JSON.stringify(normalized));

      setOrg(normalized);
      form.setValues(clone);
      // Pasar el clone explícitamente para que el dirty baseline sea el
      // valor guardado, sin depender de que setValues ya haya sido procesado.
      form.resetDirty(clone);

      showNotification({
        title: "Guardado",
        message: "Información actualizada correctamente",
        color: "green",
      });
    } catch (e) {
      console.error(e);
      showNotification({
        title: "Error",
        message: "No se pudo guardar",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !org)
    return <CustomLoader loadingText="Cargando organización..." />;

  return (
    // pb extra cuando el StickyActionBar está visible para que no tape inputs
    <Container size="md" py="md" pb={isDirty ? rem(90) : "md"}>
      <HeaderBar org={org} />

      <Divider my="sm" />

      <Tabs defaultValue="contact" keepMounted={false}>
        <ScrollArea>
          <Tabs.List wrap="nowrap">
            <Tabs.Tab value="contact" leftSection={<IconBuilding size={14} />}>
              Negocio
            </Tabs.Tab>
            <Tabs.Tab value="openingsHours" leftSection={<IconClock size={14} />}>
              Horario y reservas
            </Tabs.Tab>
            <Tabs.Tab value="socialMedia" leftSection={<IconWorld size={14} />}>
              Redes sociales
            </Tabs.Tab>
            <Tabs.Tab value="location" leftSection={<IconMapPin size={14} />}>
              Ubicación
            </Tabs.Tab>
            <Tabs.Tab value="fidelity" leftSection={<IconStar size={14} />}>
              Fidelidad
            </Tabs.Tab>
            <Tabs.Tab value="branding" leftSection={<IconPalette size={14} />}>
              Branding
            </Tabs.Tab>
            <Tabs.Tab value="payments" leftSection={<IconCreditCard size={14} />}>
              Pagos
            </Tabs.Tab>
            <Tabs.Tab value="cancellation" leftSection={<IconBan size={14} />}>
              Cancelación
            </Tabs.Tab>
            <Tabs.Tab value="reminders" leftSection={<IconBell size={14} />}>
              Recordatorios
            </Tabs.Tab>
          </Tabs.List>
        </ScrollArea>

        <Tabs.Panel value="contact" pt="md">
          <ContactTab
            form={form}
            isEditing={true}
            domains={org.domains || []}
          />
        </Tabs.Panel>

        <Tabs.Panel value="openingsHours" pt="md">
          <OpeningHoursTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="socialMedia" pt="md">
          <SocialMediaTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="location" pt="md">
          <LocationTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="fidelity" pt="md">
          <FidelityTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="branding" pt="md">
          <BrandingTab
            form={form}
            isEditing={true}
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
          />
        </Tabs.Panel>

        <Tabs.Panel value="payments" pt="md">
          <PaymentMethodsTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="cancellation" pt="md">
          <CancellationPolicyTab form={form} isEditing={true} />
        </Tabs.Panel>

        <Tabs.Panel value="reminders" pt="md">
          <ReminderSettingsTab form={form} isEditing={true} />
        </Tabs.Panel>
      </Tabs>

      {isDirty && (
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
