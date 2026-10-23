import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  Image,
  SimpleGrid,
  Loader,
  Center,
  ThemeIcon,
  Divider,
  Textarea,
  Modal,
  SegmentedControl,
} from "@mantine/core";
import {
  IconReceipt,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../../app/store";
import {
  listReceiptOrders,
  reviewReceiptOrder,
  type ReceiptOrder,
} from "../../../services/collectionService";

const TYPE_LABEL: Record<string, string> = {
  reservation: "Reserva",
  class: "Clase",
  package: "Paquete",
};

const VERDICT: Record<string, { label: string; color: string }> = {
  match: { label: "Coincide", color: "teal" },
  mismatch: { label: "Discrepancia", color: "orange" },
  unreadable: { label: "Ilegible", color: "red" },
};

const STATUS: Record<string, { label: string; color: string }> = {
  in_review: { label: "Por revisar", color: "yellow" },
  paid: { label: "Aprobado", color: "teal" },
  failed: { label: "Rechazado", color: "red" },
  expired: { label: "Expirado", color: "gray" },
  pending: { label: "Pendiente", color: "gray" },
  created: { label: "Sin pagar", color: "gray" },
  refunded: { label: "Reembolsado", color: "grape" },
};

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} style={{ textAlign: "right", wordBreak: "break-all" }}>
        {value}
      </Text>
    </Group>
  );
}

export default function ReceiptReviewPage() {
  const [orders, setOrders] = useState<ReceiptOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ReceiptOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [filter, setFilter] = useState<"in_review" | "all">("in_review");
  const organization = useSelector((s: RootState) => s.organization.organization);

  const load = async (status: "in_review" | "all" = filter) => {
    setLoading(true);
    try {
      const data = await listReceiptOrders(status);
      setOrders(data);
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudieron cargar los comprobantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // reviewReceiptOrder lanza el error del servidor (handleAxiosError): antes no se
  // atrapaba, el botón quedaba "cargando" para siempre y el motivo nunca se veía.
  const handleApprove = async (order: ReceiptOrder) => {
    setProcessing(order._id);
    try {
      await reviewReceiptOrder(order._id, "approve");
      notifications.show({ color: "teal", message: "Pago aprobado y reserva confirmada." });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo aprobar",
        message: e instanceof Error ? e.message : "No se pudo procesar la revisión.",
        autoClose: 10000,
      });
    } finally {
      setProcessing(null);
      load();
    }
  };

  const handleReject = async () => {
    if (!rejectFor) return;
    setProcessing(rejectFor._id);
    try {
      await reviewReceiptOrder(rejectFor._id, "reject", rejectNotes.trim() || undefined);
      notifications.show({ color: "orange", message: "Comprobante rechazado." });
      setRejectFor(null);
      setRejectNotes("");
    } catch (e) {
      notifications.show({
        color: "red",
        title: "No se pudo rechazar",
        message: e instanceof Error ? e.message : "No se pudo procesar la revisión.",
        autoClose: 10000,
      });
    } finally {
      setProcessing(null);
      load();
    }
  };

  const timezone = organization?.timezone || "America/Bogota";
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });

  return (
    <Container size="lg" py="lg">
      <Group justify="space-between" mb="lg">
        <Group>
          <ThemeIcon size={40} radius="md" variant="light">
            <IconReceipt size={24} />
          </ThemeIcon>
          <div>
            <Title order={3}>Comprobantes de pago</Title>
            <Text c="dimmed" size="sm">
              Pagos por transferencia validados con IA.
            </Text>
          </div>
        </Group>
        <Group>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as "in_review" | "all")}
            data={[
              { label: "Por revisar", value: "in_review" },
              { label: "Todos", value: "all" },
            ]}
          />
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => load()}>
            Actualizar
          </Button>
        </Group>
      </Group>

      {loading ? (
        <Center mih={240}>
          <Loader />
        </Center>
      ) : orders.length === 0 ? (
        <Center mih={240}>
          <Stack align="center" gap="xs">
            <ThemeIcon size={56} radius="xl" color="teal" variant="light">
              <IconCircleCheck size={32} />
            </ThemeIcon>
            <Text fw={600}>
              {filter === "in_review" ? "No hay comprobantes pendientes" : "Aún no hay comprobantes"}
            </Text>
            <Text c="dimmed" size="sm">
              {filter === "in_review"
                ? "Los pagos que requieran tu revisión aparecerán aquí."
                : "Cuando tus clientes paguen por transferencia, los verás aquí."}
            </Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {orders.map((order) => {
            const ex = order.receipt?.extracted;
            const verdict = order.receipt?.aiVerdict
              ? VERDICT[order.receipt.aiVerdict]
              : null;
            const confidence = order.receipt?.aiConfidence;
            return (
              <Card key={order._id} withBorder radius="md" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Badge variant="light">{TYPE_LABEL[order.type] || order.type}</Badge>
                    {STATUS[order.status] && (
                      <Badge color={STATUS[order.status].color} variant="filled">
                        {STATUS[order.status].label}
                      </Badge>
                    )}
                  </Group>
                  <Text fw={700}>
                    {order.amount.toLocaleString()} {order.currency}
                  </Text>
                </Group>

                {/* Reserva vinculada: qué se está aprobando */}
                {order.linkedReservation && (
                  <Card withBorder p="xs" radius="sm" mb="sm">
                    <Text size="sm" fw={600}>
                      {order.linkedReservation.customerName}
                      {order.linkedReservation.customerPhone && (
                        <Text span size="xs" c="dimmed" fw={400}>
                          {"  "}
                          {order.linkedReservation.customerPhone}
                        </Text>
                      )}
                    </Text>
                    {order.linkedReservation.items.map((it) => (
                      <Text key={it.reservationId} size="xs" c="dimmed">
                        {it.service} · {it.employee || "Sin profesional"} · {formatDateTime(it.startDate)}
                      </Text>
                    ))}
                  </Card>
                )}

                {order.receipt?.fulfillError && order.status === "in_review" && (
                  <Card bg="red.0" p="xs" radius="sm" mb="sm">
                    <Stack gap={6}>
                      <Group gap={6} wrap="nowrap" align="flex-start">
                        <IconAlertTriangle size={16} color="var(--mantine-color-red-7)" />
                        <Text size="xs" c="red.9">
                          El pago es válido, pero no se pudo confirmar la reserva: {order.receipt.fulfillError}
                        </Text>
                      </Group>
                      {order.type === "reservation" && (
                        <Button component={Link} to="/gestionar-reservas-online" size="xs" variant="light" color="red">
                          Resolver en Gestionar reservas
                        </Button>
                      )}
                    </Stack>
                  </Card>
                )}

                {order.receipt?.imageUrl && (
                  <Image
                    src={order.receipt.imageUrl}
                    alt="Comprobante"
                    mah={260}
                    fit="contain"
                    radius="sm"
                    mb="sm"
                    bg="gray.0"
                  />
                )}

                <Group gap="xs" mb="xs">
                  {verdict && (
                    <Badge color={verdict.color} variant="dot">
                      {verdict.label}
                    </Badge>
                  )}
                  {typeof confidence === "number" && (
                    <Badge color="gray" variant="light">
                      Confianza {Math.round(confidence * 100)}%
                    </Badge>
                  )}
                </Group>

                <Stack gap={4} mb="sm">
                  <DataRow label="Monto detectado" value={ex?.amount} />
                  <DataRow label="Referencia" value={ex?.reference} />
                  <DataRow label="De" value={ex?.senderName} />
                  <DataRow label="Cuenta destino" value={ex?.destinationAccount} />
                  <DataRow label="Banco" value={ex?.bank} />
                  <DataRow label="Fecha" value={ex?.date} />
                </Stack>

                {order.receipt?.aiNotes && (
                  <Card bg="yellow.0" p="xs" radius="sm" mb="sm">
                    <Group gap={6} wrap="nowrap" align="flex-start">
                      <IconAlertTriangle size={16} color="var(--mantine-color-yellow-7)" />
                      <Text size="xs" c="yellow.9">
                        {order.receipt.aiNotes}
                      </Text>
                    </Group>
                  </Card>
                )}

                {order.status === "in_review" && (
                  <>
                    <Divider mb="sm" />
                    <Group grow>
                      <Button
                        color="red"
                        variant="light"
                        leftSection={<IconCircleX size={16} />}
                        loading={processing === order._id}
                        onClick={() => setRejectFor(order)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        color="teal"
                        leftSection={<IconCircleCheck size={16} />}
                        loading={processing === order._id}
                        onClick={() => handleApprove(order)}
                      >
                        Aprobar
                      </Button>
                    </Group>
                  </>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal
        opened={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title="Rechazar comprobante"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Se cancelará la reserva/inscripción asociada. Opcionalmente indica el motivo.
          </Text>
          <Textarea
            placeholder="Motivo del rechazo (opcional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejectFor(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={!!processing} onClick={handleReject}>
              Rechazar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
