/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import {
  Box, Title, Tabs, Button, Group, Text, Badge, Card, Stack,
  ActionIcon, Tooltip, Table, ScrollArea, Skeleton, Center,
  Menu, Alert, Progress, SimpleGrid,  Checkbox,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconPlus, IconPencil, IconTrash, IconDots, IconEye,
  IconCheck, IconX, IconSchool, IconDoor, IconCalendar, IconUsers,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

import {
  Room, ClassType, ClassSession, Enrollment, BulkSessionPayload,
  getRooms, createRoom, updateRoom, deleteRoom,
  getClasses, createClass, updateClass, deleteClass,
  getSessions, createSession, updateSession, cancelSession, deleteSession, deleteSessionsBulk,
  bulkCreateSessions,
  getEnrollments, approveEnrollment, cancelEnrollment,
} from "../../../services/classService";
import { getEmployeesByOrganizationId, Employee } from "../../../services/employeeService";

import RoomFormModal from "./components/RoomFormModal";
import ClassFormModal from "./components/ClassFormModal";
import SessionFormModal from "./components/SessionFormModal";
import SessionDetailModal from "./components/SessionDetailModal";
import BulkSessionModal from "./components/BulkSessionModal";
import ClassWhatsappTemplates from "./components/ClassWhatsappTemplates";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const STATUS_COLORS: Record<string, string> = {
  open: "green", full: "red", cancelled: "gray", completed: "blue",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Disponible", full: "Llena", cancelled: "Cancelada", completed: "Completada",
};

// ══════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════

export default function ManageClasses() {
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const organization = useSelector((s: RootState) => s.organization.organization);
  const tz = organization?.timezone || "America/Bogota";

  // Datos
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<Enrollment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Loading
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modales
  const [roomModal, setRoomModal] = useState(false);
  const [classModal, setClassModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingClass, setEditingClass] = useState<ClassType | null>(null);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    if (!organizationId) return;
    setLoadingRooms(true);
    setLoadingClasses(true);
    setLoadingSessions(true);
    setLoadingEnrollments(true);
    try {
      const [r, c, s, e, emp] = await Promise.all([
        getRooms(),
        getClasses(true),
        getSessions(),
        getEnrollments({ status: "pending" }),
        getEmployeesByOrganizationId(organizationId),
      ]);
      setRooms(r);
      setClasses(c);
      setSessions(s);
      setPendingEnrollments(e.enrollments);
      setEmployees(emp);
    } finally {
      setLoadingRooms(false);
      setLoadingClasses(false);
      setLoadingSessions(false);
      setLoadingEnrollments(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── ROOMS ──────────────────────────────────────────
  const handleRoomSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom._id, data);
        showNotification({ message: "Salón actualizado", color: "green" });
      } else {
        await createRoom(data);
        showNotification({ message: "Salón creado", color: "green" });
      }
      setRoomModal(false);
      setEditingRoom(null);
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    modals.openConfirmModal({
      title: "Eliminar salón",
      children: <Text size="sm">¿Eliminar el salón <b>{room.name}</b>? Esta acción no se puede deshacer.</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteRoom(room._id);
          showNotification({ message: "Salón eliminado", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── CLASSES ────────────────────────────────────────
  const handleClassSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass._id, data);
        showNotification({ message: "Clase actualizada", color: "green" });
      } else {
        await createClass(data);
        showNotification({ message: "Clase creada", color: "green" });
      }
      setClassModal(false);
      setEditingClass(null);
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = (c: ClassType) => {
    modals.openConfirmModal({
      title: "Eliminar clase",
      children: <Text size="sm">¿Eliminar la clase <b>{c.name}</b>? No se puede deshacer.</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteClass(c._id);
          showNotification({ message: "Clase eliminada", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── SESSIONS ───────────────────────────────────────
  const handleSessionSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingSession) {
        await updateSession(editingSession._id, data);
        showNotification({ message: "Sesión actualizada", color: "green" });
      } else {
        await createSession(data);
        showNotification({ message: "Sesión creada", color: "green" });
      }
      setSessionModal(false);
      setEditingSession(null);
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
      throw err; // re-throw para que SessionFormModal muestre el error inline
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async (data: BulkSessionPayload) => {
    const result = await bulkCreateSessions(data);
    if (result) {
      showNotification({
        message: `${result.created.length} sesión(es) programada(s)${result.skipped.length ? `, ${result.skipped.length} omitida(s) por conflicto` : ""}`,
        color: result.skipped.length ? "orange" : "green",
      });
      loadAll();
    }
    return result;
  };

  const handleCancelSession = (session: ClassSession) => {
    const classDoc = typeof session.classId === "object" ? session.classId : null;
    modals.openConfirmModal({
      title: "Cancelar sesión",
      children: (
        <Text size="sm">
          ¿Cancelar la sesión de <b>{classDoc?.name}</b> del{" "}
          {dayjs(session.startDate).tz(tz).format("D [de] MMMM [a las] HH:mm")}?
          Todas las inscripciones pendientes y confirmadas también serán canceladas.
        </Text>
      ),
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await cancelSession(session._id);
          showNotification({ message: "Sesión cancelada", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  const handleDeleteSession = (session: ClassSession) => {
    const classDoc = typeof session.classId === "object" ? session.classId : null;
    modals.openConfirmModal({
      title: "Eliminar sesión",
      children: (
        <Text size="sm">
          ¿Eliminar permanentemente la sesión de <b>{classDoc?.name}</b> del{" "}
          {dayjs(session.startDate).tz(tz).format("D [de] MMMM [a las] HH:mm")}?
          Se eliminarán también todas las inscripciones asociadas. Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteSession(session._id);
          showNotification({ message: "Sesión eliminada", color: "red" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    modals.openConfirmModal({
      title: "Eliminar sesiones seleccionadas",
      children: (
        <Text size="sm">
          ¿Eliminar permanentemente <b>{count} sesión{count !== 1 ? "es" : ""}</b>?
          Se eliminarán también todas las inscripciones asociadas. Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: `Eliminar ${count}`, cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteSessionsBulk(Array.from(selectedIds));
          showNotification({ message: `${count} sesión${count !== 1 ? "es eliminadas" : " eliminada"}`, color: "red" });
          setSelectedIds(new Set());
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── ENROLLMENTS ────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveEnrollment(id);
      showNotification({ message: "Inscripción aprobada", color: "green" });
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEnrollment = (id: string, name: string) => {
    modals.openConfirmModal({
      title: "Cancelar inscripción",
      children: <Text size="sm">¿Cancelar la inscripción de <b>{name}</b>?</Text>,
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setActionLoading(id);
        try {
          await cancelEnrollment(id);
          showNotification({ message: "Inscripción cancelada", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  return (
    <Box p="md">
      <Title order={2} mb="lg">
        Módulo de Clases
      </Title>

      <Tabs defaultValue="sessions" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="sessions" leftSection={<IconCalendar size={16} />}>
            Sesiones
          </Tabs.Tab>
          <Tabs.Tab value="enrollments" leftSection={<IconUsers size={16} />}>
            Reservas
            {pendingEnrollments.length > 0 && (
              <Badge size="xs" color="red" circle ml={6}>
                {pendingEnrollments.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="classes" leftSection={<IconSchool size={16} />}>
            Tipos de Clase
          </Tabs.Tab>
          <Tabs.Tab value="rooms" leftSection={<IconDoor size={16} />}>
            Salones
          </Tabs.Tab>
          <Tabs.Tab value="messages" leftSection={<IconBrandWhatsapp size={16} />}>
            Mensajes
          </Tabs.Tab>
        </Tabs.List>

        {/* ─── SESIONES ─────────────────────────────────── */}
        <Tabs.Panel value="sessions">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <Text fw={600}>Sesiones programadas</Text>
              {selectedIds.size > 0 && (
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleBulkDelete}
                >
                  Eliminar {selectedIds.size} seleccionada{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              )}
            </Group>
            <Group gap="xs">
              <Button
                variant="light"
                leftSection={<IconCalendar size={16} />}
                onClick={() => setBulkModal(true)}
              >
                Programar horario
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => { setEditingSession(null); setSessionModal(true); }}
              >
                Nueva sesión
              </Button>
            </Group>
          </Group>

          {loadingSessions ? (
            <Stack gap="xs">{Array(4).fill(0).map((_, i) => <Skeleton key={i} h={60} radius="md" />)}</Stack>
          ) : sessions.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconCalendar size={40} color="gray" />
                <Text c="dimmed">No hay sesiones programadas</Text>
                <Button size="xs" variant="light" onClick={() => setSessionModal(true)}>
                  Crear primera sesión
                </Button>
              </Stack>
            </Center>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>
                      <Checkbox
                        size="xs"
                        checked={sessions.length > 0 && selectedIds.size === sessions.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < sessions.length}
                        onChange={(e) =>
                          setSelectedIds(e.currentTarget.checked ? new Set(sessions.map((s) => s._id)) : new Set())
                        }
                      />
                    </Table.Th>
                    <Table.Th>Clase</Table.Th>
                    <Table.Th>Fecha y hora</Table.Th>
                    <Table.Th>Instructor</Table.Th>
                    <Table.Th>Salón</Table.Th>
                    <Table.Th>Cupo</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sessions.map((s) => {
                    const classDoc = typeof s.classId === "object" ? s.classId : null;
                    const employee = typeof s.employeeId === "object" ? s.employeeId : null;
                    const room = typeof s.roomId === "object" ? s.roomId : null;
                    const start = dayjs(s.startDate).tz(tz);
                    const pct = s.capacity > 0 ? Math.round((s.enrolledCount / s.capacity) * 100) : 0;
                    const isSelected = selectedIds.has(s._id);

                    return (
                      <Table.Tr key={s._id} bg={isSelected ? "var(--mantine-color-red-0)" : undefined}>
                        <Table.Td>
                          <Checkbox
                            size="xs"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                e.currentTarget.checked ? next.add(s._id) : next.delete(s._id);
                                return next;
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {classDoc?.color && (
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: classDoc.color }} />
                            )}
                            <Text size="sm" fw={500}>{classDoc?.name ?? "—"}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{start.format("ddd D MMM, HH:mm")}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{employee?.names ?? "—"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{room?.name ?? "—"}</Text>
                        </Table.Td>
                        <Table.Td style={{ minWidth: 120 }}>
                          <Text size="xs" mb={2}>{s.enrolledCount}/{s.capacity}</Text>
                          <Progress value={pct} size="xs" color={pct >= 100 ? "red" : "blue"} />
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" color={STATUS_COLORS[s.status] ?? "gray"}>
                            {STATUS_LABELS[s.status] ?? s.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Menu shadow="md" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm">
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconEye size={14} />}
                                onClick={() => { setSelectedSession(s); setDetailModal(true); }}
                              >
                                Ver inscritos
                              </Menu.Item>
                              {s.status !== "cancelled" && s.status !== "completed" && (
                                <Menu.Item
                                  leftSection={<IconPencil size={14} />}
                                  onClick={() => { setEditingSession(s); setSessionModal(true); }}
                                >
                                  Editar
                                </Menu.Item>
                              )}
                              {s.status !== "cancelled" && (
                                <Menu.Item
                                  leftSection={<IconX size={14} />}
                                  color="red"
                                  onClick={() => handleCancelSession(s)}
                                >
                                  Cancelar sesión
                                </Menu.Item>
                              )}
                              <Menu.Divider />
                              <Menu.Item
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => handleDeleteSession(s)}
                              >
                                Eliminar sesión
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Tabs.Panel>

        {/* ─── RESERVAS PENDIENTES ───────────────────────── */}
        <Tabs.Panel value="enrollments">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Reservas de clases</Text>
          </Group>

          {loadingEnrollments ? (
            <Stack gap="xs">{Array(3).fill(0).map((_, i) => <Skeleton key={i} h={70} radius="md" />)}</Stack>
          ) : pendingEnrollments.length === 0 ? (
            <Alert color="green" icon={<IconCheck size={16} />}>
              No hay reservas pendientes de aprobación.
            </Alert>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Asistente</Table.Th>
                    <Table.Th>Clase / Sesión</Table.Th>
                    <Table.Th>Teléfono</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Descuento</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pendingEnrollments.map((e) => {
                    const classDoc = typeof e.classId === "object" ? e.classId : null;
                    const session = typeof e.sessionId === "object" ? e.sessionId : null;
                    const sessionStart = session ? dayjs(session.startDate).tz(tz).format("D MMM, HH:mm") : "—";

                    return (
                      <Table.Tr key={e._id}>
                        <Table.Td>
                          <Text size="sm" fw={500}>{e.attendee.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{classDoc?.name ?? "—"}</Text>
                          <Text size="xs" c="dimmed">{sessionStart}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{e.attendee.phone}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">${e.totalPrice.toLocaleString("es-CO")}</Text>
                        </Table.Td>
                        <Table.Td>
                          {e.discountPercent > 0 ? (
                            <Badge size="sm" color="green" variant="light">
                              -{e.discountPercent}%
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="Aprobar">
                              <ActionIcon
                                color="green"
                                variant="light"
                                size="sm"
                                loading={actionLoading === e._id}
                                onClick={() => handleApprove(e._id)}
                              >
                                <IconCheck size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Cancelar">
                              <ActionIcon
                                color="red"
                                variant="light"
                                size="sm"
                                loading={actionLoading === e._id}
                                onClick={() => handleCancelEnrollment(e._id, e.attendee.name)}
                              >
                                <IconX size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Tabs.Panel>

        {/* ─── TIPOS DE CLASE ────────────────────────────── */}
        <Tabs.Panel value="classes">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Tipos de clase</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => { setEditingClass(null); setClassModal(true); }}
            >
              Nueva clase
            </Button>
          </Group>

          {loadingClasses ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} h={160} radius="md" />)}
            </SimpleGrid>
          ) : classes.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconSchool size={40} color="gray" />
                <Text c="dimmed">No hay clases configuradas</Text>
                <Button size="xs" variant="light" onClick={() => setClassModal(true)}>
                  Crear primera clase
                </Button>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {classes.map((c) => (
                <Card key={c._id} withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      {c.color && (
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.color }} />
                      )}
                      <Text fw={600} size="sm">{c.name}</Text>
                    </Group>
                    <Badge size="xs" color={c.isActive ? "green" : "gray"} variant="light">
                      {c.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mb="xs" lineClamp={2}>{c.description || "Sin descripción"}</Text>
                  <Stack gap={2}>
                    <Text size="xs">⏱ {c.duration} min · 👥 Cupo: {c.defaultCapacity}</Text>
                    <Text size="xs">💰 ${c.pricePerPerson.toLocaleString("es-CO")} / persona</Text>
                    {c.groupDiscount?.enabled && (
                      <Badge size="xs" color="blue" variant="light">
                        Descuento {c.groupDiscount.discountPercent}% desde {c.groupDiscount.minPeople} personas
                      </Badge>
                    )}
                  </Stack>
                  <Group justify="flex-end" mt="sm" gap="xs">
                    <ActionIcon variant="subtle" size="sm" onClick={() => { setEditingClass(c); setClassModal(true); }}>
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteClass(c)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* ─── SALONES ───────────────────────────────────── */}
        <Tabs.Panel value="rooms">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Salones / Espacios</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => { setEditingRoom(null); setRoomModal(true); }}
            >
              Nuevo salón
            </Button>
          </Group>

          {loadingRooms ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} h={120} radius="md" />)}
            </SimpleGrid>
          ) : rooms.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconDoor size={40} color="gray" />
                <Text c="dimmed">No hay salones configurados</Text>
                <Button size="xs" variant="light" onClick={() => setRoomModal(true)}>
                  Crear primer salón
                </Button>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {rooms.map((r) => (
                <Card key={r._id} withBorder radius="md" p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">{r.name}</Text>
                    <Badge size="xs" color={r.isActive ? "green" : "gray"} variant="light">
                      {r.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </Group>
                  <Text size="xs">Capacidad máxima: {r.capacity} personas</Text>
                  {r.description && <Text size="xs" c="dimmed" mt={4}>{r.description}</Text>}
                  <Group justify="flex-end" mt="sm" gap="xs">
                    <ActionIcon variant="subtle" size="sm" onClick={() => { setEditingRoom(r); setRoomModal(true); }}>
                      <IconPencil size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteRoom(r)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* ─── MENSAJES WHATSAPP ──────────────────────────── */}
        <Tabs.Panel value="messages">
          <Text fw={600} mb="md">Mensajes de WhatsApp</Text>
          <ClassWhatsappTemplates />
        </Tabs.Panel>

      </Tabs>

      {/* ── Modales ─────────────────────────────────────── */}
      <RoomFormModal
        opened={roomModal}
        onClose={() => { setRoomModal(false); setEditingRoom(null); }}
        onSubmit={handleRoomSubmit}
        editing={editingRoom}
        loading={saving}
      />
      <ClassFormModal
        opened={classModal}
        onClose={() => { setClassModal(false); setEditingClass(null); }}
        onSubmit={handleClassSubmit}
        editing={editingClass}
        loading={saving}
      />
      <SessionFormModal
        opened={sessionModal}
        onClose={() => { setSessionModal(false); setEditingSession(null); }}
        onSubmit={handleSessionSubmit}
        classes={classes.filter((c) => c.isActive)}
        employees={employees}
        rooms={rooms.filter((r) => r.isActive)}
        editing={editingSession}
        loading={saving}
      />
      <SessionDetailModal
        opened={detailModal}
        onClose={() => setDetailModal(false)}
        session={selectedSession}
        timezone={tz}
      />
      <BulkSessionModal
        opened={bulkModal}
        onClose={() => setBulkModal(false)}
        onSubmit={handleBulkSubmit}
        classes={classes.filter((c) => c.isActive)}
        employees={employees}
        rooms={rooms.filter((r) => r.isActive)}
      />
    </Box>
  );
}
