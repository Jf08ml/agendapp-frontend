/* eslint-disable react-hooks/exhaustive-deps */
// pages/admin/MembershipNotifications.tsx
import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Stack,
  Text,
  Paper,
  Loader,
  Alert,
  Badge,
  Group,
  Button,
} from "@mantine/core";
import { getMembershipNotifications } from "../../services/membershipService";

// Define Notification type locally
interface Notification {
  _id: string;
  isRead: boolean;
  title: string;
  message: string;
  type: string;
  status: "read" | "unread";
  createdAt: string;
}
import { MembershipNotificationItem } from "../../components/MembershipNotificationItem";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { BiBell, BiRefresh } from "react-icons/bi";
import { IoAlertCircle } from "react-icons/io5";

export default function MembershipNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  useEffect(() => {
    fetchNotifications();
  }, [organization?._id]);

  const fetchNotifications = async () => {
    if (!organization?._id) return;

    setLoading(true);
    try {
      const data = await getMembershipNotifications(organization._id);
      setNotifications(data);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Cargando notificaciones...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <Group gap="xs">
                <BiBell size={28} />
                Notificaciones de Membresía
              </Group>
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Gestiona las notificaciones relacionadas con tu membresía
            </Text>
          </div>
          <Group>
            {unreadCount > 0 && (
              <Badge size="lg" variant="filled" color="red">
                {unreadCount} nueva{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              leftSection={<BiRefresh size={16} />}
              onClick={fetchNotifications}
              variant="light"
            >
              Actualizar
            </Button>
          </Group>
        </Group>

        {/* Lista de notificaciones */}
        {notifications.length === 0 ? (
          <Paper p="xl" withBorder>
            <Stack align="center" gap="md">
              <IoAlertCircle size={48} color="gray" />
              <Text c="dimmed" size="lg">
                No hay notificaciones de membresía
              </Text>
              <Text c="dimmed" size="sm">
                Aquí aparecerán las notificaciones sobre el estado de tu
                membresía
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="sm">
            {notifications.map((notification) => (
              <MembershipNotificationItem
                key={notification._id}
                notification={notification}
                onClick={() => setPaymentModalOpened(true)}
                onMarkAsRead={fetchNotifications}
              />
            ))}
          </Stack>
        )}

        {/* Información adicional */}
        <Alert
          icon={<IoAlertCircle size={18} />}
          title="Información"
          color="blue"
          variant="light"
        >
          <Text size="sm">
            Las notificaciones de membresía te alertan sobre el vencimiento de
            tu plan. Haz clic en cualquier notificación para renovar tu
            membresía y seguir disfrutando de todos los beneficios.
          </Text>
        </Alert>
      </Stack>

      {/* Modal de pago */}
      <PaymentMethodsModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        membership={null}
      />
    </Container>
  );
}
