/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Title,
  Table,
  Text,
  MultiSelect,
  ScrollArea,
  Flex,
  Loader,
  Container,
  ActionIcon,
  Badge,
  SimpleGrid,
  Stack,
  Group,
  Tooltip,
  SegmentedControl,
  Button,
  Divider,
  Drawer,
  Select,
  TextInput,
  NumberInput,
  Paper,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { openConfirmModal } from "@mantine/modals";
import {
  Appointment,
  getAppointmentsByOrganizationId,
  updateAppointment,
  batchConfirmAppointments,
} from "../../services/appointmentService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatInTimezone } from "../../utils/timezoneUtils";
import { startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/es";
import { registerService } from "../../services/clientService";
import { useMediaQuery } from "@mantine/hooks";

import {
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconFilter,
  IconChecks,
  IconCircleCheck,
  IconTrash,
  IconPlus,
  IconReceipt,
  IconUserCheck,
  IconUserX,
  IconBan,
} from "@tabler/icons-react";

import {
  Expense,
  getExpenses,
  createExpense,
  deleteExpense as deleteExpenseApi,
} from "../../services/expenseService";
import {
  PaymentRecord,
  cancelAppointment,
  markAttendance,
  addAppointmentPayment,
  removeAppointmentPayment,
} from "../../services/appointmentService";

const IconArrowRight = IconChevronRight;

dayjs.extend(localeData);
dayjs.locale("es");

type Interval = "daily" | "weekly" | "biweekly" | "monthly" | "custom";

type ApptStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "cancelled_by_customer"
  | "cancelled_by_admin"
  | "attended"
  | "no_show"
  | string;

const STATUS_META: Record<
  string,
  { label: string; color: string; bg?: string; text?: string }
> = {
  confirmed: {
    label: "Confirmada",
    color: "green",
    bg: "#EAF7EE",
    text: "#145A32",
  },
  pending: {
    label: "Pendiente",
    color: "yellow",
    bg: "#FFF6DF",
    text: "#7D6608",
  },
  cancelled: {
    label: "Cancelada",
    color: "red",
    bg: "#FDECEC",
    text: "#78281F",
  },
  cancelled_by_customer: {
    label: "Cancelada (cliente)",
    color: "orange",
    bg: "#FFF0E6",
    text: "#8A4B08",
  },
  cancelled_by_admin: {
    label: "Cancelada (admin)",
    color: "grape",
    bg: "#F3E8FF",
    text: "#4A235A",
  },
  attended: {
    label: "Asistió",
    color: "teal",
    bg: "#E6FAF5",
    text: "#0B6E4F",
  },
  no_show: {
    label: "No asistió",
    color: "pink",
    bg: "#FFE6EE",
    text: "#8B1A4A",
  },
};

function StatusBadge({ status }: { status: ApptStatus }) {
  const meta = STATUS_META[status] || { label: status || "—", color: "gray" };
  return (
    <Badge variant="light" color={meta.color} size="sm">
      {meta.label}
    </Badge>
  );
}

// Desktop: resaltado MUY suave (opcional)
function getRowStylesSoft(status: ApptStatus) {
  const meta = STATUS_META[status];
  if (!meta?.bg) return {};
  return { backgroundColor: meta.bg, color: meta.text };
}

// Mobile: acento en borde, más limpio que pintar el fondo
function getCardAccentStyle(status: ApptStatus) {
  const meta = STATUS_META[status];
  if (!meta?.color) return {};
  return { borderLeft: `4px solid var(--mantine-color-${meta.color}-6)` };
}

function canConfirm(status: ApptStatus) {
  return (
    status !== "confirmed" &&
    status !== "cancelled" &&
    status !== "cancelled_by_customer" &&
    status !== "cancelled_by_admin" &&
    status !== "attended" &&
    status !== "no_show"
  );
}

function CustomPriceBadge({ isMobile }: { isMobile: boolean }) {
  return (
    <Badge size="sm" color="grape" variant="light">
      {isMobile ? "Personalizado" : "Precio personalizado"}
    </Badge>
  );
}

const PAYMENT_STATUS_META: Record<string, { label: string; color: string }> = {
  paid:    { label: "Pagado",   color: "green" },
  partial: { label: "Abono",   color: "yellow" },
  unpaid:  { label: "Sin pagar", color: "red" },
  free:    { label: "Gratis",  color: "blue" },
};

function PaymentBadge({ status }: { status?: string }) {
  if (!status) return null;
  const meta = PAYMENT_STATUS_META[status] || { label: status, color: "gray" };
  return (
    <Badge variant="light" color={meta.color} size="sm">
      {meta.label}
    </Badge>
  );
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function PaymentMethods({ payments }: { payments?: any[] }) {
  if (!payments || payments.length === 0) return null;
  // Agrupar métodos únicos con sus labels (incluyendo note para "other")
  const seen = new Set<string>();
  const tags: { label: string; key: string }[] = [];
  for (const p of payments) {
    const base = METHOD_LABELS[p.method] || p.method;
    const label = p.method === "other" && p.note ? `${base}: ${p.note.split(" - ")[0]}` : base;
    if (!seen.has(label)) {
      seen.add(label);
      tags.push({ label, key: label });
    }
  }
  return (
    <Group gap={4} mt={2} wrap="wrap">
      {tags.map((t) => (
        <Badge key={t.key} variant="outline" color="gray" size="xs">
          {t.label}
        </Badge>
      ))}
    </Group>
  );
}

const DailyCashbox: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Intervalo y fechas — persiste la preferencia en localStorage
  const [interval, setInterval] = useState<Interval>(() => {
    const saved = localStorage.getItem("cashbox_interval") as Interval | null;
    const valid: Interval[] = ["daily", "weekly", "biweekly", "monthly", "custom"];
    return saved && valid.includes(saved) ? saved : "daily";
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Filtros
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filtersOpened, setFiltersOpened] = useState(false);

  // Gastos generales
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState({ concept: "", category: "", amount: 0 });
  const [addingExpense, setAddingExpense] = useState(false);

  // Ingresos generales
  const [incomes, setIncomes] = useState<Expense[]>([]);
  const [newIncome, setNewIncome] = useState({ concept: "", category: "", amount: 0 });
  const [addingIncome, setAddingIncome] = useState(false);

  // Tipo de movimiento activo en el formulario unificado
  const [movementType, setMovementType] = useState<"expense" | "income">("expense");

  // Base de caja (monto inicial en efectivo al abrir el día)
  const [cashBase, setCashBase] = useState<number>(0);

  // Drawer de detalle de cita
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [apptDrawerOpened, setApptDrawerOpened] = useState(false);
  const [drawerPayments, setDrawerPayments] = useState<PaymentRecord[]>([]);
  const [drawerPaymentStatus, setDrawerPaymentStatus] = useState<string>("unpaid");
  const [drawerNewPayment, setDrawerNewPayment] = useState({ amount: 0, method: "cash", note: "", otherLabel: "" });
  const [drawerSavingPayment, setDrawerSavingPayment] = useState(false);
  const [drawerActionLoading, setDrawerActionLoading] = useState(false);
  const [drawerCustomPrice, setDrawerCustomPrice] = useState<number | null>(null);
  const [drawerAdditionalItems, setDrawerAdditionalItems] = useState<{ name: string; price: number }[]>([]);
  const [drawerNewItem, setDrawerNewItem] = useState({ name: "", price: 0 });
  const [drawerSavingPrice, setDrawerSavingPrice] = useState(false);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  const org = useSelector(selectOrganization);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const currency = org?.currency || "COP";
  const timezone = org?.timezone || "America/Bogota";
  const timeFormat = org?.timeFormat || "12h";
  const timeFmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";

  const calculateDates = (intervalValue: Interval, day?: Date | null) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (intervalValue) {
      case "daily": {
        const base = day ?? now;
        start = dayjs(base).startOf("day").toDate();
        end = dayjs(base).endOf("day").toDate();
        break;
      }
      case "weekly": {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = addDays(start, 6);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "biweekly": {
        const d = now.getDate();
        start =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), now.getMonth(), 16);
        end =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 15)
            : endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "monthly": {
        start = startOfMonth(now);
        end = endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "custom":
        // se maneja manualmente con datepickers
        break;
      default:
        break;
    }

    if (intervalValue !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Recalcula rango al cambiar intervalo
  useEffect(() => {
    calculateDates(interval, selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  // Recalcula rango al cambiar día (solo daily)
  useEffect(() => {
    if (interval === "daily") calculateDates("daily", selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Carga la base de caja desde localStorage al cambiar de día (solo en vista diaria)
  useEffect(() => {
    if (interval === "daily" && selectedDay) {
      const key = `cashbox_base_${dayjs(selectedDay).format("YYYY-MM-DD")}`;
      const saved = localStorage.getItem(key);
      setCashBase(saved !== null ? Number(saved) : 0);
    } else {
      setCashBase(0);
    }
  }, [selectedDay, interval]);

  // Trae citas y gastos cuando hay org + rango
  useEffect(() => {
    if (organizationId && startDate && endDate) {
      fetchAppointments();
      fetchExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, startDate, endDate]);

  useEffect(() => {
    // UX: si el usuario elige "Personalizado" en mobile, abre filtros automáticamente
    if (isMobile && interval === "custom") {
      setFiltersOpened(true);

      // opcional: hint visual
      showNotification({
        title: "Rango personalizado",
        message: "Selecciona la fecha de inicio y fin en Filtros.",
        color: "blue",
        autoClose: 2500,
        position: "top-right",
      });
    }
  }, [interval, isMobile]);

  const fetchAppointments = async () => {
    if (!organizationId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await getAppointmentsByOrganizationId(
        organizationId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      const sorted = response.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setAppointments(sorted);
    } catch (error) {
      console.error("Error al obtener citas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!startDate || !endDate) return;
    try {
      const data = await getExpenses(startDate.toISOString(), endDate.toISOString());
      setExpenses(data.filter((e) => e.type !== "income"));
      setIncomes(data.filter((e) => e.type === "income"));
    } catch (error) {
      console.error("Error al obtener gastos:", error);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.concept.trim() || newExpense.amount <= 0) return;
    setAddingExpense(true);
    try {
      const date = selectedDay ?? new Date();
      const created = await createExpense({
        concept: newExpense.concept.trim(),
        category: newExpense.category.trim(),
        amount: newExpense.amount,
        date: date.toISOString(),
        type: "expense",
      });
      if (created) {
        setExpenses((prev) => [created, ...prev]);
        setNewExpense({ concept: "", category: "", amount: 0 });
        showNotification({ title: "Gasto registrado", message: "", color: "green", autoClose: 2000, position: "top-right" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    openConfirmModal({
      title: "Eliminar gasto",
      children: <p>¿Eliminar este gasto?</p>,
      centered: true,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteExpenseApi(id);
          setExpenses((prev) => prev.filter((e) => e._id !== id));
          showNotification({ title: "Gasto eliminado", message: "", color: "green", autoClose: 2000, position: "top-right" });
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  const handleAddIncome = async () => {
    if (!newIncome.concept.trim() || newIncome.amount <= 0) return;
    setAddingIncome(true);
    try {
      const date = selectedDay ?? new Date();
      const created = await createExpense({
        concept: newIncome.concept.trim(),
        category: newIncome.category.trim(),
        amount: newIncome.amount,
        date: date.toISOString(),
        type: "income",
      });
      if (created) {
        setIncomes((prev) => [created, ...prev]);
        setNewIncome({ concept: "", category: "", amount: 0 });
        showNotification({ title: "Ingreso registrado", message: "", color: "green", autoClose: 2000, position: "top-right" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAddingIncome(false);
    }
  };

  const handleDeleteIncome = (id: string) => {
    openConfirmModal({
      title: "Eliminar ingreso",
      children: <p>¿Eliminar este ingreso?</p>,
      centered: true,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteExpenseApi(id);
          setIncomes((prev) => prev.filter((e) => e._id !== id));
          showNotification({ title: "Ingreso eliminado", message: "", color: "green", autoClose: 2000, position: "top-right" });
        } catch (error) {
          console.error(error);
        }
      },
    });
  };

  // ---- Drawer de detalle de cita ----
  const handleOpenApptDetail = (appt: Appointment) => {
    setSelectedAppt(appt);
    setDrawerPayments(appt.payments || []);
    setDrawerPaymentStatus(appt.paymentStatus || "unpaid");
    setDrawerNewPayment({ amount: 0, method: "cash", note: "", otherLabel: "" });
    setDrawerCustomPrice(appt.customPrice ?? appt.totalPrice ?? 0);
    setDrawerAdditionalItems(appt.additionalItems || []);
    setDrawerNewItem({ name: "", price: 0 });
    setApptDrawerOpened(true);
  };

  const syncApptInState = (updated: Appointment) => {
    setSelectedAppt(updated);
    setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  };

  const handleDrawerConfirm = async () => {
    if (!selectedAppt) return;
    setDrawerActionLoading(true);
    try {
      await updateAppointment(selectedAppt._id, { status: "confirmed" });
      await registerService(selectedAppt.client?._id || "");
      const updated = { ...selectedAppt, status: "confirmed" };
      syncApptInState(updated as Appointment);
      showNotification({ title: "Cita confirmada", message: "Servicio registrado exitosamente", color: "green", autoClose: 2500, position: "top-right" });
    } catch {
      showNotification({ title: "Error", message: "No se pudo confirmar la cita", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setDrawerActionLoading(false);
    }
  };

  const handleDrawerMarkAttendance = async (status: "attended" | "no_show") => {
    if (!selectedAppt) return;
    setDrawerActionLoading(true);
    try {
      await markAttendance(selectedAppt._id, status);
      const updated = { ...selectedAppt, status };
      syncApptInState(updated as Appointment);
      showNotification({ title: status === "attended" ? "Marcado: Asistió" : "Marcado: No asistió", message: "", color: status === "attended" ? "teal" : "pink", autoClose: 2000, position: "top-right" });
    } catch {
      showNotification({ title: "Error", message: "No se pudo actualizar la asistencia", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setDrawerActionLoading(false);
    }
  };

  const handleDrawerCancel = () => {
    if (!selectedAppt) return;
    openConfirmModal({
      title: "Cancelar cita",
      children: <p>¿Estás seguro de que deseas cancelar esta cita?</p>,
      centered: true,
      labels: { confirm: "Cancelar cita", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setDrawerActionLoading(true);
        try {
          await cancelAppointment(selectedAppt._id);
          const updated = { ...selectedAppt, status: "cancelled" };
          syncApptInState(updated as Appointment);
          showNotification({ title: "Cita cancelada", message: "", color: "orange", autoClose: 2000, position: "top-right" });
        } catch {
          showNotification({ title: "Error", message: "No se pudo cancelar la cita", color: "red", autoClose: 3000, position: "top-right" });
        } finally {
          setDrawerActionLoading(false);
        }
      },
    });
  };

  const handleDrawerFullPayment = async () => {
    if (!selectedAppt || drawerPending <= 0) return;
    setDrawerSavingPayment(true);
    try {
      const updated = await addAppointmentPayment(selectedAppt._id, {
        amount: drawerPending,
        method: drawerNewPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: drawerNewPayment.method === "other" && drawerNewPayment.otherLabel ? drawerNewPayment.otherLabel : "",
      });
      if (updated) {
        setDrawerPayments(updated.payments || []);
        setDrawerPaymentStatus(updated.paymentStatus || "unpaid");
        syncApptInState({ ...selectedAppt, payments: updated.payments, paymentStatus: updated.paymentStatus });
        showNotification({ title: "Pago completo registrado", message: "", color: "green", autoClose: 2500, position: "top-right" });
      }
    } catch {
      showNotification({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setDrawerSavingPayment(false);
    }
  };

  const handleDrawerAddPayment = async () => {
    if (!selectedAppt || !drawerNewPayment.amount || drawerNewPayment.amount <= 0) return;
    setDrawerSavingPayment(true);
    try {
      const noteValue = drawerNewPayment.method === "other" && drawerNewPayment.otherLabel
        ? drawerNewPayment.otherLabel + (drawerNewPayment.note ? ` - ${drawerNewPayment.note}` : "")
        : drawerNewPayment.note;
      const updated = await addAppointmentPayment(selectedAppt._id, {
        amount: drawerNewPayment.amount,
        method: drawerNewPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: noteValue,
      });
      if (updated) {
        setDrawerPayments(updated.payments || []);
        setDrawerPaymentStatus(updated.paymentStatus || "unpaid");
        setDrawerNewPayment({ amount: 0, method: "cash", note: "", otherLabel: "" });
        syncApptInState({ ...selectedAppt, payments: updated.payments, paymentStatus: updated.paymentStatus });
        showNotification({ title: "Pago registrado", message: "", color: "green", autoClose: 2500, position: "top-right" });
      }
    } catch {
      showNotification({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setDrawerSavingPayment(false);
    }
  };

  const handleDrawerRemovePayment = async (paymentId: string) => {
    if (!selectedAppt) return;
    try {
      const updated = await removeAppointmentPayment(selectedAppt._id, paymentId);
      if (updated) {
        setDrawerPayments(updated.payments || []);
        setDrawerPaymentStatus(updated.paymentStatus || "unpaid");
        syncApptInState({ ...selectedAppt, payments: updated.payments, paymentStatus: updated.paymentStatus });
      }
    } catch {
      showNotification({ title: "Error", message: "No se pudo eliminar el pago", color: "red", autoClose: 3000, position: "top-right" });
    }
  };

  const handleDrawerSavePrice = async () => {
    if (!selectedAppt) return;
    setDrawerSavingPrice(true);
    try {
      const updated = await updateAppointment(selectedAppt._id, {
        customPrice: drawerCustomPrice,
        additionalItems: drawerAdditionalItems,
      });
      if (updated) {
        syncApptInState(updated);
        showNotification({ title: "Precio actualizado", message: "", color: "green", autoClose: 2000, position: "top-right" });
      }
    } catch {
      showNotification({ title: "Error", message: "No se pudo actualizar el precio", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setDrawerSavingPrice(false);
    }
  };

  // Cálculos del drawer (usan estados locales de precio para reflejar cambios antes de guardar)
  const drawerTotal = selectedAppt
    ? (drawerCustomPrice ?? selectedAppt.totalPrice ?? 0) +
      drawerAdditionalItems.reduce((s, i) => s + (i?.price || 0), 0)
    : 0;
  const drawerTotalPaid =
    (selectedAppt?.advancePayment || 0) + drawerPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const drawerPending = Math.max(0, drawerTotal - drawerTotalPaid);

  // const handleConfirmAppointment = (
  //   appointmentId: string,
  //   clientId: string
  // ) => {
  //   openConfirmModal({
  //     title: "Confirmar cita",
  //     children: <p>¿Estás seguro de que deseas confirmar esta cita?</p>,
  //     centered: true,
  //     labels: { confirm: "Confirmar", cancel: "Cancelar" },
  //     confirmProps: { color: "green" },
  //     onConfirm: async () => {
  //       try {
  //         await updateAppointment(appointmentId, { status: "confirmed" });
  //         await registerService(clientId);
  //         showNotification({
  //           title: "Éxito",
  //           message: "Cita confirmada y servicio registrado exitosamente",
  //           color: "green",
  //           autoClose: 2500,
  //           position: "top-right",
  //         });
  //         fetchAppointments();
  //       } catch (error) {
  //         showNotification({
  //           title: "Error",
  //           message: "No se pudo confirmar la cita.",
  //           color: "red",
  //           autoClose: 3000,
  //           position: "top-right",
  //         });
  //         console.error(error);
  //       }
  //     },
  //   });
  // };

  const handleConfirmAllPending = () => {
    // Filtrar solo las citas pendientes que se pueden confirmar
    const pendingAppointments = filteredAppointments.filter((appt) =>
      canConfirm(appt.status || "pending")
    );

    if (pendingAppointments.length === 0) {
      showNotification({
        title: "Sin citas pendientes",
        message: "No hay citas pendientes para confirmar.",
        color: "blue",
        autoClose: 2500,
        position: "top-right",
      });
      return;
    }

    openConfirmModal({
      title: "Confirmar todas las citas pendientes",
      children: (
        <div>
          <p>
            ¿Estás seguro de que deseas confirmar{" "}
            <strong>{pendingAppointments.length}</strong> cita
            {pendingAppointments.length !== 1 ? "s" : ""} pendiente
            {pendingAppointments.length !== 1 ? "s" : ""}?
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "gray" }}>
            Esta acción confirmará todas las citas visibles en la tabla y
            registrará los servicios de los clientes.
          </p>
        </div>
      ),
      centered: true,
      labels: { confirm: "Confirmar todas", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        if (!organizationId) return;

        setLoading(true);
        try {
          const appointmentIds = pendingAppointments.map((appt) => appt._id);

          const result = await batchConfirmAppointments(
            appointmentIds,
            organizationId
          );

          if (result) {
            const { confirmed, failed, alreadyConfirmed } = result;

            let message = "";
            if (confirmed.length > 0) {
              message += `${confirmed.length} confirmada${confirmed.length !== 1 ? "s" : ""}. `;
            }
            if (alreadyConfirmed.length > 0) {
              message += `${alreadyConfirmed.length} ya confirmada${alreadyConfirmed.length !== 1 ? "s" : ""}. `;
            }
            if (failed.length > 0) {
              message += `${failed.length} fallida${failed.length !== 1 ? "s" : ""}. `;
            }

            showNotification({
              title: "Proceso completado",
              message: message.trim(),
              color: failed.length > 0 ? "yellow" : "green",
              autoClose: 4000,
              position: "top-right",
            });

            // Recargar las citas
            fetchAppointments();
          }
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudieron confirmar las citas.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Opciones de servicios desde las citas
  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => set.add(a.service?.name || "Otro"));
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [appointments]);

  // Filtrado por servicio (impacta tabla/cards + totales + resumen)
  const filteredAppointments = useMemo(() => {
    if (selectedServices.length === 0) return appointments;
    return appointments.filter((a) =>
      selectedServices.includes(a.service?.name || "Otro")
    );
  }, [appointments, selectedServices]);

  const totalGeneralExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const totalGeneralIncomes = useMemo(
    () => incomes.reduce((s, e) => s + e.amount, 0),
    [incomes]
  );

  // Totales + resumen por servicio calculados sobre filteredAppointments
  const { totalIncome, totalCount, servicesSummary, totalCollected, totalPending, totalCosts, netMargin, totalCashCollected } =
    useMemo(() => {
      const summary: Record<string, { count: number; total: number; costs: number }> = {};
      let total = 0;
      let collected = 0;
      let cashCollected = 0;
      let costsTotal = 0;
      let completedIncome = 0;

      for (const appt of filteredAppointments) {
        const basePrice = appt.service?.price || 0;
        const additionalTotal =
          appt.additionalItems?.reduce(
            (sum, item) => sum + (item?.price || 0),
            0
          ) || 0;

        const usedPrice =
          typeof appt.customPrice === "number"
            ? appt.customPrice
            : typeof appt.totalPrice === "number"
            ? appt.totalPrice
            : basePrice;

        const lineTotal = usedPrice + additionalTotal;
        total += lineTotal;

        const advance = appt.advancePayment || 0;
        const paymentsSum = (appt.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
        collected += advance + paymentsSum;

        // Solo pagos en efectivo cuentan para el cierre físico de caja
        cashCollected += (appt.payments || [])
          .filter((p: any) => p.method === "cash")
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);

        const serviceName = appt.service?.name || "Otro";
        if (!summary[serviceName])
          summary[serviceName] = { count: 0, total: 0, costs: 0 };
        summary[serviceName].count += 1;
        summary[serviceName].total += lineTotal;

        // Gastos: solo para citas confirmadas o asistidas
        const isCompleted = appt.status === "confirmed" || appt.status === "attended";
        if (isCompleted) {
          completedIncome += lineTotal;
          const serviceCosts = (appt.service as any)?.costs ?? [];
          const apptCost = serviceCosts.reduce((s: number, c: any) => s + (c.amount || 0), 0);
          costsTotal += apptCost;
          summary[serviceName].costs += apptCost;
        }
      }

      const count = filteredAppointments.length;

      return {
        totalIncome: total,
        totalCount: count,
        servicesSummary: summary,
        totalCollected: collected,
        totalPending: Math.max(0, total - collected),
        totalCosts: costsTotal,
        netMargin: completedIncome + totalGeneralIncomes - costsTotal - totalGeneralExpenses,
        totalCashCollected: cashCollected,
      };
    }, [filteredAppointments, totalGeneralExpenses, totalGeneralIncomes]);

  const formattedRangeLabel =
    startDate && endDate
      ? interval === "daily"
        ? dayjs(startDate).format("DD/MM/YYYY")
        : `${dayjs(startDate).format("DD/MM/YYYY")} – ${dayjs(endDate).format(
            "DD/MM/YYYY"
          )}`
      : "";

  // ---- UI: filtros drawer mobile ----
  const FiltersContent = (
    <Stack gap="sm">
      {interval === "daily" && (
        <>
          <Group justify="space-between" wrap="nowrap">
            <Button variant="light" leftSection={<IconChevronLeft size={16} />}
              onClick={() => setSelectedDay((d) => dayjs(d ?? new Date()).subtract(1, "day").toDate())}>
              Anterior
            </Button>
            <Button variant="subtle" onClick={() => setSelectedDay(new Date())}>Hoy</Button>
            <Button variant="light" rightSection={<IconChevronRight size={16} />}
              onClick={() => setSelectedDay((d) => dayjs(d ?? new Date()).add(1, "day").toDate())}>
              Siguiente
            </Button>
          </Group>
          <DatePickerInput label="Día" locale="es" value={selectedDay} onChange={setSelectedDay} clearable={false} />
          <NumberInput
            label="Base de caja (efectivo inicial)"
            description="Monto en efectivo al abrir el día"
            leftSection={<IconReceipt size={16} />}
            value={cashBase}
            onChange={(v) => {
              const val = typeof v === "number" ? v : 0;
              setCashBase(val);
              if (selectedDay) localStorage.setItem(`cashbox_base_${dayjs(selectedDay).format("YYYY-MM-DD")}`, String(val));
            }}
            min={0} hideControls placeholder="0"
          />
        </>
      )}
      {interval === "custom" && (
        <Group grow align="flex-start">
          <DatePickerInput label="Inicio" locale="es" value={startDate}
            onChange={(d) => setStartDate(d ? dayjs(d).startOf("day").toDate() : null)} />
          <DatePickerInput label="Fin" locale="es" value={endDate}
            onChange={(d) => setEndDate(d ? dayjs(d).endOf("day").toDate() : null)} />
        </Group>
      )}
      <MultiSelect label="Servicios" placeholder="Todos" data={serviceOptions}
        value={selectedServices} onChange={setSelectedServices} clearable searchable />
    </Stack>
  );

  // ---- UI: Mobile cards ----
  const MobileCards = (
    <Stack gap="sm">
      {filteredAppointments.length === 0 ? (
        <Text ta="center" c="dimmed" py="md">No hay citas para este filtro/intervalo.</Text>
      ) : (
        filteredAppointments.map((appointment) => {
          const status = (appointment.status || "pending") as ApptStatus;
          const basePrice = appointment.service?.price || 0;
          const additionalTotal = appointment.additionalItems?.reduce((s, i) => s + (i?.price || 0), 0) || 0;
          const usedPrice = typeof appointment.customPrice === "number"
            ? appointment.customPrice
            : typeof appointment.totalPrice === "number" ? appointment.totalPrice : basePrice;
          const total = usedPrice + additionalTotal;
          const isCustom = typeof appointment.customPrice === "number" && appointment.customPrice !== basePrice;
          return (
            <Card key={appointment._id} withBorder radius="md" p="sm"
              style={{ ...getCardAccentStyle(status), cursor: "pointer" }}
              onClick={() => handleOpenApptDetail(appointment)}>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs" wrap="nowrap" mb={2}>
                    <Text fw={700} size="sm" lineClamp={1}>{appointment.client?.name || "—"}</Text>
                    <StatusBadge status={status} />
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {appointment.service?.name || "—"} · {formatInTimezone(appointment.startDate, timezone, `DD/MM/YY ${timeFmt}`)}
                  </Text>
                  <Group gap="xs" mt={4} align="center" wrap="wrap">
                    <Text size="sm" fw={700}>{formatCurrency(total, currency)}</Text>
                    <PaymentBadge status={appointment.paymentStatus} />
                    <PaymentMethods payments={appointment.payments} />
                    {isCustom && <CustomPriceBadge isMobile={true} />}
                    {additionalTotal > 0 && <Badge variant="light" color="blue" size="xs">+ Adic.</Badge>}
                  </Group>
                </div>
                <ActionIcon variant="subtle" color="gray" size="sm" mt={2}>
                  <IconArrowRight size={14} />
                </ActionIcon>
              </Group>
            </Card>
          );
        })
      )}
    </Stack>
  );

  // ---- UI: Desktop table ----
  const DesktopTable = (
    <ScrollArea scrollbarSize={10}>
      <Table striped highlightOnHover withTableBorder={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha / Hora</Table.Th>
            <Table.Th>Cliente</Table.Th>
            <Table.Th>Servicio</Table.Th>
            <Table.Th>Total</Table.Th>
            <Table.Th>Cobro</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th style={{ width: 32 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredAppointments.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text ta="center" c="dimmed" py="md">No hay citas registradas</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            filteredAppointments.map((appointment) => {
              const status = (appointment.status || "pending") as ApptStatus;
              const basePrice = appointment.service?.price || 0;
              const additionalTotal = appointment.additionalItems?.reduce((s, i) => s + (i?.price || 0), 0) || 0;
              const usedPrice = typeof appointment.customPrice === "number"
                ? appointment.customPrice
                : typeof appointment.totalPrice === "number" ? appointment.totalPrice : basePrice;
              const total = usedPrice + additionalTotal;
              const isCustom = typeof appointment.customPrice === "number" && appointment.customPrice !== basePrice;
              return (
                <Table.Tr key={appointment._id}
                  style={{ ...getRowStylesSoft(status), cursor: "pointer" }}
                  onClick={() => handleOpenApptDetail(appointment)}>
                  <Table.Td>
                    <Text size="sm">{formatInTimezone(appointment.startDate, timezone, `DD/MM/YY`)}</Text>
                    <Text size="xs" c="dimmed">{formatInTimezone(appointment.startDate, timezone, timeFmt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{appointment.client?.name || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{appointment.service?.name || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Text size="sm" fw={600}>{formatCurrency(total, currency)}</Text>
                      {isCustom && (
                        <Tooltip label={
                          <div>
                            <div>Base: {formatCurrency(basePrice, currency)}</div>
                            <div>Personalizado: {formatCurrency(appointment.customPrice!, currency)}</div>
                            {additionalTotal > 0 && <div>Adicionales: {formatCurrency(additionalTotal, currency)}</div>}
                            <div style={{ marginTop: 4, fontWeight: 700 }}>Total: {formatCurrency(total, currency)}</div>
                          </div>
                        } withArrow>
                          <div><CustomPriceBadge isMobile={false} /></div>
                        </Tooltip>
                      )}
                      {additionalTotal > 0 && <Badge variant="light" color="blue" size="xs">+Adic.</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <PaymentBadge status={appointment.paymentStatus} />
                    <PaymentMethods payments={appointment.payments} />
                  </Table.Td>
                  <Table.Td><StatusBadge status={status} /></Table.Td>
                  <Table.Td>
                    <ActionIcon variant="subtle" color="gray" size="xs">
                      <IconArrowRight size={12} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );


  return (
    <Container fluid>
      {/* ---- Drawer detalle de cita ---- */}
      <Drawer
        opened={apptDrawerOpened}
        onClose={() => setApptDrawerOpened(false)}
        position="right"
        size="md"
        title={
          selectedAppt ? (
            <div>
              <Text fw={800} size="sm" lineClamp={1}>{selectedAppt.client?.name || "—"}</Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {selectedAppt.service?.name || "—"} · {formatInTimezone(selectedAppt.startDate, timezone, `DD/MM/YYYY ${timeFmt}`)}
              </Text>
            </div>
          ) : null
        }
      >
        {selectedAppt && (() => {
          const isCancelled = (selectedAppt.status || "").includes("cancelled");
          const isPast = new Date(selectedAppt.endDate) < new Date();
          return (
            <Stack gap="md">
              {/* Estado + acciones */}
              <Paper withBorder p="sm" radius="md">
                <Group justify="space-between" mb="sm">
                  <Text size="sm" fw={700}>Estado</Text>
                  <StatusBadge status={(selectedAppt.status || "pending") as ApptStatus} />
                </Group>
                <Group gap="xs" wrap="wrap">
                  {canConfirm(selectedAppt.status || "pending") && (
                    <Button
                      size="xs" color="green"
                      leftSection={<IconCircleCheck size={14} />}
                      onClick={handleDrawerConfirm}
                      loading={drawerActionLoading}
                    >
                      Confirmar
                    </Button>
                  )}
                  {!isCancelled && isPast && (
                    <>
                      <Button
                        size="xs" color="teal" variant={selectedAppt.status === "attended" ? "filled" : "light"}
                        leftSection={<IconUserCheck size={14} />}
                        onClick={() => handleDrawerMarkAttendance("attended")}
                        loading={drawerActionLoading}
                      >
                        Asistió
                      </Button>
                      <Button
                        size="xs" color="pink" variant={selectedAppt.status === "no_show" ? "filled" : "light"}
                        leftSection={<IconUserX size={14} />}
                        onClick={() => handleDrawerMarkAttendance("no_show")}
                        loading={drawerActionLoading}
                      >
                        No asistió
                      </Button>
                    </>
                  )}
                  {!isCancelled && (
                    <Button
                      size="xs" color="red" variant="light"
                      leftSection={<IconBan size={14} />}
                      onClick={handleDrawerCancel}
                      loading={drawerActionLoading}
                    >
                      Cancelar
                    </Button>
                  )}
                </Group>
              </Paper>

              {/* Precio */}
              <Paper withBorder p="sm" radius="md">
                <Text size="sm" fw={700} mb="sm">Precio</Text>
                <Group gap="xs" align="flex-end" mb="sm">
                  <NumberInput
                    label="Precio del servicio"
                    prefix="$ "
                    thousandSeparator="."
                    decimalSeparator=","
                    value={drawerCustomPrice ?? ""}
                    onChange={(v) => setDrawerCustomPrice(typeof v === "number" ? v : null)}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                </Group>

                {/* Adicionales */}
                <Text size="xs" fw={600} c="dimmed" mb={4}>Adicionales</Text>
                {drawerAdditionalItems.length > 0 && (
                  <Stack gap={4} mb="sm">
                    {drawerAdditionalItems.map((item, idx) => (
                      <Group key={idx} justify="space-between" wrap="nowrap"
                        style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid var(--mantine-color-gray-2)", background: "var(--mantine-color-gray-0)" }}
                      >
                        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>{item.name}</Text>
                        <Text size="sm" fw={600} mr="xs">{formatCurrency(item.price, currency)}</Text>
                        <ActionIcon color="red" variant="subtle" size="sm"
                          onClick={() => setDrawerAdditionalItems((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
                <Group gap="xs" align="flex-end" mb="sm">
                  <TextInput
                    size="sm" label="Nombre"
                    placeholder="Ej: Kit de color"
                    value={drawerNewItem.name}
                    onChange={(e) => setDrawerNewItem((p) => ({ ...p, name: e.currentTarget.value }))}
                    style={{ flex: 2 }}
                  />
                  <NumberInput
                    size="sm" label="Precio"
                    prefix="$ " thousandSeparator="." decimalSeparator=","
                    value={drawerNewItem.price || ""}
                    onChange={(v) => setDrawerNewItem((p) => ({ ...p, price: typeof v === "number" ? v : 0 }))}
                    style={{ flex: 1 }}
                    min={0}
                  />
                  <ActionIcon
                    color="green" variant="filled" size="lg" mb={1}
                    disabled={!drawerNewItem.name.trim() || drawerNewItem.price <= 0}
                    onClick={() => {
                      setDrawerAdditionalItems((prev) => [...prev, drawerNewItem]);
                      setDrawerNewItem({ name: "", price: 0 });
                    }}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Group>
                <Button
                  fullWidth size="sm" onClick={handleDrawerSavePrice} loading={drawerSavingPrice}
                >
                  Guardar precio
                </Button>
              </Paper>

              {/* Cobro */}
              <Paper withBorder p="sm" radius="md">
                <Group justify="space-between" mb="sm">
                  <Text size="sm" fw={700}>Cobro</Text>
                  <PaymentBadge status={drawerPaymentStatus} />
                </Group>

                {/* Resumen numérico */}
                <Stack gap={4} mb="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Total esta cita</Text>
                    <Text size="sm" fw={600}>{formatCurrency(drawerTotal, currency)}</Text>
                  </Group>
                  {(selectedAppt.advancePayment || 0) > 0 && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Abono inicial</Text>
                      <Text size="sm">{formatCurrency(selectedAppt.advancePayment || 0, currency)}</Text>
                    </Group>
                  )}
                  {drawerPayments.length > 0 && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Pagos adicionales</Text>
                      <Text size="sm">{formatCurrency(drawerPayments.reduce((s, p) => s + (p.amount || 0), 0), currency)}</Text>
                    </Group>
                  )}
                  <Group
                    justify="space-between" pt={4}
                    style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
                  >
                    <Text size="sm" fw={700}>Pendiente</Text>
                    <Text size="sm" fw={700} c={drawerPending > 0 ? "red" : "green"}>
                      {formatCurrency(drawerPending, currency)}
                    </Text>
                  </Group>
                </Stack>

                {/* Historial de pagos */}
                {drawerPayments.length > 0 && (
                  <>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>Historial de pagos</Text>
                    <Stack gap={4} mb="sm">
                      {drawerPayments.map((p) => (
                        <Group
                          key={p._id} justify="space-between" wrap="nowrap"
                          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--mantine-color-gray-2)", background: "var(--mantine-color-gray-0)" }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <Text size="sm" fw={600}>
                              {formatCurrency(p.amount, currency)} · {METHOD_LABELS[p.method] || p.method}
                            </Text>
                            {p.note && <Text size="xs" c="dimmed">{p.note}</Text>}
                          </div>
                          <Tooltip label="Eliminar pago" withArrow>
                            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDrawerRemovePayment(p._id)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ))}
                    </Stack>
                  </>
                )}

                {/* Formulario de pago */}
                {drawerPaymentStatus !== "paid" && drawerPaymentStatus !== "free" && (
                  <>
                    <Divider label="Registrar pago" labelPosition="center" mb="sm" />
                    <Stack gap="xs">
                      <Group gap="xs" wrap="wrap">
                        <Select
                          size="sm" label="Método"
                          value={drawerNewPayment.method}
                          onChange={(v) => setDrawerNewPayment({ ...drawerNewPayment, method: v || "cash", otherLabel: "" })}
                          data={[
                            { value: "cash", label: "Efectivo" },
                            { value: "card", label: "Tarjeta" },
                            { value: "transfer", label: "Transferencia" },
                            { value: "other", label: "Otro" },
                          ]}
                          style={{ flex: 1, minWidth: 120 }}
                        />
                        {drawerNewPayment.method === "other" && (
                          <TextInput
                            size="sm" label="¿Cuál? (opcional)"
                            placeholder="Nequi, Daviplata..."
                            value={drawerNewPayment.otherLabel}
                            onChange={(e) => setDrawerNewPayment({ ...drawerNewPayment, otherLabel: e.currentTarget.value })}
                            style={{ flex: 1 }}
                          />
                        )}
                      </Group>
                      {drawerPending > 0 && (
                        <Button fullWidth size="sm" color="teal" onClick={handleDrawerFullPayment} loading={drawerSavingPayment}>
                          Pago completo ({formatCurrency(drawerPending, currency)})
                        </Button>
                      )}
                      <Divider label="o monto parcial" labelPosition="center" />
                      <Group gap="xs" wrap="wrap">
                        <NumberInput
                          size="sm" label="Monto"
                          prefix="$ " thousandSeparator="." decimalSeparator=","
                          value={drawerNewPayment.amount || ""}
                          onChange={(v) => setDrawerNewPayment({ ...drawerNewPayment, amount: typeof v === "number" ? v : 0 })}
                          min={0} style={{ flex: 1, minWidth: 100 }}
                        />
                        <TextInput
                          size="sm" label="Nota (opcional)"
                          value={drawerNewPayment.note}
                          onChange={(e) => setDrawerNewPayment({ ...drawerNewPayment, note: e.currentTarget.value })}
                          style={{ flex: 1, minWidth: 100 }}
                        />
                      </Group>
                      <Button
                        fullWidth size="sm" variant="light"
                        disabled={!drawerNewPayment.amount || drawerNewPayment.amount <= 0}
                        onClick={handleDrawerAddPayment} loading={drawerSavingPayment}
                      >
                        Registrar monto parcial
                      </Button>
                    </Stack>
                  </>
                )}
              </Paper>
            </Stack>
          );
        })()}
      </Drawer>

      <Stack gap="md" mt="xs">
        {/* ── Barra de control ── */}
        <Card shadow="sm" radius="md" withBorder p="md">
          <Stack gap="sm">
            {/* Fila título */}
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <IconCalendar size={18} style={{ flexShrink: 0 }} />
                <Text fw={900} size="lg" style={{ flexShrink: 0 }}>Caja</Text>
                {formattedRangeLabel && (
                  <Badge variant="light" size="md">{formattedRangeLabel}</Badge>
                )}
                {loading && <Loader size="xs" style={{ flexShrink: 0 }} />}
              </Group>
              {/* En desktop los botones van aquí; en mobile van en fila separada */}
              {!isMobile && (
                <Group gap="xs" wrap="nowrap">
                  <Button
                    variant="light" color="teal" size="xs"
                    leftSection={<IconReceipt size={14} />}
                    onClick={() => document.getElementById("cashbox-movements")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Gastos e ingresos
                  </Button>
                </Group>
              )}
            </Group>

            {/* Fila de acciones mobile (debajo del título para que el badge se vea completo) */}
            {isMobile && (
              <Group gap="xs" wrap="wrap">
                <Button
                  variant="light" color="teal" size="xs"
                  leftSection={<IconReceipt size={14} />}
                  onClick={() => document.getElementById("cashbox-movements")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{ flex: 1 }}
                >
                  Gastos e ingresos
                </Button>
                <ActionIcon variant="light" size="lg" onClick={() => setFiltersOpened(true)} aria-label="Filtros">
                  <IconFilter size={18} />
                </ActionIcon>
              </Group>
            )}

            {/* Selector de intervalo */}
            <Tooltip label="La vista seleccionada se recuerda al volver" withArrow position="top">
              {isMobile ? (
                <Select
                  placeholder="Selecciona intervalo"
                  data={[
                    { value: "daily", label: "Diario" },
                    { value: "weekly", label: "Semanal" },
                    { value: "biweekly", label: "Quincenal" },
                    { value: "monthly", label: "Mensual" },
                    { value: "custom", label: "Personalizado" },
                  ] as any}
                  value={interval}
                  onChange={(v) => {
                    const next = (v || "daily") as Interval;
                    setInterval(next);
                    localStorage.setItem("cashbox_interval", next);
                    if (next === "daily" && !selectedDay) setSelectedDay(new Date());
                  }}
                  searchable={false} clearable={false}
                />
              ) : (
                <SegmentedControl
                  fullWidth
                  value={interval}
                  onChange={(v) => {
                    const next = v as Interval;
                    setInterval(next);
                    localStorage.setItem("cashbox_interval", next);
                    if (next === "daily" && !selectedDay) setSelectedDay(new Date());
                  }}
                  data={[
                    { value: "daily", label: "Diario" },
                    { value: "weekly", label: "Semanal" },
                    { value: "biweekly", label: "Quincenal" },
                    { value: "monthly", label: "Mensual" },
                    { value: "custom", label: "Personalizado" },
                  ]}
                />
              )}
            </Tooltip>

            {/* Filtros inline desktop */}
            {!isMobile && (
              <Group gap="sm" align="flex-end" wrap="wrap">
                {interval === "daily" && (
                  <>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon variant="light" size="md"
                        onClick={() => setSelectedDay((d) => dayjs(d ?? new Date()).subtract(1, "day").toDate())}
                        aria-label="Día anterior">
                        <IconChevronLeft size={15} />
                      </ActionIcon>
                      <DatePickerInput locale="es" value={selectedDay} onChange={setSelectedDay} clearable={false} w={150} />
                      <ActionIcon variant="light" size="md"
                        onClick={() => setSelectedDay((d) => dayjs(d ?? new Date()).add(1, "day").toDate())}
                        aria-label="Día siguiente">
                        <IconChevronRight size={15} />
                      </ActionIcon>
                      <Button variant="subtle" size="sm" onClick={() => setSelectedDay(new Date())}>Hoy</Button>
                    </Group>
                    <NumberInput
                      label="Base de caja"
                      leftSection={<IconReceipt size={14} />}
                      value={cashBase}
                      onChange={(v) => {
                        const val = typeof v === "number" ? v : 0;
                        setCashBase(val);
                        if (selectedDay) localStorage.setItem(`cashbox_base_${dayjs(selectedDay).format("YYYY-MM-DD")}`, String(val));
                      }}
                      min={0} hideControls placeholder="0" w={160}
                    />
                  </>
                )}
                {interval === "custom" && (
                  <>
                    <DatePickerInput label="Inicio" locale="es" value={startDate}
                      onChange={(d) => setStartDate(d ? dayjs(d).startOf("day").toDate() : null)} w={160} />
                    <DatePickerInput label="Fin" locale="es" value={endDate}
                      onChange={(d) => setEndDate(d ? dayjs(d).endOf("day").toDate() : null)} w={160} />
                  </>
                )}
                <MultiSelect label="Servicios" placeholder="Todos" data={serviceOptions}
                  value={selectedServices} onChange={setSelectedServices} clearable searchable
                  style={{ flex: "1 1 200px", minWidth: 180 }} />
              </Group>
            )}
          </Stack>

          {/* Drawer filtros mobile */}
          <Drawer opened={filtersOpened} onClose={() => setFiltersOpened(false)}
            position="bottom" size="lg" radius="md"
            title={<Group gap="xs"><IconAdjustments size={18} /><Text fw={900}>Filtros</Text></Group>}>
            <Stack>
              {FiltersContent}
              <Button onClick={() => setFiltersOpened(false)}>Aplicar</Button>
            </Stack>
          </Drawer>
        </Card>

        {/* ── Tarjetas de métricas ── */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: interval === "daily" ? 5 : 4 }} spacing="sm">
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={500} mb={4}>Ingresos</Text>
            <Text fw={900} size="xl">{formatCurrency(totalIncome, currency)}</Text>
            <Text size="xs" c="dimmed" mt={2}>{totalCount} cita{totalCount !== 1 ? "s" : ""}</Text>
          </Paper>

          <Paper withBorder p="md" radius="md" style={{ borderLeft: "3px solid var(--mantine-color-green-6)" }}>
            <Text size="xs" c="dimmed" fw={500} mb={4}>Cobrado</Text>
            <Text fw={900} size="xl" c="green">{formatCurrency(totalCollected, currency)}</Text>
          </Paper>

          <Paper withBorder p="md" radius="md"
            style={totalPending > 0 ? { borderLeft: "3px solid var(--mantine-color-orange-6)" } : undefined}>
            <Text size="xs" c="dimmed" fw={500} mb={4}>Pendiente</Text>
            <Text fw={900} size="xl" c={totalPending > 0 ? "orange" : "dimmed"}>{formatCurrency(totalPending, currency)}</Text>
          </Paper>

          {interval === "daily" && (
            <Paper withBorder p="md" radius="md" style={{ borderLeft: "3px solid var(--mantine-color-blue-6)" }}>
              <Text size="xs" c="dimmed" fw={500} mb={4}>Cierre efectivo</Text>
              <Text fw={900} size="xl" c="blue">{formatCurrency(cashBase + totalCashCollected, currency)}</Text>
              {cashBase > 0 && <Text size="xs" c="dimmed" mt={2}>Base: {formatCurrency(cashBase, currency)}</Text>}
            </Paper>
          )}

          {totalGeneralIncomes > 0 && (
            <Paper withBorder p="md" radius="md" style={{ borderLeft: "3px solid var(--mantine-color-teal-6)" }}>
              <Text size="xs" c="dimmed" fw={500} mb={4}>Ingresos extra</Text>
              <Text fw={900} size="xl" c="teal">{formatCurrency(totalGeneralIncomes, currency)}</Text>
            </Paper>
          )}

          {(totalCosts > 0 || totalGeneralExpenses > 0) && (
            <>
              <Paper withBorder p="md" radius="md" style={{ borderLeft: "3px solid var(--mantine-color-red-6)" }}>
                <Text size="xs" c="dimmed" fw={500} mb={4}>Gastos</Text>
                <Text fw={900} size="xl" c="red">{formatCurrency(totalCosts + totalGeneralExpenses, currency)}</Text>
              </Paper>
              <Paper withBorder p="md" radius="md"
                style={{ borderLeft: `3px solid var(--mantine-color-${netMargin >= 0 ? "teal" : "red"}-6)` }}>
                <Text size="xs" c="dimmed" fw={500} mb={4}>Margen neto</Text>
                <Text fw={900} size="xl" c={netMargin >= 0 ? "teal" : "red"}>{formatCurrency(netMargin, currency)}</Text>
              </Paper>
            </>
          )}
        </SimpleGrid>

        {/* ── Citas ── */}
        <Card shadow="sm" radius="md" withBorder>
          <Group justify="space-between" mb="sm" wrap="wrap">
            <Group gap="xs">
              <Title order={4}>Citas</Title>
              <Badge variant="light" color="gray">{filteredAppointments.length}</Badge>
              {selectedServices.length > 0 && (
                <Badge variant="dot" color="blue" size="sm">{selectedServices.length} servicio(s)</Badge>
              )}
            </Group>
            {filteredAppointments.filter((a) => canConfirm(a.status || "pending")).length > 0 && (
              <Button size="xs" leftSection={<IconChecks size={14} />} color="green" variant="light"
                onClick={handleConfirmAllPending} disabled={loading}>
                Confirmar pendientes
              </Button>
            )}
          </Group>

          {loading ? (
            <Flex justify="center" align="center" direction="column" py="xl">
              <Loader size={36} />
              <Text mt="sm" size="sm" c="dimmed">Cargando citas...</Text>
            </Flex>
          ) : isMobile ? MobileCards : DesktopTable}

          {/* Resumen por servicio compacto (solo si hay más de un tipo) */}
          {Object.entries(servicesSummary).length > 1 && (
            <>
              <Divider mt="md" mb="sm" label="Resumen por servicio" labelPosition="center" />
              <Stack gap={4}>
                {Object.entries(servicesSummary).map(([name, data]) => (
                  <Group key={name} justify="space-between" wrap="nowrap">
                    <Text size="sm" lineClamp={1} style={{ flex: 1 }}>{name}</Text>
                    <Group gap="sm" wrap="nowrap">
                      <Badge variant="light" color="gray" size="sm">{data.count}</Badge>
                      <Text size="sm" fw={700}>{formatCurrency(data.total, currency)}</Text>
                      {data.costs > 0 && (
                        <Text size="xs" c="dimmed">−{formatCurrency(data.costs, currency)}</Text>
                      )}
                    </Group>
                  </Group>
                ))}
              </Stack>
            </>
          )}
        </Card>

        {/* ── Movimientos ── */}
        <Card id="cashbox-movements" shadow="sm" radius="md" withBorder>
          <Group justify="space-between" align="center" mb="md">
            <Group gap="xs">
              <IconReceipt size={18} />
              <Title order={4}>Movimientos</Title>
              {totalGeneralExpenses > 0 && <Badge color="red" variant="light">−{formatCurrency(totalGeneralExpenses, currency)}</Badge>}
              {totalGeneralIncomes > 0 && <Badge color="teal" variant="light">+{formatCurrency(totalGeneralIncomes, currency)}</Badge>}
            </Group>
          </Group>

          <Paper withBorder p="sm" radius="md" mb="md">
            <SegmentedControl
              value={movementType} onChange={(v) => setMovementType(v as "expense" | "income")}
              data={[{ value: "expense", label: "Gasto" }, { value: "income", label: "Ingreso" }]}
              color={movementType === "income" ? "teal" : "red"} size="xs" mb="sm"
            />
            <Group gap="sm" align="flex-end" wrap="wrap">
              <TextInput
                placeholder={movementType === "expense" ? "Concepto (ej: arriendo)" : "Concepto (ej: venta producto)"}
                value={movementType === "expense" ? newExpense.concept : newIncome.concept}
                onChange={(e) => movementType === "expense"
                  ? setNewExpense((p) => ({ ...p, concept: e.currentTarget.value }))
                  : setNewIncome((p) => ({ ...p, concept: e.currentTarget.value }))}
                style={{ flex: "1 1 180px", minWidth: 130 }}
              />
              <TextInput
                placeholder="Categoría (opc.)"
                value={movementType === "expense" ? newExpense.category : newIncome.category}
                onChange={(e) => movementType === "expense"
                  ? setNewExpense((p) => ({ ...p, category: e.currentTarget.value }))
                  : setNewIncome((p) => ({ ...p, category: e.currentTarget.value }))}
                style={{ flex: "0 1 140px", minWidth: 100 }}
              />
              <NumberInput
                placeholder="$ monto" prefix="$ " thousandSeparator="." decimalSeparator=","
                value={movementType === "expense" ? newExpense.amount : newIncome.amount}
                onChange={(v) => movementType === "expense"
                  ? setNewExpense((p) => ({ ...p, amount: typeof v === "number" ? v : 0 }))
                  : setNewIncome((p) => ({ ...p, amount: typeof v === "number" ? v : 0 }))}
                min={0} w={120}
              />
              <Button
                color={movementType === "income" ? "teal" : undefined}
                leftSection={<IconPlus size={16} />}
                onClick={movementType === "expense" ? handleAddExpense : handleAddIncome}
                loading={movementType === "expense" ? addingExpense : addingIncome}
                disabled={movementType === "expense"
                  ? !newExpense.concept.trim() || newExpense.amount <= 0
                  : !newIncome.concept.trim() || newIncome.amount <= 0}
              >
                Agregar
              </Button>
            </Group>
          </Paper>

          {expenses.length === 0 && incomes.length === 0 ? (
            <Text c="dimmed" ta="center" size="sm" py="sm">No hay movimientos registrados para este período.</Text>
          ) : (
            <Stack gap="xs">
              {[
                ...expenses.map((e) => ({ ...e, _type: "expense" as const })),
                ...incomes.map((e) => ({ ...e, _type: "income" as const })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <Group key={item._id} justify="space-between" wrap="nowrap"
                    style={{ borderBottom: "1px solid var(--mantine-color-gray-2)", paddingBottom: 6 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Group gap="xs" wrap="nowrap">
                        <Badge size="xs" variant="light" color={item._type === "income" ? "teal" : "red"}>
                          {item._type === "income" ? "Ingreso" : "Gasto"}
                        </Badge>
                        <Text size="sm" fw={600} lineClamp={1}>{item.concept}</Text>
                        {item.category && <Badge size="xs" variant="dot" color="gray">{item.category}</Badge>}
                      </Group>
                      <Text size="xs" c="dimmed">{formatInTimezone(item.date, timezone, "DD/MM/YYYY")}</Text>
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={700} c={item._type === "income" ? "teal" : "red"} size="sm">
                        {item._type === "income" ? "+" : "−"}{formatCurrency(item.amount, currency)}
                      </Text>
                      <Tooltip label="Eliminar" withArrow>
                        <ActionIcon color="red" variant="subtle" size="sm"
                          onClick={() => item._type === "expense" ? handleDeleteExpense(item._id) : handleDeleteIncome(item._id)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                ))}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
};

export default DailyCashbox;
