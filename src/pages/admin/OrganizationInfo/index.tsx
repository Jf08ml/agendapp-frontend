import { useMediaQuery } from "@mantine/hooks";
import { Navigate, useSearchParams } from "react-router-dom";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import CustomLoader from "../../../components/customLoader/CustomLoader";

import StickyActionBar from "./components/StickyActionBar";

import ContactTab from "./components/tabs/ContactTab";
import OpeningHoursTab from "./components/tabs/OpeningHoursTab";
import SocialMediaTab from "./components/tabs/SocialMediaTab";
import LocationTab from "./components/tabs/LocationTab";
import GoogleBusinessCard from "./components/GoogleBusinessCard";
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
import { SETTINGS_GROUPS, findPage, loyaltyRedirect, resolveSection, type SectionKey } from "./settingsNav";
import { useOrganizationSettings } from "./useOrganizationSettings";

// Ajustes (rediseño, SettingsLayout): navegación lateral en 5 grupos y una página
// por sección (?seccion=; los enlaces viejos con ?tab= siguen funcionando). Un
// solo formulario para todas las secciones, con el mismo guardado de siempre y
// la barra «Tienes cambios sin guardar · Descartar · Guardar».
// Fidelidad (programa y tarjeta) vive en Clientes › Fidelidad: los enlaces
// viejos a esas secciones redirigen allá (decisión 6).

export default function OrganizationInfo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyLoyalty = loyaltyRedirect(searchParams.get("seccion"), searchParams.get("tab"));
  const section = resolveSection(searchParams.get("seccion"), searchParams.get("tab"));
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const {
    organizationId,
    org,
    loading,
    form,
    isDirty,
    saving,
    handleSave,
    handleCancel,
    onUpload,
    uploadingLogo,
    uploadingFavicon,
    uploadingPwaIcon,
  } = useOrganizationSettings();

  if (legacyLoyalty) return <Navigate to={legacyLoyalty} replace />;

  if (loading || !org) return <CustomLoader loadingText="Cargando ajustes..." />;

  // Sección elegida: en escritorio, sin sección se abre la primera; en móvil se
  // muestra la lista de secciones.
  const current: SectionKey | null = section ?? (isMobile ? null : "datos");
  const page = current ? findPage(current) : null;
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
      case "analitica":
        return <MarketingTab form={form} isEditing />;
      case "sesiones":
        return <SessionsTab organizationId={organizationId} />;
      case "equipo":
        return <TeamPermissionsSection />;
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
      {isMobile && (
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
        </p>
      </div>
      {renderSection(current)}
      <StickyActionBar isDirty={isDirty} saving={saving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      {isMobile ? (
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
