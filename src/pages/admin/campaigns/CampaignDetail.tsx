/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/campaigns/CampaignDetail.tsx
import {
  useState,
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Title,
  Paper,
  Alert,
  Loader,
  Center,
  Text,
  Group,
  Grid,
  Card,
  Progress,
  Table,
  Badge,
  Modal,
} from "@mantine/core";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import { getCampaignStatusLabel } from "../../../utils/campaignValidations";
import type { Campaign } from "../../../types/campaign";

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const organization = useAppSelector(
    (state) => state.organization.organization
  );
  const orgId = organization?._id || "";
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [converting, setConverting] = useState(false);

  const loadCampaign = async () => {
    if (!campaignId) return;
    try {
      const data = await campaignService.getCampaignDetail(orgId, campaignId);
      setCampaign(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error cargando detalles de campaña");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
    const interval = setInterval(() => {
      if (campaign && campaign.status === "running") {
        loadCampaign();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [campaignId, campaign?.status]);

  const handleCancelCampaign = async () => {
    if (!campaignId) return;
    setCancelling(true);
    try {
      await campaignService.cancelCampaign(orgId, campaignId);
      setCancelModalOpen(false);
      await loadCampaign();
    } catch (err: any) {
      alert("Error cancelando campaña: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleConvertToReal = async () => {
    if (!campaignId) return;
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas enviar esta campaña de forma REAL a todos los destinatarios?"
    );
    if (!confirmed) return;

    setConverting(true);
    try {
      const newCampaign = await campaignService.convertDryRunToReal(
        orgId,
        campaignId
      );
      alert("✅ Campaña real creada exitosamente");
      navigate(`/admin/campaigns/${newCampaign._id}`);
    } catch (err: any) {
      alert("Error creando campaña real: " + err.message);
    } finally {
      setConverting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Center h="80vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (error || !campaign) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" mb="md">
          {error || "Campaña no encontrada"}
        </Alert>
        <Button
          leftSection={<IconArrowLeft />}
          onClick={() => navigate("/admin/campaigns")}
        >
          Volver a Campañas
        </Button>
      </Container>
    );
  }

  const statusInfo = getCampaignStatusLabel(campaign.status);
  const progressPercent =
    campaign.stats.total > 0
      ? (campaign.stats.sent / campaign.stats.total) * 100
      : 0;

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Box>
          <Button
            leftSection={<IconArrowLeft />}
            variant="subtle"
            onClick={() => navigate("/admin/campaigns")}
            mb="xs"
          >
            Volver
          </Button>
          <Title order={2}>{campaign.title}</Title>
          <Text size="sm" c="dimmed">
            Creada el {formatDate(campaign.createdAt)}
          </Text>
        </Box>
        <Box>
          <Badge
            size="lg"
            color={
              statusInfo.color === "green"
                ? "green"
                : statusInfo.color === "blue"
                ? "blue"
                : statusInfo.color === "orange"
                ? "orange"
                : statusInfo.color === "red"
                ? "red"
                : "gray"
            }
            mb="xs"
          >
            {statusInfo.emoji} {statusInfo.label}
          </Badge>
          {campaign.isDryRun && (
            <Badge size="lg" color="orange" ml="xs">
              DRY RUN
            </Badge>
          )}

          <Group gap="xs" mt="xs">
            {campaign.status === "running" && (
              <Button
                leftSection={<IconX />}
                color="red"
                size="sm"
                onClick={() => setCancelModalOpen(true)}
              >
                Cancelar Campaña
              </Button>
            )}
            {campaign.isDryRun && campaign.status === "completed" && (
              <Button
                color="green"
                size="sm"
                onClick={handleConvertToReal}
                loading={converting}
              >
                📤 Enviar Campaña Real
              </Button>
            )}
          </Group>
        </Box>
      </Group>

      {campaign.cancelReason && (
        <Alert color="orange" mb="lg" title="Campaña cancelada">
          {campaign.cancelReason} — {formatDate(campaign.cancelledAt!)}
        </Alert>
      )}

      <Grid mb="lg">
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Card>
            <Text size="xs" c="dimmed" mb={4}>
              Total destinatarios
            </Text>
            <Title order={3}>{campaign.stats.total}</Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Card>
            <Text size="xs" c="dimmed" mb={4}>
              ✅ Enviados
            </Text>
            <Title order={3} c="green">
              {campaign.stats.sent}
            </Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Card>
            <Text size="xs" c="dimmed" mb={4}>
              ⏳ Pendientes
            </Text>
            <Title order={3} c="blue">
              {campaign.stats.pending}
            </Title>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Card>
            <Text size="xs" c="dimmed" mb={4}>
              ❌ Fallidos
            </Text>
            <Title order={3} c="red">
              {campaign.stats.failed}
            </Title>
          </Card>
        </Grid.Col>
      </Grid>

      <Paper p="md" mb="lg">
        <Group justify="space-between" mb="xs">
          <Text fw={500}>Progreso de envío</Text>
          <Text size="sm" c="dimmed">
            {progressPercent.toFixed(1)}%
          </Text>
        </Group>
        <Progress
          value={progressPercent}
          color={
            campaign.status === "completed"
              ? "green"
              : campaign.status === "failed" || campaign.status === "cancelled"
              ? "red"
              : "blue"
          }
          size="lg"
          animated={campaign.status === "running"}
        />
      </Paper>

      {campaign.items && campaign.items.length > 0 && (
        <Paper p="md">
          <Title order={4} mb="md">
            📋 Detalle de envíos ({campaign.items.length})
          </Title>
          <Box style={{ maxHeight: 400, overflow: "auto" }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Teléfono</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Fecha/Hora</Table.Th>
                  <Table.Th>Error</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {campaign.items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {item.phone}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          color={
                            item.status === "sent"
                              ? "green"
                              : item.status === "pending"
                              ? "blue"
                              : "red"
                          }
                        >
                          {item.status === "sent"
                            ? "✅ Enviado"
                            : item.status === "pending"
                            ? "⏳ Pendiente"
                            : "❌ Fallido"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {item.sentAt ? (
                          <Text size="xs">{formatDate(item.sentAt)}</Text>
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {item.errorMessage ? (
                          <Text size="xs" c="red">
                            {item.errorMessage}
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  )
                )}
              </Table.Tbody>
            </Table>
          </Box>
        </Paper>
      )}

      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="⚠️ Confirmar cancelación"
      >
        <Text mb="lg">
          ¿Estás seguro de que deseas cancelar esta campaña? Los mensajes ya
          enviados no pueden revertirse, pero se detendrán los envíos
          pendientes.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="subtle"
            onClick={() => setCancelModalOpen(false)}
            disabled={cancelling}
          >
            No, volver
          </Button>
          <Button
            color="red"
            onClick={handleCancelCampaign}
            loading={cancelling}
          >
            Sí, cancelar campaña
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
