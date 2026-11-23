/* eslint-disable @typescript-eslint/no-explicit-any */
import { computeDepositTotal, uniformDepositPercentage } from "../../../utils/deposit";
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Text,
  Badge,
  Stack,
  Modal,
  Select,
  Button,
  Group,
  Skeleton,
  LoadingOverlay,
  Alert,
  Loader,
  useMantineTheme,
  TextInput,
  Box,
  Divider,
  Checkbox,
  List,
  ScrollArea,
  Pagination,
  Image,
  Drawer,
} from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { IconCheck, IconDeviceDesktop, IconLock, IconRobot, IconSearch, IconWorld } from "@tabler/icons-react";
import {
  RESERVATIONS_TAB_LABELS,
  STATUS_META,
  WHEN_LABELS,
  formatPendingCount,
  originLabel,
  paymentMeta,
  relativeWhen,
  reservationsTabs,
  resolveReservationsTab,
  whenBucket,
  type ReservationStatusKey,
  type ReservationsTab,
  type WhenBucket,
} from "./reservationsView";
import { notifyReservationsChanged } from "../../../hooks/usePendingReservationsCount";
import { useMediaQuery, useDebouncedValue } from "@mantine/hooks";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { reviewReceiptOrder } from "../../../services/collectionService";
import {
  Reservation,
  ReservationPaymentOrder,
  ReservationStats,
  getReservationsByOrganization,
  getReservationStats,
  updateReservation,
  deleteReservation,
  cancelReservation,
} from "../../../services/reservationService";
import {
  getEmployeesByOrganizationId,
  Employee,
} from "../../../services/employeeService";
import {
  getServicesByOrganizationId,
  Service,
} from "../../../services/serviceService";
import type { ReservationPolicy } from "../../../services/organizationService";
import { showNotification } from "@mantine/notifications";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getTimeFormatStr } from "../../../utils/timeFormatUtils";

dayjs.extend(utc);
dayjs.extend(timezone);
import {
  BiTrash,
  BiXCircle,
  BiUser,
  BiCheck,
  BiInfoCircle,
} from "react-icons/bi";
import CustomLoader from "../../../components/customLoader/CustomLoader";
import {
  selectReservationPolicy,
  selectSavingPolicy,
  updateReservationPolicy,
} from "../../../features/organization/sliceOrganization";

type RowAction = "approve" | "reject" | "delete" | "assign" | "cancel";

const POLICY_OPTIONS: { value: ReservationPolicy; title: string; desc: string }[] = [
  {
    value: "manual",
    title: "Las apruebo yo",
    desc: "Cada reserva queda pendiente hasta que la apruebes. No se crea la cita antes.",
  },
  {
    value: "auto_if_available",
    title: "Confirmar sola si hay cupo",
    desc: "Si el horario y la profesional están libres, se crea la cita al instante. Si no, queda por confirmar para que decidas.",
  },
];

const dateBoxStyle: React.CSSProperties = {
  flex: "none",
  width: 48,
  height: 52,
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--line)",
  background: "var(--surface-raised)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-subtle)",
};

const ReservationsList: React.FC = () => {
  const dispatch = useDispatch<any>();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ReservationStats>({
    total: 0,
    ai: 0,
    manual: 0,
    hasApprovedWithoutAppointment: false,
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // ------- PAGINACIÓN (servidor) -------
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [initialLoading, setInitialLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<
    Record<string, RowAction | null>
  >({});
  const [error, setError] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningReservationId, setAssigningReservationId] = useState<
    string | null
  >(null);
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReservationId, setDeletingReservationId] = useState<
    string | null
  >(null);
  const [deleteAlsoAppointments, setDeleteAlsoAppointments] = useState(true);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingReservationId, setCancellingReservationId] = useState<
    string | null
  >(null);
  const [cancelNotifyClient, setCancelNotifyClient] = useState(false);

  // Modal de detalle de reserva
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedGroupReservations, setSelectedGroupReservations] = useState<Reservation[]>([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgPolicy = useSelector(selectReservationPolicy);
  const savingPolicy = useSelector(selectSavingPolicy);
  const canAutoConfirm = (organization as any)?.planLimits?.autoConfirmations !== false;

  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // ------- PESTAÑAS (en la URL: ?tab=) -------
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingCount, setPendingCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const visibleTabs = reservationsTabs(orgPolicy, pendingCount, expiredCount);
  const tab: ReservationsTab = resolveReservationsTab(searchParams.get("tab"), visibleTabs);
  const setTab = (t: ReservationsTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
    setPage(1);
  };
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [rejectAllBusy, setRejectAllBusy] = useState(false);

  // ------- FILTROS -------
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "auto_approved" | "cancelled_by_customer" | "cancelled_by_admin" | "appointment_deleted"
  >("all");
  const [employeeFilter, setEmployeeFilter] = useState<string | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 400);
  const [showOnlyFuture, setShowOnlyFuture] = useState(true);

  // Modal de advertencia cuando el cupo máximo ya está alcanzado al aprobar
  const [concurrencyWarning, setConcurrencyWarning] = useState<{
    message: string;
    reservationId?: string;
    isGroup?: boolean;
    groupId?: string;
    conflictingAppointments?: Array<{ _id: string; startDate: string; endDate: string; status: string; client?: { name: string } }>;
    /** Abono a aprobar después de forzar la aprobación (si el admin lo eligió). */
    paymentOrderId?: string | null;
  } | null>(null);

  // 💳 Comprobante de abono: ver la imagen y decidir el pago al aprobar
  const [receiptView, setReceiptView] = useState<ReservationPaymentOrder | null>(null);
  const [receiptPrompt, setReceiptPrompt] = useState<{
    order: ReservationPaymentOrder;
    proceed: (approvePayment: boolean) => Promise<unknown>;
  } | null>(null);
  const [receiptPromptBusy, setReceiptPromptBusy] = useState(false);


  // ------- LOADERS HELPERS -------
  const setRowBusy = (id: string, action: RowAction | null) =>
    setRowLoading((prev) => ({ ...prev, [id]: action }));

  const isRowBusy = (id: string) => Boolean(rowLoading[id]);

  // ------- HELPERS: EMPLEADO -------
  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e._id, e.names));
    return map;
  }, [employees]);

  const getEmployeeName = (reservation: Reservation): string | null => {
    // 1) Si el backend lo trae poblado como "employee"
    const populated = (reservation as any)?.employeeId?.names;
    if (typeof populated === "string" && populated.trim()) {
      return populated.trim();
    }
    // 2) Si solo viene employeeId
    if (
      typeof reservation.employeeId === "string" &&
      employeeNameById.has(reservation.employeeId)
    ) {
      return employeeNameById.get(reservation.employeeId) ?? null;
    }
    return null;
  };

  const hasEmployeeAssigned = (reservation: Reservation) =>
    Boolean((reservation as any)?.employee?._id || reservation.employeeId);

  // Nombre(s) de profesional a mostrar en la columna "Profesional" — para un
  // grupo, puede haber más de un profesional distinto (uno por servicio).
  const getProfessionalNames = (
    reservation: Reservation,
    groupReservations?: Reservation[] | null
  ): string[] => {
    const list =
      groupReservations && groupReservations.length > 1
        ? groupReservations
        : [reservation];
    const names = list.map((r) =>
      hasEmployeeAssigned(r) ? getEmployeeName(r) ?? "Asignado" : "Sin asignar"
    );
    return Array.from(new Set(names));
  };

  // ------- MODAL DETALLE -------
  const handleOpenDetail = (reservation: Reservation, groupReservations?: Reservation[]) => {
    setSelectedReservation(reservation);
    setSelectedGroupReservations(groupReservations || [reservation]);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedReservation(null);
    setSelectedGroupReservations([]);
  };

  // ------- FETCH DATA -------
  // Datos que no dependen de filtros/página: se cargan una sola vez por organización
  useEffect(() => {
    if (organization?._id) {
      void fetchEmployees(organization._id);
      void fetchServices(organization._id);
      void loadStats(organization._id);
    }
  }, [organization?._id]);

  // Listado paginado: se recarga cuando cambia la organización, la página o cualquier filtro
  useEffect(() => {
    if (organization?._id) {
      void loadPage(organization._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    organization?._id,
    tab,
    page,
    statusFilter,
    employeeFilter,
    serviceFilter,
    debouncedSearchTerm,
    showOnlyFuture,
  ]);

  const loadPage = async (organizationId: string) => {
    setInitialLoading(true);
    setError(null);
    try {
      if (tab === "configuracion") {
        setReservations([]);
        return;
      }
      // Por confirmar: pendientes futuras. Vencidas: pendientes (se filtran las pasadas
      // aquí; el backend ordena por fecha). Historial: los filtros de siempre.
      const inbox = tab === "por_confirmar" || tab === "vencidas";
      const result = await getReservationsByOrganization(
        organizationId,
        inbox
          ? { page: 1, limit: 100, status: "pending", onlyFuture: tab === "por_confirmar" }
          : {
              page,
              limit: PAGE_SIZE,
              status: statusFilter,
              employeeId: employeeFilter,
              serviceId: serviceFilter,
              search: debouncedSearchTerm,
              onlyFuture: showOnlyFuture,
            }
      );
      setReservations(result.reservations);
      setTotalPages(result.pages);
      // Si el filtro dejó la página actual fuera de rango, volvemos a la última válida
      if (result.page > 1 && result.page > result.pages) {
        setPage(result.pages);
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar las reservas. Intenta nuevamente.");
    } finally {
      setInitialLoading(false);
    }
  };

  // Estadísticas + contadores de las pestañas. Tras cada acción refresca también el
  // contador del menú (notifyReservationsChanged).
  const loadStats = async (organizationId: string) => {
    const [data, pending, allPending] = await Promise.all([
      getReservationStats(organizationId),
      getReservationsByOrganization(organizationId, { page: 1, limit: 1, status: "pending", onlyFuture: true }),
      getReservationsByOrganization(organizationId, { page: 1, limit: 100, status: "pending", onlyFuture: false }),
    ]);
    setStats(data);
    setPendingCount(pending.total);
    const now = Date.now();
    const pastGroups = new Set(
      allPending.reservations
        .filter((r) => new Date(r.startDate).getTime() < now)
        .map((r) => r.groupId || r._id)
    );
    setExpiredCount(pastGroups.size);
    notifyReservationsChanged();
  };

  const fetchServices = async (organizationId: string) => {
    try {
      const data = await getServicesByOrganizationId(organizationId);
      setServices(data);
    } catch (err) {
      console.error("Error al cargar los servicios:", err);
    }
  };

  const fetchEmployees = async (organizationId: string) => {
    try {
      const data = await getEmployeesByOrganizationId(organizationId);
      setEmployees(data);
    } catch (err) {
      console.error("Error al cargar los profesionales:", err);
    }
  };

  // Reserva aprobada/auto_aprobada cuya cita no existe (populate devolvió null o no es objeto)
  const isApprovedWithoutAppointment = (r: Reservation): boolean => {
    const isApproved = r.status === "approved" || r.status === "auto_approved";
    if (!isApproved) return false;
    return typeof r.appointmentId !== "object" || r.appointmentId === null;
  };

  const employeesSelectData = useMemo(
    () => employees.map((e) => ({ value: e._id, label: e.names })),
    [employees]
  );

  // Servicios de la organización para el filtro (independiente de la página cargada)
  const serviceSelectData = useMemo(
    () => services.map((s) => ({ value: s._id, label: s.name })),
    [services]
  );

  // ------- LISTA DE LA PÁGINA ACTUAL -------
  // El filtrado (estado, profesional, servicio, búsqueda, solo futuras), el orden
  // y la paginación ahora se resuelven en el servidor (ver loadPage). `reservations`
  // ya llega lista para mostrar — se mantiene este alias para minimizar cambios
  // en el resto del componente (agrupación por groupId, render de la tabla, etc.)
  const filteredReservations = reservations;

  // 👥 Crear un mapa de groupId para identificar grupos rápidamente
  const groupsMap = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filteredReservations.forEach(reservation => {
      if (reservation.groupId) {
        if (!map.has(reservation.groupId)) {
          map.set(reservation.groupId, []);
        }
        map.get(reservation.groupId)!.push(reservation);
      }
    });
    return map;
  }, [filteredReservations]);

  // "¿La organización tiene reservas?" viene de las estadísticas globales (todo el
  // historial, no solo la página actual) para distinguir "sin reservas" de
  // "sin resultados para estos filtros" en el mensaje vacío de la tabla.
  const hasReservations = stats.total > 0;

  // ------- PAGO DEL ABONO (comprobante) -------
  // Order del abono de la reserva o de su grupo (todas comparten el mismo).
  const getPaymentOrder = (
    reservation: Reservation,
    groupReservations?: Reservation[] | null
  ): ReservationPaymentOrder | null => {
    const list = groupReservations?.length ? groupReservations : [reservation];
    for (const r of list) {
      if (r.orderId && typeof r.orderId === "object") return r.orderId;
    }
    return null;
  };

  // Comprobante esperando decisión del admin: al aprobar la reserva se pregunta
  // si el pago es válido (antes se aprobaba la reserva y el abono quedaba sin
  // registrar, con el comprobante colgado en revisión).
  const isReceiptInReview = (order: ReservationPaymentOrder | null) =>
    !!order && order.provider === "receipt" && order.status === "in_review";

  const formatMoney = (order: ReservationPaymentOrder) =>
    `$${order.amount.toLocaleString("es-CO")} ${order.currency}`;

  const renderPaymentBadge = (order: ReservationPaymentOrder | null) => {
    if (!order) return null;
    const meta = paymentMeta(order.status);
    if (!meta) return null;
    const clickable = !!order.receipt?.imageUrl;
    const showAmount = order.status !== "failed" && order.status !== "expired";
    return (
      <span
        className={`ag-badge${meta.tone === "neutral" ? "" : ` ag-badge--${meta.tone}`}`}
        role={clickable ? "button" : undefined}
        style={clickable ? { cursor: "pointer" } : undefined}
        onClick={
          clickable
            ? (e) => {
                e.stopPropagation();
                setReceiptView(order);
              }
            : undefined
        }
      >
        {meta.label}
        {showAmount ? ` · ${formatMoney(order)}` : ""}
      </span>
    );
  };

  // Aprueba el abono (registra el pago en la cita ya creada y cierra el comprobante).
  const approvePayment = async (orderId: string) => {
    try {
      await reviewReceiptOrder(orderId, "approve");
      showNotification({ title: "Abono registrado", message: "El pago quedó registrado en la cita.", color: "teal" });
    } catch (e) {
      showNotification({
        title: "La reserva se aprobó, pero el abono no",
        message: e instanceof Error ? e.message : "No se pudo registrar el pago. Revísalo en Comprobantes de pago.",
        color: "red",
        autoClose: 10000,
      });
    }
  };

  // ------- ACTIONS -------
  const handleUpdateStatus = async (
    reservationId: string,
    newStatus: "approved" | "rejected",
    // undefined = aún no se decidió el comprobante; null = aprobar solo la reserva
    opts: { paymentOrderId?: string | null } = {}
  ): Promise<"success" | "error" | "concurrency"> => {
    const reservation = reservations.find((r) => r._id === reservationId);
    if (!reservation) {
      showNotification({
        title: "Error",
        message: "Reserva no encontrada",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
      return "error";
    }

    if (newStatus === "approved" && !hasEmployeeAssigned(reservation)) {
      setAssigningReservationId(reservationId);
      setAssignModalOpen(true);
      return "error";
    }

    if (newStatus === "approved" && opts.paymentOrderId === undefined) {
      const order = getPaymentOrder(reservation, reservation.groupId ? groupsMap.get(reservation.groupId) : null);
      if (order && isReceiptInReview(order)) {
        setReceiptPrompt({
          order,
          proceed: (approvePaymentToo) =>
            handleUpdateStatus(reservationId, "approved", { paymentOrderId: approvePaymentToo ? order._id : null }),
        });
        return "error";
      }
    }

    try {
      setRowBusy(
        reservationId,
        newStatus === "approved" ? "approve" : "reject"
      );
      await updateReservation(reservationId, { status: newStatus });
      showNotification({
        title: "Actualizado",
        message: `Reserva ${
          newStatus === "approved" ? "aprobada" : "rechazada"
        } correctamente`,
        color: "green",
      });
      if (opts.paymentOrderId) await approvePayment(opts.paymentOrderId);
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "success";
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.data?.code === "CONCURRENCY_LIMIT_REACHED") {
        setConcurrencyWarning({
          message: err.response.data.message,
          reservationId,
          conflictingAppointments: err.response.data.data.conflictingAppointments || [],
          paymentOrderId: opts.paymentOrderId,
        });
        return "concurrency";
      }
      showNotification({
        title: "Error",
        message: err?.response?.data?.message || `${err?.message || err}`,
        color: "red",
        autoClose: 4000,
      });
      return "error";
    } finally {
      setRowBusy(reservationId, null);
    }
  };

  const handleOpenAssignModal = (reservationId: string) => {
    setAssigningReservationId(reservationId);
    setSelectedEmployee(null);
    setAssignModalOpen(true);
  };

  const handleEmployeeAssign = async () => {
    if (!selectedEmployee || !assigningReservationId) return;
    try {
      setAssignModalLoading(true);
      setRowBusy(assigningReservationId, "assign");
      await updateReservation(assigningReservationId, {
        employeeId: selectedEmployee,
      });
      showNotification({
        title: "Asignado",
        message: "Profesional asignado correctamente",
        color: "green",
      });
      setAssignModalOpen(false);
      setSelectedEmployee(null);
      setAssigningReservationId(null);
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al asignar profesional",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setAssignModalLoading(false);
      if (assigningReservationId) setRowBusy(assigningReservationId, null);
    }
  };

  const handleDelete = async (reservationId: string) => {
    setDeletingReservationId(reservationId);
    setDeleteAlsoAppointments(true);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingReservationId) return;

    const reservation = reservations.find(r => r._id === deletingReservationId);
    const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
    const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;

    try {
      setRowBusy(deletingReservationId, "delete");
      await deleteReservation(deletingReservationId, { deleteAppointments: deleteAlsoAppointments });

      showNotification({
        title: "Eliminada",
        message: isGroup
          ? `Grupo de ${groupSize} reservas eliminado correctamente`
          : "Reserva eliminada correctamente",
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });
      setDeleteConfirmOpen(false);
      setDeletingReservationId(null);
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al eliminar la reserva",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      if (deletingReservationId) setRowBusy(deletingReservationId, null);
    }
  };

  // Cancelar reserva (soft: cambia status + cancela citas vinculadas)
  const handleCancelReservation = (reservationId: string) => {
    setCancellingReservationId(reservationId);
    setCancelNotifyClient(false);
    setCancelConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancellingReservationId) return;

    const reservation = reservations.find(r => r._id === cancellingReservationId);
    const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
    const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;

    try {
      setRowBusy(cancellingReservationId, "cancel");
      await cancelReservation(cancellingReservationId, { notifyClient: cancelNotifyClient });

      showNotification({
        title: "Cancelada",
        message: isGroup
          ? `Grupo de ${groupSize} reservas cancelado correctamente`
          : "Reserva cancelada correctamente",
        color: "orange",
        position: "top-right",
        autoClose: 3000,
      });
      setCancelConfirmOpen(false);
      setCancellingReservationId(null);
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al cancelar la reserva",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      if (cancellingReservationId) setRowBusy(cancellingReservationId, null);
    }
  };

  // 👥 ACCIONES GRUPALES
  const handleApproveGroup = async (
    groupId: string,
    opts: { paymentOrderId?: string | null } = {}
  ): Promise<"success" | "error" | "concurrency"> => {
    const group = groupsMap.get(groupId);
    if (!group) return "error";

    if (opts.paymentOrderId === undefined) {
      const order = getPaymentOrder(group[0], group);
      if (order && isReceiptInReview(order)) {
        setReceiptPrompt({
          order,
          proceed: (approvePaymentToo) =>
            handleApproveGroup(groupId, { paymentOrderId: approvePaymentToo ? order._id : null }),
        });
        return "error";
      }
    }

    try {
      for (const reservation of group) {
        if (reservation._id) {
          setRowBusy(reservation._id, "approve");
        }
      }

      const pendingReservations = group.filter(r => r._id && r.status === "pending");
      
      // Aprobar todas menos la última con skipNotification: true
      for (let i = 0; i < pendingReservations.length; i++) {
        const r = pendingReservations[i];
        const isLast = i === pendingReservations.length - 1;
        await updateReservation(r._id!, { 
          status: "approved",
          skipNotification: !isLast  // Solo la última envía WhatsApp
        } as any);
      }

      showNotification({
        title: "Grupo Aprobado",
        message: `${pendingReservations.length} reserva(s) aprobada(s) exitosamente`,
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });
      if (opts.paymentOrderId) await approvePayment(opts.paymentOrderId);

      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "success";
    } catch (err: any) {
      console.error(err);

      if (err?.response?.data?.data?.code === "CONCURRENCY_LIMIT_REACHED") {
        setConcurrencyWarning({
          message: err.response.data.message,
          isGroup: true,
          groupId,
          conflictingAppointments: err.response.data.data.conflictingAppointments || [],
          paymentOrderId: opts.paymentOrderId,
        });
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
        return "concurrency";
      }

      // Extraer mensaje de error específico
      const errorMessage = err?.response?.data?.message || err?.message || "Error al aprobar el grupo de reservas";

      showNotification({
        title: "Error al Aprobar",
        message: errorMessage,
        color: "red",
        position: "top-right",
        autoClose: 5000,
      });

      // Recargar para mostrar el estado revertido
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "error";
    } finally {
      group.forEach(r => {
        if (r._id) setRowBusy(r._id, null);
      });
    }
  };

  const handleReapproveGroup = async (groupId: string): Promise<"success" | "error" | "concurrency"> => {
    const group = groupsMap.get(groupId);
    if (!group) return "error";

    const target = group.find(r => r._id && r.status === "appointment_deleted");
    if (!target?._id) return "error";

    try {
      group.forEach(r => { if (r._id) setRowBusy(r._id, "approve"); });
      await updateReservation(target._id, { status: "approved" } as any);
      showNotification({
        title: "Citas re-creadas",
        message: "Las citas del grupo fueron re-aprobadas exitosamente",
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "success";
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.data?.code === "CONCURRENCY_LIMIT_REACHED") {
        setConcurrencyWarning({
          message: err.response.data.message,
          isGroup: true,
          groupId,
          conflictingAppointments: err.response.data.data.conflictingAppointments || [],
        });
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
        return "concurrency";
      }
      showNotification({
        title: "Error",
        message: err?.response?.data?.message || err?.message || "Error al re-aprobar el grupo",
        color: "red",
        position: "top-right",
        autoClose: 4000,
      });
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "error";
    } finally {
      group.forEach(r => { if (r._id) setRowBusy(r._id, null); });
    }
  };

  const handleRecreateGroupAppointments = async (groupId: string): Promise<"success" | "error" | "concurrency"> => {
    const group = groupsMap.get(groupId);
    if (!group) return "error";

    // Tomar cualquier reserva del grupo sin cita para disparar el batch
    const target = group.find(r => r._id && isApprovedWithoutAppointment(r));
    if (!target?._id) return "error";

    try {
      group.forEach(r => { if (r._id) setRowBusy(r._id, "approve"); });
      await updateReservation(target._id, { status: "approved" } as any);
      showNotification({
        title: "Citas recreadas",
        message: "Las citas faltantes del grupo fueron creadas exitosamente",
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "success";
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.data?.code === "CONCURRENCY_LIMIT_REACHED") {
        setConcurrencyWarning({
          message: err.response.data.message,
          isGroup: true,
          groupId,
          conflictingAppointments: err.response.data.data.conflictingAppointments || [],
        });
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
        return "concurrency";
      }
      showNotification({
        title: "Error",
        message: err?.response?.data?.message || err?.message || "Error al recrear las citas",
        color: "red",
        position: "top-right",
        autoClose: 4000,
      });
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
      return "error";
    } finally {
      group.forEach(r => { if (r._id) setRowBusy(r._id, null); });
    }
  };

  const handleForceApprove = async () => {
    if (!concurrencyWarning) return;
    const warning = concurrencyWarning;
    setConcurrencyWarning(null);

    if (warning.isGroup && warning.groupId) {
      const group = groupsMap.get(warning.groupId);
      if (!group) return;
      try {
        group.forEach(r => { if (r._id) setRowBusy(r._id, "approve"); });
        const pendingReservations = group.filter(r => r._id && r.status === "pending");
        for (let i = 0; i < pendingReservations.length; i++) {
          const r = pendingReservations[i];
          const isLast = i === pendingReservations.length - 1;
          await updateReservation(r._id!, {
            status: "approved",
            skipNotification: !isLast,
            forceApprove: true,
          } as any);
        }
        showNotification({ title: "Grupo Aprobado", message: "Reservas aprobadas correctamente", color: "green", position: "top-right" });
        if (warning.paymentOrderId) await approvePayment(warning.paymentOrderId);
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
      } catch (err: any) {
        showNotification({ title: "Error", message: err?.response?.data?.message || err?.message, color: "red", position: "top-right" });
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
      } finally {
        group.forEach(r => { if (r._id) setRowBusy(r._id, null); });
      }
    } else if (warning.reservationId) {
      try {
        setRowBusy(warning.reservationId, "approve");
        await updateReservation(warning.reservationId, { status: "approved", forceApprove: true } as any);
        showNotification({ title: "Aprobada", message: "Cita creada correctamente", color: "green" });
        if (warning.paymentOrderId) await approvePayment(warning.paymentOrderId);
        if (organization?._id) {
          await loadPage(organization._id);
          void loadStats(organization._id);
        }
      } catch (err: any) {
        showNotification({ title: "Error", message: err?.response?.data?.message || err?.message, color: "red" });
      } finally {
        setRowBusy(warning.reservationId, null);
      }
    }
  };

  const handleRejectGroup = async (groupId: string) => {
    const group = groupsMap.get(groupId);
    if (!group) return;

    try {
      for (const reservation of group) {
        if (reservation._id) {
          setRowBusy(reservation._id, "reject");
        }
      }

      const promises = group
        .filter(r => r._id && r.status === "pending")
        .map(r => updateReservation(r._id!, { status: "rejected" }));

      await Promise.all(promises);

      showNotification({
        title: "Grupo Rechazado",
        message: `${promises.length} reserva(s) rechazada(s)`,
        color: "orange",
        position: "top-right",
        autoClose: 3000,
      });

      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al rechazar el grupo de reservas",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      group.forEach(r => {
        if (r._id) setRowBusy(r._id, null);
      });
    }
  };

  const handleChangePolicy = async (nextPolicy: ReservationPolicy) => {
    if (!organization?._id) return;
    try {
      await dispatch(
        updateReservationPolicy({
          organizationId: organization._id,
          policy: nextPolicy,
        })
      ).unwrap();

      showNotification({
        title: "Configuración guardada",
        message:
          nextPolicy === "auto_if_available"
            ? "Agendamiento automático activado (si hay disponibilidad inmediata)."
            : "Aprobación manual activada.",
        color: "green",
      });
    } catch {
      showNotification({
        title: "Error",
        message: "No se pudo actualizar la política de agendamiento",
        color: "red",
      });
    }
  };

  // ------- REDISEÑO: filas de la bandeja, del historial y tarjetas móviles -------
  const tz = organization?.timezone || "America/Bogota";
  const fmtTime = (d: dayjs.Dayjs) =>
    d.format(getTimeFormatStr(organization?.timeFormat)).replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Una entrada por reserva o por grupo (la primera del grupo representa a todas)
  type Entry = { first: Reservation; list: Reservation[] };
  const toEntries = (rows: Reservation[]): Entry[] => {
    const seen = new Set<string>();
    const out: Entry[] = [];
    for (const r of rows) {
      const group = r.groupId ? groupsMap.get(r.groupId) : null;
      if (group && group.length > 1) {
        if (seen.has(r.groupId!)) continue;
        seen.add(r.groupId!);
        out.push({ first: group[0], list: group });
      } else {
        out.push({ first: r, list: [r] });
      }
    }
    return out;
  };

  const nowTz = dayjs().tz(tz);
  const todayKey = nowTz.format("YYYY-MM-DD");
  const inboxEntries = useMemo(() => {
    if (tab !== "por_confirmar" && tab !== "vencidas") return [];
    const now = Date.now();
    const rows = reservations.filter((r) =>
      tab === "vencidas" ? new Date(r.startDate).getTime() < now : new Date(r.startDate).getTime() >= now - 60_000
    );
    const entries = toEntries(rows);
    // Vencidas: la más reciente primero
    return tab === "vencidas" ? entries.reverse() : entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, tab, groupsMap]);

  const inboxSections = useMemo(() => {
    if (tab === "vencidas") return [{ key: "vencidas", label: "Fecha pasada", entries: inboxEntries }];
    const buckets: Record<WhenBucket, Entry[]> = { hoy: [], semana: [], despues: [] };
    inboxEntries.forEach((e) => {
      buckets[whenBucket(dayjs(e.first.startDate).tz(tz).format("YYYY-MM-DD"), todayKey)].push(e);
    });
    return (Object.keys(buckets) as WhenBucket[])
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({ key: k, label: WHEN_LABELS[k], entries: buckets[k] }));
  }, [inboxEntries, tab, tz, todayKey]);

  const historyEntries = useMemo(
    () => (tab === "historial" ? toEntries(reservations) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, tab, groupsMap]
  );

  const hasActiveFilters =
    statusFilter !== "all" || employeeFilter !== "all" || serviceFilter !== "all" || searchTerm.trim() !== "";
  const clearFilters = () => {
    setStatusFilter("all");
    setEmployeeFilter("all");
    setServiceFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  const serviceNames = (list: Reservation[]) =>
    list.map((r) => (typeof r.serviceId === "object" && r.serviceId ? r.serviceId.name : "—")).join(" · ");

  const renderPro = (first: Reservation, list: Reservation[]) => {
    const names = getProfessionalNames(first, list);
    if (names.length === 1 && names[0] === "Sin asignar") {
      return <span className="ag-badge ag-badge--warning">Sin profesional</span>;
    }
    return (
      <span className="ag-appt__pro" style={{ color: "var(--ink)" }}>
        <i style={{ background: "var(--brand)" }} />
        {names.filter((n) => n !== "Sin asignar").join(", ")}
      </span>
    );
  };

  const renderOrigin = (r: Reservation) => {
    const Icon = r.source === "ai_chatbot" ? IconRobot : r.source === "admin" ? IconDeviceDesktop : IconWorld;
    return (
      <span className="ag-subtle" style={{ display: "inline-flex", gap: 4, alignItems: "center", whiteSpace: "nowrap" }}>
        <Icon size={14} />
        {originLabel(r.source)}
      </span>
    );
  };

  const renderStatus = (r: Reservation) => {
    const meta = STATUS_META[r.status as ReservationStatusKey];
    if (!meta) return null;
    return <span className={`ag-badge${meta.tone === "neutral" ? "" : ` ag-badge--${meta.tone}`}`}>{meta.label}</span>;
  };

  const runApprove = async (e: Entry) => {
    const isGroup = e.list.length > 1;
    if (isGroup && e.first.groupId) await handleApproveGroup(e.first.groupId);
    else if (e.first._id) await handleUpdateStatus(e.first._id, "approved");
  };
  const runReject = async (e: Entry) => {
    const isGroup = e.list.length > 1;
    if (isGroup && e.first.groupId) await handleRejectGroup(e.first.groupId);
    else if (e.first._id) await handleUpdateStatus(e.first._id, "rejected");
  };

  const renderInboxRow = (entry: Entry, expired: boolean) => {
    const { first, list } = entry;
    const isGroup = list.length > 1;
    const start = dayjs(first.startDate).tz(tz);
    const dayDiff = start.startOf("day").diff(nowTz.startOf("day"), "day");
    const order = getPaymentOrder(first, list);
    const busy = list.some((r) => r._id && isRowBusy(r._id));
    const open = () => handleOpenDetail(first, list);
    const actions = (
      <div
        className="ag-row"
        style={isMobile ? { display: "grid", gridTemplateColumns: expired ? "1fr" : "1fr 1fr", gap: 8, marginTop: 8 } : { flexWrap: "nowrap", gap: 8 }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <Button size="xs" variant={isMobile ? "outline" : "subtle"} color="gray" loading={busy} onClick={() => runReject(entry)}>
          Rechazar
        </Button>
        {!expired && (
          <Button size="xs" variant={isMobile ? "filled" : "outline"} loading={busy} leftSection={<IconCheck size={14} />} onClick={() => runApprove(entry)}>
            {isGroup ? `Aprobar las ${list.length}` : "Aprobar"}
          </Button>
        )}
      </div>
    );
    return (
      <div
        key={first._id}
        className="ag-list-row"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), open())}
        style={{ padding: "12px 16px", gap: 14, alignItems: isMobile ? "stretch" : "center", cursor: "pointer", flexDirection: isMobile ? "column" : "row" }}
      >
        <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0 }}>
          <div style={dateBoxStyle}>
            <small style={{ fontSize: 11, lineHeight: "14px", color: "var(--ink-muted)", textTransform: "capitalize" }}>{start.format("ddd").replace(".", "")}</small>
            <b style={{ fontSize: 18, lineHeight: "22px" }}>{start.format("D")}</b>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <b className="ag-num">{fmtTime(start)}</b>
              <span className="ag-subtle">{relativeWhen(start.valueOf(), Date.now(), dayDiff)}</span>
              {isGroup && <span className="ag-badge ag-badge--outline">Grupo de {list.length}</span>}
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              <b>{first.customerDetails?.name ?? "—"}</b>
              {first.customerDetails?.phone && <span className="ag-muted" style={{ fontSize: 13 }}> · {first.customerDetails.phone}</span>}
            </div>
            <div className="ag-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <span className="ag-muted" style={{ fontSize: 13 }}>{serviceNames(list)}</span>
              {renderPro(first, list)}
              {renderOrigin(first)}
            </div>
            {order && <div style={{ marginTop: 4 }}>{renderPaymentBadge(order)}</div>}
            {first.errorMessage && !expired && (
              <div className="ag-subtle" style={{ color: "var(--warning)", marginTop: 2 }}>No se confirmó sola: {first.errorMessage}</div>
            )}
          </div>
        </div>
        {actions}
      </div>
    );
  };

  const renderNotice = (first: Reservation, list: Reservation[]) => {
    const order = getPaymentOrder(first, list);
    const noAppt = list.some(isApprovedWithoutAppointment);
    if (!order && !noAppt) return <span className="ag-subtle">—</span>;
    return (
      <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }}>
        {noAppt && <span className="ag-badge ag-badge--danger">Sin cita</span>}
        {order && renderPaymentBadge(order)}
      </div>
    );
  };

  const renderRowAction = (first: Reservation, list: Reservation[]) => {
    const busy = list.some((r) => r._id && isRowBusy(r._id));
    const stop = (ev: React.MouseEvent) => ev.stopPropagation();
    if (list.every((r) => r.status === "pending")) {
      return (
        <Button size="xs" variant="outline" loading={busy} onClick={(ev) => { stop(ev); void runApprove({ first, list }); }}>
          Aprobar
        </Button>
      );
    }
    if (list.some((r) => r.status === "appointment_deleted")) {
      return (
        <Button size="xs" variant="subtle" loading={busy} onClick={(ev) => { stop(ev); handleOpenDetail(first, list); }}>
          Re-aprobar
        </Button>
      );
    }
    if (list.some(isApprovedWithoutAppointment)) {
      return (
        <Button size="xs" variant="subtle" loading={busy} onClick={(ev) => { stop(ev); handleOpenDetail(first, list); }}>
          Recrear cita
        </Button>
      );
    }
    return null;
  };

  const renderHistoryRow = (entry: Entry) => {
    const { first, list } = entry;
    const start = dayjs(first.startDate).tz(tz);
    return (
      <tr key={first._id} style={{ cursor: "pointer" }} onClick={() => handleOpenDetail(first, list)}>
        <td className="ag-num" style={{ whiteSpace: "nowrap" }}>
          <b>{capitalize(start.format("ddd D/MM").replace(".", ""))}</b>
          <div className="ag-subtle">{fmtTime(start)}</div>
        </td>
        <td>
          <b>{first.customerDetails?.name ?? "—"}</b>
          <div className="ag-subtle" style={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {list.length > 1 ? `Grupo de ${list.length} · ` : ""}
            {serviceNames(list)}
          </div>
        </td>
        <td>{renderPro(first, list)}</td>
        <td>{renderOrigin(first)}</td>
        <td>{renderStatus(first)}</td>
        <td>{renderNotice(first, list)}</td>
        <td style={{ textAlign: "right" }}>{renderRowAction(first, list)}</td>
      </tr>
    );
  };

  const renderHistoryCard = (entry: Entry) => {
    const { first, list } = entry;
    const start = dayjs(first.startDate).tz(tz);
    return (
      <div
        key={first._id}
        className="ag-card"
        role="button"
        tabIndex={0}
        onClick={() => handleOpenDetail(first, list)}
        style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer" }}
      >
        <div className="ag-row" style={{ justifyContent: "space-between" }}>
          <b className="ag-num">{capitalize(start.format("ddd D/MM").replace(".", ""))} · {fmtTime(start)}</b>
          {renderStatus(first)}
        </div>
        <div>
          <b>{first.customerDetails?.name ?? "—"}</b>
          <div className="ag-subtle">{list.length > 1 ? `Grupo de ${list.length} · ` : ""}{serviceNames(list)}</div>
        </div>
        <div className="ag-row" style={{ gap: 10, flexWrap: "wrap" }}>
          {renderPro(first, list)}
          {renderOrigin(first)}
        </div>
        {(getPaymentOrder(first, list) || list.some(isApprovedWithoutAppointment)) && renderNotice(first, list)}
        {renderRowAction(first, list)}
      </div>
    );
  };

  // Rechazar todas las vencidas (no se avisa al cliente: el backend no notifica rechazos).
  // Las que tienen dinero de por medio (comprobante en revisión o abono pagado) quedan
  // fuera: se revisan una por una para decidir qué pasa con el pago.
  const hasMoneyAtStake = (e: Entry) => {
    const st = getPaymentOrder(e.first, e.list)?.status;
    return st === "in_review" || st === "paid";
  };
  const rejectableExpired = tab === "vencidas" ? inboxEntries.filter((e) => !hasMoneyAtStake(e)) : [];
  const expiredWithMoney = tab === "vencidas" ? inboxEntries.length - rejectableExpired.length : 0;

  const handleRejectAllExpired = async () => {
    setRejectAllBusy(true);
    let ok = 0;
    try {
      for (const e of rejectableExpired) {
        const targets = e.list.filter((r) => r._id && r.status === "pending");
        await Promise.all(targets.map((r) => updateReservation(r._id!, { status: "rejected" })));
        ok += 1;
      }
      showNotification({ title: "Vencidas rechazadas", message: `${ok} reserva(s) rechazada(s).`, color: "green" });
    } catch (err: any) {
      showNotification({ title: "No se pudieron rechazar todas", message: err?.response?.data?.message || err?.message || "Intenta de nuevo.", color: "red" });
    } finally {
      setRejectAllBusy(false);
      setRejectAllOpen(false);
      if (organization?._id) {
        await loadPage(organization._id);
        void loadStats(organization._id);
      }
    }
  };

  // ------- RENDER -------
  return (
    <>
      {savingPolicy && (
        <CustomLoader overlay loadingText="Actualizando política..." />
      )}

      {/* Modal Asignar profesional */}
      <Modal
        opened={assignModalOpen}
        onClose={() => {
          if (!assignModalLoading) {
            setAssignModalOpen(false);
            setAssigningReservationId(null);
            setSelectedEmployee(null);
          }
        }}
        title="Asignar profesional"
        centered
      >
        <div style={{ position: "relative" }}>
          <LoadingOverlay visible={assignModalLoading} zIndex={1000} />
          <Select
            label="Selecciona un profesional"
            placeholder="Profesional"
            data={employeesSelectData}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            searchable
            nothingFoundMessage="Sin resultados"
          />
          <Button
            mt="md"
            fullWidth
            onClick={handleEmployeeAssign}
            disabled={!selectedEmployee}
            loading={assignModalLoading}
          >
            Asignar
          </Button>
        </div>
      </Modal>

      {/* Modal Confirmar cancelación */}
      <Modal
        opened={cancelConfirmOpen}
        onClose={() => {
          if (!cancellingReservationId || !isRowBusy(cancellingReservationId)) {
            setCancelConfirmOpen(false);
            setCancellingReservationId(null);
          }
        }}
        title="Confirmar cancelación"
        centered
      >
        {(() => {
          const reservation = reservations.find(r => r._id === cancellingReservationId);
          const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
          const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;
          const hasAppointments = isGroup
            ? (groupsMap.get(reservation?.groupId ?? "")?.some(r => r.appointmentId) ?? false)
            : !!reservation?.appointmentId;

          return (
            <Stack gap="sm">
              <Text size="sm">
                {isGroup ? (
                  <>
                    ¿Seguro que deseas cancelar este <strong>grupo de {groupSize} reservas</strong>?
                    Se cancelarán todas las reservas del grupo.
                  </>
                ) : (
                  <>
                    ¿Seguro que deseas cancelar esta reserva?
                  </>
                )}
              </Text>
              {hasAppointments && (
                <Alert color="orange" variant="light">
                  <Text size="sm">
                    Las citas vinculadas también serán canceladas.
                    Los registros se mantendrán en el historial.
                  </Text>
                </Alert>
              )}
              <Checkbox
                label="Notificar al cliente por WhatsApp"
                checked={cancelNotifyClient}
                onChange={(e) => setCancelNotifyClient(e.currentTarget.checked)}
              />
            </Stack>
          );
        })()}
        <Group mt="md" justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setCancelConfirmOpen(false);
              setCancellingReservationId(null);
            }}
            disabled={!!(cancellingReservationId && isRowBusy(cancellingReservationId))}
          >
            Volver
          </Button>
          <Button
            color="orange"
            onClick={confirmCancel}
            loading={!!(cancellingReservationId && isRowBusy(cancellingReservationId))}
          >
            Cancelar reserva
          </Button>
        </Group>
      </Modal>

      {/* Modal Confirmar eliminación */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          if (!deletingReservationId || !isRowBusy(deletingReservationId)) {
            setDeleteConfirmOpen(false);
            setDeletingReservationId(null);
          }
        }}
        title="Confirmar eliminación"
        centered
      >
        {(() => {
          const reservation = reservations.find(r => r._id === deletingReservationId);
          const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
          const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;
          const hasAppointments = isGroup
            ? (groupsMap.get(reservation?.groupId ?? "")?.some(r => r.appointmentId) ?? false)
            : !!reservation?.appointmentId;

          return (
            <Stack gap="sm">
              <Text size="sm">
                {isGroup ? (
                  <>
                    ¿Seguro que deseas eliminar este <strong>grupo de {groupSize} reservas</strong>?
                    Se eliminarán permanentemente de la base de datos. Esta acción no se puede deshacer.
                  </>
                ) : (
                  <>
                    ¿Seguro que deseas eliminar esta reserva? Se eliminará permanentemente. Esta acción no se puede deshacer.
                  </>
                )}
              </Text>
              {hasAppointments && (
                <Checkbox
                  label="También eliminar las citas creadas"
                  checked={deleteAlsoAppointments}
                  onChange={(e) => setDeleteAlsoAppointments(e.currentTarget.checked)}
                  color="red"
                />
              )}
            </Stack>
          );
        })()}
        <Group mt="md" justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeletingReservationId(null);
            }}
            disabled={!!(deletingReservationId && isRowBusy(deletingReservationId))}
          >
            Volver
          </Button>
          <Button
            color="red"
            onClick={confirmDelete}
            loading={!!(deletingReservationId && isRowBusy(deletingReservationId))}
          >
            Eliminar
          </Button>
        </Group>
      </Modal>

      {/* Detalle de la reserva: panel lateral en escritorio, sheet en móvil */}
      <Drawer
        opened={detailModalOpen}
        onClose={handleCloseDetail}
        position={isMobile ? "bottom" : "right"}
        size={isMobile ? "90%" : 460}
        radius={isMobile ? "lg" : 0}
        title={
          <Group gap="sm">
            <Text fw={600} size="lg">
              {selectedGroupReservations.length > 1
                ? `Grupo de ${selectedGroupReservations.length} reservas`
                : "Reserva"}
            </Text>
            {selectedReservation && renderStatus(selectedReservation)}
          </Group>
        }
      >
        <div style={{ position: "relative" }}>
          <LoadingOverlay visible={detailModalLoading} zIndex={1000} />
          {selectedReservation ? (
          <Stack gap="md">
            {/* Información del Cliente */}
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb={4}>
                Cliente
              </Text>
              <Text size="lg" fw={500}>
                {selectedReservation.customerDetails?.name ?? "—"}
              </Text>
              {selectedReservation.customerDetails?.phone && (
                <Text size="sm" c="dimmed">
                  {selectedReservation.customerDetails.phone}
                </Text>
              )}
              {selectedReservation.customerDetails?.email && (
                <Text size="sm" c="dimmed">
                  {selectedReservation.customerDetails.email}
                </Text>
              )}
              {selectedReservation.customerDetails?.documentId && (
                <Text size="sm" c="dimmed">
                  Documento: {selectedReservation.customerDetails.documentId}
                </Text>
              )}
              {selectedReservation.customerDetails?.birthDate && (
                <Text size="sm" c="dimmed">
                  Nacimiento: {dayjs(selectedReservation.customerDetails.birthDate).format("DD/MM/YYYY")}
                </Text>
              )}
              {selectedReservation.customerDetails?.notes && (
                <Text size="sm" c="dimmed" mt={4}>
                  Notas: {selectedReservation.customerDetails.notes}
                </Text>
              )}
            </Box>

            {/* Pago del abono (comprobante) */}
            {(() => {
              const order = getPaymentOrder(selectedReservation, selectedGroupReservations);
              if (!order) return null;
              return (
                <Box>
                  <Text size="sm" fw={600} c="dimmed" mb={4}>
                    Abono
                  </Text>
                  <Group gap="xs">
                    {renderPaymentBadge(order)}
                    {order.receipt?.imageUrl && (
                      <Button size="xs" variant="subtle" onClick={() => setReceiptView(order)}>
                        Ver comprobante
                      </Button>
                    )}
                  </Group>
                  {order.status === "in_review" && order.receipt?.fulfillError && selectedReservation.status === "pending" && (
                    <Text size="xs" c="red" mt={4}>
                      El pago es válido, pero no se pudo confirmar la reserva: {order.receipt.fulfillError}. Cambia el profesional u horario y apruébala.
                    </Text>
                  )}
                  {/* Reserva ya aprobada (ej. desde aquí antes de esta mejora) con el
                      comprobante aún en revisión: registrar o rechazar el abono. */}
                  {isReceiptInReview(order) && selectedReservation.status !== "pending" && (
                    <Group gap="xs" mt="xs">
                      <Button
                        size="xs"
                        color="teal"
                        onClick={async () => {
                          await approvePayment(order._id);
                          handleCloseDetail();
                          if (organization?._id) await loadPage(organization._id);
                        }}
                      >
                        Registrar abono
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={async () => {
                          try {
                            await reviewReceiptOrder(order._id, "reject");
                            showNotification({ title: "Comprobante rechazado", message: "Se le avisó al cliente.", color: "orange" });
                            handleCloseDetail();
                            if (organization?._id) await loadPage(organization._id);
                          } catch (e) {
                            showNotification({ title: "No se pudo rechazar", message: e instanceof Error ? e.message : "Intenta de nuevo.", color: "red" });
                          }
                        }}
                      >
                        Rechazar comprobante
                      </Button>
                    </Group>
                  )}
                </Box>
              );
            })()}

            {/* Campos personalizados (Organization.clientFormConfig.fields, scope "booking") */}
            {selectedReservation.customFieldValues &&
              Object.keys(selectedReservation.customFieldValues).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb={4}>
                      Campos personalizados
                    </Text>
                    <Stack gap={4}>
                      {Object.entries(selectedReservation.customFieldValues).map(([key, value]) => {
                        if (value === undefined || value === null || value === "") return null;
                        const def = organization?.clientFormConfig?.fields?.find((f) => f.key === key);
                        const label = def?.label || key;
                        const displayValue =
                          def?.type === "date" && value
                            ? dayjs(value as string).format("DD/MM/YYYY")
                            : String(value);
                        return (
                          <Group key={key} justify="space-between">
                            <Text size="sm" c="dimmed">{label}</Text>
                            <Text size="sm" fw={500}>{displayValue}</Text>
                          </Group>
                        );
                      })}
                    </Stack>
                  </Box>
                </>
              )}

            <Divider />

            {/* Servicios */}
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb={8}>
                {selectedGroupReservations.length > 1 ? "Servicios" : "Servicio"}
              </Text>
              <Stack gap="xs">
                {selectedGroupReservations.map((res, idx) => {
                  const serviceObj = typeof res.serviceId === "object" ? res.serviceId : null;
                  const serviceName = serviceObj?.name || "Sin especificar";
                  const servicePrice = serviceObj?.price || 0;
                  const empName = getEmployeeName(res);
                  const hasEmp = hasEmployeeAssigned(res);

                  return (
                    <Card key={res._id || idx} withBorder p="sm" radius="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Text fw={500}>{serviceName}</Text>
                            {renderStatus(res)}
                            {isApprovedWithoutAppointment(res) && (
                              <Badge size="sm" color="orange" variant="outline">
                                Sin cita
                              </Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">
                            {capitalize(dayjs(res.startDate).tz(tz).format("ddd D/MM/YYYY").replace(".", ""))} · {fmtTime(dayjs(res.startDate).tz(tz))}
                          </Text>
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              Profesional:
                            </Text>
                            {hasEmp ? (
                              <Badge variant="light" color="grape" size="sm">
                                {empName ?? "Asignado"}
                              </Badge>
                            ) : (
                              <Badge variant="light" color="red" size="sm">
                                Sin asignar
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                        <Text fw={600} size="lg">
                          $ {servicePrice.toLocaleString("es-CO")}
                        </Text>
                      </Group>

                      {/* Re-aprobar cita eliminada */}
                      {res.status === "appointment_deleted" && (
                        <Group mt="sm">
                          <Button
                            size="xs"
                            color="blue"
                            variant="light"
                            leftSection={<BiCheck />}
                            onClick={async () => {
                              setDetailModalLoading(true);
                              const result = await handleUpdateStatus(res._id!, "approved");
                              setDetailModalLoading(false);
                              if (result === "success") handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!) || detailModalLoading}
                            disabled={detailModalLoading}
                          >
                            Re-aprobar
                          </Button>
                        </Group>
                      )}

                      {/* Recrear cita individual */}
                      {isApprovedWithoutAppointment(res) && (
                        <Group mt="sm">
                          <Button
                            size="xs"
                            color="orange"
                            variant="light"
                            leftSection={<BiCheck />}
                            onClick={async () => {
                              setDetailModalLoading(true);
                              const result = await handleUpdateStatus(res._id!, "approved");
                              setDetailModalLoading(false);
                              if (result === "success") handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!) || detailModalLoading}
                            disabled={detailModalLoading}
                          >
                            Recrear cita
                          </Button>
                        </Group>
                      )}

                      {/* Acciones Individuales */}
                      {res.status === "pending" && (
                        <Group mt="sm" gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<BiCheck />}
                            onClick={async () => {
                              setDetailModalLoading(true);
                              const result = await handleUpdateStatus(res._id!, "approved");
                              setDetailModalLoading(false);
                              if (result === "success") handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!) || detailModalLoading}
                            disabled={detailModalLoading}
                          >
                            Aprobar
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<BiXCircle />}
                            onClick={async () => {
                              setDetailModalLoading(true);
                              const result = await handleUpdateStatus(res._id!, "rejected");
                              setDetailModalLoading(false);
                              if (result === "success") handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!) || detailModalLoading}
                            disabled={detailModalLoading}
                          >
                            Rechazar
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<BiUser />}
                            onClick={() => {
                              handleOpenAssignModal(res._id!);
                              handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!)}
                          >
                            Profesional
                          </Button>
                        </Group>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            </Box>

            {/* ⚠️ Mostrar error si existe */}
            {selectedReservation.errorMessage && (
              <>
                <Divider />
                <Alert color="red" icon={<BiInfoCircle />} title="Error al crear cita automáticamente">
                  <Text size="sm">
                    {selectedReservation.errorMessage}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Esta reserva quedó pendiente porque no se pudo crear la cita automáticamente. 
                    Puedes intentar aprobarla manualmente.
                  </Text>
                </Alert>
              </>
            )}

            {/* Información de Abono si aplica */}
            {selectedReservation.status === "pending" &&
              organization?.requireReservationDeposit && (
                <>
                  <Divider />
                  <Alert color="blue" icon={<BiInfoCircle />}>
                    {(() => {
                      const groupServices = selectedGroupReservations.map((r) =>
                        typeof r.serviceId === "object" && r.serviceId
                          ? (r.serviceId as any)
                          : { price: 0 }
                      );
                      const depositTotal = computeDepositTotal(organization, groupServices);
                      const totalPrice = groupServices.reduce((sum, sv) => sum + (sv.price || 0), 0);
                      const pct = uniformDepositPercentage(organization, groupServices);
                      return depositTotal > 0 ? (
                        <Group gap="xs">
                          <Text size="sm" fw={500}>
                            Abono requerido:
                          </Text>
                          <Text size="sm" c="blue" fw={700}>
                            ${depositTotal.toLocaleString("es-CL")}
                          </Text>
                          <Text size="xs" c="dimmed">
                            ({pct !== undefined ? `${pct}% del total` : "según la regla de cada servicio"} de $
                            {totalPrice.toLocaleString("es-CL")})
                          </Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          El abono no está configurado. Configúralo en Ajustes › Cobros.
                        </Text>
                      );
                    })()}
                  </Alert>
                </>
              )}

            <Divider />

            {/* Re-aprobar citas eliminadas del grupo */}
            {selectedGroupReservations.length > 1 &&
              selectedGroupReservations.some(r => r.status === "appointment_deleted") && (
                <Alert color="blue" variant="light" icon={<BiInfoCircle />}>
                  <Text size="sm" mb="xs">
                    {selectedGroupReservations.filter(r => r.status === "appointment_deleted").length} reserva(s) del grupo tienen su cita eliminada.
                  </Text>
                  <Button
                    size="xs"
                    color="blue"
                    leftSection={<BiCheck />}
                    onClick={async () => {
                      if (selectedReservation.groupId) {
                        setDetailModalLoading(true);
                        const result = await handleReapproveGroup(selectedReservation.groupId);
                        setDetailModalLoading(false);
                        if (result === "success") handleCloseDetail();
                      }
                    }}
                    loading={detailModalLoading}
                    disabled={detailModalLoading}
                  >
                    Re-aprobar grupo
                  </Button>
                </Alert>
            )}

            {/* Recrear citas faltantes del grupo */}
            {selectedGroupReservations.length > 1 &&
              selectedGroupReservations.some(isApprovedWithoutAppointment) &&
              !selectedGroupReservations.every(r => r.status === "pending") && (
                <Alert color="orange" variant="light" icon={<BiInfoCircle />}>
                  <Text size="sm" mb="xs">
                    {selectedGroupReservations.filter(isApprovedWithoutAppointment).length} reserva(s) del grupo no tienen cita creada.
                  </Text>
                  <Button
                    size="xs"
                    color="orange"
                    leftSection={<BiCheck />}
                    onClick={async () => {
                      if (selectedReservation.groupId) {
                        setDetailModalLoading(true);
                        const result = await handleRecreateGroupAppointments(selectedReservation.groupId);
                        setDetailModalLoading(false);
                        if (result === "success") handleCloseDetail();
                      }
                    }}
                    loading={detailModalLoading}
                    disabled={detailModalLoading}
                  >
                    Recrear citas faltantes
                  </Button>
                </Alert>
            )}

            {/* Acciones Grupales */}
            {selectedGroupReservations.length > 1 &&
              selectedGroupReservations.every(r => r.status === "pending") && (
                <Group gap="xs" grow>
                  <Button
                    color="green"
                    leftSection={<BiCheck />}
                    onClick={async () => {
                      if (selectedReservation.groupId) {
                        setDetailModalLoading(true);
                        const result = await handleApproveGroup(selectedReservation.groupId);
                        setDetailModalLoading(false);
                        if (result === "success") handleCloseDetail();
                      }
                    }}
                    loading={detailModalLoading}
                    disabled={detailModalLoading}
                  >
                    Aprobar todas
                  </Button>
                  <Button
                    color="red"
                    leftSection={<BiXCircle />}
                    onClick={async () => {
                      if (selectedReservation.groupId) {
                        setDetailModalLoading(true);
                        await handleRejectGroup(selectedReservation.groupId);
                        setDetailModalLoading(false);
                        handleCloseDetail();
                      }
                    }}
                    loading={detailModalLoading}
                    disabled={detailModalLoading}
                  >
                    Rechazar todas
                  </Button>
                </Group>
              )}

            {/* Botones de Cancelar y Eliminar */}
            <Divider my="xs" />
            <Group gap="xs">
              <Button
                variant="subtle"
                color="orange"
                leftSection={<BiXCircle />}
                onClick={() => {
                  handleCancelReservation(selectedReservation._id!);
                  handleCloseDetail();
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<BiTrash />}
                onClick={() => {
                  handleDelete(selectedReservation._id!);
                  handleCloseDetail();
                }}
              >
                Eliminar
              </Button>
            </Group>
          </Stack>
          ) : (
            <Text c="dimmed" ta="center">No hay información disponible</Text>
          )}
        </div>
      </Drawer>

      {/* Rechazar todas las vencidas */}
      <Modal
        opened={rejectAllOpen}
        onClose={() => !rejectAllBusy && setRejectAllOpen(false)}
        title="Rechazar las reservas vencidas"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            Se rechazarán {rejectableExpired.length === 1 ? "1 reserva vencida" : `${rejectableExpired.length} reservas vencidas`}. Su fecha ya pasó y no
            se crea ninguna cita. No se le envía mensaje al cliente.
          </Text>
          {expiredWithMoney > 0 && (
            <div className="ag-alert ag-alert--warning">
              <BiInfoCircle size={20} />
              <div>
                {expiredWithMoney === 1 ? "1 reserva tiene" : `${expiredWithMoney} reservas tienen`} un comprobante en revisión o un abono
                pagado. No se incluyen: ábrelas una por una para decidir qué pasa con el pago.
              </div>
            </div>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejectAllOpen(false)} disabled={rejectAllBusy}>
              Volver
            </Button>
            <Button color="red" onClick={handleRejectAllExpired} loading={rejectAllBusy}>
              Rechazar todas
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: ver comprobante del abono */}
      <Modal
        opened={!!receiptView}
        onClose={() => setReceiptView(null)}
        title="Comprobante de pago"
        centered
        zIndex={400}
      >
        {receiptView && (
          <Stack gap="sm">
            <Group justify="space-between">
              {renderPaymentBadge(receiptView)}
            </Group>
            {receiptView.receipt?.imageUrl && (
              <Image src={receiptView.receipt.imageUrl} alt="Comprobante" mah={420} fit="contain" radius="sm" />
            )}
            {receiptView.receipt?.aiNotes && (
              <Text size="xs" c="dimmed">
                Revisión IA: {receiptView.receipt.aiNotes}
              </Text>
            )}
          </Stack>
        )}
      </Modal>

      {/* Modal: aprobar una reserva que tiene comprobante en revisión */}
      <Modal
        opened={!!receiptPrompt}
        onClose={() => !receiptPromptBusy && setReceiptPrompt(null)}
        title="Esta reserva tiene un comprobante en revisión"
        centered
        zIndex={400}
      >
        {receiptPrompt && (
          <Stack gap="sm">
            <Text size="sm">
              El cliente subió un comprobante de <b>{formatMoney(receiptPrompt.order)}</b>. ¿Es válido?
            </Text>
            {receiptPrompt.order.receipt?.imageUrl && (
              <Image src={receiptPrompt.order.receipt.imageUrl} alt="Comprobante" mah={320} fit="contain" radius="sm" />
            )}
            {receiptPrompt.order.receipt?.aiNotes && (
              <Text size="xs" c="dimmed">
                Revisión IA: {receiptPrompt.order.receipt.aiNotes}
              </Text>
            )}
            <Stack gap="xs" mt="xs">
              <Button
                color="teal"
                loading={receiptPromptBusy}
                onClick={async () => {
                  const prompt = receiptPrompt;
                  setReceiptPromptBusy(true);
                  setReceiptPrompt(null);
                  try {
                    await prompt.proceed(true);
                  } finally {
                    setReceiptPromptBusy(false);
                  }
                }}
              >
                Sí, aprobar reserva y registrar el abono
              </Button>
              <Button
                variant="default"
                disabled={receiptPromptBusy}
                onClick={async () => {
                  const prompt = receiptPrompt;
                  setReceiptPrompt(null);
                  await prompt.proceed(false);
                }}
              >
                Aprobar solo la reserva (el comprobante queda pendiente)
              </Button>
              <Button
                color="red"
                variant="light"
                disabled={receiptPromptBusy}
                onClick={async () => {
                  const order = receiptPrompt.order;
                  setReceiptPromptBusy(true);
                  try {
                    await reviewReceiptOrder(order._id, "reject");
                    showNotification({
                      title: "Comprobante rechazado",
                      message: "La reserva se liberó y se le avisó al cliente.",
                      color: "orange",
                    });
                    setReceiptPrompt(null);
                    if (organization?._id) {
                      await loadPage(organization._id);
                      void loadStats(organization._id);
                    }
                  } catch (e) {
                    showNotification({
                      title: "No se pudo rechazar",
                      message: e instanceof Error ? e.message : "Intenta de nuevo.",
                      color: "red",
                    });
                  } finally {
                    setReceiptPromptBusy(false);
                  }
                }}
              >
                No es válido: rechazar comprobante y liberar la reserva
              </Button>
            </Stack>
          </Stack>
        )}
      </Modal>

      {/* Modal: cupo máximo alcanzado — permite forzar la aprobación */}
      <Modal
        opened={!!concurrencyWarning}
        onClose={() => setConcurrencyWarning(null)}
        title="Cupo máximo alcanzado"
        centered
        size="md"
      >
        <Stack>
          <Alert color="orange" title="Límite de concurrencia">
            {concurrencyWarning?.message}
          </Alert>
          {concurrencyWarning?.conflictingAppointments && concurrencyWarning.conflictingAppointments.length > 0 && (
            <>
              <Text size="sm" fw={500}>Citas que ocupan ese horario:</Text>
              <ScrollArea.Autosize mah={200}>
                <List size="sm" spacing={4}>
                  {concurrencyWarning.conflictingAppointments.map((appt) => {
                    const tz = organization?.timezone || "America/Bogota";
                    const start = dayjs(appt.startDate).tz(tz).format("HH:mm");
                    const end = dayjs(appt.endDate).tz(tz).format("HH:mm");
                    return (
                      <List.Item key={appt._id}>
                        <Text size="sm" component="span" fw={500}>
                          {appt.client?.name || "Cliente"}
                        </Text>
                        <Text size="sm" component="span" c="dimmed"> · {start}–{end}</Text>
                      </List.Item>
                    );
                  })}
                </List>
              </ScrollArea.Autosize>
            </>
          )}
          <Text size="sm">
            ¿Deseas crear la cita de igual forma ampliando el cupo manualmente?
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setConcurrencyWarning(null)}>
              Cancelar
            </Button>
            <Button color="orange" onClick={handleForceApprove}>
              Crear de igual forma
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box p={{ base: "sm", md: "lg" }}>
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          <div className="ag-row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <div>
              <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Reservas online</h1>
              <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
                {orgPolicy === "auto_if_available"
                  ? "Se confirman solas si hay cupo. Las que no tuvieron cupo quedan por confirmar."
                  : "Las reservas de tu página y del chat esperan tu aprobación antes de crear la cita."}{" "}
                {tab !== "configuracion" && (
                  <a href="?tab=configuracion" className="ag-link" onClick={(e) => { e.preventDefault(); setTab("configuracion"); }}>
                    Cambiar política
                  </a>
                )}
              </div>
            </div>
          </div>

          <nav className="ag-subtabs" aria-label="Reservas online">
            {visibleTabs.map((t) => {
              const count = t === "por_confirmar" ? pendingCount : t === "vencidas" ? expiredCount : 0;
              return (
                <a
                  key={t}
                  href={`?tab=${t}`}
                  aria-current={tab === t ? "page" : undefined}
                  onClick={(e) => { e.preventDefault(); setTab(t); }}
                >
                  {RESERVATIONS_TAB_LABELS[t]}
                  {count > 0 && (
                    <span className={`ag-badge${t === "por_confirmar" ? " ag-badge--warning" : ""}`}>{formatPendingCount(count)}</span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Política automática con reservas que no tuvieron cupo */}
          {orgPolicy === "auto_if_available" && pendingCount > 0 && tab !== "por_confirmar" && (
            <div className="ag-alert ag-alert--warning" style={{ alignItems: "center" }}>
              <BiInfoCircle size={20} />
              <div style={{ flex: 1 }}>
                <b>{pendingCount === 1 ? "1 reserva no se pudo confirmar sola" : `${pendingCount} reservas no se pudieron confirmar solas`}</b>{" "}
                <span className="ag-muted">· no había cupo. Apruébalas o recházalas.</span>
              </div>
              <Button size="xs" variant="outline" onClick={() => setTab("por_confirmar")}>Revisar</Button>
            </div>
          )}

          {error && (
            <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
              <BiInfoCircle size={20} />
              <div style={{ flex: 1 }}>{error}</div>
              <Button size="xs" variant="outline" onClick={() => organization?._id && loadPage(organization._id)}>Reintentar</Button>
            </div>
          )}

          {/* ---------- POR CONFIRMAR / VENCIDAS ---------- */}
          {(tab === "por_confirmar" || tab === "vencidas") && (
            <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
              <div className="ag-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span className="ag-muted" style={{ fontSize: 14 }}>
                  {tab === "por_confirmar"
                    ? "Ordenadas por la fecha más próxima. Aprueba para crear la cita en la agenda."
                    : "Su fecha pasó sin que nadie las aprobara. No suman en el contador."}
                </span>
                {tab === "vencidas" && rejectableExpired.length > 0 && (
                  <Button size="xs" variant="outline" color="red" onClick={() => setRejectAllOpen(true)}>
                    {expiredWithMoney > 0 ? `Rechazar las ${rejectableExpired.length} sin pago` : `Rechazar todas (${rejectableExpired.length})`}
                  </Button>
                )}
              </div>

              {initialLoading ? (
                <div className="ag-card" style={{ padding: 16 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={56} radius="md" mb={i < 3 ? 12 : 0} />
                  ))}
                </div>
              ) : inboxEntries.length === 0 ? (
                <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                  <b style={{ display: "block", marginBottom: 4 }}>
                    {tab === "por_confirmar" ? "No tienes reservas por confirmar" : "No hay reservas vencidas"}
                  </b>
                  <span className="ag-muted" style={{ fontSize: 14 }}>
                    {tab === "por_confirmar" ? "Cuando un cliente reserve desde tu página o el chat, aparecerá aquí. " : ""}
                    <a href="?tab=historial" className="ag-link" onClick={(e) => { e.preventDefault(); setTab("historial"); }}>
                      Ver historial
                    </a>
                  </span>
                </div>
              ) : (
                <div className="ag-card" style={{ padding: 0, overflow: "hidden" }}>
                  {inboxSections.map((section) => (
                    <div key={section.key}>
                      <div style={{ padding: "10px 16px", background: "var(--surface-muted)", borderBottom: "1px solid var(--line)" }}>
                        <span style={eyebrowStyle}>{section.label}</span>
                      </div>
                      {section.entries.map((entry) => renderInboxRow(entry, tab === "vencidas"))}
                    </div>
                  ))}
                </div>
              )}

              {tab === "por_confirmar" && expiredCount > 0 && !initialLoading && (
                <div className="ag-alert ag-alert--info" style={{ alignItems: "center" }}>
                  <BiInfoCircle size={20} />
                  <div style={{ flex: 1 }}>
                    <b>{expiredCount === 1 ? "1 reserva vencida" : `${expiredCount} reservas vencidas`}</b>{" "}
                    <span className="ag-muted">· su fecha pasó sin que nadie las aprobara.</span>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => setTab("vencidas")}>Ver vencidas</Button>
                </div>
              )}
            </div>
          )}

          {/* ---------- HISTORIAL ---------- */}
          {tab === "historial" && (
            <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
              {!initialLoading && stats.hasApprovedWithoutAppointment && (
                <div className="ag-alert ag-alert--warning">
                  <BiInfoCircle size={20} />
                  <div>
                    Hay reservas <b>aprobadas sin cita</b>: la cita se eliminó o falló al crearse. Aparecen con «Sin cita»; ábrelas para recrearla.
                  </div>
                </div>
              )}

              <div className="ag-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <TextInput
                  placeholder="Nombre, teléfono o correo"
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.currentTarget.value); setPage(1); }}
                  w={isMobile ? "100%" : 260}
                  aria-label="Buscar cliente"
                />
                <Select
                  aria-label="Estado"
                  value={statusFilter}
                  onChange={(val) => { setStatusFilter((val as typeof statusFilter) || "all"); setPage(1); }}
                  data={[
                    { value: "all", label: "Estado: todos" },
                    ...(Object.keys(STATUS_META) as ReservationStatusKey[]).map((k) => ({ value: k, label: STATUS_META[k].label })),
                  ]}
                  w={isMobile ? "calc(50% - 4px)" : 200}
                />
                <Select
                  aria-label="Profesional"
                  value={employeeFilter}
                  onChange={(val) => { setEmployeeFilter((val as string) || "all"); setPage(1); }}
                  data={[{ value: "all", label: "Profesional: todos" }, ...employeesSelectData]}
                  w={isMobile ? "calc(50% - 4px)" : 190}
                  searchable
                />
                <Select
                  aria-label="Servicio"
                  value={serviceFilter}
                  onChange={(val) => { setServiceFilter((val as string) || "all"); setPage(1); }}
                  data={[{ value: "all", label: "Servicio: todos" }, ...serviceSelectData]}
                  w={isMobile ? "100%" : 200}
                  searchable
                />
                <div className="ag-segment" role="group" aria-label="Fechas" style={{ marginLeft: isMobile ? 0 : "auto" }}>
                  <button type="button" aria-pressed={showOnlyFuture} onClick={() => { setShowOnlyFuture(true); setPage(1); }}>Próximas</button>
                  <button type="button" aria-pressed={!showOnlyFuture} onClick={() => { setShowOnlyFuture(false); setPage(1); }}>Todas</button>
                </div>
              </div>

              {initialLoading ? (
                <div className="ag-card" style={{ padding: 16 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={40} radius="sm" mb={i < 5 ? 10 : 0} />
                  ))}
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="ag-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                  <b style={{ display: "block", marginBottom: 8 }}>
                    {hasActiveFilters ? "No hay reservas con estos filtros" : hasReservations ? "No hay reservas próximas" : "Aún no tienes reservas online"}
                  </b>
                  {hasActiveFilters ? (
                    <Button size="xs" variant="outline" onClick={clearFilters}>Quitar filtros</Button>
                  ) : hasReservations && showOnlyFuture ? (
                    <Button size="xs" variant="outline" onClick={() => setShowOnlyFuture(false)}>Ver todas</Button>
                  ) : null}
                </div>
              ) : isMobile ? (
                <div className="ag-stack" style={{ gap: 8 }}>
                  {historyEntries.map((entry) => renderHistoryCard(entry))}
                </div>
              ) : (
                <div className="ag-card" style={{ padding: 0, overflow: "auto" }}>
                  <table className="ag-table" style={{ minWidth: 860 }}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Cliente y servicio</th>
                        <th>Profesional</th>
                        <th>Origen</th>
                        <th>Estado</th>
                        <th>Abono / aviso</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>{historyEntries.map((entry) => renderHistoryRow(entry))}</tbody>
                  </table>
                </div>
              )}

              {!initialLoading && totalPages > 1 && (
                <Group justify="center">
                  <Pagination value={page} onChange={setPage} total={totalPages} />
                </Group>
              )}
            </div>
          )}

          {/* ---------- CONFIGURACIÓN ---------- */}
          {tab === "configuracion" && (
            <div className="ag-card" style={{ padding: 20, maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <h2 className="ag-h" style={{ margin: 0 }}>¿Cómo se confirman las reservas?</h2>
                <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
                  Aplica a las reservas de tu página y del chat. Las citas que creas tú en la agenda no cambian.
                </div>
              </div>
              <div className="ag-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Política de reservas">
                {POLICY_OPTIONS.map((o) => {
                  const locked = o.value === "auto_if_available" && !canAutoConfirm;
                  const checked = orgPolicy === o.value;
                  const choose = () => {
                    if (locked || checked || savingPolicy) return;
                    void handleChangePolicy(o.value);
                  };
                  return (
                    <div
                      key={o.value}
                      className="ag-opt"
                      role="radio"
                      tabIndex={locked ? -1 : 0}
                      aria-checked={checked}
                      aria-disabled={locked || undefined}
                      onClick={choose}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose())}
                      style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}
                    >
                      <span className="ag-radio" />
                      <div>
                        <b>{o.title}</b>
                        <span className="d">{o.desc}</span>
                        {locked && (
                          <div style={{ marginTop: 6 }}>
                            <span className="ag-badge">
                              <IconLock size={12} /> Desde el plan Starter
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {savingPolicy && (
                <Group gap={6}>
                  <Loader size="xs" />
                  <Text size="xs" c="dimmed" aria-live="polite">Guardando…</Text>
                </Group>
              )}
            </div>
          )}
        </div>
      </Box>
    </>
  );
};

export default ReservationsList;
