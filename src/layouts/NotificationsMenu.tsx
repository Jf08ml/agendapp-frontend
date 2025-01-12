/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
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
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { FaBell, FaCalendarAlt } from "react-icons/fa";
import NotificationToggle from "./NotificationToggle";

const NotificationsMenu = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const auth = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const type = auth.role === "admin" ? "organization" : "employee";
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
    fetchNotifications();

    // Listen for push notifications from the service worker
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        const { title, message } = event.data.payload;

        // Show a visual notification in the app
        showNotification({
          title,
          message,
          color: "blue",
        });

        // Refresh notifications
        fetchNotifications();
      }
    };

    navigator.serviceWorker.addEventListener(
      "message",
      (event) => {
        console.log("Mensaje recibido del Service Worker:", event.data);
        handleServiceWorkerMessage(event);
      }
    );

    // Cleanup the event listener on unmount
    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, []);

  // Handle single notification click
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
      if (notification.frontendRoute) {
        navigate(notification.frontendRoute);
      }
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      if (!auth.userId) return;
      const type = auth.role === "admin" ? "organization" : "employee";
      await markAllNotificationsAsRead(auth.userId, type);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    } catch (error) {
      console.error(
        "Error al marcar todas las notificaciones como leídas:",
        error
      );
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reservation":
        return <FaCalendarAlt color="#00b894" />;
      default:
        return <FaBell color="#0984e3" />;
    }
  };

  // Filter unread notifications for the badge count
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <Menu shadow="md" width={400}>
      <Menu.Target>
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
      </Menu.Target>
      <Menu.Dropdown>
        <Flex justify="space-between" align="center" px="sm">
          <NotificationToggle userId={auth.userId ? auth.userId : ""} />

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
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <Menu.Item
              key={index}
              onClick={() => handleNotificationClick(notification)}
              style={{
                position: "relative",
                backgroundColor:
                  notification.status === "unread" ? "#f9f9f9" : "white",
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
          ))
        ) : (
          <Menu.Item>
            <Text size="sm" c="dimmed" ta="center">
              No tienes notificaciones
            </Text>
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default NotificationsMenu;
