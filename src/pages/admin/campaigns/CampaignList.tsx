/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/campaigns/CampaignList.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Title,
  Paper,
  TextInput,
  Select,
  Table,
  Badge,
  ActionIcon,
  Pagination,
  Loader,
  Alert,
  Center,
  Text,
  Group,
  Card,
} from "@mantine/core";
import { IconPlus, IconEye, IconRefresh } from "@tabler/icons-react";
import { useAppSelector } from "../../../app/store";
import campaignService from "../../../services/campaignService";
import type { Campaign } from "../../../types/campaign";
import { getCampaignStatusLabel } from "../../../utils/campaignValidations";

export default function CampaignList() {
  const navigate = useNavigate();
  const organization = useAppSelector(
    (state) => state.organization.organization
  );
  const orgId = organization?._id || "";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCampaigns = async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await campaignService.listCampaigns(orgId, {
        page,
        limit: 10,
        status: statusFilter === "all" ? undefined : statusFilter || undefined,
      });
      setCampaigns(result.campaigns || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.message || "Error cargando campañas");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [page, statusFilter, orgId]);

  const filteredCampaigns = (campaigns || []).filter(
    (campaign) =>
      !searchQuery ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>📜 Campañas de WhatsApp</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate("/admin/campaigns/new")}
        >
          Nueva Campaña
        </Button>
      </Group>

      <Paper p="md" mb="lg">
        <Group>
          <TextInput
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ minWidth: 250 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: "all", label: "Todas" },
              { value: "running", label: "En progreso" },
              { value: "completed", label: "Completadas" },
              { value: "dry-run", label: "Simulaciones" },
              { value: "cancelled", label: "Canceladas" },
              { value: "failed", label: "Fallidas" },
            ]}
            style={{ minWidth: 150 }}
          />
          <ActionIcon variant="light" onClick={loadCampaigns} title="Refrescar">
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      </Paper>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py={80}>
          <Loader />
        </Center>
      ) : filteredCampaigns.length === 0 ? (
        <Card p="xl" ta="center">
          <Title order={3} c="dimmed" mb="sm">
            No hay campañas
          </Title>
          <Text c="dimmed" mb="lg">
            {statusFilter === "all"
              ? "Aún no has creado ninguna campaña"
              : "No hay campañas con ese estado"}
          </Text>
          <Button
            leftSection={<IconPlus />}
            onClick={() => navigate("/admin/campaigns/new")}
          >
            Crear mi primera campaña
          </Button>
        </Card>
      ) : (
        <>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Título</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th ta="center">Enviados</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th ta="center">Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredCampaigns.map((campaign) => {
                const statusInfo = getCampaignStatusLabel(campaign.status);
                return (
                  <Table.Tr key={campaign._id}>
                    <Table.Td>
                      <Text fw={500}>{campaign.title}</Text>
                      {campaign.isDryRun && (
                        <Badge size="sm" color="orange" ml="xs">
                          DRY RUN
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
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
                      >
                        {statusInfo.emoji} {statusInfo.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Text>
                        {campaign.stats.sent}/{campaign.stats.total}
                      </Text>
                      {campaign.stats.failed > 0 && (
                        <Text size="xs" c="red">
                          {campaign.stats.failed} fallidos
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(campaign.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td ta="center">
                      <ActionIcon
                        variant="light"
                        onClick={() =>
                          navigate(`/admin/campaigns/${campaign._id}`)
                        }
                        title="Ver detalle"
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {totalPages > 1 && (
            <Center mt="lg">
              <Pagination total={totalPages} value={page} onChange={setPage} />
            </Center>
          )}
        </>
      )}
    </Container>
  );
}
