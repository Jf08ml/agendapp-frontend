/* eslint-disable @typescript-eslint/no-explicit-any */
// Nueva campaña (rediseño, CampanasPanel): tres pasos —Destinatarios, Mensaje y
// Revisar y enviar—. En móvil ocupa la pantalla y la barra de acción va fija abajo.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Button, Stepper } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconInfoCircle } from "@tabler/icons-react";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type { CampaignWizardState } from "../../../types/campaign";
import AudienceSelector from "./components/AudienceSelector";
import MessageComposer from "./components/MessageComposer";
import CampaignSummary from "./components/CampaignSummary";

const steps = ["Destinatarios", "Mensaje", "Revisar y enviar"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const organization = useAppSelector((state) => state.organization.organization);
  const orgId = organization?._id || "";
  const isMeta = organization?.waConnectionType === "meta";
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [wizardState, setWizardState] = useState<CampaignWizardState>({
    step: 1,
    recipients: [],
    selectedClientIds: [],
    rawPhones: "",
    title: "",
    message: "",
    isDryRun: false,
    confirmations: {
      reviewedRecipients: false,
      reviewedMessage: false,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const header = (
    <div>
      <Button component={Link} to="/admin/campaigns" variant="subtle" color="gray" size="compact-sm" leftSection={<IconArrowLeft size={16} />} mb={6}>
        Campañas
      </Button>
      <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Nueva campaña</h1>
    </div>
  );

  // Sin conexión Meta no se puede enviar
  if (!isMeta) {
    return (
      <Box p={{ base: "sm", md: "lg" }} maw={760}>
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          {header}
          <div className="ag-alert ag-alert--warning" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>
              <b style={{ display: "block" }}>Necesitas la API oficial de Meta</b>
              Las campañas solo se envían con tu número conectado a Meta y una plantilla aprobada.
            </div>
            <Button size="xs" variant="outline" component={Link} to="/gestionar-whatsapp">
              Conectar
            </Button>
          </div>
        </div>
      </Box>
    );
  }

  const handleNext = async () => {
    setError(null);

    if (wizardState.step === 1) {
      if (wizardState.recipients.length === 0) {
        setError("Elige al menos un destinatario.");
        return;
      }
      // Validar teléfonos antes de avanzar
      setLoading(true);
      try {
        const phones = wizardState.recipients.map((r) => r.phone);
        const validation = await campaignService.validatePhones(orgId, phones);
        if (validation.valid === 0) {
          setError("Ninguno de los números es válido. Revisa la lista.");
          setLoading(false);
          return;
        }
        setWizardState((prev) => ({ ...prev, validation, step: 2 }));
      } catch (err: any) {
        setError(err.message || "No pudimos validar los números. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    } else if (wizardState.step === 2) {
      if (!wizardState.title.trim()) {
        setError("Ponle un nombre a la campaña.");
        return;
      }
      if (!wizardState.templateName) {
        setError("Elige una plantilla aprobada por Meta.");
        return;
      }
      // Meta rechaza el envío completo si un parámetro de texto llega vacío
      const bodyText = wizardState.templateBody || "";
      const varIndices = [
        ...new Set((bodyText.match(/\{\{(\d+)\}\}/g) || []).map((m) => parseInt(m.replace(/\{\{|\}\}/g, ""), 10))),
      ];
      const fixedVarIndices = varIndices.filter((i) => i > 1);
      const missingVars = fixedVarIndices.filter((i) => !(wizardState.templateVariables?.[String(i)] || "").trim());
      if (missingVars.length > 0) {
        setError(`Completa el texto fijo de: ${missingVars.map((i) => `{{${i}}}`).join(", ")}`);
        return;
      }
      setWizardState((prev) => ({ ...prev, step: 3 }));
    }
  };

  const handleBack = () => {
    setError(null);
    setWizardState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) as 1 | 2 | 3 }));
  };

  const handleSend = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const campaign = await campaignService.createCampaign(orgId, {
        title: wizardState.title,
        message: wizardState.templateBody || "",
        recipients: wizardState.recipients,
        dryRun,
        templateName: wizardState.templateName,
        templateLanguage: wizardState.templateLanguage,
        templateVariables: wizardState.templateVariables,
      });
      navigate(`/admin/campaigns/${campaign._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "No pudimos crear la campaña. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const updateWizardState = (updates: Partial<CampaignWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  // En el paso 3 las acciones de envío están en el resumen; aquí solo Atrás / Cancelar
  const actionBar = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        ...(isMobile
          ? {
              position: "sticky",
              bottom: 0,
              background: "var(--surface-raised)",
              borderTop: "1px solid var(--line)",
              padding: "12px 16px",
              margin: "16px -16px -16px",
              zIndex: 5,
            }
          : { marginTop: 16 }),
      }}
    >
      <Button variant="subtle" color="gray" onClick={() => navigate("/admin/campaigns")} disabled={loading}>
        Cancelar
      </Button>
      <div style={{ display: "flex", gap: 8 }}>
        {wizardState.step > 1 && (
          <Button variant="default" onClick={handleBack} disabled={loading}>
            Atrás
          </Button>
        )}
        {wizardState.step < 3 && (
          <Button onClick={handleNext} loading={loading}>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Box p={{ base: "sm", md: "lg" }} maw={960}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        {header}

        <Stepper active={wizardState.step - 1} size="sm" allowNextStepsSelect={false}>
          {steps.map((label) => (
            <Stepper.Step key={label} label={label} />
          ))}
        </Stepper>

        {error && (
          <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
            <IconInfoCircle size={20} />
            <div style={{ flex: 1 }}>{error}</div>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setError(null)}>
              Cerrar
            </Button>
          </div>
        )}

        <div className="ag-card" style={{ padding: 16 }}>
          {wizardState.step === 1 && (
            <AudienceSelector
              orgId={orgId}
              recipients={wizardState.recipients}
              selectedClientIds={wizardState.selectedClientIds}
              rawPhones={wizardState.rawPhones}
              onUpdate={updateWizardState}
            />
          )}

          {wizardState.step === 2 && (
            <MessageComposer
              orgId={orgId}
              isMeta={isMeta}
              title={wizardState.title}
              message={wizardState.message}
              templateName={wizardState.templateName}
              templateVariables={wizardState.templateVariables}
              image={wizardState.image}
              media={wizardState.media}
              onUpdate={updateWizardState}
              previewRecipient={wizardState.recipients[0]}
            />
          )}

          {wizardState.step === 3 && (
            <CampaignSummary
              title={wizardState.title}
              message={wizardState.message}
              templateName={wizardState.templateName}
              hasMedia={!!(wizardState.media || wizardState.image)}
              validation={wizardState.validation}
              confirmations={wizardState.confirmations}
              onUpdate={updateWizardState}
              onSend={handleSend}
              loading={loading}
            />
          )}

          {actionBar}
        </div>
      </div>
    </Box>
  );
}
