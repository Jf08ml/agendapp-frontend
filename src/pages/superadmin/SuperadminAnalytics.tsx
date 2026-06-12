/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/superadmin/SuperadminAnalytics.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Paper,
  SimpleGrid,
  Badge,
  Table,
  Divider,
  Loader,
  SegmentedControl,
  Select,
  Button,
  ScrollArea,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  BiBuildings,
  BiCreditCard,
  BiPackage,
  BiUserCheck,
  BiBarChartAlt2,
  BiBot,
} from "react-icons/bi";
import { notifications } from "@mantine/notifications";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getPlatformOverview,
  getPlatformTimeSeries,
  getOrganizationRanking,
  type PlatformOverview,
  type PlatformTimeSeriesPoint,
  type OrganizationRankingItem,
} from "../../services/platformAnalyticsService";

dayjs.locale("es");

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Activas",
  trial: "En prueba",
  pending: "Pendientes",
  past_due: "En mora",
  suspended: "Suspendidas",
  cancelled: "Canceladas",
  expired: "Vencidas",
};

const MEMBERSHIP_STATUS_COLORS: Record<string, string> = {
  active: "green",
  trial: "blue",
  pending: "yellow",
  past_due: "orange",
  suspended: "red",
  cancelled: "gray",
  expired: "dark",
};

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Text fw={700} size="xl">
          {value}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

export default function SuperadminAnalytics() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<PlatformTimeSeriesPoint[]>([]);
  const [ranking, setRanking] = useState<OrganizationRankingItem[]>([]);

  const [range, setRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(29, "day").startOf("day").toDate(),
    dayjs().endOf("day").toDate(),
  ]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [rankingSortBy, setRankingSortBy] = useState<"citas" | "ingresos">("citas");

  useEffect(() => {
    if (granularity === "month") {
      setRange([
        dayjs().subtract(5, "month").startOf("month").toDate(),
        dayjs().endOf("month").toDate(),
      ]);
    } else if (granularity === "week") {
      setRange([
        dayjs().subtract(7, "week").startOf("week").toDate(),
        dayjs().endOf("week").toDate(),
      ]);
    } else {
      setRange([
        dayjs().subtract(29, "day").startOf("day").toDate(),
        dayjs().endOf("day").toDate(),
      ]);
    }
  }, [granularity]);

  useEffect(() => {
    const load = async () => {
      if (!range[0] || !range[1]) return;
      setLoading(true);
      try {
        const startDate = dayjs(range[0]).format("YYYY-MM-DD");
        const endDate = dayjs(range[1]).format("YYYY-MM-DD");

        const [overviewData, seriesData, rankingData] = await Promise.all([
          getPlatformOverview({ startDate, endDate }),
          getPlatformTimeSeries({ startDate, endDate, granularity }),
          getOrganizationRanking({ startDate, endDate, sortBy: rankingSortBy, limit: 10 }),
        ]);

        setOverview(overviewData);
        setTimeSeries(seriesData);
        setRanking(rankingData);
      } catch (err) {
        console.error("Error cargando analítica de plataforma:", err);
        notifications.show({
          color: "red",
          title: "Error",
          message: "No se pudo cargar la analítica de la plataforma",
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [range[0], range[1], granularity, rankingSortBy]);

  const conversionRate = useMemo(() => {
    if (!overview) return 0;
    return overview.newOrganizations > 0
      ? (overview.trialToActiveConversions / overview.newOrganizations) * 100
      : 0;
  }, [overview]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navegación superadmin */}
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<BiCreditCard size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin")}
          >
            Membresías
          </Button>
          <Button
            variant="light"
            leftSection={<BiBuildings size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin/orgs")}
          >
            Organizaciones
          </Button>
          <Button
            variant="light"
            leftSection={<BiPackage size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin/planes")}
          >
            Planes
          </Button>
          <Button
            variant="light"
            leftSection={<BiUserCheck size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin/agentes")}
          >
            Agentes
          </Button>
          <Button
            variant="filled"
            leftSection={<BiBarChartAlt2 size={16} />}
            size="sm"
          >
            Analítica
          </Button>
          <Button
            variant="light"
            leftSection={<BiBot size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin/chatbots")}
          >
            Chatbots IA
          </Button>
        </Group>

        {/* Header + filtros */}
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <div>
                <Title order={2}>Analítica global de la plataforma</Title>
                <Text c="dimmed" size="sm">
                  Comportamiento agregado de AgenditApp: crecimiento, actividad operativa, salud de membresías e ingresos
                </Text>
              </div>
              {loading && <Loader size="sm" />}
            </Group>

            <Group wrap="wrap" gap="sm" align="flex-end">
              <DatePickerInput
                type="range"
                label="Rango de fechas"
                placeholder="Selecciona un rango"
                value={range}
                onChange={setRange}
                locale="es"
                dropdownType="modal"
              />
              <div>
                <SegmentedControl
                  value={granularity}
                  onChange={(v: any) => setGranularity(v)}
                  data={[
                    { label: "Día", value: "day" },
                    { label: "Semana", value: "week" },
                    { label: "Mes", value: "month" },
                  ]}
                  size={isMobile ? "xs" : "sm"}
                />
                {granularity === "month" && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Mostrando últimos 6 meses. Modifica el rango para ver más.
                  </Text>
                )}
                {granularity === "week" && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Mostrando últimas 8 semanas. Modifica el rango para ver más.
                  </Text>
                )}
              </div>
            </Group>
          </Stack>
        </Card>

        {/* KPIs principales */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <KpiCard
            label="🆕 Nuevas organizaciones"
            value={overview?.newOrganizations ?? 0}
            hint="Registradas en el rango"
          />
          <KpiCard
            label="🔁 Conversión trial → activa"
            value={`${conversionRate.toFixed(1)}%`}
            hint={`${overview?.trialToActiveConversions ?? 0} activaciones (estimado)`}
          />
          <KpiCard
            label="📅 Citas totales"
            value={overview?.appointments.total ?? 0}
            hint={`${overview?.appointments.atendidas ?? 0} atendidas`}
          />
          <KpiCard
            label="💵 MRR estimado"
            value={formatCurrency(overview?.mrr ?? 0, "COP")}
            hint="Ingreso mensual recurrente (excluye planes lifetime)"
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <KpiCard
            label="📩 Reservas"
            value={overview?.reservations ?? 0}
            hint="Solicitudes recibidas en el rango"
          />
          <KpiCard
            label="❌ Cancelaciones"
            value={overview?.appointments.canceladas ?? 0}
            hint={`${overview?.appointments.noShows ?? 0} no-shows`}
          />
          <KpiCard
            label="💰 Ingresos por citas"
            value={formatCurrency(overview?.appointments.ingresos ?? 0, "COP")}
            hint="Suma de totalPrice en el rango"
          />
        </SimpleGrid>

        {/* Salud de membresías */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">
            Salud de membresías
          </Text>
          <Divider mb="sm" />
          <Group gap="xs" wrap="wrap">
            {Object.entries(overview?.membershipBreakdown ?? {}).map(([status, count]) => (
              <Badge
                key={status}
                size="lg"
                variant="light"
                color={MEMBERSHIP_STATUS_COLORS[status] || "gray"}
              >
                {(MEMBERSHIP_STATUS_LABELS[status] || status)}: {count}
              </Badge>
            ))}
            {(!overview || Object.keys(overview.membershipBreakdown).length === 0) && (
              <Text c="dimmed" size="sm">
                Sin datos de membresías
              </Text>
            )}
          </Group>
        </Card>

        {/* Tendencia */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="lg">
              Tendencia: actividad de la plataforma
            </Text>
            <Badge variant="light" color="blue">
              {timeSeries.length} puntos
            </Badge>
          </Group>
          <Divider mb="sm" />
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer
              key={`chart-${granularity}-${range[0]?.getTime()}-${range[1]?.getTime()}`}
            >
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RTooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="citas"
                  name="Citas"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cancelaciones"
                  name="Cancelaciones"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="newOrgs"
                  name="Nuevas organizaciones"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ranking de organizaciones */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs" wrap="wrap">
            <Text fw={700} size="lg">
              Top organizaciones por actividad
            </Text>
            <Select
              value={rankingSortBy}
              onChange={(v) => setRankingSortBy((v as "citas" | "ingresos") || "citas")}
              data={[
                { value: "citas", label: "Ordenar por citas" },
                { value: "ingresos", label: "Ordenar por ingresos" },
              ]}
              size="sm"
              w={200}
            />
          </Group>
          <Divider mb="sm" />
          <ScrollArea>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Organización</Table.Th>
                  <Table.Th>Citas</Table.Th>
                  <Table.Th>Ingresos</Table.Th>
                  <Table.Th>Membresía</Table.Th>
                  <Table.Th>Última actividad</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ranking.map((row) => (
                  <Table.Tr key={row.organizationId}>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text fw={600} size="sm">
                          {row.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {row.slug}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{row.citas}</Table.Td>
                    <Table.Td>{formatCurrency(row.ingresos || 0, "COP")}</Table.Td>
                    <Table.Td>
                      {row.membershipStatus ? (
                        <Badge
                          size="sm"
                          variant="light"
                          color={MEMBERSHIP_STATUS_COLORS[row.membershipStatus] || "gray"}
                        >
                          {MEMBERSHIP_STATUS_LABELS[row.membershipStatus] || row.membershipStatus}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          Sin membresía
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {row.lastActivity ? dayjs(row.lastActivity).format("DD/MM/YYYY HH:mm") : "—"}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {ranking.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center">
                        No hay datos para los filtros seleccionados.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      </Stack>
    </Container>
  );
}
