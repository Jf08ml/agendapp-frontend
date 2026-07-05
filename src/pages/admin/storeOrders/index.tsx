// Bandeja admin de pedidos de la tienda pública (/pedidos).
// Clon estructural de pages/admin/payments/ReceiptReviewPage.tsx.
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
  SimpleGrid,
  Loader,
  Center,
  ThemeIcon,
  Divider,
  Modal,
  Select,
  SegmentedControl,
  Anchor,
} from "@mantine/core";
import {
  IconTruckDelivery,
  IconCircleCheck,
  IconCircleX,
  IconCash,
  IconRefresh,
  IconBuildingStore,
  IconMapPin,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { usePermissions } from "../../../hooks/usePermissions";
import { formatCurrency } from "../../../utils/formatCurrency";
import {
  listStoreOrders,
  deliverStoreOrder,
  collectStoreOrder,
  cancelStoreOrder,
  type StoreOrder,
  type CodCollectMethod,
} from "../../../services/storeOrderService";

const PROVIDER_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago",
  receipt: "Transferencia",
  cod: "Contraentrega",
};

const FULFILLMENT: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "blue" },
  delivered: { label: "Entregado", color: "teal" },
  cancelled: { label: "Cancelado", color: "gray" },
};

const COD_METHOD_OPTIONS: { value: CodCollectMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

// Badge de pago según status + provider (Decisiones del plan).
const paymentBadge = (order: StoreOrder): { label: string; color: string } => {
  if (order.status === "paid") return { label: "Pagado", color: "teal" };
  if (order.status === "in_review") return { label: "En revisión", color: "yellow" };
  if (order.status === "refunded") return { label: "Reembolsado", color: "grape" };
  if (order.status === "failed" || order.status === "expired")
    return { label: "Cancelado", color: "gray" };
  if (order.provider === "cod") return { label: "Pendiente de pago", color: "orange" };
  // created/pending de un checkout online que el cliente no completó todavía.
  return { label: "Sin pagar", color: "gray" };
};

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (iso?: string) => (iso ? dateFormatter.format(new Date(iso)) : "");

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export default function StoreOrdersPage() {
  const { hasPermission } = usePermissions();
  const canRead = hasPermission("inventory:read");
  const canManage = hasPermission("inventory:manage");

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [collectFor, setCollectFor] = useState<StoreOrder | null>(null);
  const [collectMethod, setCollectMethod] = useState<CodCollectMethod>("cash");

  const load = async (fulfillment: "pending" | "all" = filter) => {
    setLoading(true);
    try {
      const data = await listStoreOrders(fulfillment);
      setOrders(data);
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudieron cargar los pedidos.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, canRead]);

  const handleDeliver = async (order: StoreOrder) => {
    setProcessing(order._id);
    try {
      await deliverStoreOrder(order._id);
      notifications.show({ color: "teal", message: "Pedido marcado como entregado." });
      await load();
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudo marcar la entrega.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleCollect = async () => {
    if (!collectFor) return;
    setProcessing(collectFor._id);
    try {
      await collectStoreOrder(collectFor._id, collectMethod);
      notifications.show({
        color: "teal",
        message: "Cobro registrado y pedido entregado. La venta quedó en caja.",
      });
      setCollectFor(null);
      await load();
    } catch (e) {
      // Incluye el 400 de stock insuficiente: se muestra el mensaje del backend.
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudo registrar el cobro.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const doCancel = async (order: StoreOrder) => {
    setProcessing(order._id);
    try {
      await cancelStoreOrder(order._id);
      notifications.show({ color: "orange", message: "Pedido cancelado." });
      await load();
    } catch (e) {
      notifications.show({
        color: "red",
        message: e instanceof Error ? e.message : "No se pudo cancelar el pedido.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const confirmCancel = (order: StoreOrder) => {
    modals.openConfirmModal({
      title: "Cancelar pedido",
      centered: true,
      children: (
        <Text size="sm">
          ¿Deseas cancelar el pedido de {order.store?.customer?.name || "este cliente"} por{" "}
          {formatCurrency(order.amount, order.currency)}? Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: "Cancelar pedido", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: () => doCancel(order),
    });
  };

  if (!canRead) {
    return (
      <Container size="lg" py="lg">
        <Center mih={240}>
          <Text c="dimmed">No tienes permisos para ver los pedidos de la tienda.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="lg" py="lg">
      <Group justify="space-between" mb="lg">
        <Group>
          <ThemeIcon size={40} radius="md" variant="light">
            <IconTruckDelivery size={24} />
          </ThemeIcon>
          <div>
            <Title order={3}>Pedidos de la tienda</Title>
            <Text c="dimmed" size="sm">
              Compras de productos hechas desde tu tienda pública.
            </Text>
          </div>
        </Group>
        <Group>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as "pending" | "all")}
            data={[
              { label: "Pendientes", value: "pending" },
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
              {filter === "pending" ? "No hay pedidos pendientes" : "Aún no hay pedidos"}
            </Text>
            <Text c="dimmed" size="sm">
              {filter === "pending"
                ? "Los pedidos por despachar aparecerán aquí."
                : "Cuando tus clientes compren en la tienda, los verás aquí."}
            </Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {orders.map((order) => {
            const pay = paymentBadge(order);
            const fulfillment = order.store?.fulfillmentStatus || "pending";
            const dispatch = FULFILLMENT[fulfillment] || FULFILLMENT.pending;
            const customer = order.store?.customer;
            const delivery = order.store?.delivery;
            const items = order.store?.items || [];
            const isPending = fulfillment === "pending";
            const canDeliver = canManage && order.status === "paid" && isPending;
            const canCollect =
              canManage && order.provider === "cod" && order.status === "pending" && isPending;
            const canCancel = canManage && order.status !== "paid" && isPending;

            return (
              <Card key={order._id} withBorder radius="md" p="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Badge color={pay.color} variant="filled">
                      {pay.label}
                    </Badge>
                    <Badge color={dispatch.color} variant="light">
                      {dispatch.label}
                    </Badge>
                    <Badge color="gray" variant="outline">
                      {PROVIDER_LABEL[order.provider] || order.provider}
                    </Badge>
                  </Group>
                  <Text fw={700}>{formatCurrency(order.amount, order.currency)}</Text>
                </Group>

                <Text size="xs" c="dimmed" mb="sm">
                  {formatDate(order.createdAt)}
                </Text>

                <Stack gap={4} mb="sm">
                  {items.map((item, idx) => (
                    <Group key={`${item.productId}-${idx}`} justify="space-between" gap="xs" wrap="nowrap">
                      <Text size="sm">
                        {item.name} × {item.quantity}
                      </Text>
                      <Text size="sm" fw={500}>
                        {formatCurrency(item.unitPrice * item.quantity, order.currency)}
                      </Text>
                    </Group>
                  ))}
                </Stack>

                <Divider mb="sm" />

                <Stack gap={6} mb="sm">
                  {customer?.name && (
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {customer.name}
                      </Text>
                      {customer.phone && (
                        <Anchor
                          href={waLink(customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                        >
                          <Group gap={4} wrap="nowrap" component="span">
                            <IconBrandWhatsapp size={14} />
                            {customer.phone}
                          </Group>
                        </Anchor>
                      )}
                    </Group>
                  )}
                  {customer?.email && (
                    <Text size="xs" c="dimmed">
                      {customer.email}
                    </Text>
                  )}

                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge
                      color={delivery?.mode === "delivery" ? "indigo" : "cyan"}
                      variant="light"
                      leftSection={
                        delivery?.mode === "delivery" ? (
                          <IconMapPin size={12} />
                        ) : (
                          <IconBuildingStore size={12} />
                        )
                      }
                    >
                      {delivery?.mode === "delivery" ? "Domicilio" : "Retiro en local"}
                    </Badge>
                  </Group>
                  {delivery?.mode === "delivery" && delivery?.address && (
                    <Text size="sm">{delivery.address}</Text>
                  )}
                  {delivery?.notes && (
                    <Text size="xs" c="dimmed">
                      Notas: {delivery.notes}
                    </Text>
                  )}
                </Stack>

                {(canDeliver || canCollect || canCancel) && (
                  <>
                    <Divider mb="sm" />
                    <Group grow>
                      {canCancel && (
                        <Button
                          color="red"
                          variant="light"
                          leftSection={<IconCircleX size={16} />}
                          loading={processing === order._id}
                          onClick={() => confirmCancel(order)}
                        >
                          Cancelar pedido
                        </Button>
                      )}
                      {canCollect && (
                        <Button
                          color="teal"
                          leftSection={<IconCash size={16} />}
                          loading={processing === order._id}
                          onClick={() => {
                            setCollectMethod("cash");
                            setCollectFor(order);
                          }}
                        >
                          Registrar cobro y entregar
                        </Button>
                      )}
                      {canDeliver && (
                        <Button
                          color="teal"
                          leftSection={<IconCircleCheck size={16} />}
                          loading={processing === order._id}
                          onClick={() => handleDeliver(order)}
                        >
                          Marcar entregado
                        </Button>
                      )}
                    </Group>
                  </>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal
        opened={!!collectFor}
        onClose={() => setCollectFor(null)}
        title="Registrar cobro y entregar"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Se registrará la venta en caja por{" "}
            {collectFor ? formatCurrency(collectFor.amount, collectFor.currency) : ""} y el pedido
            quedará pagado y entregado.
          </Text>
          <Select
            label="Método de pago"
            data={COD_METHOD_OPTIONS}
            value={collectMethod}
            onChange={(v) => setCollectMethod((v as CodCollectMethod) || "cash")}
            allowDeselect={false}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCollectFor(null)}>
              Cancelar
            </Button>
            <Button color="teal" loading={!!processing} onClick={handleCollect}>
              Confirmar cobro
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
