/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/campaigns/CampaignWizard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Paper,
  Stepper,
  Title,
  Alert,
  Group,
  Text,
  Anchor,
} from "@mantine/core";
import { BiInfoCircle } from "react-icons/bi";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type { CampaignWizardState } from "../../../types/campaign";
import AudienceSelector from "./components/AudienceSelector";
import MessageComposer from "./components/MessageComposer";
import CampaignSummary from "./components/CampaignSummary";

const steps = [
  "Seleccionar Audiencia",
  "Componer Mensaje",
  "Confirmar y Enviar",
];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const organization = useAppSelector((state) => state.organization.organization);
  const orgId = organization?._id || "";
  const isMeta = organization?.waConnectionType === "meta";

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

  // Bloqueo temprano si no hay conexión Meta
  if (!isMeta) {
    return (
      <Container size="lg" py="xl">
        <Paper shadow="sm" p="xl" radius="md">
          <Alert color="orange" icon={<BiInfoCircle size={20} />} title="Conexión Meta requerida">
            <Text size="sm">
              Las campañas de WhatsApp solo funcionan con conexión Meta activa.
              Conecta tu número en{" "}
              <Anchor href="/admin/gestionar-whatsapp" size="sm">Gestionar WhatsApp</Anchor>
              {" "}para poder enviar campañas.
            </Text>
          </Alert>
        </Paper>
      </Container>
    );
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);

    // Validaciones por paso
    if (wizardState.step === 1) {
      if (wizardState.recipients.length === 0) {
        setError("Debes seleccionar al menos un destinatario");
        return;
      }

      // Validar teléfonos antes de avanzar
      setLoading(true);
      try {
        const phones = wizardState.recipients.map((r) => r.phone);
        const validation = await campaignService.validatePhones(orgId, phones);

        if (validation.valid === 0) {
          setError("Todos los teléfonos son inválidos");
          setLoading(false);
          return;
        }

        // Guardar validación para el último paso
        setWizardState((prev) => ({
          ...prev,
          validation,
          step: 2,
        }));
      } catch (err: any) {
        setError(err.message || "Error validando teléfonos");
      } finally {
        setLoading(false);
      }
    } else if (wizardState.step === 2) {
      if (!wizardState.title.trim()) {
        setError("El título de la campaña es obligatorio");
        return;
      }
      if (!wizardState.templateName) {
        setError("Debes seleccionar una plantilla aprobada para la campaña");
        return;
      }
      setWizardState((prev) => ({ ...prev, step: 3 }));
    }
  };

  const handleBack = () => {
    setError(null);
    setWizardState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1) as 1 | 2 | 3,
    }));
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
      });

      // Redirigir al detalle de la campaña
      navigate(`/admin/campaigns/${campaign._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Error enviando campaña");
    } finally {
      setLoading(false);
    }
  };

  const updateWizardState = (updates: Partial<CampaignWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Container size="lg" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <Title order={2} mb="md">
          📢 Nueva Campaña de WhatsApp
        </Title>

        <Stepper active={wizardState.step - 1} mb="xl" mt="lg">
          {steps.map((label, index) => (
            <Stepper.Step key={index} label={label} />
          ))}
        </Stepper>

        {error && (
          <Alert
            color="red"
            mb="md"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Paso 1: Audiencia */}
        {wizardState.step === 1 && (
          <AudienceSelector
            orgId={orgId}
            recipients={wizardState.recipients}
            selectedClientIds={wizardState.selectedClientIds}
            rawPhones={wizardState.rawPhones}
            onUpdate={updateWizardState}
          />
        )}

        {/* Paso 2: Mensaje / Plantilla */}
        {wizardState.step === 2 && (
          <MessageComposer
            orgId={orgId}
            isMeta={isMeta}
            title={wizardState.title}
            message={wizardState.message}
            templateName={wizardState.templateName}
            templateLanguage={wizardState.templateLanguage}
            templateBody={wizardState.templateBody}
            image={wizardState.image}
            media={wizardState.media}
            onUpdate={updateWizardState}
            previewRecipient={wizardState.recipients[0]}
          />
        )}

        {/* Paso 3: Confirmación */}
        {wizardState.step === 3 && (
          <CampaignSummary
            title={wizardState.title}
            message={wizardState.message}
            validation={wizardState.validation}
            confirmations={wizardState.confirmations}
            onUpdate={updateWizardState}
            onSend={handleSend}
            loading={loading}
          />
        )}

        {/* Botones de navegación */}
        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            onClick={() => navigate("/admin/campaigns")}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Group>
            {wizardState.step > 1 && (
              <Button variant="default" onClick={handleBack} disabled={loading}>
                ← Atrás
              </Button>
            )}

            {wizardState.step < 3 && (
              <Button onClick={handleNext} disabled={loading} loading={loading}>
                Siguiente →
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Container>
  );
}
