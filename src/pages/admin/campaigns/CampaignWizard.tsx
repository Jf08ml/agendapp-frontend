// pages/admin/campaigns/CampaignWizard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Paper,
  Stepper,
  Title,
  Alert,
  Group,
} from "@mantine/core";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type {
  CampaignRecipient,
  CampaignWizardState,
  PhoneValidation,
} from "../../../types/campaign";
import AudienceSelector from "./components/AudienceSelector";
import MessageComposer from "./components/MessageComposer";
import CampaignSummary from "./components/CampaignSummary";
import { validateCampaignData } from "../../../utils/campaignValidations";

const steps = ["Seleccionar Audiencia", "Componer Mensaje", "Confirmar y Enviar"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const organization = useAppSelector((state) => state.organization.organization);
  const orgId = organization?._id || "";

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
      const validationResult = validateCampaignData({
        title: wizardState.title,
        message: wizardState.message,
        recipients: wizardState.recipients,
      });

      if (!validationResult.valid) {
        setError(validationResult.errors.join(". "));
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
        message: wizardState.message,
        recipients: wizardState.recipients,
        image: wizardState.image,
        dryRun,
      });

      // Redirigir al detalle de la campaña
      navigate(`/admin/campaigns/${campaign._id}`);
    } catch (err: any) {
      setError(err.message || "Error enviando campaña");
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

        <Stepper active={wizardState.step - 1} breakpoint="sm" mb="xl" mt="lg">
          {steps.map((label, index) => (
            <Stepper.Step key={index} label={label} />
          ))}
        </Stepper>

        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
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

        {/* Paso 2: Mensaje */}
        {wizardState.step === 2 && (
          <MessageComposer
            title={wizardState.title}
            message={wizardState.message}
            image={wizardState.image}
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
              <Button
                variant="default"
                onClick={handleBack}
                disabled={loading}
              >
                ← Atrás
              </Button>
            )}

            {wizardState.step < 3 && (
              <Button
                onClick={handleNext}
                disabled={loading}
                loading={loading}
              >
                Siguiente →
              </Button>
            )}
          </Group>
        </Group>
      </Paper>
    </Container>
  );
}
