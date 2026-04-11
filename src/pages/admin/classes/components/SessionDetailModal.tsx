import React, { useEffect, useState } from "react";
import {
  Modal, Text, Badge, Table, Group, Button, Stack, Loader,
  Center, ActionIcon, Tooltip, Menu, Divider, NumberInput,
  Select, ScrollArea, Alert, Progress,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconCheck, IconX, IconCash, IconDots,
  IconUserCheck, IconUserX, IconAlertCircle,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  ClassSession, Enrollment,
  getSessionEnrollments, approveEnrollment, cancelEnrollment,
  updateAttendance, addEnrollmentPayment,
} from "../../../../services/classService";

dayjs.extend(utc);
dayjs.extend(timezone);

const STATUS_COLORS: Record<string, string> = {
  pending: "yellow",
  confirmed: "green",
  cancelled: "red",
  attended: "teal",
  no_show: "gray",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  attended: "Asistió",
  no_show: "No asistió",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "red",
  partial: "yellow",
  paid: "green",
  free: "blue",
};

interface Props {
  opened: boolean;
  onClose: () => void;
  session: ClassSession | null;
  timezone?: string;
}

export default function SessionDetailModal({ opened, onClose, session, timezone: tz = "America/Bogota" }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estado para pago rápido
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("cash");

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await getSessionEnrollments(session._id);
      setEnrollments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened && session) load();
  }, [opened, session]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveEnrollment(id);
      showNotification({ message: "Inscripción aprobada", color: "green" });
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (id: string) => {
    modals.openConfirmModal({
      title: "Cancelar inscripción",
      children: <Text size="sm">¿Seguro que deseas cancelar esta inscripción? El cupo quedará disponible nuevamente.</Text>,
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setActionLoading(id);
        try {
          await cancelEnrollment(id);
          showNotification({ message: "Inscripción cancelada", color: "orange" });
          load();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleAttendance = async (id: string, status: "attended" | "no_show") => {
    setActionLoading(id);
    try {
      await updateAttendance(id, status);
      showNotification({
        message: status === "attended" ? "Asistencia registrada" : "No asistencia registrada",
        color: status === "attended" ? "teal" : "gray",
      });
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddPayment = async (id: string) => {
    if (!payAmount || payAmount <= 0) {
      showNotification({ message: "Ingresa un monto válido", color: "red" });
      return;
    }
    setActionLoading(id);
    try {
      await addEnrollmentPayment(id, {
        amount: payAmount,
        method: payMethod as "cash" | "card" | "transfer" | "other",
      });
      showNotification({ message: "Pago registrado", color: "green" });
      setPayingId(null);
      setPayAmount(0);
      load();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  if (!session) return null;

  const classDoc = typeof session.classId === "object" ? session.classId : null;
  const room = typeof session.roomId === "object" ? session.roomId : null;
  const employee = typeof session.employeeId === "object" ? session.employeeId : null;
  const start = dayjs(session.startDate).tz(tz);
  const end = dayjs(session.endDate).tz(tz);

  const activeEnrollments = enrollments.filter((e) => e.status !== "cancelled");
  const occupancyPct = session.capacity > 0 ? Math.round((activeEnrollments.length / session.capacity) * 100) : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Detalle de sesión"
      centered
      size="xl"
    >
      <Stack gap="sm">
        {/* Header info */}
        <Group justify="space-between" wrap="wrap">
          <div>
            <Text fw={700} size="lg">{classDoc?.name || "Clase"}</Text>
            <Text size="sm" c="dimmed">
              {start.format("dddd D [de] MMMM YYYY")} · {start.format("HH:mm")} – {end.format("HH:mm")}
            </Text>
            {employee && <Text size="sm" c="dimmed">Instructor: {employee.names}</Text>}
            {room && <Text size="sm" c="dimmed">Salón: {room.name}</Text>}
          </div>
          <Badge size="lg" color={STATUS_COLORS[session.status] ?? "gray"}>
            {session.status === "open" ? "Disponible" : session.status === "full" ? "Llena" : session.status}
          </Badge>
        </Group>

        {/* Ocupación */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">Ocupación</Text>
            <Text size="xs" fw={600}>{activeEnrollments.length} / {session.capacity}</Text>
          </Group>
          <Progress value={occupancyPct} color={occupancyPct >= 100 ? "red" : "blue"} size="sm" radius="xl" />
        </div>

        <Divider />

        {/* Lista de inscritos */}
        {loading ? (
          <Center h={100}><Loader size="sm" /></Center>
        ) : enrollments.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="gray">
            No hay inscripciones para esta sesión aún.
          </Alert>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Asistente</Table.Th>
                  <Table.Th>Teléfono</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Pago</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {enrollments.map((e) => (
                  <React.Fragment key={e._id}>
                    <Table.Tr>
                      <Table.Td>
                        <Text size="sm" fw={500}>{e.attendee.name}</Text>
                        {e.discountPercent > 0 && (
                          <Text size="xs" c="green">Descuento {e.discountPercent}%</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{e.attendee.phone}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={STATUS_COLORS[e.status] ?? "gray"}>
                          {STATUS_LABELS[e.status] ?? e.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={PAYMENT_COLORS[e.paymentStatus] ?? "gray"} variant="light">
                          {e.paymentStatus === "unpaid" ? "Sin pago" :
                           e.paymentStatus === "partial" ? "Parcial" :
                           e.paymentStatus === "paid" ? "Pagado" : "Gratis"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">${e.totalPrice.toLocaleString("es-CO")}</Text>
                      </Table.Td>
                      <Table.Td>
                        {e.status !== "cancelled" && (
                          <Menu shadow="md" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" size="sm" loading={actionLoading === e._id}>
                                <IconDots size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {e.status === "pending" && (
                                <Menu.Item
                                  leftSection={<IconCheck size={14} />}
                                  onClick={() => handleApprove(e._id)}
                                >
                                  Aprobar
                                </Menu.Item>
                              )}
                              {["pending", "confirmed"].includes(e.status) && (
                                <>
                                  <Menu.Item
                                    leftSection={<IconUserCheck size={14} />}
                                    onClick={() => handleAttendance(e._id, "attended")}
                                  >
                                    Marcar asistencia
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconUserX size={14} />}
                                    onClick={() => handleAttendance(e._id, "no_show")}
                                  >
                                    No asistió
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={<IconCash size={14} />}
                                    onClick={() => { setPayingId(e._id); setPayAmount(e.totalPrice); }}
                                  >
                                    Registrar pago
                                  </Menu.Item>
                                  <Menu.Divider />
                                  <Menu.Item
                                    leftSection={<IconX size={14} />}
                                    color="red"
                                    onClick={() => handleCancel(e._id)}
                                  >
                                    Cancelar inscripción
                                  </Menu.Item>
                                </>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Table.Td>
                    </Table.Tr>

                    {/* Panel de pago inline */}
                    {payingId === e._id && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Group gap="sm" p="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
                            <NumberInput
                              size="xs"
                              label="Monto"
                              prefix="$"
                              thousandSeparator=","
                              value={payAmount}
                              onChange={(v) => setPayAmount(Number(v))}
                              style={{ width: 140 }}
                            />
                            <Select
                              size="xs"
                              label="Método"
                              value={payMethod}
                              onChange={(v) => setPayMethod(v || "cash")}
                              data={[
                                { value: "cash", label: "Efectivo" },
                                { value: "transfer", label: "Transferencia" },
                                { value: "card", label: "Tarjeta" },
                                { value: "other", label: "Otro" },
                              ]}
                              style={{ width: 140 }}
                            />
                            <Button size="xs" mt="lg" loading={actionLoading === e._id} onClick={() => handleAddPayment(e._id)}>
                              Guardar
                            </Button>
                            <Button size="xs" mt="lg" variant="default" onClick={() => setPayingId(null)}>
                              Cancelar
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  );
}
