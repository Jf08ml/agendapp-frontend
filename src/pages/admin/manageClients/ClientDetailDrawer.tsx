/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Drawer,
  Tabs,
  Group,
  Avatar,
  Text,
  ActionIcon,
  Menu,
  Stack,
  Box,
  Paper,
  Progress,
  Badge,
  Select,
  Table,
  ScrollArea,
  Loader,
  Center,
  Tooltip,
  Textarea,
  Button,
  Modal,
  SimpleGrid,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconPencil,
  IconDotsVertical,
  IconGitMerge,
  IconRestore,
  IconTrash,
  IconUserPlus,
  IconCirclePlus,
} from "@tabler/icons-react";
import { RootState } from "../../../app/store";
import { selectOrganization } from "../../../features/organization/sliceOrganization";
import {
  Client,
  RewardHistoryEntry,
  redeemReward,
  ClientFollowUpStatus,
  FollowUpPendingEntry,
  FollowUpProcessedEntry,
  FollowUpOutcome,
  getClientFollowUpStatus,
} from "../../../services/clientService";
import {
  Appointment,
  getAppointmentsByClient,
  updateAppointmentNotes,
} from "../../../services/appointmentService";
import { formatInTimezone } from "../../../utils/timezoneUtils";
import { getCountryFlag, getCountryName } from "../../../utils/countryHelper";
import { getLoyaltyProgress } from "./utils/loyaltyProgress";

interface ClientDetailDrawerProps {
  opened: boolean;
  onClose: () => void;
  client: Client | null;
  onRegisterService: (clientId: string) => void;
  onReferral: (clientId: string) => void;
  onEditClient: (client: Client) => void;
  onMergeClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onForceDeleteClient: (id: string) => void;
  onResetClientLoyalty: (clientId: string) => void;
  onClientUpdated: (updated: Client) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "attended", label: "Asistió" },
  { value: "no_show", label: "No asistió" },
  { value: "cancelled_by_admin,cancelled_by_customer,cancelled", label: "Canceladas" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return { label: "Pendiente", color: "yellow" };
    case "confirmed":
      return { label: "Confirmada", color: "green" };
    case "cancelled":
    case "cancelled_by_customer":
      return { label: "Cancelada por cliente", color: "red" };
    case "cancelled_by_admin":
      return { label: "Cancelada por admin", color: "orange" };
    case "attended":
      return { label: "Asistió", color: "teal" };
    case "no_show":
      return { label: "No asistió", color: "pink" };
    default:
      return { label: status, color: "gray" };
  }
};

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
    default:
      return { label: "Desconocido (histórico)", color: "gray" };
  }
};

const getFollowUpPendingBadge = (entry: FollowUpPendingEntry) => {
  if (entry.windowState === "expired") return { label: "Vencido sin procesar", color: "red" };
  if (entry.windowState === "upcoming") return { label: "Programado", color: "yellow" };
  if (entry.preview?.wouldSend) return { label: "Se enviará hoy", color: "green" };
  return { label: "No se enviará", color: "gray" };
};

function confirmAction(action: () => void, title: string, message: string, color: string) {
  openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: "Confirmar", cancel: "Cancelar" },
    confirmProps: { color },
    onConfirm: action,
    centered: true,
  });
}

function CompactLoyaltyCard({
  label,
  color,
  count,
  tiers,
  legacyThreshold,
  legacyReward,
}: {
  label: string;
  color: string;
  count: number;
  tiers?: { threshold: number; reward: string }[];
  legacyThreshold?: number;
  legacyReward?: string;
}) {
  const progress = getLoyaltyProgress(count, tiers, legacyThreshold, legacyReward);

  if (!progress.configured) {
    return (
      <Group justify="space-between">
        <Text size="sm" c="dimmed">{label}</Text>
        <Badge variant="light" color={color} size="lg">{progress.count}</Badge>
      </Group>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={500}>{label}</Text>
        <Text size="xs" c="dimmed">{progress.count} / {progress.maxThreshold}</Text>
      </Group>
      <Progress value={progress.progressPct} size="lg" radius="xl" color={color} striped animated />
      <Text size="xs" c="dimmed" mt={4}>
        {progress.allCompleted ? (
          "¡Todos los niveles completados!"
        ) : (
          <>Te faltan <b>{progress.remaining}</b> para: <b>{progress.nextTier?.reward}</b></>
        )}
      </Text>
    </Box>
  );
}

const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({
  opened,
  onClose,
  client,
  onRegisterService,
  onReferral,
  onEditClient,
  onMergeClient,
  onDeleteClient,
  onForceDeleteClient,
  onResetClientLoyalty,
  onClientUpdated,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const organization = useSelector((state: RootState) => selectOrganization(state));
  const timezone = organization?.timezone || "America/Bogota";
  const timeFormat = organization?.timeFormat || "12h";
  const timeFmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";

  const [activeTab, setActiveTab] = useState<string>("resumen");

  // ── Citas ──────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [citasLoadedForClientId, setCitasLoadedForClientId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [noteModalOpened, setNoteModalOpened] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // ── Premios ────────────────────────────────────────────────────────────
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // ── Seguimientos ───────────────────────────────────────────────────────
  const [followUpStatus, setFollowUpStatus] = useState<ClientFollowUpStatus | null>(null);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [followUpLoadedForClientId, setFollowUpLoadedForClientId] = useState<string | null>(null);

  // Reset lo efímero cada vez que cambia el cliente mostrado (o se cierra)
  useEffect(() => {
    setActiveTab("resumen");
    setAppointments([]);
    setCitasLoadedForClientId(null);
    setStatusFilter("");
    setFollowUpStatus(null);
    setFollowUpLoadedForClientId(null);
  }, [client?._id]);

  const fetchAppointments = async (clientId: string, status: string) => {
    setLoadingAppointments(true);
    try {
      const res = await getAppointmentsByClient(clientId, status || undefined);
      setAppointments(res);
      setCitasLoadedForClientId(clientId);
    } catch (err) {
      console.error("Error obteniendo las citas:", err);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Fetch perezoso: solo la primera vez que se activa la pestaña Citas
  useEffect(() => {
    if (activeTab === "citas" && client && citasLoadedForClientId !== client._id) {
      void fetchAppointments(client._id, statusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, client?._id]);

  const handleStatusFilterChange = (value: string | null) => {
    const next = value ?? "";
    setStatusFilter(next);
    if (client) void fetchAppointments(client._id, next);
  };

  const fetchFollowUpStatus = async (clientId: string) => {
    setLoadingFollowUp(true);
    try {
      const res = await getClientFollowUpStatus(clientId);
      setFollowUpStatus(res ?? null);
      setFollowUpLoadedForClientId(clientId);
    } catch (err) {
      console.error("Error obteniendo el estado de recordatorios de seguimiento:", err);
      setFollowUpStatus(null);
    } finally {
      setLoadingFollowUp(false);
    }
  };

  // Fetch perezoso: solo la primera vez que se activa la pestaña Seguimientos
  useEffect(() => {
    if (activeTab === "seguimientos" && client && followUpLoadedForClientId !== client._id) {
      void fetchFollowUpStatus(client._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, client?._id]);

  const getMostTakenServiceType = () => {
    if (appointments.length === 0) return "—";
    const typeCount: Record<string, number> = {};
    appointments.forEach((a) => {
      if (!a.service) return;
      const type = (a.service as any).type;
      if (!type) return;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const entries = Object.entries(typeCount);
    if (entries.length === 0) return "—";
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  const handleOpenNoteEditor = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setNoteDraft(appointment.sessionNotes || "");
    setNoteModalOpened(true);
  };

  const handleSaveNote = async () => {
    if (!editingAppointment) return;
    setSavingNote(true);
    try {
      const updated = await updateAppointmentNotes(editingAppointment._id, noteDraft);
      if (updated) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === updated._id ? { ...a, sessionNotes: updated.sessionNotes } : a))
        );
        showNotification({ title: "Notas guardadas", message: "El registro de la sesión se actualizó correctamente.", color: "green", autoClose: 2500, position: "top-right" });
        setNoteModalOpened(false);
      }
    } catch (err) {
      showNotification({ title: "Error", message: (err as Error).message || "No se pudieron guardar las notas.", color: "red", autoClose: 4000, position: "top-right" });
    } finally {
      setSavingNote(false);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    if (!client) return;
    setRedeemingId(rewardId);
    try {
      const updated = await redeemReward(client._id, rewardId);
      if (updated) {
        onClientUpdated(updated);
        showNotification({ title: "Recompensa canjeada", message: "La recompensa fue marcada como canjeada.", color: "green", autoClose: 3000, position: "top-right" });
      }
    } catch (err) {
      showNotification({ title: "Error", message: (err as Error).message || "No se pudo canjear.", color: "red", autoClose: 4000, position: "top-right" });
    } finally {
      setRedeemingId(null);
    }
  };

  if (!client) return null;

  const rewardsList: RewardHistoryEntry[] = client.rewardHistory || [];

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        size={isMobile ? "100%" : "md"}
        title={
          <Group gap="sm" wrap="nowrap">
            <Avatar radius="xl" color="blue">{client.name.charAt(0).toUpperCase()}</Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>{client.name}</Text>
              <Text size="xs" c="dimmed" truncate>
                {client.phone_country && `${getCountryFlag(client.phone_country)} `}
                {client.phoneNumber}
              </Text>
            </Box>
          </Group>
        }
      >
        <Group justify="flex-end" gap="xs" mb="md">
          <Tooltip label="Editar cliente">
            <ActionIcon variant="light" onClick={() => onEditClient(client)}>
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Menu shadow="sm" width={220} withinPortal>
            <Menu.Target>
              <ActionIcon variant="default">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconGitMerge size={16} />} onClick={() => onMergeClient(client)}>
                Fusionar con...
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRestore size={16} />}
                color="teal"
                onClick={() =>
                  confirmAction(
                    () => onResetClientLoyalty(client._id),
                    "Restablecer contadores",
                    "¿Deseas reiniciar los servicios tomados y referidos a 0 para este cliente?",
                    "green"
                  )
                }
              >
                Restablecer contadores
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() =>
                  confirmAction(
                    () => { onDeleteClient(client._id); onClose(); },
                    "Eliminar Cliente",
                    "¿Estás seguro? Esta acción no se puede deshacer.",
                    "red"
                  )
                }
              >
                Eliminar cliente
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={() =>
                  confirmAction(
                    () => { onForceDeleteClient(client._id); onClose(); },
                    "Eliminar con citas",
                    "⚠️ Se eliminarán el cliente Y TODAS SUS CITAS. Esta acción no se puede deshacer.",
                    "red"
                  )
                }
              >
                Eliminar con citas
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || "resumen")}>
          <Tabs.List mb="md">
            <Tabs.Tab value="resumen">Resumen</Tabs.Tab>
            <Tabs.Tab value="citas">Citas</Tabs.Tab>
            <Tabs.Tab value="seguimientos">Seguimientos</Tabs.Tab>
            <Tabs.Tab value="premios">Premios</Tabs.Tab>
          </Tabs.List>

          {/* ── Resumen ── */}
          <Tabs.Panel value="resumen">
            <Stack gap="md">
              <Paper withBorder radius="md" p="md">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">Fidelidad</Text>
                <Stack gap="md">
                  <CompactLoyaltyCard
                    label="Servicios tomados"
                    color="blue"
                    count={client.servicesTaken}
                    tiers={organization?.serviceTiers}
                    legacyThreshold={organization?.serviceCount}
                    legacyReward={organization?.serviceReward}
                  />
                  <CompactLoyaltyCard
                    label="Referidos hechos"
                    color="grape"
                    count={client.referralsMade}
                    tiers={organization?.referralTiers}
                    legacyThreshold={organization?.referredCount}
                    legacyReward={organization?.referredReward}
                  />
                </Stack>
              </Paper>

              <SimpleGrid cols={2} spacing="sm">
                <Button
                  leftSection={<IconCirclePlus size={16} />}
                  variant="light"
                  color="green"
                  onClick={() => onRegisterService(client._id)}
                >
                  Registrar servicio
                </Button>
                <Button
                  leftSection={<IconUserPlus size={16} />}
                  variant="light"
                  color="grape"
                  onClick={() => onReferral(client._id)}
                >
                  Registrar referido
                </Button>
              </SimpleGrid>

              <Paper withBorder radius="md" p="md">
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">Información</Text>
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Teléfono</Text>
                    <Text size="sm">{client.phoneNumber}</Text>
                  </Group>
                  {client.phone_country && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">País</Text>
                      <Text size="sm">{getCountryFlag(client.phone_country)} {getCountryName(client.phone_country)}</Text>
                    </Group>
                  )}
                  {client.email && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Correo</Text>
                      <Text size="sm">{client.email}</Text>
                    </Group>
                  )}
                  {client.documentId && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Documento</Text>
                      <Text size="sm">{client.documentId}</Text>
                    </Group>
                  )}
                  {client.birthDate && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Fecha de nacimiento</Text>
                      <Text size="sm">
                        {new Date(client.birthDate).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                      </Text>
                    </Group>
                  )}
                  {client.notes && (
                    <Box mt={4}>
                      <Text size="sm" c="dimmed" mb={2}>Notas</Text>
                      <Text size="sm">{client.notes}</Text>
                    </Box>
                  )}
                  {!client.email && !client.documentId && !client.birthDate && !client.notes && (
                    <Text size="xs" c="dimmed">Sin información adicional registrada.</Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* ── Citas ── */}
          <Tabs.Panel value="citas">
            <Group mb="md" justify="space-between" align="center">
              <Select
                placeholder="Filtrar por estado"
                data={STATUS_OPTIONS}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                w={200}
                clearable={false}
              />
              {!loadingAppointments && (
                <Text size="sm" c="dimmed">
                  {appointments.length} cita{appointments.length !== 1 ? "s" : ""}
                </Text>
              )}
            </Group>

            {loadingAppointments ? (
              <Center py="xl"><Loader size="md" /></Center>
            ) : appointments.length > 0 ? (
              <>
                <Text mb="sm">
                  <strong>Tipo de servicio más tomado:</strong> {getMostTakenServiceType()}
                </Text>
                <ScrollArea.Autosize mah={420}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Servicio</Table.Th>
                        <Table.Th>Profesional</Table.Th>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Notas</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {appointments.map((a) => {
                        const statusBadge = getStatusBadge(a.status);
                        return (
                          <Table.Tr key={a._id}>
                            <Table.Td>{a.service?.name ?? "—"}</Table.Td>
                            <Table.Td>{(a.employee as any)?.names ?? "—"}</Table.Td>
                            <Table.Td>{formatInTimezone(a.startDate, timezone, `DD/MM/YYYY ${timeFmt}`)}</Table.Td>
                            <Table.Td>
                              <Badge color={statusBadge.color} variant="light">{statusBadge.label}</Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap" justify="space-between">
                                <Text size="sm" c={a.sessionNotes ? undefined : "dimmed"} lineClamp={1} style={{ maxWidth: 140 }}>
                                  {a.sessionNotes || "Sin notas"}
                                </Text>
                                <Tooltip label="Editar notas de la sesión">
                                  <ActionIcon variant="subtle" size="sm" onClick={() => handleOpenNoteEditor(a)}>
                                    <IconPencil size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </>
            ) : (
              <Text c="dimmed">
                {statusFilter ? "No hay citas con el estado seleccionado" : "No hay citas registradas"}
              </Text>
            )}
          </Tabs.Panel>

          {/* ── Seguimientos ── */}
          <Tabs.Panel value="seguimientos">
            {loadingFollowUp ? (
              <Center py="xl"><Loader size="md" /></Center>
            ) : !followUpStatus || !followUpStatus.organizationHasRules ? (
              <Text c="dimmed" ta="center" py="md">
                Tu organización no tiene ningún servicio con recordatorio de seguimiento configurado.
              </Text>
            ) : followUpStatus.pending.length === 0 && followUpStatus.processed.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                Este cliente no tiene citas asociadas a un servicio con seguimiento configurado.
              </Text>
            ) : (
              <Stack gap="md">
                {followUpStatus.pending.length > 0 && (
                  <Paper withBorder radius="md" p="md">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">Próximos</Text>
                    <Stack gap="sm">
                      {followUpStatus.pending.map((entry) => (
                        <PendingFollowUpCard
                          key={entry.appointmentId}
                          entry={entry}
                          timezone={timezone}
                        />
                      ))}
                    </Stack>
                  </Paper>
                )}

                {followUpStatus.processed.filter((p) => p.outcome === "sent").length > 0 && (
                  <Paper withBorder radius="md" p="md">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">Enviados</Text>
                    <Stack gap="sm">
                      {followUpStatus.processed
                        .filter((p) => p.outcome === "sent")
                        .map((entry) => (
                          <ProcessedFollowUpCard key={entry.appointmentId} entry={entry} timezone={timezone} />
                        ))}
                    </Stack>
                  </Paper>
                )}

                {followUpStatus.processed.filter((p) => p.outcome !== "sent").length > 0 && (
                  <Paper withBorder radius="md" p="md">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">No enviados</Text>
                    <Stack gap="sm">
                      {followUpStatus.processed
                        .filter((p) => p.outcome !== "sent")
                        .map((entry) => (
                          <ProcessedFollowUpCard key={entry.appointmentId} entry={entry} timezone={timezone} />
                        ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}
          </Tabs.Panel>

          {/* ── Premios ── */}
          <Tabs.Panel value="premios">
            {rewardsList.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">Este cliente aún no ha ganado ningún premio.</Text>
            ) : (
              <Stack gap="sm">
                {[...rewardsList].reverse().map((entry) => (
                  <RewardCard key={entry._id} entry={entry} redeemingId={redeemingId} onRedeem={handleRedeem} />
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Drawer>

      {/* Modal edición de notas de sesión */}
      <Modal
        opened={noteModalOpened}
        onClose={() => setNoteModalOpened(false)}
        title={
          <Group gap={6}>
            <IconPencil size={16} />
            <Text fw={600}>Notas de la sesión</Text>
          </Group>
        }
        centered
        size="md"
        zIndex={1000}
      >
        {editingAppointment && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {editingAppointment.service?.name ?? "—"} ·{" "}
              {formatInTimezone(editingAppointment.startDate, timezone, `DD/MM/YYYY ${timeFmt}`)}
            </Text>
            <Textarea
              placeholder="¿Qué se hizo en esta sesión? Observaciones, seguimiento, próximos pasos..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.currentTarget.value)}
              minRows={5}
              autosize
              maxRows={12}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setNoteModalOpened(false)} disabled={savingNote}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNote} loading={savingNote}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
};

// ── Tarjeta de premio individual (con expandir para canjear) ─────────────
function RewardCard({
  entry,
  redeemingId,
  onRedeem,
}: {
  entry: RewardHistoryEntry;
  redeemingId: string | null;
  onRedeem: (rewardId: string) => void;
}) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} mb={2}>
            <Text size="lg">{entry.type === "service" ? "🏆" : "🎁"}</Text>
            <Badge size="xs" color={entry.type === "service" ? "blue" : "grape"} variant="light">
              {entry.type === "service" ? "Fidelidad" : "Referidos"}
            </Badge>
            <Badge size="xs" color={entry.redeemed ? "green" : "orange"} variant="filled">
              {entry.redeemed ? "Canjeado" : "Pendiente"}
            </Badge>
          </Group>
          <Text size="sm" fw={500} lineClamp={2}>{entry.reward}</Text>
          <Text size="xs" c="dimmed">
            Ganado el {new Date(entry.earnedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
          </Text>
          {entry.redeemed && entry.redeemedAt && (
            <Text size="xs" c="green">
              Canjeado el {new Date(entry.redeemedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </Text>
          )}
        </Box>
        {!entry.redeemed && (
          <Button
            size="xs"
            color="green"
            variant="light"
            loading={redeemingId === entry._id}
            onClick={() => onRedeem(entry._id)}
          >
            Canjear
          </Button>
        )}
      </Group>
    </Paper>
  );
}

// ── Tarjeta de recordatorio de seguimiento pendiente/programado ──────────
function PendingFollowUpCard({ entry, timezone }: { entry: FollowUpPendingEntry; timezone: string }) {
  const badge = getFollowUpPendingBadge(entry);
  const fmt = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: timezone });

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500}>
            🔁 {entry.triggerService.name} → {entry.followUpService?.name ?? "—"}
          </Text>
          <Text size="xs" c="dimmed">
            Cita del {fmt(entry.startDate)} · seguimiento a los {entry.followUpDays} días
          </Text>
          <Text size="xs" c="dimmed">
            Fecha proyectada: {fmt(entry.projectedDate)}
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
function ProcessedFollowUpCard({ entry, timezone }: { entry: FollowUpProcessedEntry; timezone: string }) {
  const badge = getFollowUpOutcomeBadge(entry.outcome);
  const fmt = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: timezone });

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={500}>
            🔁 {entry.triggerService.name} → {entry.followUpService?.name ?? "—"}
          </Text>
          <Text size="xs" c="dimmed">Cita del {fmt(entry.startDate)}</Text>
          <Text size="xs" c="dimmed">
            {entry.processedAt ? `Procesado el ${fmt(entry.processedAt)}` : "Procesado antes de que se registrara la fecha"}
          </Text>
        </Box>
        <Badge size="xs" color={badge.color} variant="filled">{badge.label}</Badge>
      </Group>
    </Paper>
  );
}

export default ClientDetailDrawer;
