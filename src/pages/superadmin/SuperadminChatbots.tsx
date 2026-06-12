// pages/superadmin/SuperadminChatbots.tsx
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
  Select,
  Button,
  ScrollArea,
  Modal,
  Pagination,
  Checkbox,
  Box,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  BiBuildings,
  BiCreditCard,
  BiPackage,
  BiUserCheck,
  BiBarChartAlt2,
  BiBot,
} from "react-icons/bi";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getChatbotStats,
  getChatbotSessions,
  type ChatbotStats,
  type ChatbotSession,
} from "../../services/chatbotAnalyticsService";

dayjs.locale("es");

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

const fmtNum = (n: number | undefined) => (n ?? 0).toLocaleString("es-CO");

export default function SuperadminChatbots() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChatbotStats | null>(null);

  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [onlyConverted, setOnlyConverted] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatbotSession | null>(null);

  const [range, setRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(29, "day").startOf("day").toDate(),
    dayjs().endOf("day").toDate(),
  ]);

  const dateParams = useMemo(() => {
    if (!range[0] || !range[1]) return null;
    return {
      startDate: dayjs(range[0]).format("YYYY-MM-DD"),
      endDate: dayjs(range[1]).format("YYYY-MM-DD"),
    };
  }, [range]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setLoading(true);
      try {
        setStats(await getChatbotStats(dateParams));
      } catch (err) {
        console.error("Error cargando métricas de chatbots:", err);
        notifications.show({
          color: "red",
          title: "Error",
          message: "No se pudieron cargar las métricas de chatbots",
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dateParams]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setSessionsLoading(true);
      try {
        const res = await getChatbotSessions({
          ...dateParams,
          type: (typeFilter as "admin" | "booking") || undefined,
          converted: onlyConverted || undefined,
          hasError: onlyErrors || undefined,
          page,
          limit: 20,
        });
        setSessions(res.sessions);
        setPages(res.pages);
      } catch (err) {
        console.error("Error cargando sesiones de chat:", err);
      } finally {
        setSessionsLoading(false);
      }
    };
    void load();
  }, [dateParams, typeFilter, onlyConverted, onlyErrors, page]);

  const bookingStats = stats?.porTipo.find((t) => t._id === "booking");
  const adminStats = stats?.porTipo.find((t) => t._id === "admin");
  const totalTokens =
    (stats?.porTipo ?? []).reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
  const bookingFeedback = stats?.feedback.find((f) => f._id === "booking");

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
            variant="light"
            leftSection={<BiBarChartAlt2 size={16} />}
            size="sm"
            onClick={() => navigate("/superadmin/analiticas")}
          >
            Analítica
          </Button>
          <Button variant="filled" leftSection={<BiBot size={16} />} size="sm">
            Chatbots IA
          </Button>
        </Group>

        {/* Header + filtros */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Title order={2}>Analítica de chatbots IA</Title>
              <Text c="dimmed" size="sm">
                Uso, conversión y costos de los asistentes (booking público y admin)
              </Text>
            </div>
            <Group gap="sm" align="flex-end">
              <DatePickerInput
                type="range"
                label="Rango de fechas"
                placeholder="Selecciona un rango"
                value={range}
                onChange={setRange}
                locale="es"
                dropdownType="modal"
              />
              {loading && <Loader size="sm" />}
            </Group>
          </Group>
        </Card>

        {/* KPIs */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <KpiCard
            label="💬 Sesiones de booking"
            value={fmtNum(bookingStats?.sesiones)}
            hint={`${fmtNum(adminStats?.sesiones)} sesiones del bot admin`}
          />
          <KpiCard
            label="🎯 Conversión total"
            value={`${stats?.funnelBooking.tasaConversionTotal ?? 0}%`}
            hint={`${fmtNum(stats?.funnelBooking.reservasCreadas)} reservas creadas de ${fmtNum(stats?.funnelBooking.sesiones)} sesiones`}
          />
          <KpiCard
            label="🧾 Payloads preparados"
            value={`${stats?.funnelBooking.tasaPreparacion ?? 0}%`}
            hint={`${fmtNum(stats?.funnelBooking.conPayloadPreparado)} sesiones llegaron al botón de confirmar (${stats?.funnelBooking.tasaConversionPayload ?? 0}% de ellas convirtió)`}
          />
          <KpiCard
            label="🪙 Tokens consumidos"
            value={fmtNum(totalTokens)}
            hint={`Entrada + salida, ambos bots${bookingFeedback ? ` · satisfacción ${bookingFeedback.ratingPromedio.toFixed(1)}/5 (${bookingFeedback.total})` : ""}`}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <KpiCard
            label="🔁 Rondas promedio (booking)"
            value={(bookingStats?.rondasPromedio ?? 0).toFixed(1)}
            hint={`${((bookingStats?.duracionPromedioMs ?? 0) / 1000).toFixed(1)}s de duración promedio`}
          />
          <KpiCard
            label="⚠️ Sesiones con round-limit"
            value={fmtNum((bookingStats?.conRoundLimit ?? 0) + (adminStats?.conRoundLimit ?? 0))}
            hint="El agente agotó las rondas sin resolver"
          />
          <KpiCard
            label="❌ Sesiones con error"
            value={fmtNum((bookingStats?.conError ?? 0) + (adminStats?.conError ?? 0))}
            hint="Excepciones durante el procesamiento"
          />
        </SimpleGrid>

        {/* Desglose por organización */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">
            Top organizaciones por uso
          </Text>
          <Divider mb="sm" />
          <ScrollArea>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Organización</Table.Th>
                  <Table.Th>Sesiones</Table.Th>
                  <Table.Th>Booking</Table.Th>
                  <Table.Th>Admin</Table.Th>
                  <Table.Th>Reservas creadas</Table.Th>
                  <Table.Th>Tokens</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(stats?.porOrganizacion ?? []).map((row) => (
                  <Table.Tr key={row.organizationId}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {row.nombre}
                      </Text>
                    </Table.Td>
                    <Table.Td>{row.sesiones}</Table.Td>
                    <Table.Td>{row.booking}</Table.Td>
                    <Table.Td>{row.admin}</Table.Td>
                    <Table.Td>
                      {row.convertidas}
                      {row.conPayload > 0 && (
                        <Text span size="xs" c="dimmed">
                          {" "}
                          / {row.conPayload} preparadas
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{fmtNum(row.inputTokens + row.outputTokens)}</Table.Td>
                  </Table.Tr>
                ))}
                {(!stats || stats.porOrganizacion.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center">
                        No hay datos para el rango seleccionado.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Sesiones recientes */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="xs" wrap="wrap">
            <Text fw={700} size="lg">
              Sesiones recientes
            </Text>
            <Group gap="sm">
              <Select
                value={typeFilter}
                onChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
                placeholder="Todos los tipos"
                clearable
                data={[
                  { value: "booking", label: "Booking" },
                  { value: "admin", label: "Admin" },
                ]}
                size="sm"
                w={160}
              />
              <Checkbox
                label="Solo convertidas"
                checked={onlyConverted}
                onChange={(e) => {
                  setOnlyConverted(e.currentTarget.checked);
                  setPage(1);
                }}
              />
              <Checkbox
                label="Solo con error"
                checked={onlyErrors}
                onChange={(e) => {
                  setOnlyErrors(e.currentTarget.checked);
                  setPage(1);
                }}
              />
              {sessionsLoading && <Loader size="xs" />}
            </Group>
          </Group>
          <Divider mb="sm" />
          <ScrollArea>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Organización</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Rondas</Table.Th>
                  <Table.Th>Tokens</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sessions.map((s) => (
                  <Table.Tr key={s._id}>
                    <Table.Td>{dayjs(s.createdAt).format("DD/MM HH:mm")}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{s.organizationId?.name || "—"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={s.type === "booking" ? "blue" : "grape"}>
                        {s.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{s.rounds}</Table.Td>
                    <Table.Td>{fmtNum(s.inputTokens + s.outputTokens)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {s.reservationCreated && (
                          <Badge size="sm" color="green" variant="light">
                            Convertida
                          </Badge>
                        )}
                        {!s.reservationCreated && s.bookingPayload != null && (
                          <Badge size="sm" color="yellow" variant="light">
                            Preparada
                          </Badge>
                        )}
                        {s.hitRoundLimit && (
                          <Badge size="sm" color="orange" variant="light">
                            Round limit
                          </Badge>
                        )}
                        {s.error && (
                          <Badge size="sm" color="red" variant="light">
                            Error
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Button size="compact-xs" variant="subtle" onClick={() => setSelectedSession(s)}>
                        Ver chat
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {sessions.length === 0 && !sessionsLoading && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center">
                        No hay sesiones con los filtros seleccionados.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {pages > 1 && (
            <Group justify="center" mt="md">
              <Pagination value={page} onChange={setPage} total={pages} size="sm" />
            </Group>
          )}
        </Card>
      </Stack>

      {/* Modal: conversación completa */}
      <Modal
        opened={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={
          <Group gap="xs">
            <Text fw={600}>Conversación</Text>
            {selectedSession && (
              <Badge size="sm" variant="light">
                {selectedSession.organizationId?.name || "—"} · {selectedSession.type}
              </Badge>
            )}
          </Group>
        }
        size="lg"
      >
        {selectedSession && (
          <Stack gap="sm">
            <Group gap="xs">
              <Badge size="sm" variant="outline">
                {selectedSession.rounds} rondas
              </Badge>
              <Badge size="sm" variant="outline">
                {fmtNum(selectedSession.inputTokens + selectedSession.outputTokens)} tokens
              </Badge>
              {selectedSession.toolsUsed?.length > 0 && (
                <Badge size="sm" variant="outline">
                  {selectedSession.toolsUsed.join(", ")}
                </Badge>
              )}
            </Group>
            {selectedSession.error && (
              <Paper withBorder p="sm" radius="md" bg="red.0">
                <Text size="sm" c="red.8">
                  Error: {selectedSession.error}
                </Text>
              </Paper>
            )}
            <Stack gap="xs">
              {selectedSession.messages.map((m, i) => (
                <Box
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                  }}
                >
                  <Paper
                    withBorder
                    p="xs"
                    radius="md"
                    bg={m.role === "user" ? "blue.0" : "gray.0"}
                  >
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {m.content}
                    </Text>
                  </Paper>
                </Box>
              ))}
              {selectedSession.reply && (
                <Box style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                  <Paper withBorder p="xs" radius="md" bg="gray.0">
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {selectedSession.reply}
                    </Text>
                  </Paper>
                </Box>
              )}
            </Stack>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
