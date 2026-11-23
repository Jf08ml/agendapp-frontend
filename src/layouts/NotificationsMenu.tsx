// Menú de la campana (rediseño, NotificacionesMenu): panel de 420 px en escritorio
// y pantalla completa en móvil. Filtro Todas / Sin leer, selección múltiple con
// barra «Eliminar N» y el interruptor «Avisos en este dispositivo» abajo.
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
import { ActionIcon, Button, Checkbox, Drawer, Indicator, Popover, Skeleton, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import {
  IconBell,
  IconCalendarEvent,
  IconCalendarX,
  IconCash,
  IconCircleCheck,
  IconClock,
  IconCrown,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import NotificationToggle from "./NotificationToggle";
import EmployeeReminderPreference from "./EmployeeReminderPreference";
import { cleanTitle, filterNotifications, relativeTime, type NotifFilter } from "./notificationsModel";

type NotificationsMenuProps = {
  /** Botón que abre el panel (la campana del header). */
  target?: ReactNode;
  /** Por defecto true: muestra el número de sin leer sobre el botón. */
  showBadgeOnTarget?: boolean;
  /** Ancho del panel en escritorio. */
  dropdownWidth?: number;
};

const TYPE_ICON: Record<string, typeof IconBell> = {
  reservation: IconCalendarEvent,
  payment: IconCash,
  cancellation: IconCalendarX,
  confirmation: IconCircleCheck,
  reminder: IconClock,
  membership: IconCrown,
  system: IconBell,
};

export default function NotificationsMenu({ target, showBadgeOnTarget = true, dropdownWidth = 420 }: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [filter, setFilter] = useState<NotifFilter>("todas");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 61.99em)");

  const type = auth.role === "admin" ? "organization" : "employee";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      if (!auth.userId) return;
      const response =
        type === "organization" ? await getAdminNotifications(auth.userId) : await getNotificationsByUserOrOrganization(auth.userId, type);
      setNotifications(response);
    } catch (error) {
      console.error("Error al obtener notificaciones:", error);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    // Respaldo: el push (SW) puede no llegar (suscripción vencida, permiso
    // denegado, pestaña en segundo plano…). Sin este poll el contador se queda
    // desactualizado: el componente se monta una sola vez en el shell.
    const pollId = window.setInterval(() => {
      void fetchNotifications();
    }, 60_000);

    const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator && !!navigator.serviceWorker;
    if (!hasServiceWorker) return () => window.clearInterval(pollId);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        const { title, message } = event.data.payload || {};
        showNotification({ title, message, color: "blue" });
        fetchNotifications();
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => {
      window.clearInterval(pollId);
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, [auth.userId]);

  const close = () => {
    setOpened(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (notification.status === "unread") {
        await markAsRead(notification._id);
        setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, status: "read" } : n)));
      }
      if (notification.frontendRoute) {
        close();
        navigate(notification.frontendRoute);
      }
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!auth.userId) return;
    setBusy(true);
    try {
      await markAllNotificationsAsRead(auth.userId, type);
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
      showNotification({ message: "No pudimos marcar las notificaciones como leídas. Inténtalo de nuevo.", color: "red" });
    } finally {
      setBusy(false);
    }
  };

  const deleteIds = async (ids: string[]) => {
    setBusy(true);
    const results = await Promise.allSettled(ids.map((id) => deleteNotification(id)));
    const deleted = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    setNotifications((prev) => prev.filter((n) => !deleted.has(n._id)));
    setSelectedIds(new Set());
    if (deleted.size < ids.length) {
      showNotification({
        message:
          ids.length === 1
            ? "No pudimos eliminar la notificación. Inténtalo de nuevo."
            : `No pudimos eliminar ${ids.length - deleted.size} de ${ids.length}. Inténtalo de nuevo.`,
        color: "red",
      });
    } else if (ids.length > 1) {
      setSelectionMode(false);
    }
    setBusy(false);
  };

  const confirmDeleteAll = () =>
    modals.openConfirmModal({
      title: "Eliminar todas las notificaciones",
      children: `Se eliminarán las ${notifications.length} notificaciones. No se pueden recuperar.`,
      labels: { confirm: "Eliminar todas", cancel: "Volver" },
      confirmProps: { color: "red" },
      zIndex: 3000,
      onConfirm: () => void deleteIds(notifications.map((n) => n._id)),
    });

  const toggleSelection = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const unreadCount = useMemo(() => notifications.filter((n) => n.status === "unread").length, [notifications]);
  const visible = useMemo(() => filterNotifications(notifications, filter), [notifications, filter]);
  const allSelected = visible.length > 0 && visible.every((n) => selectedIds.has(n._id));
  const now = Date.now();

  const header = (
    <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--line)" }}>
      <div className="ag-row" style={{ justifyContent: "space-between", gap: 8 }}>
        <b style={{ fontSize: 16 }}>Notificaciones</b>
        <div className="ag-row" style={{ gap: 4 }}>
          {!selectionMode && unreadCount > 0 && (
            <Button size="compact-xs" variant="subtle" onClick={handleMarkAllAsRead} disabled={busy}>
              Marcar todas como leídas
            </Button>
          )}
          {isMobile && (
            <ActionIcon variant="subtle" color="gray" onClick={close} aria-label="Cerrar">
              <IconX size={18} />
            </ActionIcon>
          )}
        </div>
      </div>
      <div className="ag-row" style={{ justifyContent: "space-between", marginTop: 10, gap: 8 }}>
        <div className="ag-segment" role="group" aria-label="Filtro">
          <button type="button" aria-pressed={filter === "todas"} onClick={() => setFilter("todas")}>
            Todas
          </button>
          <button type="button" aria-pressed={filter === "sin_leer"} onClick={() => setFilter("sin_leer")}>
            Sin leer{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>
        {notifications.length > 0 && (
          <Button
            size="compact-xs"
            variant={selectionMode ? "light" : "subtle"}
            color="gray"
            onClick={() => {
              setSelectionMode((v) => !v);
              setSelectedIds(new Set());
            }}
          >
            {selectionMode ? "Cancelar" : "Seleccionar"}
          </Button>
        )}
      </div>
      {selectionMode && (
        <div className="ag-row" style={{ justifyContent: "space-between", marginTop: 10 }}>
          <Checkbox
            size="xs"
            label="Seleccionar todas"
            checked={allSelected}
            indeterminate={selectedIds.size > 0 && !allSelected}
            onChange={() => setSelectedIds(allSelected ? new Set() : new Set(visible.map((n) => n._id)))}
          />
          <Button size="compact-xs" variant="subtle" color="red" onClick={confirmDeleteAll} disabled={busy}>
            Eliminar todas
          </Button>
        </div>
      )}
    </div>
  );

  const rows = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", maxHeight: isMobile ? undefined : 400 }}>
      {loading && !loaded ? (
        <div style={{ padding: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={48} radius="md" mb={i < 2 ? 10 : 0} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ padding: "36px 16px", textAlign: "center" }}>
          <b style={{ display: "block", marginBottom: 4 }}>{filter === "sin_leer" ? "No tienes notificaciones sin leer" : "No tienes notificaciones"}</b>
          <span className="ag-subtle">Aquí verás reservas, pagos y cancelaciones.</span>
        </div>
      ) : (
        visible.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? IconBell;
          const unread = n.status === "unread";
          const selected = selectedIds.has(n._id);
          return (
            <div
              key={n._id}
              className="ag-notif-row"
              role="button"
              tabIndex={0}
              onClick={() => (selectionMode ? toggleSelection(n._id) : handleNotificationClick(n))}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), selectionMode ? toggleSelection(n._id) : handleNotificationClick(n))}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "12px 16px",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
                background: selected ? "var(--brand-soft)" : undefined,
              }}
            >
              {selectionMode && (
                <Checkbox size="xs" mt={8} checked={selected} onChange={() => toggleSelection(n._id)} onClick={(e) => e.stopPropagation()} aria-label="Seleccionar" />
              )}
              <span
                style={{
                  flex: "none",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--surface-hover)",
                  color: "var(--ink-muted)",
                }}
              >
                <Icon size={17} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, lineHeight: "20px", fontWeight: unread ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cleanTitle(n.title)}
                  </span>
                  <span className="ag-subtle" style={{ flex: "none", fontSize: 12 }}>
                    {n.createdAt ? relativeTime(new Date(n.createdAt).getTime(), now) : ""}
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: "18px", color: unread ? "var(--ink)" : "var(--ink-muted)" }}>{n.message}</div>
              </div>
              {unread && !selectionMode && (
                <span aria-label="Sin leer" style={{ flex: "none", width: 8, height: 8, borderRadius: 999, background: "var(--info)", marginTop: 6 }} />
              )}
              {!selectionMode && (
                <ActionIcon
                  className="ag-notif-delete"
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="Eliminar notificación"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteIds([n._id]);
                  }}
                >
                  <IconTrash size={15} />
                </ActionIcon>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const footer = (
    <div style={{ borderTop: "1px solid var(--line)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {selectionMode && selectedIds.size > 0 ? (
        <Button color="red" fullWidth leftSection={<IconTrash size={16} />} loading={busy} onClick={() => void deleteIds([...selectedIds])}>
          Eliminar {selectedIds.size}
        </Button>
      ) : (
        <>
          <NotificationToggle userId={auth.userId ?? ""} />
          {auth.role !== "admin" && <EmployeeReminderPreference />}
        </>
      )}
    </div>
  );

  const panel = (
    <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "100%" : undefined }}>
      <style>{`
        .ag-notif-row:hover { background: var(--surface-hover); }
        @media (hover: hover) {
          .ag-notif-row .ag-notif-delete { opacity: 0; }
          .ag-notif-row:hover .ag-notif-delete, .ag-notif-row:focus-within .ag-notif-delete { opacity: 1; }
        }
      `}</style>
      {header}
      {rows}
      {footer}
    </div>
  );

  const trigger = (
    <UnstyledButton
      type="button"
      aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"}
      // Popover controlado: Mantine no alterna solo, el botón abre y cierra.
      onClick={() => {
        if (opened) {
          close();
          return;
        }
        void fetchNotifications();
        setOpened(true);
      }}
      style={{ lineHeight: 0, touchAction: "manipulation" }}
    >
      <Indicator
        inline
        size={16}
        offset={4}
        label={unreadCount > 99 ? "99+" : String(unreadCount)}
        color="red"
        disabled={!showBadgeOnTarget || unreadCount === 0}
        withBorder
      >
        {target ?? <IconBell size={20} />}
      </Indicator>
    </UnstyledButton>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer
          opened={opened}
          onClose={close}
          position="bottom"
          size="100%"
          withCloseButton={false}
          padding={0}
          styles={{ body: { height: "100%", padding: 0 } }}
        >
          {panel}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={(o) => {
        if (!o) close();
      }}
      width={dropdownWidth} position="bottom-end" shadow="md" withinPortal trapFocus={false}>
      <Popover.Target>{trigger}</Popover.Target>
      <Popover.Dropdown p={0} style={{ overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
        {panel}
      </Popover.Dropdown>
    </Popover>
  );
}
