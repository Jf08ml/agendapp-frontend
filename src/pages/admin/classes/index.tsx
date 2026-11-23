/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useMemo } from "react";
// Clases (rediseño, ClasesPanel): pestañas neutras (?tab=sesiones|inscripciones|
// clases|salones|mensajes), sesiones por semana con selección múltiple y barra de
// acciones, estados con palabra + ícono, política de inscripción en tarjeta con
// switches de etiqueta fija y detalle de sesión en panel lateral.
import {
  ActionIcon, Button, Loader, Menu, SegmentedControl, Switch, Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Link, useSearchParams } from "react-router-dom";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconPlus, IconPencil, IconTrash, IconDots, IconEye, IconCheck, IconX, IconSchool,
  IconDoor, IconCalendar, IconUsers, IconSearch, IconCalendarOff, IconCalendarRepeat,
  IconChevronLeft, IconChevronRight, IconMinus, IconAlertTriangle, IconCircleCheck,
  IconClock, IconCash, IconUserX, IconGift,
} from "@tabler/icons-react";
import { RootState, useAppDispatch, useAppSelector } from "../../../app/store";
import {
  selectClassReservationPolicy,
  selectSavingClassPolicy,
  updateClassReservationPolicy,
  fetchOrganizationConfig,
} from "../../../features/organization/sliceOrganization";
import { updateOrganization, type ReservationPolicy } from "../../../services/organizationService";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";

import {
  Room, ClassType, ClassSession, Enrollment, BulkSessionPayload,
  getRooms, createRoom, updateRoom, deleteRoom,
  getClasses, createClass, updateClass, deleteClass,
  getSessions, createSession, updateSession, cancelSession, deleteSession, deleteSessionsBulk,
  bulkCreateSessions,
  getEnrollments, approveEnrollment, cancelEnrollment,
} from "../../../services/classService";
import { getEmployeesByOrganizationId, Employee } from "../../../services/employeeService";
import { uploadImage } from "../../../services/imageService";

import RoomFormModal from "./components/RoomFormModal";
import ClassFormModal from "./components/ClassFormModal";
import SessionFormModal from "./components/SessionFormModal";
import SessionDetailModal from "./components/SessionDetailModal";
import BulkSessionModal from "./components/BulkSessionModal";
import ClassWhatsappTemplates from "./components/ClassWhatsappTemplates";
import ClassCalendar from "./components/ClassCalendar";
import { toSpanishMeridiem } from "../../../utils/timeFormatUtils";
import { formatCurrency } from "../../../utils/formatCurrency";
import {
  CLASS_TABS, ENROLLMENT_FILTERS, badgeClass, enrollmentState, occupancy, paymentState,
  resolveClassTab, sessionState, toggleAllVisible, toggleOne,
  type ClassTabKey, type StateInfo,
} from "./classesView";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const STATE_ICONS = {
  check: IconCheck, circleCheck: IconCircleCheck, users: IconUsers, clock: IconClock,
  cash: IconCash, userX: IconUserX, calendarOff: IconCalendarOff, gift: IconGift,
} as const;

// Semana de lunes a domingo, en la zona del negocio
// «lun. 16 nov» → «Lun. 16 nov» (solo la primera letra)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const startOfWeek = (d: dayjs.Dayjs) => d.startOf("day").subtract((d.day() + 6) % 7, "day");

// ══════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════

export default function ManageClasses() {
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector((s: RootState) => s.auth.organizationId);
  const organization = useAppSelector((s: RootState) => s.organization.organization);
  const classPolicy = useAppSelector(selectClassReservationPolicy);
  const savingClassPolicy = useAppSelector(selectSavingClassPolicy);
  const canAutoConfirmClasses = (organization as any)?.planLimits?.autoConfirmations !== false;
  const tz = organization?.timezone || "America/Bogota";
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [searchParams] = useSearchParams();
  const activeTab = resolveClassTab(searchParams.get("tab"));
  const money = (n: number) => formatCurrency(n, organization?.currency || "COP");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dayjs().tz(tz)));
  const [loadError, setLoadError] = useState(false);

  const handleChangeClassPolicy = async (nextPolicy: ReservationPolicy) => {
    if (!organization?._id) return;
    try {
      await dispatch(
        updateClassReservationPolicy({
          organizationId: organization._id,
          policy: nextPolicy,
        })
      ).unwrap();
      showNotification({
        title: "Configuración guardada",
        message:
          nextPolicy === "auto_if_available"
            ? "Inscripción automática activada (si hay cupo disponible)."
            : "Aprobación manual activada para inscripciones a clases.",
        color: "green",
      });
    } catch {
      showNotification({
        title: "Error",
        message: "No se pudo actualizar la política de inscripción a clases",
        color: "red",
      });
    }
  };

  // undefined = orgs sin migrar (docs viejos sin el campo) → true por defecto,
  // igual que el comportamiento histórico (siempre visible en la reserva pública).
  const allowCompanion = organization?.allowCompanionInClassBooking !== false;
  const [savingCompanionToggle, setSavingCompanionToggle] = useState(false);

  const handleToggleAllowCompanion = async (checked: boolean) => {
    if (!organization?._id) return;
    setSavingCompanionToggle(true);
    try {
      await updateOrganization(organization._id, { allowCompanionInClassBooking: checked });
      await dispatch(fetchOrganizationConfig());
      showNotification({
        message: checked
          ? "Se muestra la opción de acompañante en la reserva de clases."
          : "Se ocultó la opción de acompañante en la reserva de clases.",
        color: "green",
      });
    } catch {
      showNotification({ message: "No se pudo actualizar la configuración", color: "red" });
    } finally {
      setSavingCompanionToggle(false);
    }
  };

  const packageChoiceStepEnabled = !!organization?.enablePackageChoiceStep;
  const [savingPackageChoiceToggle, setSavingPackageChoiceToggle] = useState(false);

  const handleTogglePackageChoiceStep = async (checked: boolean) => {
    if (!organization?._id) return;
    setSavingPackageChoiceToggle(true);
    try {
      await updateOrganization(organization._id, { enablePackageChoiceStep: checked });
      await dispatch(fetchOrganizationConfig());
      showNotification({
        message: checked
          ? "El cliente elegirá primero entre clase paga o paquete al reservar."
          : "Se quitó el paso de elegir clase paga o paquete al reservar.",
        color: "green",
      });
    } catch {
      showNotification({ message: "No se pudo actualizar la configuración", color: "red" });
    } finally {
      setSavingPackageChoiceToggle(false);
    }
  };

  // Datos
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<Enrollment[]>([]);
  const [viewEnrollments, setViewEnrollments] = useState<Enrollment[]>([]);
  const [loadingViewEnrollments, setLoadingViewEnrollments] = useState(false);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>("pending");
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Loading
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modales
  const [roomModal, setRoomModal] = useState(false);
  const [classModal, setClassModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingClass, setEditingClass] = useState<ClassType | null>(null);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sessionView, setSessionView] = useState<"table" | "calendar">("table");

  const loadAll = useCallback(async () => {
    if (!organizationId) return;
    setLoadingRooms(true);
    setLoadingClasses(true);
    setLoadingSessions(true);
    setLoadError(false);
    setLoadingEnrollments(true);
    try {
      const [r, c, s, e, emp] = await Promise.all([
        getRooms(),
        getClasses(true),
        getSessions(),
        getEnrollments({ status: "pending" }),
        getEmployeesByOrganizationId(organizationId),
      ]);
      setRooms(r);
      setClasses(c);
      setSessions(s);
      setPendingEnrollments(e.enrollments);
      setEmployees(emp);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoadingRooms(false);
      setLoadingClasses(false);
      setLoadingSessions(false);
      setLoadingEnrollments(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── RESERVAS: historial (cualquier estado distinto de "pending", que ya se
  // carga arriba para el badge de la pestaña) ────────
  const loadEnrollmentsView = useCallback(async (status: string) => {
    setLoadingViewEnrollments(true);
    try {
      const res = await getEnrollments(
        status === "all" ? { limit: 200 } : { status, limit: 200 }
      );
      setViewEnrollments(res.enrollments);
    } finally {
      setLoadingViewEnrollments(false);
    }
  }, []);

  useEffect(() => {
    if (enrollmentStatusFilter === "pending" || !organizationId) return;
    loadEnrollmentsView(enrollmentStatusFilter);
  }, [enrollmentStatusFilter, organizationId, loadEnrollmentsView]);

  // Lista a mostrar en la tabla según el filtro activo + búsqueda por cliente
  const enrollmentsToShow =
    enrollmentStatusFilter === "pending" ? pendingEnrollments : viewEnrollments;
  const loadingEnrollmentsToShow =
    enrollmentStatusFilter === "pending" ? loadingEnrollments : loadingViewEnrollments;
  const filteredEnrollments = useMemo(() => {
    const term = enrollmentSearch.trim().toLowerCase();
    if (!term) return enrollmentsToShow;
    return enrollmentsToShow.filter(
      (e) =>
        e.attendee.name.toLowerCase().includes(term) ||
        e.attendee.phone?.toLowerCase().includes(term)
    );
  }, [enrollmentsToShow, enrollmentSearch]);

  // ── ROOMS ──────────────────────────────────────────
  const handleRoomSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom._id, data);
        showNotification({ message: "Salón actualizado", color: "green" });
      } else {
        await createRoom(data);
        showNotification({ message: "Salón creado", color: "green" });
      }
      setRoomModal(false);
      setEditingRoom(null);
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    modals.openConfirmModal({
      title: "Eliminar salón",
      children: <Text size="sm">¿Eliminar el salón <b>{room.name}</b>? Esta acción no se puede deshacer.</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteRoom(room._id);
          showNotification({ message: "Salón eliminado", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── CLASSES ────────────────────────────────────────
  const handleClassSubmit = async (data: any) => {
    setSaving(true);
    try {
      // Subir archivos nuevos (imágenes File[] + PDF File) antes de guardar,
      // igual que el flujo de Servicios (handleSaveService).
      const images = (data.images || []) as (string | File)[];
      const filesToUpload = images.filter((img) => img && typeof img !== "string") as File[];
      let uploadedUrls: (string | undefined)[] = [];
      if (filesToUpload.length > 0) {
        uploadedUrls = await Promise.all(filesToUpload.map((f) => uploadImage(f)));
      }
      const finalImages = [
        ...images.filter((img): img is string => typeof img === "string"),
        ...(uploadedUrls.filter(Boolean) as string[]),
      ];

      const pdfCandidate = data.pdfUrl as File | string | null;
      const finalPdfUrl =
        pdfCandidate && typeof pdfCandidate !== "string"
          ? (await uploadImage(pdfCandidate)) ?? null
          : pdfCandidate;

      const payload = { ...data, images: finalImages, pdfUrl: finalPdfUrl };

      if (editingClass) {
        await updateClass(editingClass._id, payload);
        showNotification({ message: "Clase actualizada", color: "green" });
      } else {
        await createClass(payload);
        showNotification({ message: "Clase creada", color: "green" });
      }
      setClassModal(false);
      setEditingClass(null);
      loadAll();
    } catch (err: any) {
      showNotification({ message: err?.response?.data?.message || err?.message || "Error", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = (c: ClassType) => {
    modals.openConfirmModal({
      title: "Eliminar clase",
      children: <Text size="sm">¿Eliminar la clase <b>{c.name}</b>? No se puede deshacer.</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteClass(c._id);
          showNotification({ message: "Clase eliminada", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── SESSIONS ───────────────────────────────────────
  const handleSessionSubmit = async (data: any) => {
    setSaving(true);
    try {
      if (editingSession) {
        await updateSession(editingSession._id, data);
        showNotification({ message: "Sesión actualizada", color: "green" });
      } else {
        await createSession(data);
        showNotification({ message: "Sesión creada", color: "green" });
      }
      setSessionModal(false);
      setEditingSession(null);
      loadAll();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
      throw err; // re-throw para que SessionFormModal muestre el error inline
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async (data: BulkSessionPayload) => {
    try {
      const result = await bulkCreateSessions(data);
      if (result) {
        const duplicates = result.skipped.filter((s) => s.kind === "duplicate").length;
        const conflicts = result.skipped.length - duplicates;
        showNotification({
          message: `${result.created.length} sesión(es) programada(s)${duplicates ? `, ${duplicates} ya estaban programada(s)` : ""}${conflicts ? `, ${conflicts} omitida(s) por conflicto` : ""}`,
          color: conflicts ? "orange" : "green",
        });
        loadAll();
      }
      return result;
    } catch (err) {
      showNotification({
        message: err instanceof Error ? err.message : "Error al programar las sesiones",
        color: "red",
      });
      throw err; // re-throw para que BulkSessionModal muestre el error inline
    }
  };

  const handleCancelSession = (session: ClassSession) => {
    const classDoc = typeof session.classId === "object" ? session.classId : null;
    modals.openConfirmModal({
      title: "Cancelar sesión",
      children: (
        <Text size="sm">
          ¿Cancelar la sesión de <b>{classDoc?.name}</b> del{" "}
          {dayjs(session.startDate).tz(tz).format("D [de] MMMM [a las] HH:mm")}?
          Todas las inscripciones pendientes y confirmadas también serán canceladas.
        </Text>
      ),
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await cancelSession(session._id);
          showNotification({ message: "Sesión cancelada", color: "orange" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  const handleDeleteSession = (session: ClassSession) => {
    const classDoc = typeof session.classId === "object" ? session.classId : null;
    modals.openConfirmModal({
      title: "Eliminar sesión",
      children: (
        <Text size="sm">
          ¿Eliminar permanentemente la sesión de <b>{classDoc?.name}</b> del{" "}
          {dayjs(session.startDate).tz(tz).format("D [de] MMMM [a las] HH:mm")}?
          Se eliminarán también todas las inscripciones asociadas. Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteSession(session._id);
          showNotification({ message: "Sesión eliminada", color: "red" });
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    modals.openConfirmModal({
      title: "Eliminar sesiones seleccionadas",
      children: (
        <Text size="sm">
          ¿Eliminar permanentemente <b>{count} sesión{count !== 1 ? "es" : ""}</b>?
          Se eliminarán también todas las inscripciones asociadas. Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: `Eliminar ${count}`, cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteSessionsBulk(Array.from(selectedIds));
          showNotification({ message: `${count} sesión${count !== 1 ? "es eliminadas" : " eliminada"}`, color: "red" });
          setSelectedIds(new Set());
          loadAll();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        }
      },
    });
  };

  // ── ENROLLMENTS ────────────────────────────────────
  const refreshEnrollments = () => {
    loadAll();
    if (enrollmentStatusFilter !== "pending") loadEnrollmentsView(enrollmentStatusFilter);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveEnrollment(id);
      showNotification({ message: "Inscripción aprobada", color: "green" });
      refreshEnrollments();
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEnrollment = (id: string, name: string) => {
    modals.openConfirmModal({
      title: "Cancelar inscripción",
      children: <Text size="sm">¿Cancelar la inscripción de <b>{name}</b>?</Text>,
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setActionLoading(id);
        try {
          await cancelEnrollment(id);
          showNotification({ message: "Inscripción cancelada", color: "orange" });
          refreshEnrollments();
        } catch (err) {
          showNotification({ message: err instanceof Error ? err.message : "Error", color: "red" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBulkCancel = () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const s = sessions.find((x) => x._id === id);
      return s && s.status !== "cancelled" && s.status !== "completed";
    });
    if (ids.length === 0) {
      showNotification({ message: "Las sesiones elegidas ya están canceladas o completadas.", color: "yellow" });
      return;
    }
    modals.openConfirmModal({
      title: `Cancelar ${ids.length} ${ids.length === 1 ? "sesión" : "sesiones"}`,
      children: (
        <Text size="sm">
          Se cancelan también sus inscripciones pendientes y confirmadas. Las sesiones quedan en la lista como canceladas.
        </Text>
      ),
      labels: { confirm: "Sí, cancelar", cancel: "No" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        let ok = 0;
        for (const id of ids) {
          try {
            await cancelSession(id);
            ok++;
          } catch (err) {
            console.error(err);
          }
        }
        showNotification({
          message: ok === ids.length ? `${ok} ${ok === 1 ? "sesión cancelada" : "sesiones canceladas"}` : `Se cancelaron ${ok} de ${ids.length}`,
          color: ok === ids.length ? "green" : "orange",
        });
        setSelectedIds(new Set());
        loadAll();
      },
    });
  };

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════

  const openNewSession = () => {
    setEditingSession(null);
    setSessionModal(true);
  };
  const openDetail = (s: ClassSession) => {
    setSelectedSession(s);
    setDetailModal(true);
  };

  const tabLink = (key: ClassTabKey) => `?tab=${key}`;

  const StateBadge = ({ info, small }: { info: StateInfo; small?: boolean }) => {
    const Icon = STATE_ICONS[info.icon];
    return (
      <span className={badgeClass(info.tone)} style={small ? { height: 20, fontSize: 11, padding: "0 8px" } : undefined}>
        <Icon size={12} stroke={2} /> {info.label}
      </span>
    );
  };

  const SessionActions = ({ s }: { s: ClassSession }) => (
    <Menu shadow="lg" withinPortal position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label="Acciones de la sesión" onClick={(e) => e.stopPropagation()}>
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item leftSection={<IconEye size={16} />} onClick={() => openDetail(s)}>
          Ver inscritos
        </Menu.Item>
        {s.status !== "cancelled" && s.status !== "completed" && (
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => { setEditingSession(s); setSessionModal(true); }}>
            Editar
          </Menu.Item>
        )}
        {s.status !== "cancelled" && (
          <Menu.Item leftSection={<IconCalendarOff size={16} />} onClick={() => handleCancelSession(s)}>
            Cancelar sesión
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleDeleteSession(s)}>
          Eliminar sesión
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  const checkbox = (on: boolean, onToggle: () => void, label: string, mixed = false) => (
    <span
      role="checkbox"
      tabIndex={0}
      aria-checked={mixed ? "mixed" : on}
      aria-label={label}
      className="ag-check"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onToggle(); } }}
      style={{ cursor: "pointer", ...(mixed ? { background: "var(--brand)", borderColor: "var(--brand)" } : {}) }}
    >
      {mixed ? <IconMinus size={14} stroke={2.5} /> : on ? <IconCheck size={14} stroke={2.5} /> : null}
    </span>
  );

  // ── Sesiones de la semana ────────────────────────────
  const weekEnd = weekStart.add(7, "day");
  const weekSessions = sessions
    .filter((s) => {
      const d = dayjs(s.startDate).tz(tz);
      return !d.isBefore(weekStart) && d.isBefore(weekEnd);
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const weekIds = weekSessions.map((s) => s._id);
  const selectedInWeek = weekIds.filter((id) => selectedIds.has(id)).length;
  const weekLabel = `${weekStart.format("D MMM")} – ${weekEnd.subtract(1, "day").format("D MMM YYYY")}`;
  const isThisWeek = weekStart.isSame(startOfWeek(dayjs().tz(tz)), "day");

  const sessionMeta = (s: ClassSession) => {
    const classDoc = typeof s.classId === "object" ? s.classId : null;
    const employee = typeof s.employeeId === "object" ? s.employeeId : null;
    const room = typeof s.roomId === "object" ? s.roomId : null;
    return { classDoc, employee, room, start: dayjs(s.startDate).tz(tz), end: dayjs(s.endDate).tz(tz) };
  };

  const capacityCell = (s: ClassSession) => {
    const pct = occupancy(s.enrolledCount, s.capacity);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 110 }}>
        <span className="ag-num" style={{ fontSize: 13, minWidth: 36 }}>{s.enrolledCount}/{s.capacity}</span>
        <span className={`ag-progress${pct >= 100 ? "" : " ag-progress--brand"}`} style={{ flex: 1 }}>
          <i style={{ width: `${pct}%` }} />
        </span>
      </div>
    );
  };

  const sessionsTab = (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      <div className="ag-row" style={{ gap: 8 }}>
        <div className="ag-row" style={{ gap: 4 }}>
          <ActionIcon variant="default" aria-label="Semana anterior" onClick={() => setWeekStart((w) => w.subtract(7, "day"))}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon variant="default" aria-label="Semana siguiente" onClick={() => setWeekStart((w) => w.add(7, "day"))}>
            <IconChevronRight size={16} />
          </ActionIcon>
          {!isThisWeek && (
            <Button size="xs" variant="subtle" color="gray" onClick={() => setWeekStart(startOfWeek(dayjs().tz(tz)))}>
              Esta semana
            </Button>
          )}
        </div>
        <b style={{ fontSize: 15 }}>{sessionView === "table" ? weekLabel : ""}</b>
        <span style={{ flex: 1 }} />
        <SegmentedControl
          size="xs"
          value={sessionView}
          onChange={(v) => setSessionView(v as "table" | "calendar")}
          data={[
            { value: "table", label: "Tabla" },
            { value: "calendar", label: "Calendario" },
          ]}
        />
      </div>

      {loadingSessions ? (
        <div className="ag-card" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <span className="ag-skeleton" style={{ width: 18, height: 18 }} />
              <span className="ag-skeleton" style={{ width: "30%" }} />
              <span className="ag-skeleton" style={{ width: "20%" }} />
            </div>
          ))}
        </div>
      ) : sessionView === "calendar" ? (
        <ClassCalendar sessions={sessions} timezone={tz} onSelectSession={openDetail} />
      ) : weekSessions.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon"><IconCalendar size={22} /></div>
            <h3>No hay sesiones programadas esta semana</h3>
            <p>Programa la semana completa o crea una sesión suelta.</p>
            <div className="ag-row" style={{ justifyContent: "center" }}>
              <Button variant="default" onClick={() => setBulkModal(true)}>Programar semana</Button>
              <Button onClick={openNewSession}>Nueva sesión</Button>
            </div>
          </div>
        </div>
      ) : isMobile ? (
        <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
          {Object.entries(
            weekSessions.reduce<Record<string, ClassSession[]>>((acc, s) => {
              const k = dayjs(s.startDate).tz(tz).format("YYYY-MM-DD");
              (acc[k] ||= []).push(s);
              return acc;
            }, {})
          ).map(([day, list]) => (
            <div key={day}>
              <div className="ag-slots__group" style={{ margin: "0 0 6px" }}>
                {cap(dayjs.tz(day, tz).format("dddd D [de] MMMM"))}
              </div>
              <div className="ag-card">
                {list.map((s) => {
                  const m = sessionMeta(s);
                  return (
                    <div
                      key={s._id}
                      className="ag-list-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(s)}
                      onKeyDown={(e) => e.key === "Enter" && openDetail(s)}
                      style={{ padding: "var(--space-3)", cursor: "pointer", background: selectedIds.has(s._id) ? "var(--brand-soft)" : undefined }}
                    >
                      {checkbox(selectedIds.has(s._id), () => setSelectedIds((p) => toggleOne(p, s._id)), `Elegir ${m.classDoc?.name ?? "sesión"}`)}
                      <span className="ag-num" style={{ width: 64, fontSize: 13, fontWeight: 600 }}>{toSpanishMeridiem(m.start.format("h:mm A"))}</span>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <b style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                          {m.classDoc?.color && <i style={{ width: 8, height: 8, borderRadius: 99, background: m.classDoc.color, flex: "none" }} />}
                          {m.classDoc?.name ?? "Clase"}
                        </b>
                        <span className="ag-subtle">
                          {[m.employee?.names, m.room?.name].filter(Boolean).join(" · ")} · <span className="ag-num">{s.enrolledCount}/{s.capacity}</span>
                        </span>
                        <div><StateBadge info={sessionState(s.status)} small /></div>
                      </div>
                      <SessionActions s={s} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  {checkbox(
                    selectedInWeek > 0 && selectedInWeek === weekIds.length,
                    () => setSelectedIds((p) => toggleAllVisible(p, weekIds)),
                    "Elegir todas las sesiones de la semana",
                    selectedInWeek > 0 && selectedInWeek < weekIds.length
                  )}
                </th>
                <th>Clase</th>
                <th>Fecha y hora</th>
                <th>Instructor</th>
                <th>Salón</th>
                <th>Cupo</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {weekSessions.map((s) => {
                const m = sessionMeta(s);
                const on = selectedIds.has(s._id);
                return (
                  <tr key={s._id} aria-selected={on} onClick={() => openDetail(s)} style={{ cursor: "pointer" }}>
                    <td>{checkbox(on, () => setSelectedIds((p) => toggleOne(p, s._id)), `Elegir ${m.classDoc?.name ?? "sesión"}`)}</td>
                    <td>
                      <b style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                        <i style={{ width: 10, height: 10, borderRadius: 99, background: m.classDoc?.color || "var(--line-strong)", flex: "none" }} />
                        {m.classDoc?.name ?? "—"}
                      </b>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span>{cap(m.start.format("ddd D MMM"))}</span>
                      <span className="ag-subtle ag-num"> · {toSpanishMeridiem(m.start.format("h:mm A"))}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{m.employee?.names ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{m.room?.name ?? "—"}</td>
                    <td>{capacityCell(s)}</td>
                    <td><StateBadge info={sessionState(s.status)} /></td>
                    <td style={{ width: 48, textAlign: "right" }}><SessionActions s={s} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra de selección múltiple */}
      {selectedIds.size > 0 && sessionView === "table" && (
        <div
          role="toolbar"
          aria-label="Acciones de las sesiones elegidas"
          style={{
            position: "sticky",
            bottom: isMobile ? "calc(var(--app-shell-footer-offset, 0px) + 12px)" : 16,
            zIndex: 20,
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px 8px 16px",
            borderRadius: "var(--radius-lg)",
            background: "var(--ink)",
            color: "var(--ink-inverse)",
            boxShadow: "var(--shadow-lg)",
            flexWrap: "wrap",
          }}
        >
          <b style={{ fontSize: 14, marginRight: 8 }}>
            {selectedIds.size} {selectedIds.size === 1 ? "elegida" : "elegidas"}
          </b>
          <Button size="xs" variant="white" color="dark" leftSection={<IconCalendarOff size={14} />} onClick={handleBulkCancel}>
            Cancelar sesiones
          </Button>
          <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={handleBulkDelete}>
            Eliminar
          </Button>
          <ActionIcon variant="subtle" color="gray" aria-label="Quitar selección" onClick={() => setSelectedIds(new Set())}>
            <IconX size={16} color="var(--ink-inverse)" />
          </ActionIcon>
        </div>
      )}
    </div>
  );

  // ── Inscripciones ────────────────────────────────────
  const switchRow = (
    label: string,
    help: string,
    checked: boolean,
    onChange: (v: boolean) => void,
    disabled?: boolean,
    busy?: boolean
  ) => (
    <div className="ag-switchrow">
      <div>
        <b>{label}</b>
        <span>{help}</span>
      </div>
      {busy ? <span style={{ flex: "none" }}><Loader size="xs" /></span> : null}
      <span style={{ flex: "none", paddingTop: 2 }}>
        <Switch checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} disabled={disabled} aria-label={label} />
      </span>
    </div>
  );

  const policyCard = (
    <div className="ag-card" style={{ padding: "var(--space-2) var(--space-4)" }}>
      <h3 style={{ margin: "var(--space-2) 0 0", font: "600 15px/22px var(--mantine-font-family)" }}>Política de inscripción</h3>
      {switchRow(
        "Confirmar automáticamente si hay cupo",
        canAutoConfirmClasses
          ? "Apagado: cada inscripción queda pendiente hasta que la apruebes."
          : "Disponible desde el plan Starter. Hoy cada inscripción queda pendiente hasta que la apruebes.",
        classPolicy === "auto_if_available",
        (v) => handleChangeClassPolicy(v ? "auto_if_available" : "manual"),
        !organization?._id || savingClassPolicy || (!canAutoConfirmClasses && classPolicy !== "auto_if_available"),
        savingClassPolicy
      )}
      {switchRow(
        "Permitir acompañante",
        "Muestra la opción de agregar un acompañante en la reserva pública.",
        allowCompanion,
        handleToggleAllowCompanion,
        !organization?._id || savingCompanionToggle,
        savingCompanionToggle
      )}
      <div style={{ marginBottom: -1 }}>
        {switchRow(
          "Elegir clase paga o paquete",
          "Antes de elegir la clase, el cliente indica si paga la clase o usa un paquete.",
          packageChoiceStepEnabled,
          handleTogglePackageChoiceStep,
          !organization?._id || savingPackageChoiceToggle,
          savingPackageChoiceToggle
        )}
      </div>
    </div>
  );

  const enrollmentsTab = (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      {policyCard}
      <div className="ag-row" style={{ gap: 8 }}>
        <div className="ag-tabs" role="tablist" aria-label="Estado" style={{ scrollbarWidth: "none" }}>
          {ENROLLMENT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              className="ag-chip"
              aria-selected={enrollmentStatusFilter === f.value}
              onClick={() => setEnrollmentStatusFilter(f.value)}
            >
              {f.label}
              {f.value === "pending" && <span className="count">{pendingEnrollments.length}</span>}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <div className="ag-search" style={{ flex: isMobile ? "1 1 100%" : "0 1 280px" }}>
          <input
            className="ag-input"
            type="search"
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar inscripciones"
            value={enrollmentSearch}
            onChange={(e) => setEnrollmentSearch(e.currentTarget.value)}
          />
          <span aria-hidden="true"><IconSearch size={16} stroke={1.75} /></span>
        </div>
      </div>

      {loadingEnrollmentsToShow ? (
        <div className="ag-card" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <span className="ag-skeleton" style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <div className="ag-empty__icon"><IconUsers size={22} /></div>
            <h3>
              {enrollmentSearch
                ? "Nadie coincide con la búsqueda"
                : enrollmentStatusFilter === "pending"
                  ? "No tienes inscripciones por aprobar"
                  : "No hay inscripciones con este filtro"}
            </h3>
          </div>
        </div>
      ) : (
        <div className="ag-card" style={{ overflowX: isMobile ? undefined : "auto" }}>
          {isMobile ? (
            filteredEnrollments.map((e) => {
              const classDoc = typeof e.classId === "object" ? e.classId : null;
              const session = typeof e.sessionId === "object" ? e.sessionId : null;
              return (
                <div key={e._id} className="ag-list-row" style={{ padding: "var(--space-3)", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: 15 }}>{e.attendee.name}</b>
                      <span className="ag-subtle" style={{ display: "block" }}>
                        {classDoc?.name ?? "Clase"}
                        {session ? ` · ${toSpanishMeridiem(dayjs(session.startDate).tz(tz).format("ddd D MMM, h:mm A"))}` : ""}
                      </span>
                    </div>
                    <b className="ag-num" style={{ fontSize: 14 }}>{money(e.totalPrice)}</b>
                  </div>
                  <div className="ag-row" style={{ gap: 4 }}>
                    <StateBadge info={enrollmentState(e.status)} small />
                    <StateBadge info={paymentState(e.paymentStatus)} small />
                  </div>
                  {e.status === "pending" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Button variant="default" loading={actionLoading === e._id} onClick={() => handleCancelEnrollment(e._id, e.attendee.name)}>
                        Rechazar
                      </Button>
                      <Button loading={actionLoading === e._id} onClick={() => handleApprove(e._id)}>
                        Aprobar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <table className="ag-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Asistente</th>
                  <th>Clase y sesión</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th className="num">Total</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map((e) => {
                  const classDoc = typeof e.classId === "object" ? e.classId : null;
                  const session = typeof e.sessionId === "object" ? e.sessionId : null;
                  return (
                    <tr key={e._id}>
                      <td>
                        <b style={{ display: "block" }}>{e.attendee.name}</b>
                        <span className="ag-subtle ag-num">{e.attendee.phone}</span>
                      </td>
                      <td>
                        <span style={{ display: "block" }}>{classDoc?.name ?? "—"}</span>
                        <span className="ag-subtle">
                          {session ? cap(toSpanishMeridiem(dayjs(session.startDate).tz(tz).format("ddd D MMM, h:mm A"))) : "—"}
                        </span>
                      </td>
                      <td><StateBadge info={enrollmentState(e.status)} /></td>
                      <td><StateBadge info={paymentState(e.paymentStatus)} /></td>
                      <td className="num">
                        <b>{money(e.totalPrice)}</b>
                        {e.discountPercent > 0 && <span className="ag-subtle" style={{ display: "block" }}>−{e.discountPercent} % grupal</span>}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {e.status === "pending" && (
                          <div className="ag-row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                            <Button size="xs" variant="default" loading={actionLoading === e._id} onClick={() => handleCancelEnrollment(e._id, e.attendee.name)}>
                              Rechazar
                            </Button>
                            <Button size="xs" loading={actionLoading === e._id} onClick={() => handleApprove(e._id)}>
                              Aprobar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // ── Clases (plantillas) ──────────────────────────────
  const classesTab = loadingClasses ? (
    <div className="ag-card" style={{ padding: 16 }}><span className="ag-skeleton" style={{ width: "40%" }} /></div>
  ) : classes.length === 0 ? (
    <div className="ag-card">
      <div className="ag-empty">
        <div className="ag-empty__icon"><IconSchool size={22} /></div>
        <h3>Aún no tienes clases</h3>
        <p>Crea una clase para poder programar sus sesiones.</p>
        <Button onClick={() => { setEditingClass(null); setClassModal(true); }}>Nueva clase</Button>
      </div>
    </div>
  ) : (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
      {classes.map((c) => (
        <div
          key={c._id}
          className="ag-card"
          role="button"
          tabIndex={0}
          onClick={() => { setEditingClass(c); setClassModal(true); }}
          onKeyDown={(e) => e.key === "Enter" && (setEditingClass(c), setClassModal(true))}
          style={{ padding: "var(--space-4)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, opacity: c.isActive ? 1 : 0.7 }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <i style={{ width: 10, height: 10, borderRadius: 99, background: c.color || "var(--line-strong)", marginTop: 6, flex: "none" }} />
            <b style={{ flex: 1, fontSize: 15 }}>{c.name}</b>
            <Menu shadow="lg" withinPortal position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" aria-label={`Acciones de ${c.name}`} onClick={(e) => e.stopPropagation()}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => { setEditingClass(c); setClassModal(true); }}>
                  Editar
                </Menu.Item>
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleDeleteClass(c)}>
                  Eliminar
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
          {c.description && <span className="ag-subtle" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</span>}
          <span className="ag-subtle ag-num">
            {c.duration} min · Cupo {c.defaultCapacity} · {money(c.pricePerPerson)} por persona
          </span>
          <div className="ag-row" style={{ gap: 4 }}>
            <StateBadge info={c.isActive ? { label: "Activa", tone: "success", icon: "circleCheck" } : { label: "Inactiva", tone: "neutral", icon: "calendarOff" }} small />
            {c.groupDiscount?.enabled && (
              <span className="ag-badge" style={{ height: 20, fontSize: 11, padding: "0 8px" }}>
                −{c.groupDiscount.discountPercent} % desde {c.groupDiscount.minPeople} personas
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Salones ──────────────────────────────────────────
  const roomsTab = loadingRooms ? (
    <div className="ag-card" style={{ padding: 16 }}><span className="ag-skeleton" style={{ width: "40%" }} /></div>
  ) : rooms.length === 0 ? (
    <div className="ag-card">
      <div className="ag-empty">
        <div className="ag-empty__icon"><IconDoor size={22} /></div>
        <h3>Aún no tienes salones</h3>
        <p>Agrega los espacios donde das las clases.</p>
        <Button onClick={() => { setEditingRoom(null); setRoomModal(true); }}>Nuevo salón</Button>
      </div>
    </div>
  ) : (
    <div className="ag-card" style={{ maxWidth: 720 }}>
      {rooms.map((r) => (
        <div key={r._id} className="ag-list-row" style={{ padding: "var(--space-3) var(--space-4)", opacity: r.isActive ? 1 : 0.7 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block", fontSize: 15 }}>{r.name}</b>
            <span className="ag-subtle">
              Capacidad {r.capacity} {r.capacity === 1 ? "persona" : "personas"}
              {r.description ? ` · ${r.description}` : ""}
              {!r.isActive ? " · Inactivo" : ""}
            </span>
          </div>
          <Menu shadow="lg" withinPortal position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={`Acciones de ${r.name}`}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => { setEditingRoom(r); setRoomModal(true); }}>
                Editar
              </Menu.Item>
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleDeleteRoom(r)}>
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      ))}
    </div>
  );

  // Acción principal del encabezado según la pestaña
  const headerActions =
    activeTab === "sesiones" ? (
      <>
        <Button variant="default" leftSection={<IconCalendarRepeat size={16} />} onClick={() => setBulkModal(true)} size={isMobile ? "xs" : "sm"}>
          Programar semana
        </Button>
        <Button leftSection={<IconPlus size={16} />} onClick={openNewSession} size={isMobile ? "xs" : "sm"}>
          Nueva sesión
        </Button>
      </>
    ) : activeTab === "clases" ? (
      <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingClass(null); setClassModal(true); }} size={isMobile ? "xs" : "sm"}>
        Nueva clase
      </Button>
    ) : activeTab === "salones" ? (
      <Button leftSection={<IconPlus size={16} />} onClick={() => { setEditingRoom(null); setRoomModal(true); }} size={isMobile ? "xs" : "sm"}>
        Nuevo salón
      </Button>
    ) : null;

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
        <div className="ag-row" style={{ gap: 8 }}>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em", flex: 1 }}>Clases</h1>
          {headerActions}
        </div>
        <nav className="ag-subtabs" aria-label="Clases">
          {CLASS_TABS.map((t) => (
            <Link key={t.key} to={tabLink(t.key)} aria-current={activeTab === t.key ? "page" : undefined}>
              {t.label}
              {t.key === "inscripciones" && pendingEnrollments.length > 0 && (
                <span className="ag-badge ag-badge--warning">{pendingEnrollments.length}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {loadError && (
        <div className="ag-alert ag-alert--danger" role="alert">
          <IconAlertTriangle size={18} />
          <div style={{ flex: 1 }}>No se pudieron cargar las clases. Revisa tu conexión e inténtalo de nuevo.</div>
          <Button size="xs" variant="default" onClick={() => loadAll()}>Reintentar</Button>
        </div>
      )}

      {activeTab === "sesiones" && sessionsTab}
      {activeTab === "inscripciones" && enrollmentsTab}
      {activeTab === "clases" && classesTab}
      {activeTab === "salones" && roomsTab}
      {activeTab === "mensajes" && <ClassWhatsappTemplates />}

      {/* ── Paneles y modales ─────────────────────────────── */}
      <RoomFormModal
        opened={roomModal}
        onClose={() => { setRoomModal(false); setEditingRoom(null); }}
        onSubmit={handleRoomSubmit}
        editing={editingRoom}
        loading={saving}
      />
      <ClassFormModal
        opened={classModal}
        onClose={() => { setClassModal(false); setEditingClass(null); }}
        onSubmit={handleClassSubmit}
        editing={editingClass}
        loading={saving}
      />
      <SessionFormModal
        opened={sessionModal}
        onClose={() => { setSessionModal(false); setEditingSession(null); }}
        onSubmit={handleSessionSubmit}
        classes={classes.filter((c) => c.isActive)}
        employees={employees}
        rooms={rooms.filter((r) => r.isActive)}
        editing={editingSession}
        loading={saving}
      />
      <SessionDetailModal
        opened={detailModal}
        onClose={() => setDetailModal(false)}
        session={selectedSession}
        timezone={tz}
        onEdit={(s) => { setDetailModal(false); setEditingSession(s); setSessionModal(true); }}
        onCancelSession={(s) => { setDetailModal(false); handleCancelSession(s); }}
      />
      <BulkSessionModal
        opened={bulkModal}
        onClose={() => setBulkModal(false)}
        onSubmit={handleBulkSubmit}
        classes={classes.filter((c) => c.isActive)}
        employees={employees}
        rooms={rooms.filter((r) => r.isActive)}
      />
    </div>
  );
}
