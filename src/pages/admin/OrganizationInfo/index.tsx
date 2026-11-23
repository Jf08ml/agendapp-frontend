/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useForm } from "@mantine/form";
import { zodResolver } from "../../../utils/zodResolver";
import { showNotification } from "@mantine/notifications";
import { IoAlertCircle } from "react-icons/io5";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { RootState } from "../../../app/store";
import {
  getOrganizationById,
  updateOrganization,
  Organization,
} from "../../../services/organizationService";
import { uploadImage } from "../../../services/imageService";
import { updateOrganizationState } from "../../../features/organization/sliceOrganization";
import CustomLoader from "../../../components/customLoader/CustomLoader";

import StickyActionBar from "./components/StickyActionBar";

import ContactTab from "./components/tabs/ContactTab";
import OpeningHoursTab from "./components/tabs/OpeningHoursTab";
import SocialMediaTab from "./components/tabs/SocialMediaTab";
import LocationTab from "./components/tabs/LocationTab";
import GoogleBusinessCard from "./components/GoogleBusinessCard";
import FidelityTab from "./components/tabs/FidelityTab";
import BrandingTab from "./components/tabs/BrandingTab";
import PaymentMethodsTab from "./components/tabs/PaymentMethodsTab";
import MercadoPagoConnectCard from "./components/MercadoPagoConnectCard";
import CancellationPolicyTab from "./components/tabs/CancellationPolicyTab";
import ReminderSettingsTab from "./components/tabs/ReminderSettingsTab";
import ClientFormTab from "./components/tabs/ClientFormTab";
import StoreFormTab from "./components/tabs/StoreFormTab";
import MarketingTab from "./components/tabs/MarketingTab";
import SessionsTab from "./components/tabs/SessionsTab";
import TeamPermissionsSection from "./components/TeamPermissionsSection";
import { SETTINGS_GROUPS, findPage, resolveSection, type SectionKey } from "./settingsNav";

import { schema, FormValues } from "./schema";
import { normalizeOrg } from "./utils";

// Ajustes (rediseño, SettingsLayout): navegación lateral en 5 grupos y una página
// por sección (?seccion=; los enlaces viejos con ?tab= siguen funcionando). Un
// solo formulario para todas las secciones, con el mismo guardado de siempre y
// la barra «Tienes cambios sin guardar · Descartar · Guardar».

export default function OrganizationInfo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = resolveSection(searchParams.get("seccion"), searchParams.get("tab"));
  const isMobile = useMediaQuery("(max-width: 48rem)");
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
        message: e instanceof Error && e.message ? e.message : "No se pudo guardar",
        color: "red",
        autoClose: 10000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !org) return <CustomLoader loadingText="Cargando ajustes..." />;

  // Sección elegida: en escritorio, sin sección se abre la primera; en móvil se
  // muestra la lista de secciones.
  const current: SectionKey | null = section ?? (isMobile ? null : "datos");
  const page = current ? findPage(current) : null;
  const isFidelity = current === "fidelidad";
  const go = (key: SectionKey | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    if (key) next.set("seccion", key);
    else next.delete("seccion");
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  };

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "datos":
        return <ContactTab form={form} isEditing domains={org.domains || []} slug={org.slug} part="profile" />;
      case "ubicacion":
        return (
          <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
            <LocationTab form={form} isEditing />
            <GoogleBusinessCard form={form} slug={org.slug} domains={org.domains || []} />
          </div>
        );
      case "redes":
        return <SocialMediaTab form={form} isEditing />;
      case "horario":
        return <OpeningHoursTab form={form} isEditing part="schedule" />;
      case "reglas":
        return (
          <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
            <OpeningHoursTab form={form} isEditing part="rules" />
            <ReminderSettingsTab form={form} isEditing part="attendance" />
          </div>
        );
      case "cancelacion":
        return <CancellationPolicyTab form={form} isEditing />;
      case "recordatorios":
        return <ReminderSettingsTab form={form} isEditing part="reminders" />;
      case "formulario-cliente":
        return <ClientFormTab form={form} isEditing />;
      case "metodos":
        return <PaymentMethodsTab form={form} isEditing part="methods" />;
      case "mercado-pago":
        return <MercadoPagoConnectCard organizationId={organizationId} />;
      case "abonos":
        return <PaymentMethodsTab form={form} isEditing part="deposits" />;
      case "formulario-tienda":
        return <StoreFormTab form={form} isEditing />;
      case "marca":
      case "app":
      case "temporada":
        return (
          <BrandingTab
            form={form}
            isEditing
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
            part={key === "marca" ? "brand" : key === "app" ? "pwa" : "season"}
          />
        );
      case "inicio":
        return <ContactTab form={form} isEditing domains={org.domains || []} slug={org.slug} part="home" />;
      case "tarjeta":
        return <FidelityTab form={form} isEditing part="card" />;
      case "analitica":
        return <MarketingTab form={form} isEditing />;
      case "sesiones":
        return <SessionsTab organizationId={organizationId} />;
      case "equipo":
        return <TeamPermissionsSection />;
      case "fidelidad":
        return <FidelityTab form={form} isEditing part="program" />;
    }
  };

  const nav = (
    <nav aria-label="Ajustes" className="ag-stack" style={{ gap: "var(--space-4)" }}>
      {SETTINGS_GROUPS.map((g) => (
        <div key={g.key}>
          <div className="ag-nav__group" style={{ padding: "0 12px 4px", font: "600 12px/16px var(--mantine-font-family)", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-subtle)" }}>
            {g.label}
          </div>
          <div className={isMobile ? "ag-card" : undefined}>
            {g.pages.map((p) => {
              const active = p.key === current;
              return isMobile ? (
                <button
                  key={p.key}
                  type="button"
                  className="ag-list-row"
                  onClick={() => go(p.key)}
                  style={{ width: "100%", padding: "12px 14px", border: 0, background: "transparent", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15 }}>{p.label}</b>
                    <span className="ag-subtle">{p.description}</span>
                  </span>
                  <IconChevronRight size={18} color="var(--ink-subtle)" />
                </button>
              ) : (
                <button
                  key={p.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => go(p.key)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 12px",
                    border: 0,
                    borderRadius: "var(--radius-md)",
                    background: active ? "var(--surface-hover)" : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    font: `${active ? 600 : 500} 14px/20px var(--mantine-font-family)`,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const content = page && current && (
    <div className="ag-stack" style={{ gap: "var(--space-4)", minWidth: 0 }}>
      {isMobile && !isFidelity && (
        <button
          type="button"
          onClick={() => go(null)}
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, border: 0, background: "transparent", padding: 0, color: "var(--ink-muted)", font: "500 14px/20px var(--mantine-font-family)", cursor: "pointer" }}
        >
          <IconChevronLeft size={16} /> Ajustes
        </button>
      )}
      <div>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{page.label}</h1>
        <p className="ag-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          {page.description}
          {isFidelity && " El diseño de la tarjeta está en Ajustes › Marca y web › Tarjeta de fidelidad."}
        </p>
      </div>
      {renderSection(current)}
      <StickyActionBar isDirty={isDirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      {isFidelity ? (
        // Clientes › Fidelidad: misma información y mismo guardado, sin la navegación de Ajustes
        <div style={{ maxWidth: 820 }}>{content}</div>
      ) : isMobile ? (
        current ? (
          content
        ) : (
          <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Ajustes</h1>
            {nav}
            <StickyActionBar isDirty={isDirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
          </div>
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 820px)", gap: "var(--space-6)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 16 }}>
            <h2 style={{ margin: "0 0 var(--space-4) 12px", font: "600 20px/28px var(--mantine-font-family)" }}>Ajustes</h2>
            {nav}
          </div>
          {content}
        </div>
      )}
    </div>
  );
}
