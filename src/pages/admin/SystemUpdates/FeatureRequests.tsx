import { useEffect, useState } from "react";
import {
  Box,
  Text,
  Stack,
  Paper,
  Badge,
  Group,
  Textarea,
  Button,
  Loader,
  Alert,
  Center,
  ActionIcon,
  Tooltip,
  UnstyledButton,
  Collapse,
} from "@mantine/core";
import { IconAlertCircle, IconSend, IconX, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import {
  createFeatureRequest,
  getMyFeatureRequests,
  closeFeatureRequest,
  type FeatureRequest,
  type FeatureRequestStatus,
} from "../../../services/featureRequestService";

const STATUS_CONFIG: Record<FeatureRequestStatus, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "gray" },
  under_review: { label: "En revisión", color: "blue" },
  planned: { label: "Planeada", color: "violet" },
  done: { label: "Implementada", color: "teal" },
  declined: { label: "No planeada", color: "red" },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

function RequestCard({
  request,
  onClose,
  closing,
}: {
  request: FeatureRequest;
  onClose?: (id: string) => void;
  closing: boolean;
}) {
  const cfg = STATUS_CONFIG[request.status];
  return (
    <Paper withBorder radius="md" p="sm" opacity={request.closedByOrg ? 0.6 : 1}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" td={request.closedByOrg ? "line-through" : undefined}>
            {request.text}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {formatDate(request.createdAt)}
          </Text>
          {request.adminReply && (
            <Box
              mt="xs"
              p="sm"
              style={{
                borderLeft: "2px solid var(--mantine-color-violet-3)",
                borderRadius: "0 4px 4px 0",
                backgroundColor: "var(--mantine-color-violet-0)",
              }}
            >
              <Text size="sm" c="dimmed">
                {request.adminReply}
              </Text>
            </Box>
          )}
        </Box>
        <Group gap={4} wrap="nowrap">
          <Badge size="xs" color={cfg.color} variant="filled">
            {cfg.label}
          </Badge>
          {onClose && (
            <Tooltip label="Retirar solicitud">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                loading={closing}
                onClick={() => onClose(request._id)}
              >
                <IconX size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

export default function FeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    getMyFeatureRequests()
      .then(setRequests)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await createFeatureRequest(text.trim());
      setText("");
      showNotification({
        title: "Solicitud enviada",
        message: "Gracias por tu idea, la vamos a revisar.",
        color: "green",
        autoClose: 3000,
        position: "top-right",
      });
      loadRequests();
    } catch (err) {
      showNotification({
        title: "Error",
        message: (err as Error).message || "No se pudo enviar la solicitud.",
        color: "red",
        autoClose: 4000,
        position: "top-right",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (id: string) => {
    setClosingId(id);
    try {
      await closeFeatureRequest(id);
      showNotification({
        title: "Solicitud retirada",
        message: "La quitamos de tu lista activa.",
        color: "gray",
        autoClose: 2500,
        position: "top-right",
      });
      loadRequests();
    } catch (err) {
      showNotification({
        title: "Error",
        message: (err as Error).message || "No se pudo retirar la solicitud.",
        color: "red",
        autoClose: 4000,
        position: "top-right",
      });
    } finally {
      setClosingId(null);
    }
  };

  const confirmClose = (id: string) => {
    openConfirmModal({
      title: "Retirar solicitud",
      children: <Text size="sm">¿Ya no necesitas esta solicitud? Se retira de tu lista activa (no se borra).</Text>,
      labels: { confirm: "Sí, retirar", cancel: "Cancelar" },
      confirmProps: { color: "gray" },
      onConfirm: () => handleClose(id),
      centered: true,
    });
  };

  const activeRequests = requests.filter((r) => !r.closedByOrg);
  const closedRequests = requests.filter((r) => r.closedByOrg);

  return (
    <Box p="md" maw={720} mx="auto">
      <Text size="sm" c="dimmed" mb="md">
        ¿Te falta algo en AgenditApp o se te ocurre una mejora? Contánoslo — lo revisamos y acá vas a ver el estado
        de tu solicitud.
      </Text>

      <Paper withBorder radius="md" p="md" mb="xl">
        <Textarea
          placeholder='Ej: "Quiero poder compartir el detalle de mis servicios con un link"'
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          minRows={3}
          autosize
          maxRows={8}
        />
        <Group justify="flex-end" mt="sm">
          <Button
            leftSection={<IconSend size={16} />}
            onClick={handleSubmit}
            loading={sending}
            disabled={!text.trim()}
          >
            Enviar solicitud
          </Button>
        </Group>
      </Paper>

      {loading && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          No se pudieron cargar tus solicitudes. Intenta de nuevo más tarde.
        </Alert>
      )}

      {!loading && !error && requests.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Todavía no has enviado ninguna solicitud.
        </Text>
      )}

      {!loading && !error && activeRequests.length > 0 && (
        <Stack gap="sm">
          {activeRequests.map((r) => (
            <RequestCard key={r._id} request={r} onClose={confirmClose} closing={closingId === r._id} />
          ))}
        </Stack>
      )}

      {!loading && !error && closedRequests.length > 0 && (
        <Box mt="lg">
          <UnstyledButton onClick={() => setShowClosed((v) => !v)}>
            <Group gap={4} c="dimmed">
              <Text size="xs" fw={500}>
                {showClosed ? "Ocultar" : "Ver"} retiradas ({closedRequests.length})
              </Text>
              {showClosed ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            </Group>
          </UnstyledButton>
          <Collapse in={showClosed}>
            <Stack gap="sm" mt="sm">
              {closedRequests.map((r) => (
                <RequestCard key={r._id} request={r} closing={false} />
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
