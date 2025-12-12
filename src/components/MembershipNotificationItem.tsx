// components/MembershipNotificationItem.tsx
import { Group, Text, Badge, ActionIcon, Paper, Stack } from "@mantine/core";
import { markNotificationAsRead } from "../services/membershipService";
import { IoAlertCircle } from "react-icons/io5";
import { BiX } from "react-icons/bi";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  status: "read" | "unread";
  createdAt: string;
}

interface MembershipNotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead?: (id: string) => void;
}

export function MembershipNotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: MembershipNotificationItemProps) {
  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(notification._id);
      onMarkAsRead?.(notification._id);
    } catch (error) {
      console.error("Error al marcar como leída:", error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? "s" : ""}`;
    }
    if (diffInHours > 0) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? "s" : ""}`;
    }
    return "Hace unos momentos";
  };

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{
        cursor: "pointer",
        backgroundColor:
          notification.status === "unread" ? "#f8f9fa" : "transparent",
        transition: "all 0.2s ease",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="sm">
          <IoAlertCircle size={24} color="#fa5252" />
          
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="xs">
              <Text size="sm" fw={600}>
                {notification.title}
              </Text>
              {notification.status === "unread" && (
                <Badge size="xs" color="blue" variant="filled">
                  Nueva
                </Badge>
              )}
            </Group>

            <Text size="sm" c="dimmed" lineClamp={2}>
              {notification.message}
            </Text>

            <Text size="xs" c="dimmed">
              {getTimeAgo(notification.createdAt)}
            </Text>
          </Stack>
        </Group>

        {notification.status === "unread" && (
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={handleMarkAsRead}
            title="Marcar como leída"
          >
            <BiX size={16} />
          </ActionIcon>
        )}
      </Group>
    </Paper>
  );
}
