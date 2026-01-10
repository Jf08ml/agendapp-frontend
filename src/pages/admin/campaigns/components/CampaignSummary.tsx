/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/campaigns/components/CampaignSummary.tsx
import { Box, Title, Paper, Alert, Checkbox, Button, Text, Stack } from "@mantine/core";
import type { PhoneValidation } from "../../../../types/campaign";

interface CampaignSummaryProps {
  title: string;
  message: string;
  validation?: PhoneValidation;
  confirmations: {
    reviewedRecipients: boolean;
    reviewedMessage: boolean;
  };
  onUpdate: (updates: any) => void;
  onSend: (dryRun: boolean) => void;
  loading: boolean;
}

export default function CampaignSummary({
  title,
  validation,
  confirmations,
  onUpdate,
  onSend,
  loading,
}: CampaignSummaryProps) {
  const validRecipients = validation?.valid || 0;
  const invalidCount = validation?.invalid || 0;
  const withoutConsent = validation?.withoutConsent || 0;
  const canSend = confirmations.reviewedRecipients && confirmations.reviewedMessage;

  return (
    <Box>
      <Title order={3} mb="md">✅ Confirma y Envía</Title>
      <Paper withBorder p="md" mb="lg">
        <Title order={4} mb="sm">📊 Resumen de la Campaña</Title>
        <Stack gap="xs">
          <Text><strong>Título:</strong> {title}</Text>
          <Text><strong>Destinatarios válidos:</strong> {validRecipients}</Text>
          {invalidCount > 0 && <Text c="red"><strong>Números inválidos (omitidos):</strong> {invalidCount}</Text>}
        </Stack>
      </Paper>
      <Alert color="orange" title="⚠️ IMPORTANTE" mb="lg">
        <Stack gap="xs">
          <Text size="sm">• Esta campaña se enviará a {validRecipients} personas</Text>
          {withoutConsent > 0 && <Text size="sm">• {withoutConsent} contactos sin opt-in serán omitidos</Text>}
          <Text size="sm">• El envío es IRREVERSIBLE</Text>
          <Text size="sm">• Puedes cancelar mientras esté en progreso</Text>
        </Stack>
      </Alert>
      <Alert color="blue" mb="lg">
        <Title order={5} mb="xs">🧪 ¿Quieres hacer una prueba primero?</Title>
        <Text size="sm">El modo "Dry Run" simula el envío sin enviar mensajes reales.</Text>
      </Alert>
      <Paper withBorder p="md" mb="lg">
        <Stack gap="sm">
          <Checkbox label="He revisado los destinatarios y son correctos" checked={confirmations.reviewedRecipients} onChange={(e) => onUpdate({ confirmations: { ...confirmations, reviewedRecipients: e.currentTarget.checked }})} />
          <Checkbox label="Confirmo que el mensaje es correcto" checked={confirmations.reviewedMessage} onChange={(e) => onUpdate({ confirmations: { ...confirmations, reviewedMessage: e.currentTarget.checked }})} />
        </Stack>
      </Paper>
      <Box style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button variant="light" onClick={() => onSend(true)} disabled={!canSend || loading} loading={loading}>🧪 Dry Run</Button>
        <Button onClick={() => onSend(false)} disabled={!canSend || loading} loading={loading} color="green">📤 Enviar Campaña</Button>
      </Box>
      {!canSend && <Text size="sm" c="dimmed" ta="right" mt="sm">Debes marcar ambas confirmaciones para continuar</Text>}
    </Box>
  );
}
