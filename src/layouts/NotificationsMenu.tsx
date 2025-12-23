// src/layouts/NotificationsMenu.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, ReactNode, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../app/store";
import {
  getNotificationsByUserOrOrganization,
  markAsRead,
  markAllNotificationsAsRead,
  Notification,
} from "../services/notificationService";
import {
  ActionIcon,
  Indicator,
  Menu,
  Text,
  Avatar,
  Flex,
  Button,
  Divider,
  Box,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { FaBell, FaCalendarAlt } from "react-icons/fa";
import { MdCardMembership } from "react-icons/md";
import NotificationToggle from "./NotificationToggle";

type NotificationsMenuProps = {
  /** Si se pasa, esto será el botón/trigger del menú.
   * Se envolverá automáticamente con Indicator (badge) y Menu.Target. */
  target?: ReactNode;
  /** Por defecto true: pinta el badge sobre el target */
  showBadgeOnTarget?: boolean;
  /** Ancho del dropdown */
  dropdownWidth?: number;
};

export default function NotificationsMenu({
  target,
  showBadgeOnTarget = true,
  dropdownWidth = 450,
}: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const auth = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const type = auth.role === "admin" ? "organization" : "employee";

  const fetchNotifications = async () => {
    try {
      if (!auth.userId) return;
      const response = await getNotificationsByUserOrOrganization(
        auth.userId,
        type
      );
      setNotifications(response);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    const hasServiceWorker =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      !!navigator.serviceWorker;

    if (!hasServiceWorker) {
      return;
    }

    // SW listener con cleanup correcto
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        const { title, message } = event.data.payload || {};
        showNotification({ title, message, color: "blue" });
        fetchNotifications();
      }
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (notification.status === "unread") {
        await markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, status: "read" } : n
          )
        );
      }
      if (notification.frontendRoute) navigate(notification.frontendRoute);
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!auth.userId) return;
      await markAllNotificationsAsRead(auth.userId, type);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === "unread").length,
    [notifications]
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reservation":
        return <FaCalendarAlt color="#00b894" />;
      case "membership":
        return <MdCardMembership color="#ff6b6b" />;
      default:
        return <FaBell color="#0984e3" />;
    }
  };

  return (
    <Menu shadow="md" width={dropdownWidth} position="bottom-end">
      <Menu.Target>
        {target ? (
          showBadgeOnTarget ? (
            <Indicator
              inline
              size={16}
              offset={4}
              label={unreadCount > 99 ? "99+" : String(unreadCount)}
              color="red"
              disabled={unreadCount === 0}
              withBorder
              processing={unreadCount > 0}
            >
              {target}
            </Indicator>
          ) : (
            <>{target}</>
          )
        ) : (
          // Fallback: campana
          <Indicator
            inline
            size={16}
            offset={4}
            label={unreadCount}
            color="red"
            disabled={unreadCount === 0}
          >
            <ActionIcon radius="xl" size="md" variant="filled" color="yellow">
              <FaBell />
            </ActionIcon>
          </Indicator>
        )}
      </Menu.Target>

      <Menu.Dropdown>
        <Flex justify="space-between" align="center">
          {/* Si usas un toggle de permisos/push, déjalo */}
          <NotificationToggle userId={auth.userId ?? ""} />
          <Button
            variant="subtle"
            size="xs"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar todas como leídas
          </Button>
        </Flex>

        <Divider my="xs" />
        <Box style={{ maxHeight: 320, overflowY: "auto" }}>
          {[...notifications]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((notification, index) => (
              <Menu.Item
                key={index}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  position: "relative",
                  backgroundColor:
                    notification.status === "unread" ? "#f7faf9" : "white",
                  borderLeft:
                    notification.status === "unread"
                      ? "4px solid #00b894"
                      : "4px solid transparent",
                  padding: "8px 12px",
                }}
              >
                <Flex direction="row" gap="xs" align="center">
                  <Avatar radius="xl" size="sm">
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text
                      fw={notification.status === "unread" ? 700 : 500}
                      size="sm"
                    >
                      {notification.title}
                    </Text>
                    <Text
                      c={notification.status === "unread" ? "dark" : "dimmed"}
                      size="xs"
                    >
                      {notification.message}
                    </Text>
                  </div>
                </Flex>
              </Menu.Item>
            ))}
        </Box>

        {notifications.length === 0 && (
          <Menu.Item>
            <Text size="sm" c="dimmed" ta="center">
              No tienes notificaciones
            </Text>
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
