// pages/superadmin/SuperadminChatbots.tsx
import { useEffect, useMemo, useState } from "react";
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
  Textarea,
  Box,
  Tabs,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import SuperadminNav from "./SuperadminNav";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getChatbotStats,
  getChatbotSessions,
  markChatLogSessionReviewed,
  getWaBotSessions,
  getWaBotSessionMessages,
  markWaBotSessionReviewed,
  REVIEW_CATEGORIES,
  type ChatbotStats,
  type ChatbotSession,
  type ChatSessionReview,
  type WaBotSession,
  type WaBotSessionMessage,
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

type ModalMessage = { role: "user" | "assistant"; content: string };

/** Bloque de revisión reusado en el modal, tanto para sesiones de ChatLog como del agente WhatsApp. */
function ReviewPanel({
  reviewed,
  onReviewedChange,
  category,
  onCategoryChange,
  notes,
  onNotesChange,
  onSave,
  saving,
  lastReview,
}: {
  reviewed: boolean;
  onReviewedChange: (v: boolean) => void;
  category: string | null;
  onCategoryChange: (v: string | null) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  lastReview?: ChatSessionReview;
}) {
  return (
    <Paper withBorder p="sm" radius="md" bg="gray.0">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap">
          <Text fw={600} size="sm">
            Revisión
          </Text>
          {lastReview?.reviewed && (
            <Text size="xs" c="dimmed">
              Revisado por {lastReview.reviewedBy || "—"}
              {lastReview.reviewedAt
                ? ` · ${dayjs(lastReview.reviewedAt).format("DD/MM/YYYY HH:mm")}`
                : ""}
            </Text>
          )}
        </Group>
        <Checkbox
          label="Marcado como revisado"
          checked={reviewed}
          onChange={(e) => onReviewedChange(e.currentTarget.checked)}
        />
        <Select
          label="Categoría del hallazgo"
          placeholder="Sin categoría"
          data={REVIEW_CATEGORIES}
          value={category}
          onChange={onCategoryChange}
          clearable
          size="sm"
        />
        <Textarea
          label="Notas"
          placeholder="Qué se encontró, qué debería ajustarse..."
          value={notes}
          onChange={(e) => onNotesChange(e.currentTarget.value)}
          autosize
          minRows={2}
          size="sm"
        />
        <Group justify="flex-end">
          <Button size="sm" loading={saving} onClick={onSave}>
            Guardar revisión
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

export default function SuperadminChatbots() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("web");

  // ── ChatLog (chat web / booking WhatsApp) ──────────────────────────────────
  const [sessions, setSessions] = useState<ChatbotSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [reviewedFilter, setReviewedFilter] = useState<string | null>(null);
  const [onlyConverted, setOnlyConverted] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatbotSession | null>(null);

  // ── Agente admin por WhatsApp (WaBotMessage) ────────────────────────────────
  const [waSessions, setWaSessions] = useState<WaBotSession[]>([]);
  const [waSessionsLoading, setWaSessionsLoading] = useState(false);
  const [waPage, setWaPage] = useState(1);
  const [waPages, setWaPages] = useState(1);
  const [waReviewedFilter, setWaReviewedFilter] = useState<string | null>(null);
  const [selectedWaSession, setSelectedWaSession] = useState<WaBotSession | null>(null);
  const [waModalMessages, setWaModalMessages] = useState<WaBotSessionMessage[]>([]);
  const [waModalLoading, setWaModalLoading] = useState(false);

  // ── Panel de revisión (compartido entre ambas pestañas) ─────────────────────
  const [reviewChecked, setReviewChecked] = useState(false);
  const [reviewCategory, setReviewCategory] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

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
          channel: (channelFilter as "web" | "whatsapp") || undefined,
          converted: onlyConverted || undefined,
          hasError: onlyErrors || undefined,
          reviewed: reviewedFilter === "true" ? true : reviewedFilter === "false" ? false : undefined,
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
  }, [dateParams, typeFilter, channelFilter, reviewedFilter, onlyConverted, onlyErrors, page]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setWaSessionsLoading(true);
      try {
        const res = await getWaBotSessions({
          ...dateParams,
          reviewed: waReviewedFilter === "true" ? true : waReviewedFilter === "false" ? false : undefined,
          page: waPage,
          limit: 20,
        });
        setWaSessions(res.sessions);
        setWaPages(res.pages);
      } catch (err) {
        console.error("Error cargando sesiones del agente WhatsApp:", err);
      } finally {
        setWaSessionsLoading(false);
      }
    };
    void load();
  }, [dateParams, waReviewedFilter, waPage]);

  // Resetea el borrador de revisión cada vez que se abre/cierra una sesión distinta
  useEffect(() => {
    const review = selectedSession?.review || selectedWaSession?.review;
    setReviewChecked(!!review?.reviewed);
    setReviewCategory(review?.category || null);
    setReviewNotes(review?.notes || "");
  }, [selectedSession, selectedWaSession]);

  const openSession = (s: ChatbotSession) => setSelectedSession(s);

  const openWaSession = async (s: WaBotSession) => {
    setSelectedWaSession(s);
    setWaModalLoading(true);
    try {
      setWaModalMessages(await getWaBotSessionMessages(s.sessionId));
    } catch (err) {
      console.error("Error cargando mensajes de la sesión:", err);
      notifications.show({ color: "red", message: "No se pudieron cargar los mensajes" });
    } finally {
      setWaModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSession(null);
    setSelectedWaSession(null);
    setWaModalMessages([]);
  };

  const handleSaveReview = async () => {
    setReviewSaving(true);
    try {
      const payload = {
        reviewed: reviewChecked,
        category: reviewCategory || undefined,
        notes: reviewNotes || undefined,
      };
      if (selectedSession) {
        const updated = await markChatLogSessionReviewed(selectedSession._id, payload);
        setSessions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
        setSelectedSession(updated);
      } else if (selectedWaSession) {
        const res = await markWaBotSessionReviewed(selectedWaSession.sessionId, payload);
        setWaSessions((prev) =>
          prev.map((s) => (s.sessionId === res.sessionId ? { ...s, review: res.review } : s))
        );
        setSelectedWaSession((prev) => (prev ? { ...prev, review: res.review } : prev));
      }
      notifications.show({ color: "teal", message: "Revisión guardada." });
    } catch (err) {
      console.error("Error guardando revisión:", err);
      notifications.show({ color: "red", message: "No se pudo guardar la revisión." });
    } finally {
      setReviewSaving(false);
    }
  };

  const bookingStats = stats?.porTipo.find((t) => t._id === "booking");
  const adminStats = stats?.porTipo.find((t) => t._id === "admin");
  const totalTokens = (stats?.porTipo ?? []).reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
  const bookingFeedback = stats?.feedback.find((f) => f._id === "booking");
  const totalSesiones = (bookingStats?.sesiones ?? 0) + (adminStats?.sesiones ?? 0);
  const totalRevisadas = (bookingStats?.revisadas ?? 0) + (adminStats?.revisadas ?? 0);

  const modalMessages: ModalMessage[] = selectedSession
    ? [
        ...selectedSession.messages,
        ...(selectedSession.reply ? [{ role: "assistant" as const, content: selectedSession.reply }] : []),
      ]
    : waModalMessages;

  const modalOpen = !!selectedSession || !!selectedWaSession;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navegación superadmin (compartida) */}
        <SuperadminNav />

        {/* Header + filtros */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Title order={2}>Analítica de chatbots IA</Title>
              <Text c="dimmed" size="sm">
                Uso, conversión, costos y revisión de los asistentes (booking público, admin web y
                agente admin por WhatsApp)
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

        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
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
          <KpiCard
            label="🔍 Revisión pendiente (ChatLog)"
            value={fmtNum(totalSesiones - totalRevisadas)}
            hint={`${fmtNum(totalRevisadas)} de ${fmtNum(totalSesiones)} ya revisadas`}
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

        {/* Sesiones + revisión */}
        <Card withBorder radius="md" p="md">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="sm">
              <Tabs.Tab value="web">Chat web (admin + booking)</Tabs.Tab>
              <Tabs.Tab value="wa">Agente admin por WhatsApp</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="web">
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
                    w={150}
                  />
                  <Select
                    value={channelFilter}
                    onChange={(v) => {
                      setChannelFilter(v);
                      setPage(1);
                    }}
                    placeholder="Todos los canales"
                    clearable
                    data={[
                      { value: "web", label: "Web" },
                      { value: "whatsapp", label: "WhatsApp" },
                    ]}
                    size="sm"
                    w={160}
                  />
                  <Select
                    value={reviewedFilter}
                    onChange={(v) => {
                      setReviewedFilter(v);
                      setPage(1);
                    }}
                    placeholder="Todas"
                    clearable
                    data={[
                      { value: "true", label: "Revisadas" },
                      { value: "false", label: "Sin revisar" },
                    ]}
                    size="sm"
                    w={150}
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
                      <Table.Th>Canal</Table.Th>
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
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {s.channel === "whatsapp" ? "WhatsApp" : "Web"}
                          </Text>
                        </Table.Td>
                        <Table.Td>{s.rounds}</Table.Td>
                        <Table.Td>{fmtNum(s.inputTokens + s.outputTokens)}</Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {s.review?.reviewed && (
                              <Badge size="sm" color="teal" variant="filled">
                                Revisada
                              </Badge>
                            )}
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
                          <Button size="compact-xs" variant="subtle" onClick={() => openSession(s)}>
                            Ver chat
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {sessions.length === 0 && !sessionsLoading && (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
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
            </Tabs.Panel>

            <Tabs.Panel value="wa">
              <Group justify="space-between" mb="xs" wrap="wrap">
                <Text fw={700} size="lg">
                  Sesiones del agente admin (WhatsApp)
                </Text>
                <Group gap="sm">
                  <Select
                    value={waReviewedFilter}
                    onChange={(v) => {
                      setWaReviewedFilter(v);
                      setWaPage(1);
                    }}
                    placeholder="Todas"
                    clearable
                    data={[
                      { value: "true", label: "Revisadas" },
                      { value: "false", label: "Sin revisar" },
                    ]}
                    size="sm"
                    w={150}
                  />
                  {waSessionsLoading && <Loader size="xs" />}
                </Group>
              </Group>
              <Text size="xs" c="dimmed" mb="xs">
                Conversaciones del staff con el agente IA vía WhatsApp (número de plataforma). No hay
                métricas de tokens/rondas para este canal.
              </Text>
              <Divider mb="sm" />
              <ScrollArea>
                <Table withTableBorder striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Última actividad</Table.Th>
                      <Table.Th>Organización</Table.Th>
                      <Table.Th>Mensajes</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {waSessions.map((s) => (
                      <Table.Tr key={s.sessionId}>
                        <Table.Td>{dayjs(s.lastMessageAt).format("DD/MM HH:mm")}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{s.organizationId?.name || "—"}</Text>
                        </Table.Td>
                        <Table.Td>{s.messageCount}</Table.Td>
                        <Table.Td>
                          {s.review?.reviewed && (
                            <Badge size="sm" color="teal" variant="filled">
                              Revisada
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Button size="compact-xs" variant="subtle" onClick={() => void openWaSession(s)}>
                            Ver chat
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {waSessions.length === 0 && !waSessionsLoading && (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text c="dimmed" ta="center">
                            No hay sesiones con los filtros seleccionados.
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              {waPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination value={waPage} onChange={setWaPage} total={waPages} size="sm" />
                </Group>
              )}
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>

      {/* Modal: conversación completa (compartido entre ambas pestañas) */}
      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={
          <Group gap="xs">
            <Text fw={600}>Conversación</Text>
            {selectedSession && (
              <Badge size="sm" variant="light">
                {selectedSession.organizationId?.name || "—"} · {selectedSession.type}
              </Badge>
            )}
            {selectedWaSession && (
              <Badge size="sm" variant="light">
                {selectedWaSession.organizationId?.name || "—"} · agente WhatsApp
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
          </Stack>
        )}
        {(selectedSession || selectedWaSession) && (
          <Stack gap="sm" mt="sm">
            {waModalLoading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : (
              <Stack gap="xs">
                {modalMessages.map((m, i) => (
                  <Box
                    key={i}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                    }}
                  >
                    <Paper withBorder p="xs" radius="md" bg={m.role === "user" ? "blue.0" : "gray.0"}>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {m.content}
                      </Text>
                    </Paper>
                  </Box>
                ))}
              </Stack>
            )}

            <ReviewPanel
              reviewed={reviewChecked}
              onReviewedChange={setReviewChecked}
              category={reviewCategory}
              onCategoryChange={setReviewCategory}
              notes={reviewNotes}
              onNotesChange={setReviewNotes}
              onSave={() => void handleSaveReview()}
              saving={reviewSaving}
              lastReview={selectedSession?.review || selectedWaSession?.review}
            />
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
