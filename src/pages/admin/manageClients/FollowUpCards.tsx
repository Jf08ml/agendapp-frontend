import { Badge, Box, Group, Paper, Text } from "@mantine/core";
import {
  FollowUpClientRef,
  FollowUpOutcome,
  FollowUpPendingEntry,
  FollowUpProcessedEntry,
} from "../../../services/clientService";

// Tarjetas de recordatorios de seguimiento, compartidas por la pestaña "Seguimientos" del
// detalle de un cliente (ClientDetailDrawer) y la lista general de la organización (FollowUpsTab).
// `showClient` agrega el nombre/teléfono del cliente, que en la vista por cliente sobra.

const getFollowUpOutcomeBadge = (outcome: FollowUpOutcome | null) => {
  switch (outcome) {
    case "sent":
      return { label: "Enviado", color: "teal" };
    case "skipped_already_returned":
      return { label: "No enviado — ya volvió", color: "blue" };
    case "skipped_no_phone":
      return { label: "No enviado — sin teléfono", color: "gray" };
    case "skipped_superseded":
      return { label: "No enviado — otra cita tuvo prioridad", color: "gray" };
    case "failed_max_retries":
      return { label: "No enviado — sin confirmación tras varios intentos", color: "red" };
    default:
      return { label: "Desconocido (histórico)", color: "gray" };
  }
};

const getFollowUpPendingBadge = (entry: FollowUpPendingEntry) => {
  if (entry.windowState === "expired") return { label: "Vencido sin procesar", color: "red" };
  // Un programado puede saberse desde antes que no saldrá (el cliente ya volvió, no tiene teléfono)
  if (entry.preview && !entry.preview.wouldSend) return { label: "No se enviará", color: "gray" };
  if (entry.windowState === "upcoming") return { label: "Programado", color: "yellow" };
  if (entry.preview?.wouldSend) return { label: "Se enviará hoy", color: "green" };
  return { label: "No se enviará", color: "gray" };
};

const formatLongDate = (value: string, timezone: string) =>
  new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: timezone });

function ClientLine({ client }: { client: FollowUpClientRef | null | undefined }) {
  return (
    <Text size="sm" fw={600}>
      {client ? client.name : "Cliente eliminado"}
      {client?.phone && (
        <Text span size="xs" c="dimmed" fw={400}>
          {" "}
          · {client.phone}
        </Text>
      )}
    </Text>
  );
}

// ── Tarjeta de recordatorio de seguimiento pendiente/programado ──────────
export function PendingFollowUpCard({
  entry,
  timezone,
  showClient = false,
}: {
  entry: FollowUpPendingEntry & { client?: FollowUpClientRef | null };
  timezone: string;
  showClient?: boolean;
}) {
  const badge = getFollowUpPendingBadge(entry);

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          {showClient && <ClientLine client={entry.client} />}
          <Text size="sm" fw={500}>
            🔁 {entry.triggerService.name} → {entry.followUpService?.name ?? "—"}
          </Text>
          <Text size="xs" c="dimmed">
            Cita del {formatLongDate(entry.startDate, timezone)} · seguimiento a los {entry.followUpDays} días
          </Text>
          <Text size="xs" c="dimmed">
            Fecha proyectada: {formatLongDate(entry.projectedDate, timezone)}
          </Text>
          {entry.preview && (
            <Text size="xs" c="dimmed" mt={2}>{entry.preview.reason}</Text>
          )}
        </Box>
        <Badge size="xs" color={badge.color} variant="filled">{badge.label}</Badge>
      </Group>
    </Paper>
  );
}

// ── Tarjeta de recordatorio de seguimiento ya procesado (enviado o no) ───
export function ProcessedFollowUpCard({
  entry,
  timezone,
  showClient = false,
}: {
  entry: FollowUpProcessedEntry & { client?: FollowUpClientRef | null };
  timezone: string;
  showClient?: boolean;
}) {
  const badge = getFollowUpOutcomeBadge(entry.outcome);

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          {showClient && <ClientLine client={entry.client} />}
          <Text size="sm" fw={500}>
            🔁 {entry.triggerService.name} → {entry.followUpService?.name ?? "—"}
          </Text>
          <Text size="xs" c="dimmed">Cita del {formatLongDate(entry.startDate, timezone)}</Text>
          <Text size="xs" c="dimmed">
            {entry.processedAt
              ? `Procesado el ${formatLongDate(entry.processedAt, timezone)}`
              : "Procesado antes de que se registrara la fecha"}
          </Text>
        </Box>
        <Badge size="xs" color={badge.color} variant="filled">{badge.label}</Badge>
      </Group>
    </Paper>
  );
}
