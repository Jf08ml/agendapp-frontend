// src/layouts/NotificationsMenu.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, ReactNode, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../app/store";
import {
  getNotificationsByUserOrOrganization,
  getAdminNotifications,
  markAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
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
  Loader,
  Checkbox,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { FaBell, FaCalendarAlt, FaTrash, FaCheckSquare } from "react-icons/fa";
import { MdCardMembership, MdCancel } from "react-icons/md";
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
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const type = auth.role === "admin" ? "organization" : "employee";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      if (!auth.userId) return;
      const response =
        type === "organization"
          ? await getAdminNotifications(auth.userId)
          : await getNotificationsByUserOrOrganization(auth.userId, type);
      setNotifications(response);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
    } finally {
      setLoading(false);
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
            n._id === notification._id ? { ...n, status: "read" } : n,
          ),
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
      setLoading(true);
      await markAllNotificationsAsRead(auth.userId, type);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      showNotification({
        title: "✅ Éxito",
        message: "Todas las notificaciones marcadas como leídas",
        color: "green",
      });
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
      showNotification({
        title: "❌ Error",
        message: "No se pudieron marcar las notificaciones",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    console.log('🗑️ Intentando eliminar notificación:', notificationId);
    try {
      setLoading(true);
      await deleteNotification(notificationId);
      console.log('✅ Notificación eliminada exitosamente');
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      showNotification({
        title: "🗑️ Eliminada",
        message: "Notificación eliminada exitosamente",
        color: "blue",
      });
    } catch (error) {
      console.error("Error al eliminar notificación:", error);
      showNotification({
        title: "❌ Error",
        message: "No se pudo eliminar la notificación",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedIds).map((id) =>
        deleteNotification(id),
      );
      await Promise.all(deletePromises);

      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n._id)));
      setSelectedIds(new Set());
      setSelectionMode(false);

      showNotification({
        title: "🗑️ Eliminadas",
        message: `${selectedIds.size} notificaciones eliminadas`,
        color: "blue",
      });
    } catch (error) {
      console.error("Error al eliminar notificaciones:", error);
      showNotification({
        title: "❌ Error",
        message: "No se pudieron eliminar algunas notificaciones",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;

    try {
      setLoading(true);
      const deletePromises = notifications.map((n) =>
        deleteNotification(n._id),
      );
      await Promise.all(deletePromises);

      setNotifications([]);
      setSelectedIds(new Set());
      setSelectionMode(false);

      showNotification({
        title: "🗑️ Todas eliminadas",
        message: "Todas las notificaciones han sido eliminadas",
        color: "blue",
      });
    } catch (error) {
      console.error("Error al eliminar todas las notificaciones:", error);
      showNotification({
        title: "❌ Error",
        message: "No se pudieron eliminar todas las notificaciones",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n._id)));
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === "unread").length,
    [notifications],
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reservation":
        return <FaCalendarAlt color="#00b894" />;
      case "membership":
        return <MdCardMembership color="#ff6b6b" />;
      case "cancellation":
        return <MdCancel color="#e74c3c" />;
      default:
        return <FaBell color="#0984e3" />;
    }
  };

  return (
    <Menu
      shadow="md"
      width={dropdownWidth}
      position="bottom-end"
      withinPortal
      floatingStrategy="fixed"
      trapFocus={false}
      closeOnItemClick={false}
    >
      <Menu.Target>
        <Box style={{ touchAction: "manipulation" }}>
          <UnstyledButton type="button" style={{ lineHeight: 0 }}>
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
                  <Box style={{ position: "relative" }}>
                    {loading && (
                      <Loader
                        size="xs"
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          zIndex: 10,
                        }}
                      />
                    )}
                    {target}
                  </Box>
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
                <ActionIcon
                  radius="xl"
                  size="md"
                  variant="filled"
                  color="yellow"
                >
                  {loading ? <Loader size="xs" color="white" /> : <FaBell />}
                </ActionIcon>
              </Indicator>
            )}
          </UnstyledButton>
        </Box>
      </Menu.Target>

      <Menu.Dropdown>
        <Flex justify="space-between" align="center" mb="xs">
          <NotificationToggle userId={auth.userId ?? ""} />
          <Flex gap="xs">
            <Tooltip label="Modo selección (eliminar múltiples)">
              <ActionIcon
                variant={selectionMode ? "filled" : "light"}
                size="sm"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedIds(new Set());
                }}
                color={selectionMode ? "blue" : "gray"}
              >
                <FaCheckSquare />
              </ActionIcon>
            </Tooltip>

            {!selectionMode && (
              <Button
                variant="subtle"
                size="xs"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || loading}
              >
                Marcar como leídas
              </Button>
            )}
          </Flex>
        </Flex>

        {selectionMode && (
          <>
            <Flex justify="space-between" align="center" mb="xs" px="xs">
              <Checkbox
                label={`Seleccionar todas (${selectedIds.size}/${notifications.length})`}
                checked={
                  selectedIds.size === notifications.length &&
                  notifications.length > 0
                }
                indeterminate={
                  selectedIds.size > 0 &&
                  selectedIds.size < notifications.length
                }
                onChange={toggleSelectAll}
                size="xs"
              />
              <Flex gap="xs">
                <Button
                  variant="light"
                  size="xs"
                  color="red"
                  leftSection={<FaTrash />}
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || loading}
                >
                  Eliminar ({selectedIds.size})
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  color="red"
                  onClick={handleDeleteAll}
                  disabled={notifications.length === 0 || loading}
                >
                  Todas
                </Button>
              </Flex>
            </Flex>
            <Divider />
          </>
        )}

        <Divider my="xs" />
        <Box
          style={{ maxHeight: 320, overflowY: "auto", position: "relative" }}
        >
          {loading && notifications.length === 0 && (
            <Flex justify="center" align="center" py="xl">
              <Loader size="sm" />
            </Flex>
          )}

          {[...notifications]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .map((notification) => (
              <Box
                key={notification._id}
                style={{
                  position: "relative",
                  backgroundColor:
                    notification.status === "unread" ? "#f7faf9" : "white",
                  borderLeft:
                    notification.status === "unread"
                      ? "4px solid #00b894"
                      : "4px solid transparent",
                  padding: "8px 12px",
                  cursor: selectionMode ? "default" : "pointer",
                  borderBottom: "1px solid #f1f3f5",
                }}
                onClick={(e) => {
                  // No hacer nada si se clickeó en el botón de eliminar o checkbox
                  if ((e.target as HTMLElement).closest('button, input[type="checkbox"]')) {
                    return;
                  }
                  if (!selectionMode) {
                    handleNotificationClick(notification);
                  }
                }}
              >
                <Flex direction="row" gap="xs" align="center">
                  {selectionMode && (
                    <Checkbox
                      checked={selectedIds.has(notification._id)}
                      onChange={() => toggleSelection(notification._id)}
                      size="xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

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

                  {!selectionMode && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="sm"
                      onClick={(e) => {
                        console.log('🖱️ Click en botón eliminar');
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteNotification(notification._id);
                      }}
                      disabled={loading}
                      style={{ flexShrink: 0 }}
                      title="Eliminar notificación"
                    >
                      <FaTrash size={14} />
                    </ActionIcon>
                  )}
                </Flex>
              </Box>
            ))}
        </Box>

        {notifications.length === 0 && !loading && (
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
