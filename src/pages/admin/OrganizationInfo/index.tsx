/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Divider, Tabs, rem } from "@mantine/core";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import { GrOrganization } from "react-icons/gr";
import { RiGlobalLine } from "react-icons/ri";
import { BiLocationPlus, BiCreditCard } from "react-icons/bi";
import { MdBrandingWatermark } from "react-icons/md";

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

import { schema, FormValues } from "./schema";
import { ensureBranding, ensureDomains } from "./utils";

export default function OrganizationInfo() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const [org, setOrg] = useState<Organization | null>(null);

  // loaders específicos
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);
  const [saving, setSaving] = useState(false);

  // bloquear salida con cambios
  const isBlockingRef = useRef(false);

  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {} as any,
    validateInputOnChange: true,
  });

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        if (!organizationId) return;
        const response = await getOrganizationById(organizationId);
        if (response) {
          // OrganizationInfo.tsx (dentro de fetchOrganization)
          const ensureArray = <T,>(arr: T[] | undefined, fallback: T[] = []) =>
            Array.isArray(arr) ? [...arr] : [...fallback];

          const ensureBreaks = (arr: any[] | undefined) =>
            Array.isArray(arr) ? arr.map((b) => ({ ...b })) : [];

          const normalized: Organization = {
            ...response,
            branding: ensureBranding(response.branding),
            domains: ensureArray(response.domains, []),
            default_country: response.default_country ?? "CO", // 🌍 País por defecto
            showLoyaltyProgram: response.showLoyaltyProgram ?? true,
            welcomeTitle: response.welcomeTitle ?? "¡Hola! Bienvenido",
            welcomeDescription: response.welcomeDescription ?? "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨",
            homeLayout: response.homeLayout ?? "modern",
            paymentMethods: ensureArray(response.paymentMethods, []),
            requireReservationDeposit: response.requireReservationDeposit ?? false,
            reservationDepositPercentage: response.reservationDepositPercentage ?? 50,
            reminderSettings: {
              enabled: response.reminderSettings?.enabled ?? true,
              hoursBefore: response.reminderSettings?.hoursBefore ?? 24,
              sendTimeStart: response.reminderSettings?.sendTimeStart ?? "07:00",
              sendTimeEnd: response.reminderSettings?.sendTimeEnd ?? "20:00",
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
          };

          setOrg(normalized);
          // 👇 Muy importante: pasar COPIAS al form
          form.setValues(
            structuredClone
              ? structuredClone(normalized as any)
              : JSON.parse(JSON.stringify(normalized))
          );
          form.resetDirty();
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

  // Track dirty
  const isDirty = useMemo(() => form.isDirty(), [form]);
  useEffect(() => {
    isBlockingRef.current = isEditing && isDirty;
  }, [isEditing, isDirty]);

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
    form.setValues((org || {}) as any);
    form.resetDirty();
    setIsEditing(false);
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
        message: Object.values(errors.fieldErrors).flat()[0] as string || "Hay errores de validación",
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
      const normalized: Organization = {
        ...updated,
        branding: ensureBranding(updated.branding),
        domains: ensureDomains(updated.domains),
      };
      setOrg(normalized);
      form.setValues(normalized as any);
      form.resetDirty();
      setIsEditing(false);

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
    <Container size="md" py="md">
      <HeaderBar
        org={org}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
      />

      <Divider my="sm" />

      <Tabs defaultValue="contact" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab
            value="contact"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Nombre y contacto
          </Tabs.Tab>
          <Tabs.Tab
            value="openingsHours"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Horario de atención
          </Tabs.Tab>
          <Tabs.Tab
            value="socialMedia"
            leftSection={
              <RiGlobalLine style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Redes sociales
          </Tabs.Tab>
          <Tabs.Tab
            value="location"
            leftSection={
              <BiLocationPlus style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Ubicación
          </Tabs.Tab>
          <Tabs.Tab
            value="fidelity"
            leftSection={
              <GrOrganization style={{ width: rem(12), height: rem(12) }} />
            }
          >
            Fidelidad
          </Tabs.Tab>
          <Tabs.Tab
            value="branding"
            leftSection={
              <MdBrandingWatermark
                style={{ width: rem(12), height: rem(12) }}
              />
            }
          >
            Branding
          </Tabs.Tab>
          <Tabs.Tab
            value="payments"
            leftSection={
              <BiCreditCard
                style={{ width: rem(12), height: rem(12) }}
              />
            }
          >
            Métodos de Pago
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="contact" pt="md">
          <ContactTab
            form={form}
            isEditing={isEditing}
            domains={org.domains || []}
          />
        </Tabs.Panel>

        <Tabs.Panel value="openingsHours" pt="md">
          <OpeningHoursTab form={form} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="socialMedia" pt="md">
          <SocialMediaTab form={form} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="location" pt="md">
          <LocationTab form={form} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="fidelity" pt="md">
          <FidelityTab form={form} isEditing={isEditing} />
        </Tabs.Panel>

        <Tabs.Panel value="branding" pt="md">
          <BrandingTab
            form={form}
            isEditing={isEditing}
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
          />
        </Tabs.Panel>

        <Tabs.Panel value="payments" pt="md">
          <PaymentMethodsTab
            form={form}
            isEditing={isEditing}
          />
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
