/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  Grid,
  Select,
  Text,
  Group,
  Checkbox,
  NumberInput,
  MultiSelectProps,
  Avatar,
  Card,
  Loader,
  Divider,
  Badge,
  ActionIcon,
  Textarea,
  Tabs,
  ScrollArea,
  Flex,
  CopyButton,
  Tooltip,
  Table,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import { addMinutes } from "date-fns";
import { Service } from "../../../../services/serviceService";
import { Employee } from "../../../../services/employeeService";
import { Client, searchClients } from "../../../../services/clientService";
import {
  Appointment,
  PaymentRecord,
  updateAppointment,
  updateAppointmentNotes,
  addAppointmentPayment,
  removeAppointmentPayment,
} from "../../../../services/appointmentService";
import ClientFormModal from "../../manageClients/ClientFormModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatCurrency } from "../../../../utils/formatCurrency";
import {
  formatInTimezone,
  formatFullDateInTimezone,
} from "../../../../utils/timezoneUtils";

dayjs.extend(utc);
dayjs.extend(timezone);
import { CreateAppointmentPayload } from "..";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import { getActivePackagesForService, ClientPackage } from "../../../../services/packageService";
import { IconPackage, IconX, IconNotes, IconListDetails } from "@tabler/icons-react";
import { BiCopy, BiCheckCircle, BiPlus, BiTrash, BiX } from "react-icons/bi";
import { FaWhatsapp } from "react-icons/fa";
import { BUILT_IN_FIELD_KEYS } from "../../../../services/organizationService";
import DynamicFormFields from "../../../../components/DynamicFormFields";

// 🔁 Imports para citas recurrentes
import RecurrenceSelector from "../../../../components/customCalendar/components/RecurrenceSelector";
import SeriesPreview from "../../../../components/customCalendar/components/SeriesPreview";
import {
  RecurrencePattern,
  SeriesPreview as SeriesPreviewType,
  createAppointmentSeries,
} from "../../../../services/appointmentService";
import { notifications } from "@mantine/notifications";

// ----- Tipos para el modo multi-profesional -----

export interface EmployeeBlockData {
  employee: Employee;
  services: Service[];
  startDate: Date;
  endDate: Date;
  customDurations: Record<string, number>;
  employeeRequestedByClient?: boolean;
}

interface ExtraBlock {
  id: string;
  employee: Employee | null;
  services: Service[];
  startDate: Date;
  endDate: Date;
  customDurations: Record<string, number>;
}

const ExtraEmployeeBlockEditor: React.FC<{
  block: ExtraBlock;
  blockIndex: number;
  employees: Employee[];
  timeFormat: string;
  onChange: (updated: ExtraBlock) => void;
  onRemove: () => void;
}> = ({ block, blockIndex, employees, timeFormat, onChange, onRemove }) => {
  const availableServices = block.employee
    ? (block.employee.services as unknown as Service[])
    : [];

  const recalcEnd = (svcs: Service[], durations: Record<string, number>, start: Date) => {
    const total = svcs.reduce((acc, s) => acc + (durations[s._id] ?? s.duration ?? 0), 0);
    return addMinutes(start, Math.max(total, 0));
  };

  const handleEmployeeChange = (employeeId: string | null) => {
    const emp = employees.find((e) => e._id === employeeId) ?? null;
    onChange({ ...block, employee: emp, services: [], customDurations: {}, endDate: block.startDate });
  };

  const handleServiceToggle = (service: Service) => {
    const isSelected = block.services.some((s) => s._id === service._id);
    const newServices = isSelected
      ? block.services.filter((s) => s._id !== service._id)
      : [...block.services, service];
    const newDurations: Record<string, number> = {};
    newServices.forEach((s) => { newDurations[s._id] = block.customDurations[s._id] ?? s.duration ?? 0; });
    onChange({ ...block, services: newServices, customDurations: newDurations, endDate: recalcEnd(newServices, newDurations, block.startDate) });
  };

  const handleStartChange = (date: Date) => {
    onChange({ ...block, startDate: date, endDate: recalcEnd(block.services, block.customDurations, date) });
  };

  return (
    <Box mb="sm" p="md" style={{ border: "1px solid #d0ebff", borderRadius: 8, backgroundColor: "#f0f8ff" }}>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={700} c="blue.7">👤 Profesional {blockIndex}</Text>
        <ActionIcon size="xs" variant="light" color="red" onClick={onRemove} radius="xl">
          <IconX size={12} />
        </ActionIcon>
      </Group>

      <Select
        label="Profesional"
        size="sm"
        placeholder="Selecciona un profesional"
        data={employees.map((e) => ({ value: e._id, label: e.names }))}
        value={block.employee?._id || ""}
        onChange={handleEmployeeChange}
        searchable
        mb="sm"
        styles={{ input: { borderRadius: 8 } }}
      />

      {block.employee && availableServices.length > 0 && (
        <Box mb="sm">
          <Text size="xs" fw={600} mb={6} c="dimmed" tt="uppercase">Servicios</Text>
          <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
            {availableServices.map((service) => {
              const isSelected = block.services.some((s) => s._id === service._id);
              return (
                <Card
                  key={service._id}
                  padding="xs"
                  withBorder
                  radius="md"
                  style={{
                    backgroundColor: isSelected ? "#e7f5ff" : "white",
                    borderColor: isSelected ? "#228be6" : "#e9ecef",
                    cursor: "pointer",
                  }}
                  onClick={() => handleServiceToggle(service)}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Checkbox
                      size="xs"
                      checked={isSelected}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Box>
                      <Text size="xs" fw={600} style={{ lineHeight: 1.2 }}>{service.name}</Text>
                      <Text size="xs" c="dimmed">⏱️ {service.duration} min</Text>
                    </Box>
                  </Group>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Box p="xs" style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #e9ecef" }}>
            <Text size="xs" fw={600} mb={4} c="dimmed">Inicio</Text>
            <DateSelector label="Fecha" value={block.startDate} onChange={handleStartChange} />
            <TimeSelector label="Hora" date={block.startDate} timeFormat={timeFormat} onChange={handleStartChange} />
          </Box>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Box p="xs" style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #e9ecef" }}>
            <Text size="xs" fw={600} mb={4} c="dimmed">Fin (auto-calculado)</Text>
            <DateSelector label="Fecha" value={block.endDate} onChange={(d) => onChange({ ...block, endDate: d })} />
            <TimeSelector label="Hora" date={block.endDate} timeFormat={timeFormat} onChange={(d) => onChange({ ...block, endDate: d })} />
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  newAppointment: Partial<CreateAppointmentPayload>;
  setNewAppointment: React.Dispatch<
    React.SetStateAction<Partial<CreateAppointmentPayload>>
  >;
  services: Service[];
  employees: Employee[];
  // onServiceChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  onClientChange: (client: Client | null) => void;
  onSave: () => void;
  fetchClients?: () => void;
  creatingAppointment: boolean;
  fetchAppointmentsForMonth?: (date: Date) => Promise<void>;
  onSaveMulti?: (blocks: EmployeeBlockData[]) => void;
  /** Lista completa de citas (para historial + tabla de facturación del cliente en la pestaña Cobro). */
  appoinments?: Appointment[];
  setAppointments?: React.Dispatch<React.SetStateAction<Appointment[]>>;
  /** Pestaña con la que abrir el modal en modo edición ("detalle" por defecto). */
  initialTab?: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  opened,
  onClose,
  appointment,
  newAppointment,
  setNewAppointment,
  services,
  employees,
  // onServiceChange,
  onEmployeeChange,
  onClientChange,
  onSave,
  fetchClients,
  creatingAppointment,
  fetchAppointmentsForMonth,
  onSaveMulti,
  appoinments = [],
  setAppointments,
  initialTab,
}) => {
  const [createClientModalOpened, setCreateClientModalOpened] =
    useState<boolean>(false);
  const auth = useSelector((state: RootState) => state.auth);

  // 🚀 Estado para búsqueda asíncrona de clientes
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(clientSearchQuery, 300);
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // 🔁 Estados para citas recurrentes
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    {
      type: "none",
      intervalWeeks: 1,
      weekdays: [],
      endType: "count",
      count: 4,
    },
  );
  const [seriesPreview, setSeriesPreview] = useState<SeriesPreviewType | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [notifyAllAppointments, setNotifyAllAppointments] = useState(false); // 📨 Por defecto solo primera cita

  // Multi-profesional
  const [extraBlocks, setExtraBlocks] = useState<ExtraBlock[]>([]);
  const isMultiMode = extraBlocks.length > 0;

  // Estado para paquetes de sesiones del cliente
  const [availablePackages, setAvailablePackages] = useState<Record<string, ClientPackage[]>>({});
  const [usePackage, setUsePackage] = useState<Record<string, string>>({}); // serviceId -> clientPackageId

  // 📝 Notas de la sesión (registro genérico de lo hecho en la cita).
  // lastSavedNotes se trackea localmente (no desde la prop `appointment`,
  // que no se actualiza sola tras guardar) para que el botón "Guardar" se
  // deshabilite correctamente justo después de un guardado exitoso.
  const [sessionNotesDraft, setSessionNotesDraft] = useState("");
  const [lastSavedNotes, setLastSavedNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setSessionNotesDraft(appointment?.sessionNotes || "");
    setLastSavedNotes(appointment?.sessionNotes || "");
  }, [appointment?._id, appointment?.sessionNotes]);

  // 🗂️ Pestañas del modal (solo aplica en modo edición/consulta, cuando ya existe `appointment`)
  const [activeTab, setActiveTab] = useState<string>(initialTab || "detalle");

  // 💰 Cobro: precio personalizado + adicionales + pagos (migrado desde el
  // antiguo modal propio de AppointmentCard.tsx, ahora unificado aquí)
  const [customPrice, setCustomPrice] = useState<number | null>(
    appointment?.customPrice ?? null,
  );
  const [additionalItems, setAdditionalItems] = useState(
    appointment?.additionalItems || [],
  );
  const [newItem, setNewItem] = useState({ name: "", price: 0 });
  const [savingCobro, setSavingCobro] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>(
    appointment?.payments || [],
  );
  const [paymentStatus, setPaymentStatus] = useState(
    appointment?.paymentStatus || "unpaid",
  );
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: "cash",
    note: "",
    otherLabel: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const customFieldsChanged =
    JSON.stringify(newAppointment.customFieldValues ?? {}) !==
    JSON.stringify(appointment?.customFieldValues ?? {});

  const handleSaveNotesAndFields = async () => {
    if (!appointment) return;
    setSavingNotes(true);
    try {
      const notesChanged = sessionNotesDraft !== lastSavedNotes;
      if (notesChanged) {
        await updateAppointmentNotes(appointment._id, sessionNotesDraft);
      }
      if (customFieldsChanged) {
        await updateAppointment(appointment._id, {
          customFieldValues: newAppointment.customFieldValues ?? {},
        });
      }
      setLastSavedNotes(sessionNotesDraft);
      // Refresca la lista de citas del mes para que, si se vuelve a abrir
      // esta misma cita más tarde, ya venga con la nota/campos actualizados.
      await fetchAppointmentsForMonth?.(appointment.startDate);
      setAppointments?.((prev) =>
        prev.map((a) =>
          a._id === appointment._id
            ? {
                ...a,
                sessionNotes: sessionNotesDraft,
                customFieldValues: newAppointment.customFieldValues,
              }
            : a,
        ),
      );
      notifications.show({
        title: "Guardado",
        message: "Las notas y los campos personalizados se actualizaron correctamente",
        color: "green",
        autoClose: 2500,
      });
    } catch (error: unknown) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "No se pudo guardar",
        color: "red",
        autoClose: 4000,
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddItem = () => {
    if (newItem.name && newItem.price > 0) {
      setAdditionalItems([...additionalItems, newItem]);
      setNewItem({ name: "", price: 0 });
    }
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...additionalItems];
    updatedItems.splice(index, 1);
    setAdditionalItems(updatedItems);
  };

  const handleSaveCobro = async () => {
    if (!appointment) return;
    setSavingCobro(true);
    try {
      const updated = await updateAppointment(appointment._id, {
        customPrice,
        additionalItems,
      });
      if (updated) {
        notifications.show({
          title: "Éxito",
          message: "Cita actualizada correctamente",
          color: "green",
          autoClose: 3000,
        });
        setAppointments?.((prev) =>
          prev.map((a) =>
            a._id === appointment._id ? { ...a, customPrice, additionalItems } : a,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "No se pudo actualizar la cita",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setSavingCobro(false);
    }
  };

  const handleFullPayment = async () => {
    if (!appointment || pending <= 0) return;
    setSavingPayment(true);
    try {
      const updated = await addAppointmentPayment(appointment._id, {
        amount: pending,
        method: newPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: newPayment.method === "other" && newPayment.otherLabel ? newPayment.otherLabel : "",
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments?.((prev) =>
          prev.map((a) =>
            a._id === appointment._id
              ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
              : a,
          ),
        );
        notifications.show({
          title: "Pago completo registrado",
          message: "Se registró el saldo pendiente como pagado",
          color: "green",
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error(err);
      notifications.show({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000 });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddPayment = async () => {
    if (!appointment || !newPayment.amount || newPayment.amount <= 0) return;
    setSavingPayment(true);
    try {
      const noteValue = newPayment.method === "other" && newPayment.otherLabel
        ? newPayment.otherLabel + (newPayment.note ? ` - ${newPayment.note}` : "")
        : newPayment.note;
      const updated = await addAppointmentPayment(appointment._id, {
        amount: newPayment.amount,
        method: newPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: noteValue,
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments?.((prev) =>
          prev.map((a) =>
            a._id === appointment._id
              ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
              : a,
          ),
        );
        setNewPayment({ amount: 0, method: "cash", note: "", otherLabel: "" });
        notifications.show({ title: "Pago registrado", message: "El pago fue registrado correctamente", color: "green", autoClose: 3000 });
      }
    } catch (err) {
      console.error(err);
      notifications.show({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000 });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (!appointment) return;
    try {
      const updated = await removeAppointmentPayment(appointment._id, paymentId);
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments?.((prev) =>
          prev.map((a) =>
            a._id === appointment._id
              ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
              : a,
          ),
        );
      }
    } catch (err) {
      console.error(err);
      notifications.show({ title: "Error", message: "No se pudo eliminar el pago", color: "red", autoClose: 3000 });
    }
  };

  const getIsBirthday = (
    birthDate: string | number | dayjs.Dayjs | Date | null | undefined,
  ): boolean => {
    if (!birthDate) return false;
    const todayD = dayjs();
    const birthDateClient = dayjs(birthDate);
    if (!birthDateClient.isValid()) return false;
    return (
      birthDateClient.month() === todayD.month() &&
      birthDateClient.date() === todayD.date()
    );
  };

  const generateAppointmentDetails = (
    appt: Appointment,
    allAppointments: Appointment[],
  ) => {
    const clientServices = allAppointments
      .filter((a) => a.client._id === appt.client._id)
      .map((a) =>
        a.service
          ? `⭐ *Servicio:* ${a.service.name}\n👤 *Profesional:* ${a.employee.names}`
          : `⭐ *Servicio:* [Eliminado]\n👤 *Profesional:* ${a.employee.names}`,
      )
      .join("\n\n");

    return `*DETALLES DE LA CITA*
👩‍🦰 *Cliente:* ${appt.client.name}
📅 *Horario:* ${formatFullDateInTimezone(
      appt.startDate,
      timezone,
      `dddd, D MMMM YYYY, ${timeFormat === "24h" ? "HH:mm" : "h:mm A"}`,
    )} - ${formatInTimezone(appt.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
💵 *Abono:* ${appt.advancePayment}

${clientServices}`;
  };

  // 📨 Confirmación de WhatsApp del agendamiento (mismo criterio que la tarjeta de la agenda)
  const waConfirmationConfig: Record<string, { color: string; shortLabel: string; fullLabel: string }> = {
    sent: { color: "#25D366", shortLabel: "Enviada", fullLabel: "Confirmación de WhatsApp enviada" },
    failed: { color: "#e03131", shortLabel: "Falló el envío", fullLabel: "Confirmación de WhatsApp: falló el envío" },
    blocked: { color: "#f08c00", shortLabel: "Bloqueada", fullLabel: "Confirmación de WhatsApp bloqueada (plan o plantilla deshabilitada)" },
    skipped: { color: "#868e96", shortLabel: "Omitida", fullLabel: "Confirmación de WhatsApp omitida (sin teléfono utilizable)" },
  };
  const waDeliveryConfig: Record<string, { color: string; shortLabel: string; fullLabel: string }> = {
    sent: { color: "#25D366", shortLabel: "Enviada (✓)", fullLabel: "Confirmación de WhatsApp enviada — WhatsApp la aceptó, esperando confirmación de entrega" },
    delivered: { color: "#25D366", shortLabel: "Entregada (✓✓)", fullLabel: "Confirmación de WhatsApp entregada" },
    failed: { color: "#e03131", shortLabel: "No entregada", fullLabel: "Confirmación de WhatsApp: WhatsApp no pudo entregarla (revisar el número del cliente)" },
  };
  const waConfirmationDelivery =
    appointment?.waConfirmationStatus === "sent" && appointment?.waConfirmationDeliveryStatus
      ? waDeliveryConfig[appointment.waConfirmationDeliveryStatus]
      : null;
  const waConfirmation =
    waConfirmationDelivery ??
    (appointment?.waConfirmationStatus ? waConfirmationConfig[appointment.waConfirmationStatus] : null);
  const waConfirmationColor = waConfirmation?.color || "#868e96";

  const appointmentStatusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: "yellow", label: "Pendiente" },
    confirmed: { color: "blue", label: "Confirmada" },
    attended: { color: "teal", label: "Asistió" },
    no_show: { color: "pink", label: "No asistió" },
    cancelled: { color: "red", label: "Cancelada" },
    cancelled_by_admin: { color: "red", label: "Cancelada por el negocio" },
    cancelled_by_customer: { color: "red", label: "Cancelada por el cliente" },
  };
  const statusInfo = appointment
    ? appointmentStatusConfig[appointment.status] ?? { color: "gray", label: appointment.status }
    : null;

  const isBirthdayDetalle = appointment ? getIsBirthday(appointment.client.birthDate) : false;
  const whatsappURL = appointment ? `https://wa.me/${appointment.client.phoneNumber}` : "";

  // 💰 Cálculos de cobro para esta cita (pestaña Cobro)
  const thisTotal = (customPrice ?? appointment?.totalPrice ?? 0) +
    additionalItems.reduce((s, i) => s + (i.price || 0), 0);
  const totalPaid = (appointment?.advancePayment || 0) +
    payments.reduce((s, p) => s + (p.amount || 0), 0);
  const pending = Math.max(0, thisTotal - totalPaid);

  const paymentStatusConfig = {
    paid:    { color: "green",  label: "Pagado" },
    partial: { color: "yellow", label: "Abono" },
    unpaid:  { color: "red",    label: "Sin pagar" },
    free:    { color: "blue",   label: appointment?.clientPackageId ? "Incluido en paquete" : "Gratis" },
  };
  const psConfig = paymentStatusConfig[paymentStatus as keyof typeof paymentStatusConfig] ?? paymentStatusConfig.unpaid;

  const methodLabels: Record<string, string> = {
    cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro",
  };

  const today = dayjs();
  const organization = useSelector(
    (state: RootState) => state.organization.organization,
  );
  const organizationId = organization?._id;
  const timezone = organization?.timezone || "America/Bogota"; // 🌍 Timezone de la organización
  const timeFormat = organization?.timeFormat || "12h";

  // 🚀 Búsqueda asíncrona de clientes con debounce
  useEffect(() => {
    if (!organizationId) return;

    const searchClientsAsync = async () => {
      setLoadingClients(true);
      try {
        const results = await searchClients(
          organizationId,
          debouncedSearch,
          20,
        );

        // Si hay un cliente seleccionado, asegurarse de que esté en la lista
        if (
          newAppointment.client &&
          typeof newAppointment.client._id !== "undefined" &&
          !results.find((c) => c._id === newAppointment.client!._id)
        ) {
          setSearchedClients([newAppointment.client, ...results]);
        } else {
          setSearchedClients(results);
        }
      } catch (error) {
        console.error("Error buscando clientes:", error);
        // Si hay error pero existe cliente seleccionado, mantenerlo
        if (newAppointment.client) {
          setSearchedClients([newAppointment.client]);
        } else {
          setSearchedClients([]);
        }
      } finally {
        setLoadingClients(false);
      }
    };

    searchClientsAsync();
  }, [debouncedSearch, organizationId, newAppointment.client]);

  useEffect(() => {
    if (appointment) {
      // Parse dates in organization timezone and create local Date with same hour values
      // This prevents TimeSelector from showing wrong time due to browser timezone conversion
      const startParsed = dayjs.tz(appointment.startDate, timezone);
      const endParsed = dayjs.tz(appointment.endDate, timezone);

      const startDate = new Date(
        startParsed.year(),
        startParsed.month(),
        startParsed.date(),
        startParsed.hour(),
        startParsed.minute(),
      );

      const endDate = new Date(
        endParsed.year(),
        endParsed.month(),
        endParsed.date(),
        endParsed.hour(),
        endParsed.minute(),
      );

      setNewAppointment({
        ...appointment,
        startDate,
        endDate,
        employee: appointment?.employee || newAppointment.employee,
        services: appointment.service ? [appointment.service] : [],
        client: appointment.client,
      });

      // Si hay cliente en appointment, agregarlo a la lista de búsqueda
      if (
        appointment.client &&
        !searchedClients.find((c) => c._id === appointment.client._id)
      ) {
        setSearchedClients((prev) => [appointment.client, ...prev]);
      }
    }
  }, [appointment, setNewAppointment]);

  useEffect(() => {
    // MODO CREACIÓN: recalcular endDate basado en duración de servicios
    if (!appointment && newAppointment.startDate && newAppointment.services) {
      const totalDuration = newAppointment.services.reduce((acc, s) => {
        const customDuration = newAppointment.customDurations?.[s._id];
        return acc + (customDuration ?? s.duration ?? 0);
      }, 0);
      const end = addMinutes(newAppointment.startDate, totalDuration);
      setNewAppointment((prev) => ({ ...prev, endDate: end }));
    }
    // MODO EDICIÓN: el recálculo de endDate se hace directamente en los onChange de startDate
  }, [
    appointment,
    newAppointment.startDate,
    newAppointment.services,
    newAppointment.customDurations,
    setNewAppointment,
  ]);

  // Inicializar customDurations cuando cambian los servicios seleccionados
  useEffect(() => {
    if (
      !appointment &&
      newAppointment.services &&
      newAppointment.services.length > 0
    ) {
      // Solo inicializar si no existen duraciones personalizadas para los servicios actuales
      const currentDurations = newAppointment.customDurations || {};
      const needsInit = newAppointment.services.some(
        (s) => !(s._id in currentDurations),
      );

      if (needsInit) {
        const initialDurations: Record<string, number> = {};
        newAppointment.services.forEach((s) => {
          // Mantener duración existente o usar la del servicio
          initialDurations[s._id] = currentDurations[s._id] ?? s.duration ?? 0;
        });
        setNewAppointment((prev) => ({
          ...prev,
          customDurations: initialDurations,
        }));
      }
    }
  }, [appointment, newAppointment.services]);

  const renderMultiSelectOption: MultiSelectProps["renderOption"] = ({
    option,
  }) => {
    const employee = employees.find((e) => e._id === option.value);

    if (!employee) {
      return null; // Si no se encuentra el profesional, no renderizar nada
    }

    return (
      <Group gap="sm">
        <Avatar src={employee.profileImage} size={36} radius="xl" />
        <div>
          <Text size="sm">{employee.names}</Text>
          <Text size="xs" opacity={0.5}>
            {employee.position}
          </Text>
        </div>
      </Group>
    );
  };

  // 🔁 Función para generar preview de citas recurrentes
  const handleGeneratePreview = async () => {
    if (
      !newAppointment.employee ||
      !newAppointment.client ||
      !newAppointment.startDate ||
      !newAppointment.services ||
      newAppointment.services.length === 0
    ) {
      notifications.show({
        title: "⚠️ Campos requeridos",
        message: "Por favor completa profesional, cliente, servicios y fecha",
        color: "yellow",
      });
      return;
    }

    if (!organizationId) {
      notifications.show({
        title: "⚠️ Error",
        message: "No se encontró la organización",
        color: "red",
      });
      return;
    }

    setLoadingPreview(true);
    try {
      // Extraer IDs de objetos
      const employeeId =
        typeof newAppointment.employee === "string"
          ? newAppointment.employee
          : newAppointment.employee?._id;
      const clientId =
        typeof newAppointment.client === "string"
          ? newAppointment.client
          : newAppointment.client?._id;
      const serviceIds =
        newAppointment.services
          ?.filter((s) => s && (s._id || typeof s === "string"))
          .map((s) => (typeof s === "string" ? s : s._id)) || [];

      if (!employeeId || !clientId || serviceIds.length === 0) {
        const missing = [];
        if (!employeeId) missing.push("profesional");
        if (!clientId) missing.push("cliente");
        if (serviceIds.length === 0) missing.push("servicios");

        notifications.show({
          title: "⚠️ Campos faltantes",
          message: `Por favor selecciona: ${missing.join(", ")}`,
          color: "yellow",
        });
        return;
      }

      const result = await createAppointmentSeries(
        {
          employee: employeeId,
          client: clientId,
          services: serviceIds,
          startDate: newAppointment.startDate,
          organizationId,
          advancePayment: newAppointment.advancePayment,
        },
        recurrencePattern,
        { previewOnly: true },
      );

      // El backend devuelve el preview directamente: { totalOccurrences, availableCount, occurrences }
      if (
        result &&
        "totalOccurrences" in result &&
        "availableCount" in result &&
        "occurrences" in result
      ) {
        setSeriesPreview(result as SeriesPreviewType);
        notifications.show({
          title: "✅ Preview generado",
          message: `Se generaron ${result.totalOccurrences} citas (${result.availableCount} disponibles)`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "⚠️ Sin preview",
          message: "No se pudo generar el preview",
          color: "yellow",
        });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "❌ Error al generar preview",
        message: error instanceof Error ? error.message : "Ocurrió un error",
        color: "red",
      });
      setSeriesPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Buscar paquetes activos del cliente para los servicios seleccionados
  useEffect(() => {
    if (!newAppointment.client?._id || !newAppointment.services?.length || !organizationId) {
      setAvailablePackages({});
      setUsePackage({});
      return;
    }

    const fetchPackages = async () => {
      const pkgsByService: Record<string, ClientPackage[]> = {};
      const defaultUsePackage: Record<string, string> = {};

      for (const svc of newAppointment.services!) {
        try {
          const pkgs = await getActivePackagesForService(
            newAppointment.client!._id,
            svc._id,
            organizationId
          );
          if (pkgs.length > 0) {
            pkgsByService[svc._id] = pkgs;
            // Auto-seleccionar el primer paquete disponible
            defaultUsePackage[svc._id] = pkgs[0]._id;
          }
        } catch {
          // Silently ignore
        }
      }

      setAvailablePackages(pkgsByService);
      setUsePackage(defaultUsePackage);

      // Actualizar el payload con los paquetes seleccionados
      if (Object.keys(defaultUsePackage).length > 0) {
        const firstPkgId = Object.values(defaultUsePackage)[0];
        setNewAppointment((prev) => ({
          ...prev,
          clientPackageId: firstPkgId,
          usePackageForServices: defaultUsePackage,
        }));
      }
    };

    fetchPackages();
  }, [newAppointment.client?._id, newAppointment.services?.map(s => s._id).join(","), organizationId]);

  // 🔁 Resetear preview cuando cambian los parámetros de recurrencia
  useEffect(() => {
    setSeriesPreview(null);
  }, [
    recurrencePattern,
    newAppointment.employee,
    newAppointment.client,
    newAppointment.startDate,
    newAppointment.services,
  ]);

  const schedulingForm = (
    <>
          {/* Sección: Cliente y Profesional */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              {isMultiMode ? "👥 Cliente y Profesional 1" : "👤 Cliente y Profesional"}
            </Text>

            <Select
              label={
                <Group justify="space-between" wrap="nowrap" gap="xs" mb={2}>
                  <Text size="sm" fw={500}>Cliente</Text>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    onClick={() => setCreateClientModalOpened(true)}
                  >
                    + Nuevo cliente
                  </Button>
                </Group>
              }
              size="md"
              placeholder="Escribe para buscar cliente..."
              searchable
              mb="md"
              // 🔎 La lista ya viene filtrada por el servidor (searchClients con
              // debounce); desactivamos el filtro local de Mantine porque, si no,
              // filtraría también la opción estática "+ Crear nuevo cliente" en
              // cuanto el usuario escribiera algo (su label nunca matchea el texto
              // buscado), haciéndola desaparecer justo cuando más se necesita.
              filter={({ options }) => options}
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
              data={[
                ...searchedClients.map((client) => {
                  let isBirthday = false;
                  if (client.birthDate) {
                    const birthDate = dayjs(client.birthDate);
                    if (birthDate.isValid()) {
                      isBirthday =
                        birthDate.month() === today.month() &&
                        birthDate.date() === today.date();
                    }
                  }

                  return {
                    value: client._id,
                    label: isBirthday
                      ? `🎉 ${client.name} 🎉`
                      : auth.role === "admin"
                        ? client.name + " - " + client.phoneNumber
                        : client.name,
                    isBirthday,
                  };
                }),
                { value: "create-client", label: "+ Crear nuevo cliente" },
              ]}
              value={newAppointment.client?._id || ""}
              searchValue={clientSearchQuery}
              onSearchChange={setClientSearchQuery}
              onChange={(value) => {
                if (value === "create-client") {
                  setCreateClientModalOpened(true);
                } else {
                  const found = searchedClients.find((c) => c._id === value) ?? null;
                  onClientChange(found);
                  setClientSearchQuery(""); // Limpiar búsqueda después de seleccionar
                }
              }}
              onBlur={() => {
                // No limpiar el searchQuery en blur, solo cuando se selecciona
                // Esto evita que se borre mientras el usuario escribe
              }}
              rightSection={loadingClients ? <Loader size="xs" /> : null}
              nothingFoundMessage={
                loadingClients ? (
                  <Box p="sm" style={{ textAlign: "center" }}>
                    <Loader size="sm" />
                  </Box>
                ) : (
                  <Box p="sm">
                    <Text size="sm" c="dimmed">
                      {clientSearchQuery
                        ? `No se encontraron clientes con "${clientSearchQuery}"`
                        : "Escribe para buscar clientes"}
                    </Text>
                    <Button
                      mt="sm"
                      fullWidth
                      size="xs"
                      onClick={() => setCreateClientModalOpened(true)}
                    >
                      Crear cliente
                    </Button>
                  </Box>
                )
              }
            />

            <Select
              label="Profesional"
              size="md"
              placeholder="Selecciona un profesional"
              renderOption={renderMultiSelectOption}
              data={employees.map((employee) => ({
                value: employee._id,
                label: employee.names,
              }))}
              value={newAppointment.employee?._id || ""}
              onChange={(value) => onEmployeeChange(value)}
              searchable
              required
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
            />

            <Checkbox
              size="sm"
              mt="sm"
              label="Profesional solicitado por el cliente"
              checked={!!newAppointment.employeeRequestedByClient}
              onChange={(event) =>
                setNewAppointment({
                  ...newAppointment,
                  employeeRequestedByClient: event.currentTarget.checked,
                })
              }
            />
          </Box>

          {/* Sección: Servicios */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              ✨ Servicios
            </Text>

            <Checkbox.Group
              size="lg"
              required
              value={
                // Array de IDs seleccionados
                newAppointment.services
                  ? newAppointment.services.map((s) => s._id)
                  : []
              }
              onChange={(selectedIds) => {
                const currentServices = newAppointment.services ?? [];
                const currentIds = currentServices.map((s) => s._id);
                const added = selectedIds.filter((id) => !currentIds.includes(id));
                const newServices = [
                  ...currentServices.filter((s) => selectedIds.includes(s._id)),
                  ...added
                    .map((id) => services.find((s) => s._id === id))
                    .filter((s): s is Service => s !== undefined),
                ];
                setNewAppointment((prev) => ({
                  ...prev,
                  services: newServices,
                }));
              }}
            >
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {services.map((service) => {
                  const isSelected = newAppointment.services
                    ? newAppointment.services.some((s) => s._id === service._id)
                    : false;

                  return (
                    <Card
                      key={service._id}
                      shadow={isSelected ? "md" : "xs"}
                      padding="xs"
                      withBorder
                      radius="md"
                      style={{
                        backgroundColor: isSelected ? "#e7f5ff" : "white",
                        borderColor: isSelected ? "#228be6" : "#e9ecef",
                        borderWidth: isSelected ? 2 : 1,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => {
                        const currentIds = newAppointment.services
                          ? newAppointment.services.map((s) => s._id)
                          : [];
                        const newIds = isSelected
                          ? currentIds.filter((id) => id !== service._id)
                          : [...currentIds, service._id];
                        const selectedServices = newIds
                          .map((id) => services.find((s) => s._id === id))
                          .filter((s): s is Service => s !== undefined);
                        setNewAppointment((prev) => ({
                          ...prev,
                          services: selectedServices,
                        }));
                      }}
                    >
                      <Group gap="xs" wrap="nowrap" align="flex-start">
                        <Checkbox
                          size="xs"
                          value={service._id}
                          onClick={(e) => e.stopPropagation()}
                          styles={{
                            input: {
                              cursor: "pointer",
                            },
                          }}
                          mt={1}
                        />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                            {service.name}
                          </Text>
                          <Group gap={6} mt={2}>
                            <Text size="xs" c="dimmed">
                              ⏱️ {service.duration} min
                            </Text>
                            {service.price && (
                              <Text size="xs" c="dimmed">
                                💵{" "}
                                {formatCurrency(
                                  service.price,
                                  organization?.currency || "COP",
                                )}
                              </Text>
                            )}
                          </Group>
                        </Box>
                      </Group>
                    </Card>
                  );
                })}
              </Box>
            </Checkbox.Group>
          </Box>

          {/* Multi-modo: horario inline del Profesional 1 */}
          {isMultiMode && !appointment && (
            <Box
              mb="sm"
              p="md"
              style={{ backgroundColor: "#f0f8ff", borderRadius: 8, border: "1px solid #d0ebff" }}
            >
              <Text size="xs" fw={700} c="blue.7" mb="sm">⏰ Horario — Profesional 1</Text>
              <Grid gutter="sm">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Box p="xs" style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #e9ecef" }}>
                    <Text size="xs" fw={600} mb={4} c="dimmed">Inicio</Text>
                    <DateSelector
                      label="Fecha"
                      value={newAppointment.startDate}
                      onChange={(date) =>
                        setNewAppointment((prev) => {
                          const total = (prev.services || []).reduce((acc, s) => acc + (prev.customDurations?.[s._id] ?? s.duration ?? 0), 0);
                          return { ...prev, startDate: date, endDate: addMinutes(date, total) };
                        })
                      }
                    />
                    <TimeSelector
                      label="Hora"
                      date={newAppointment.startDate}
                      timeFormat={timeFormat}
                      onChange={(date) =>
                        setNewAppointment((prev) => {
                          const total = (prev.services || []).reduce((acc, s) => acc + (prev.customDurations?.[s._id] ?? s.duration ?? 0), 0);
                          return { ...prev, startDate: date, endDate: addMinutes(date, total) };
                        })
                      }
                    />
                  </Box>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Box p="xs" style={{ backgroundColor: "white", borderRadius: 8, border: "1px solid #e9ecef" }}>
                    <Text size="xs" fw={600} mb={4} c="dimmed">Fin (auto-calculado)</Text>
                    <DateSelector
                      label="Fecha"
                      value={newAppointment.endDate}
                      onChange={(date) => setNewAppointment((prev) => ({ ...prev, endDate: date }))}
                    />
                    <TimeSelector
                      label="Hora"
                      date={newAppointment.endDate}
                      timeFormat={timeFormat}
                      onChange={(date) => setNewAppointment((prev) => ({ ...prev, endDate: date }))}
                    />
                  </Box>
                </Grid.Col>
              </Grid>
            </Box>
          )}

          {/* Multi-modo: bloques extra de profesionales */}
          {isMultiMode && !appointment && extraBlocks.map((block, idx) => (
            <ExtraEmployeeBlockEditor
              key={block.id}
              block={block}
              blockIndex={idx + 2}
              employees={employees}
              timeFormat={timeFormat}
              onChange={(updated) =>
                setExtraBlocks((prev) => prev.map((b) => (b.id === block.id ? updated : b)))
              }
              onRemove={() => setExtraBlocks((prev) => prev.filter((b) => b.id !== block.id))}
            />
          ))}

          {/* Botón para agregar otro profesional */}
          {!appointment && (
            <Button
              variant="light"
              color="blue"
              size="xs"
              mb="xl"
              fullWidth
              onClick={() => {
                const defaultStart = newAppointment.startDate || new Date();
                setExtraBlocks((prev) => [
                  ...prev,
                  {
                    id: `block-${Date.now()}-${Math.random()}`,
                    employee: null,
                    services: [],
                    startDate: defaultStart,
                    endDate: defaultStart,
                    customDurations: {},
                  },
                ]);
              }}
            >
              + Agregar otro profesional
            </Button>
          )}

          {/* Sección: Paquetes de sesiones disponibles */}
          {Object.keys(availablePackages).length > 0 && !appointment && (
            <Box
              mb="xl"
              p="md"
              style={{
                backgroundColor: "#e6fcf5",
                borderRadius: 8,
                border: "1px solid #63e6be",
              }}
            >
              <Group gap="xs" mb="md">
                <IconPackage size={18} color="#099268" />
                <Text size="sm" fw={600} c="teal.8" tt="uppercase">
                  Paquetes de sesiones disponibles
                </Text>
              </Group>

              {newAppointment.services
                ?.filter((svc) => availablePackages[svc._id])
                .map((svc) => {
                  const pkgs = availablePackages[svc._id];
                  const selectedPkgId = usePackage[svc._id];
                  const selectedPkg = pkgs.find((p) => p._id === selectedPkgId);
                  const svcInPkg = selectedPkg?.services.find(
                    (s) =>
                      (typeof s.serviceId === "object"
                        ? s.serviceId._id
                        : s.serviceId) === svc._id
                  );

                  return (
                    <Box
                      key={svc._id}
                      p="sm"
                      mb="xs"
                      style={{
                        backgroundColor: "white",
                        borderRadius: 6,
                        border: selectedPkgId
                          ? "2px solid #12b886"
                          : "1px solid #c3fae8",
                      }}
                    >
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={600}>
                          {svc.name}
                        </Text>
                        {svcInPkg && (
                          <Badge variant="light" color="teal" size="sm">
                            {svcInPkg.sessionsRemaining} sesiones restantes
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Checkbox
                          label={
                            <Text size="xs">
                              Usar paquete:{" "}
                              <Text span fw={600}>
                                {typeof selectedPkg?.servicePackageId === "object"
                                  ? selectedPkg.servicePackageId.name
                                  : "Paquete"}
                              </Text>
                            </Text>
                          }
                          checked={!!selectedPkgId}
                          onChange={(event) => {
                            if (event.currentTarget.checked && pkgs.length > 0) {
                              const newUsePackage = {
                                ...usePackage,
                                [svc._id]: pkgs[0]._id,
                              };
                              setUsePackage(newUsePackage);
                              setNewAppointment((prev) => ({
                                ...prev,
                                clientPackageId: Object.values(newUsePackage)[0],
                                usePackageForServices: newUsePackage,
                              }));
                            } else {
                              const newUsePackage = { ...usePackage };
                              delete newUsePackage[svc._id];
                              setUsePackage(newUsePackage);
                              setNewAppointment((prev) => ({
                                ...prev,
                                clientPackageId:
                                  Object.values(newUsePackage)[0] || undefined,
                                usePackageForServices:
                                  Object.keys(newUsePackage).length > 0
                                    ? newUsePackage
                                    : undefined,
                              }));
                            }
                          }}
                          color="teal"
                          size="sm"
                        />
                      </Group>
                    </Box>
                  );
                })}

              <Text size="xs" c="teal.6" mt="xs">
                Las sesiones se descontarán del paquete al crear la cita.
                Precio: $0 para servicios cubiertos por el paquete.
              </Text>
            </Box>
          )}

          {/* Sección: Fecha y Hora */}
          <Box
            mb="xl"
            p="md"
            style={{
              display: isMultiMode ? "none" : undefined,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              🕒 Fecha y Hora
            </Text>

            {/* Selector de fecha de inicio (siempre visible) */}
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Box
                  p="xs"
                  style={{
                    backgroundColor: "white",
                    borderRadius: 8,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Text size="xs" fw={600} mb="xs" c="dimmed">
                    Inicio de la primera cita
                  </Text>
                  <DateSelector
                    label="Fecha"
                    value={newAppointment.startDate}
                    onChange={(date) =>
                      setNewAppointment((prev) => {
                        const updated: typeof prev = { ...prev, startDate: date };
                        if (appointment?.startDate && appointment?.endDate) {
                          const durationMs = new Date(appointment.endDate).getTime() - new Date(appointment.startDate).getTime();
                          updated.endDate = new Date(date.getTime() + Math.max(durationMs, 0));
                        }
                        return updated;
                      })
                    }
                  />
                  <TimeSelector
                    label="Hora"
                    date={newAppointment.startDate}
                    timeFormat={timeFormat}
                    onChange={(date) =>
                      setNewAppointment((prev) => {
                        const updated: typeof prev = { ...prev, startDate: date };
                        if (appointment?.startDate && appointment?.endDate) {
                          const durationMs = new Date(appointment.endDate).getTime() - new Date(appointment.startDate).getTime();
                          updated.endDate = new Date(date.getTime() + Math.max(durationMs, 0));
                        }
                        return updated;
                      })
                    }
                  />
                </Box>
              </Grid.Col>

              {/* Mostrar selector de fin solo si hay 1 servicio o en modo edición */}
              {(newAppointment.services?.length === 1 || appointment) && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Box
                    p="xs"
                    style={{
                      backgroundColor: "white",
                      borderRadius: 8,
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" c="dimmed">
                      Fin
                    </Text>
                    <DateSelector
                      label="Fecha"
                      value={newAppointment.endDate}
                      onChange={(date) =>
                        setNewAppointment((prev) => ({ ...prev, endDate: date }))
                      }
                    />
                    <TimeSelector
                      label="Hora"
                      date={newAppointment.endDate}
                      timeFormat={timeFormat}
                      onChange={(date) =>
                        setNewAppointment((prev) => ({ ...prev, endDate: date }))
                      }
                    />
                  </Box>
                </Grid.Col>
              )}
            </Grid>

            {/* Controles de duración individual para múltiples servicios */}
            {!appointment &&
              newAppointment.services &&
              newAppointment.services.length > 1 && (
                <>
                  <Divider
                    label="Duración por servicio"
                    labelPosition="center"
                    mb="md"
                    color="blue"
                  />
                  <Box
                    p="sm"
                    style={{
                      backgroundColor: "#e7f5ff",
                      borderRadius: 8,
                      border: "1px solid #74c0fc",
                    }}
                  >
                    <Text size="xs" c="blue.7" mb="sm">
                      Ajusta la duración de cada servicio. El horario se
                      calculará automáticamente en secuencia.
                    </Text>

                    {newAppointment.services.map((service, index) => {
                      // Calcular hora de inicio para este servicio
                      let serviceStartTime = newAppointment.startDate;
                      if (serviceStartTime && index > 0) {
                        let accumulatedMinutes = 0;
                        for (let i = 0; i < index; i++) {
                          const prevService = newAppointment.services![i];
                          const prevDuration =
                            newAppointment.customDurations?.[prevService._id] ??
                            prevService.duration ??
                            0;
                          accumulatedMinutes += prevDuration;
                        }
                        serviceStartTime = addMinutes(
                          newAppointment.startDate!,
                          accumulatedMinutes,
                        );
                      }

                      // Calcular hora de fin para este servicio
                      const currentDuration =
                        newAppointment.customDurations?.[service._id] ??
                        service.duration ??
                        0;
                      const serviceEndTime = serviceStartTime
                        ? addMinutes(serviceStartTime, currentDuration)
                        : undefined;

                      return (
                        <Box
                          key={service._id}
                          p="sm"
                          mb={
                            index < newAppointment.services!.length - 1
                              ? "sm"
                              : 0
                          }
                          style={{
                            backgroundColor: "white",
                            borderRadius: 8,
                            border: "1px solid #d0ebff",
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap" mb="xs">
                            <Group gap="xs">
                              <Badge size="sm" variant="light" color="blue">
                                {index + 1}
                              </Badge>
                              <Text size="sm" fw={600}>
                                {service.name}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              Original: {service.duration} min
                            </Text>
                          </Group>

                          <Grid gutter="xs" align="center">
                            <Grid.Col span={4}>
                              <NumberInput
                                size="xs"
                                label="Duración (min)"
                                value={
                                  newAppointment.customDurations?.[
                                    service._id
                                  ] ??
                                  service.duration ??
                                  0
                                }
                                onChange={(value) => {
                                  const numValue =
                                    typeof value === "number" ? value : 0;
                                  setNewAppointment((prev) => ({
                                    ...prev,
                                    customDurations: {
                                      ...prev.customDurations,
                                      [service._id]: numValue,
                                    },
                                  }));
                                }}
                                min={5}
                                max={480}
                                step={5}
                                styles={{
                                  input: { borderRadius: 6 },
                                }}
                              />
                            </Grid.Col>
                            <Grid.Col span={8}>
                              <Text size="xs" c="dimmed" ta="right">
                                {serviceStartTime && serviceEndTime ? (
                                  <>
                                    {dayjs(serviceStartTime).format(timeFormat === "24h" ? "HH:mm" : "h:mm A")} →{" "}
                                    {dayjs(serviceEndTime).format(timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                                  </>
                                ) : (
                                  "Selecciona hora de inicio"
                                )}
                              </Text>
                            </Grid.Col>
                          </Grid>
                        </Box>
                      );
                    })}

                    {/* Resumen del tiempo total */}
                    <Box
                      mt="sm"
                      pt="sm"
                      style={{ borderTop: "1px dashed #74c0fc" }}
                    >
                      <Group justify="space-between">
                        <Text size="sm" fw={600} c="blue.7">
                          Tiempo total:
                        </Text>
                        <Text size="sm" fw={700} c="blue.7">
                          {newAppointment.services.reduce(
                            (acc, s) =>
                              acc +
                              (newAppointment.customDurations?.[s._id] ??
                                s.duration ??
                                0),
                            0,
                          )}{" "}
                          min
                          {newAppointment.startDate &&
                            newAppointment.endDate && (
                              <Text span size="xs" c="dimmed" ml="xs">
                                (
                                {dayjs(newAppointment.startDate).format(
                                  timeFormat === "24h" ? "HH:mm" : "h:mm A",
                                )}{" "}
                                →{" "}
                                {dayjs(newAppointment.endDate).format(timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                                )
                              </Text>
                            )}
                        </Text>
                      </Group>
                    </Box>
                  </Box>
                </>
              )}
          </Box>

          {/* 🔁 Sección: Citas Recurrentes (solo para nuevas citas, no en multi-mode) */}
          {!appointment && !isMultiMode && (
            <Box
              mb="xl"
              p="md"
              style={{
                backgroundColor: "#f0f8ff",
                borderRadius: 8,
                border: "1px solid #b0d4f1",
              }}
            >
              <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
                🔁 Citas Recurrentes
              </Text>

              <RecurrenceSelector
                value={recurrencePattern}
                onChange={setRecurrencePattern}
                startDate={newAppointment.startDate}
              />

              {recurrencePattern.type === "weekly" && (
                <>
                  <Button
                    mt="md"
                    variant="light"
                    color="blue"
                    loading={loadingPreview}
                    onClick={handleGeneratePreview}
                    leftSection={<Text>🔍</Text>}
                  >
                    Generar Vista Previa
                  </Button>

                  {/* 📨 Checkbox para controlar notificación */}
                  <Box
                    mt="md"
                    p="md"
                    style={{
                      backgroundColor: "#e7f5ff",
                      borderRadius: 8,
                      border: "1px solid #339af0",
                    }}
                  >
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                      📨 Notificación por WhatsApp
                    </Text>

                    <Checkbox
                      label={
                        <Text size="sm" fw={500}>
                          Enviar mensaje con todas las citas de la serie
                        </Text>
                      }
                      checked={notifyAllAppointments}
                      onChange={(event) =>
                        setNotifyAllAppointments(event.currentTarget.checked)
                      }
                      color="blue"
                    />

                    <Box
                      mt="xs"
                      p="xs"
                      style={{
                        backgroundColor: notifyAllAppointments
                          ? "#d0ebff"
                          : "#fff3bf",
                        borderRadius: 6,
                        borderLeft: `3px solid ${notifyAllAppointments ? "#339af0" : "#fab005"}`,
                      }}
                    >
                      <Text
                        size="xs"
                        c={notifyAllAppointments ? "blue.7" : "yellow.9"}
                        fw={600}
                      >
                        {notifyAllAppointments
                          ? "✅ Se enviará un mensaje con TODAS las citas programadas"
                          : "📅 Se enviará mensaje solo de LA PRIMERA cita"}
                      </Text>
                    </Box>
                  </Box>
                </>
              )}

              {seriesPreview && (
                <Box mt="lg">
                  <SeriesPreview preview={seriesPreview} timeFormat={timeFormat} />
                </Box>
              )}
            </Box>
          )}

          {/* Sección: Pago */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              💰 Información de Pago
            </Text>

            <NumberInput
              label="Monto del Abono"
              size="md"
              placeholder="Ingresa el monto del abono"
              prefix="$ "
              thousandSeparator
              min={0}
              value={newAppointment.advancePayment || 0}
              onChange={(value) =>
                setNewAppointment((prev) => ({
                  ...prev,
                  advancePayment: typeof value === "number" ? value : 0,
                }))
              }
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
            />

            {(newAppointment.client ||
              newAppointment.employee ||
              (newAppointment.services &&
                newAppointment.services.length > 0)) && (
              <Box
                mt="md"
                p="md"
                style={{
                  backgroundColor: "#e7f5ff",
                  borderRadius: 8,
                  border: "1px solid #74c0fc",
                }}
              >
                <Text size="sm" fw={700} mb="sm" c="blue">
                  📋 Resumen de la Cita
                </Text>

                {newAppointment.client && (
                  <Box mb="xs">
                    <Text size="xs" c="dimmed" mb={2}>
                      Cliente:
                    </Text>
                    <Text size="sm" fw={600}>
                      {newAppointment.client.name}
                    </Text>
                  </Box>
                )}

                {isMultiMode ? (
                  // ---- Resumen multi-profesional ----
                  <>
                    {/* Bloque 0 */}
                    {newAppointment.employee && (
                      <Box
                        mb="xs"
                        p="sm"
                        style={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #d0ebff" }}
                      >
                        <Group gap="xs" mb={4}>
                          <Avatar src={newAppointment.employee.profileImage} size={20} radius="xl" />
                          <Text size="sm" fw={700} c="blue.7">
                            Profesional 1: {newAppointment.employee.names}
                          </Text>
                        </Group>
                        {newAppointment.services?.map((s) => (
                          <Text key={s._id} size="xs" c="dimmed" ml="xs">
                            • {s.name} — ⏱️ {s.duration} min
                          </Text>
                        ))}
                        {newAppointment.startDate && newAppointment.endDate && (
                          <Text size="xs" c="blue.6" mt={4}>
                            {formatInTimezone(newAppointment.startDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                            {" – "}
                            {formatInTimezone(newAppointment.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                          </Text>
                        )}
                      </Box>
                    )}

                    {/* Bloques extra */}
                    {extraBlocks
                      .filter((b) => b.employee && b.services.length > 0)
                      .map((b, idx) => (
                        <Box
                          key={b.id}
                          mb="xs"
                          p="sm"
                          style={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #d0ebff" }}
                        >
                          <Group gap="xs" mb={4}>
                            <Avatar src={b.employee!.profileImage} size={20} radius="xl" />
                            <Text size="sm" fw={700} c="blue.7">
                              Profesional {idx + 2}: {b.employee!.names}
                            </Text>
                          </Group>
                          {b.services.map((s) => (
                            <Text key={s._id} size="xs" c="dimmed" ml="xs">
                              • {s.name} — ⏱️ {s.duration} min
                            </Text>
                          ))}
                          <Text size="xs" c="blue.6" mt={4}>
                            {formatInTimezone(b.startDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                            {" – "}
                            {formatInTimezone(b.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                          </Text>
                        </Box>
                      ))}

                    {/* Totales */}
                    {(() => {
                      const allSvcs = [
                        ...(newAppointment.services || []),
                        ...extraBlocks.flatMap((b) => b.services),
                      ];
                      const total = allSvcs.reduce((acc, s) => acc + (s.price || 0), 0);
                      return total > 0 ? (
                        <Box mt="sm" pt="sm" style={{ borderTop: "1px solid #a5d8ff" }}>
                          <Group justify="space-between" mb={4}>
                            <Text size="sm" c="dimmed">Total servicios:</Text>
                            <Text size="sm" fw={700}>
                              {formatCurrency(total, organization?.currency || "COP")}
                            </Text>
                          </Group>
                          {typeof newAppointment.advancePayment === "number" &&
                            newAppointment.advancePayment > 0 && (
                              <>
                                <Group justify="space-between" mb={4}>
                                  <Text size="sm" c="dimmed">Abono:</Text>
                                  <Text size="sm" fw={600} c="green">
                                    - {formatCurrency(newAppointment.advancePayment, organization?.currency || "COP")}
                                  </Text>
                                </Group>
                                <Group justify="space-between">
                                  <Text size="sm" fw={600}>Pendiente:</Text>
                                  <Text size="sm" fw={700} c="orange">
                                    {formatCurrency(total - newAppointment.advancePayment, organization?.currency || "COP")}
                                  </Text>
                                </Group>
                              </>
                            )}
                        </Box>
                      ) : null;
                    })()}
                  </>
                ) : (
                  // ---- Resumen single-profesional (original) ----
                  <>
                    {newAppointment.employee && (
                      <Box mb="xs">
                        <Text size="xs" c="dimmed" mb={2}>Profesional:</Text>
                        <Group gap="xs">
                          <Avatar src={newAppointment.employee.profileImage} size={24} radius="xl" />
                          <Text size="sm" fw={600}>{newAppointment.employee.names}</Text>
                          {newAppointment.employeeRequestedByClient && (
                            <Text size="xs" c="violet" fw={600}>(solicitado)</Text>
                          )}
                        </Group>
                      </Box>
                    )}

                    {newAppointment.services && newAppointment.services.length > 0 && (
                      <>
                        <Box mb="xs">
                          <Text size="xs" c="dimmed" mb={4}>Servicios:</Text>
                          {newAppointment.services.map((service, index) => (
                            <Box
                              key={service._id}
                              mb={4}
                              p={6}
                              style={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #d0ebff" }}
                            >
                              <Group justify="space-between" wrap="nowrap">
                                <Text size="sm" fw={500}>{index + 1}. {service.name}</Text>
                                <Text size="xs" c="dimmed">⏱️ {service.duration} min</Text>
                              </Group>
                            </Box>
                          ))}
                        </Box>

                        <Box mt="sm" pt="sm" style={{ borderTop: "1px solid #a5d8ff" }}>
                          <Group justify="space-between" mb={4}>
                            <Text size="sm" c="dimmed">Total servicios:</Text>
                            <Text size="sm" fw={700}>
                              {formatCurrency(
                                newAppointment.services.reduce((acc, s) => acc + (s.price || 0), 0),
                                organization?.currency || "COP",
                              )}
                            </Text>
                          </Group>
                          {typeof newAppointment.advancePayment === "number" &&
                            newAppointment.advancePayment > 0 && (
                              <>
                                <Group justify="space-between" mb={4}>
                                  <Text size="sm" c="dimmed">Abono:</Text>
                                  <Text size="sm" fw={600} c="green">
                                    -{" "}
                                    {formatCurrency(newAppointment.advancePayment, organization?.currency || "COP")}
                                  </Text>
                                </Group>
                                <Group justify="space-between">
                                  <Text size="sm" fw={600}>Pendiente:</Text>
                                  <Text size="sm" fw={700} c="orange">
                                    {formatCurrency(
                                      newAppointment.services.reduce((acc, s) => acc + (s.price || 0), 0) -
                                        (newAppointment.advancePayment || 0),
                                      organization?.currency || "COP",
                                    )}
                                  </Text>
                                </Group>
                              </>
                            )}
                        </Box>
                      </>
                    )}

                    {newAppointment.startDate && newAppointment.endDate && (
                      <Box mt="sm" pt="sm" style={{ borderTop: "1px solid #a5d8ff" }}>
                        <Text size="xs" c="dimmed" mb={4}>Horario:</Text>
                        <Text size="sm" fw={600}>
                          {formatFullDateInTimezone(
                            appointment ? appointment.startDate : newAppointment.startDate!,
                            timezone,
                            "DD/MM/YYYY",
                          )}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {formatInTimezone(
                            appointment ? appointment.startDate : newAppointment.startDate!,
                            timezone,
                            timeFormat === "24h" ? "HH:mm" : "h:mm A",
                          )}{" "}
                          -{" "}
                          {formatInTimezone(
                            appointment ? appointment.endDate : newAppointment.endDate!,
                            timezone,
                            timeFormat === "24h" ? "HH:mm" : "h:mm A",
                          )}
                        </Text>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
    </>
  );

  const customFieldsBox = (() => {
            const bookingCustomFields = (organization?.clientFormConfig?.fields ?? []).filter(
              (f) =>
                f.enabled &&
                f.scope === "booking" &&
                !(BUILT_IN_FIELD_KEYS as readonly string[]).includes(f.key)
            );
            if (bookingCustomFields.length === 0) return null;
            return (
              <Box
                mb="xl"
                p="md"
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: 8,
                  border: "1px solid #e9ecef",
                }}
              >
                <Text size="sm" fw={600} c="dimmed" tt="uppercase" mb="md">
                  <IconListDetails size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Campos personalizados
                </Text>
                <DynamicFormFields
                  fields={bookingCustomFields}
                  values={newAppointment.customFieldValues ?? {}}
                  onChange={(key, value) =>
                    setNewAppointment((prev) => ({
                      ...prev,
                      customFieldValues: { ...(prev.customFieldValues ?? {}), [key]: value },
                    }))
                  }
                />
              </Box>
            );
          })();

  const actionButtons = (
    <>
          {/* Botones de acción */}
          <Group
            mt="xl"
            pt="md"
            justify="space-between"
            style={{
              borderTop: "1px solid #e9ecef",
            }}
          >
            <Button
              variant="subtle"
              onClick={onClose}
              size="xs"
              radius="md"
              color="gray"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                // 👥 Multi-profesional
                if (!appointment && isMultiMode) {
                  const block0: EmployeeBlockData | null =
                    newAppointment.employee && newAppointment.services?.length && newAppointment.startDate && newAppointment.endDate
                      ? {
                          employee: newAppointment.employee,
                          services: newAppointment.services,
                          startDate: newAppointment.startDate,
                          endDate: newAppointment.endDate,
                          customDurations: newAppointment.customDurations || {},
                          employeeRequestedByClient: newAppointment.employeeRequestedByClient,
                        }
                      : null;
                  const validExtra = extraBlocks
                    .filter((b) => b.employee && b.services.length > 0)
                    .map((b) => ({
                      employee: b.employee!,
                      services: b.services,
                      startDate: b.startDate,
                      endDate: b.endDate,
                      customDurations: b.customDurations,
                    }));
                  const allBlocks = [...(block0 ? [block0] : []), ...validExtra];
                  if (allBlocks.length > 0) {
                    onSaveMulti?.(allBlocks);
                  }
                  return;
                }
                // 🔁 Si es cita recurrente, crearla como serie
                if (!appointment && recurrencePattern.type === "weekly") {
                  if (!organizationId) {
                    notifications.show({
                      title: "⚠️ Error",
                      message: "No se encontró la organización",
                      color: "red",
                    });
                    return;
                  }

                  try {
                    // Extraer IDs de objetos si es necesario
                    const employeeId =
                      typeof newAppointment.employee === "string"
                        ? newAppointment.employee
                        : newAppointment.employee?._id;
                    const clientId =
                      typeof newAppointment.client === "string"
                        ? newAppointment.client
                        : newAppointment.client?._id;
                    const serviceIds =
                      newAppointment.services
                        ?.filter((s) => s && (s._id || typeof s === "string"))
                        .map((s) => (typeof s === "string" ? s : s._id)) || [];

                    if (serviceIds.length === 0) {
                      notifications.show({
                        title: "⚠️ Error",
                        message:
                          "No se pudieron procesar los servicios seleccionados",
                        color: "yellow",
                      });
                      return;
                    }

                    setCreatingSeries(true);

                    const result = await createAppointmentSeries(
                      {
                        employee: employeeId,
                        client: clientId,
                        services: serviceIds,
                        startDate: newAppointment.startDate,
                        organizationId,
                        advancePayment: newAppointment.advancePayment,
                      },
                      recurrencePattern,
                      {
                        previewOnly: false,
                        notifyAllAppointments, // 📨 Enviar a backend la opción seleccionada
                      },
                    );

                    if (result && "createdCount" in result) {
                      notifications.show({
                        title: "✅ Serie creada exitosamente",
                        message: `Se crearon ${result.createdCount} de ${result.totalOccurrences} citas recurrentes`,
                        color: "green",
                        autoClose: 4000,
                      });
                    }

                    // Cerrar modal
                    onClose();

                    // Refrescar citas del mes actual sin recargar toda la página
                    if (fetchAppointmentsForMonth) {
                      await fetchAppointmentsForMonth(
                        newAppointment.startDate || new Date(),
                      );
                    }
                  } catch (error: unknown) {
                    notifications.show({
                      title: "❌ Error al crear serie",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Error al crear las citas recurrentes",
                      color: "red",
                      autoClose: 5000,
                    });
                  } finally {
                    setCreatingSeries(false);
                  }
                } else {
                  // 📅 Cita normal o edición
                  onSave();
                }
              }}
              disabled={creatingAppointment || creatingSeries}
              loading={creatingAppointment || creatingSeries}
              size="xs"
              radius="md"
              leftSection={
                appointment
                  ? "✏️"
                  : isMultiMode
                    ? "👥"
                    : recurrencePattern.type === "weekly"
                      ? "🔁"
                      : "➕"
              }
              styles={{
                root: {
                  minWidth: 160,
                },
              }}
            >
              {appointment
                ? "Actualizar Cita"
                : isMultiMode
                  ? `Crear Citas (${extraBlocks.filter((b) => b.employee && b.services.length > 0).length + (newAppointment.employee ? 1 : 0)} profesionales)`
                  : recurrencePattern.type === "weekly"
                    ? "Crear Serie Recurrente"
                    : "Crear Cita"}
            </Button>
          </Group>
    </>
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Text size="xl" fw={700}>
            {appointment ? "✏️ Editar Cita" : "📅 Nueva Cita"}
          </Text>
        }
        zIndex={300}
        centered
        size="xl"
        radius="md"
        overlayProps={{
          opacity: 0.3,
          blur: 3,
        }}
        styles={{
          body: {
            padding: "1.5rem",
          },
          header: {
            borderBottom: "1px solid #e9ecef",
            paddingBottom: "1rem",
          },
        }}
      >
        <Box>
          {appointment ? (
            <>
              {/* Acciones rápidas */}
              <Flex
                justify="space-between"
                align="center"
                mb="md"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                }}
              >
                <Flex direction="column" gap={2}>
                  <Text size="xs" c="dimmed">Acciones rápidas</Text>
                  <Text size="sm" fw={600}>Copiar / WhatsApp</Text>
                </Flex>
                <Group gap="xs">
                  <Tooltip label="Copiar detalle de la cita" withArrow>
                    <ActionIcon
                      color="blue"
                      size="lg"
                      variant="filled"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          generateAppointmentDetails(appointment, appoinments),
                        )
                      }
                    >
                      <BiCopy size={18} />
                    </ActionIcon>
                  </Tooltip>
                  {auth.role === "admin" && (
                    <Tooltip label="Abrir chat de WhatsApp" withArrow>
                      <ActionIcon
                        color="green"
                        size="lg"
                        variant="filled"
                        onClick={() => window.open(whatsappURL, "_blank")}
                      >
                        <FaWhatsapp size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Flex>

              <Tabs
                value={activeTab}
                onChange={(v) => setActiveTab(v || "detalle")}
                variant="pills"
                radius="xl"
              >
                <Tabs.List mb="md">
                  <Tabs.Tab value="detalle">Detalle</Tabs.Tab>
                  <Tabs.Tab value="edicion">Edición</Tabs.Tab>
                  <Tabs.Tab value="notas">Notas y campos</Tabs.Tab>
                  <Tabs.Tab value="cobro">Cobro</Tabs.Tab>
                </Tabs.List>

                {/* -------- PESTAÑA: Detalle -------- */}
                <Tabs.Panel value="detalle">
                  <Flex direction="column" gap="md">
                    <Box style={{ border: "1px solid #e9ecef", borderRadius: 12, padding: 12 }}>
                      <Group justify="space-between" mb={6}>
                        <Text fw={700} size="sm">Resumen</Text>
                        {isBirthdayDetalle && (
                          <Text size="xs" c="orange" fw={700}>🎉 Cumpleaños hoy</Text>
                        )}
                      </Group>
                      <Flex direction="column" gap={6}>
                        <Text size="sm">
                          <strong>Servicio:</strong>{" "}
                          {appointment.service ? appointment.service.name : "Sin servicio"}
                        </Text>
                        <Text size="sm">
                          <strong>Profesional:</strong> {appointment.employee.names}
                          {appointment.employeeRequestedByClient && (
                            <Text span c="violet" fw={600}> (solicitado)</Text>
                          )}
                        </Text>
                        <Text size="sm">
                          <strong>Fecha:</strong>{" "}
                          {formatFullDateInTimezone(appointment.startDate, timezone, "dddd, D MMMM YYYY")}
                        </Text>
                        <Text size="sm">
                          <strong>Hora:</strong>{" "}
                          {formatInTimezone(appointment.startDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                          {" - "}
                          {formatInTimezone(appointment.endDate, timezone, timeFormat === "24h" ? "HH:mm" : "h:mm A")}
                        </Text>
                        <Group gap={6}>
                          <Text size="sm"><strong>Estado:</strong></Text>
                          {statusInfo && (
                            <Badge color={statusInfo.color} size="sm">{statusInfo.label}</Badge>
                          )}
                        </Group>
                        <Text size="sm">
                          <strong>Abono:</strong>{" "}
                          {formatCurrency(appointment.advancePayment, organization?.currency || "COP")}
                        </Text>

                        {auth.role === "admin" && (
                          <Flex align="center" gap={6} wrap="wrap">
                            <Text size="sm">
                              <strong>Tel:</strong> {appointment.client.phoneNumber}
                            </Text>
                            <CopyButton value={appointment.client.phoneNumber || ""} timeout={2000}>
                              {({ copied, copy }) => (
                                <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
                                  <ActionIcon
                                    color={copied ? "green" : "blue"}
                                    onClick={copy}
                                    size="sm"
                                    variant="subtle"
                                  >
                                    {copied ? <BiCheckCircle size={14} /> : <BiCopy size={14} />}
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </CopyButton>
                          </Flex>
                        )}

                        {auth.role === "admin" && waConfirmation && (
                          <Flex align="center" gap={6} wrap="wrap">
                            <FaWhatsapp size={13} color={waConfirmationColor} />
                            <Text size="sm">
                              <strong>Confirmación WhatsApp:</strong> {waConfirmation.shortLabel}
                            </Text>
                          </Flex>
                        )}
                        {auth.role === "admin" &&
                          appointment.waConfirmationStatus === "failed" &&
                          appointment.waConfirmationError && (
                            <Text size="xs" c="red" ml={19}>{appointment.waConfirmationError}</Text>
                          )}
                      </Flex>
                    </Box>

                    <Box>
                      <Group justify="space-between" mb={6}>
                        <Text fw={700} size="sm">Historial de citas</Text>
                        <Text size="xs" c="dimmed">Mismo cliente</Text>
                      </Group>
                      <ScrollArea h={220} offsetScrollbars>
                        <Flex direction="column" gap="xs">
                          {appoinments
                            .filter((appt) => appt.client._id === appointment.client._id)
                            .map((appt, index) => {
                              const isCurrentAppointment = appt._id === appointment._id;
                              return (
                                <Flex
                                  key={index}
                                  justify="space-between"
                                  align="center"
                                  py={8}
                                  px={10}
                                  style={{
                                    borderRadius: 10,
                                    border: isCurrentAppointment ? "1px solid #4dabf7" : "1px solid #e9ecef",
                                    background: isCurrentAppointment ? "#e7f5ff" : "#f8f9fa",
                                  }}
                                >
                                  <Box>
                                    <Text size="sm" fw={600}>
                                      {appt.service ? (
                                        appt.service.name
                                      ) : (
                                        <Text component="span" c="red" fw={800} size="sm">
                                          Sin servicio
                                        </Text>
                                      )}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      Profesional:{" "}
                                      {appt.employeeRequestedByClient ? (
                                        <strong style={{ color: "purple" }}>
                                          {appt.employee.names} (solicitado)
                                        </strong>
                                      ) : (
                                        appt.employee.names
                                      )}
                                    </Text>
                                  </Box>
                                  {isCurrentAppointment && (
                                    <Text size="xs" fw={800} c="blue">ACTUAL</Text>
                                  )}
                                </Flex>
                              );
                            })}
                        </Flex>
                      </ScrollArea>
                    </Box>
                  </Flex>
                </Tabs.Panel>

                {/* -------- PESTAÑA: Edición -------- */}
                <Tabs.Panel value="edicion">
                  {schedulingForm}
                  {actionButtons}
                </Tabs.Panel>

                {/* -------- PESTAÑA: Notas y campos personalizados -------- */}
                <Tabs.Panel value="notas">
                  <Box mt="md">
                    <Group justify="space-between" mb="md">
                      <Text size="sm" fw={600} c="dimmed" tt="uppercase">
                        <IconNotes size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Notas y campos personalizados
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={handleSaveNotesAndFields}
                        loading={savingNotes}
                        disabled={sessionNotesDraft === lastSavedNotes && !customFieldsChanged}
                      >
                        Guardar
                      </Button>
                    </Group>
                    <Textarea
                      placeholder="¿Qué se hizo en esta sesión? Observaciones, seguimiento, próximos pasos..."
                      value={sessionNotesDraft}
                      onChange={(e) => setSessionNotesDraft(e.currentTarget.value)}
                      minRows={3}
                      autosize
                      maxRows={8}
                      styles={{ input: { borderRadius: 8 } }}
                    />
                    {customFieldsBox && <Box mt="md">{customFieldsBox}</Box>}
                  </Box>
                </Tabs.Panel>

                {/* -------- PESTAÑA: Cobro -------- */}
                <Tabs.Panel value="cobro">
                  <Flex direction="column" gap="md" mt="md">
                    <Box style={{ border: "1px solid #e9ecef", borderRadius: 12, padding: 12 }}>
                      <Text fw={700} size="sm" mb={8}>Precio del servicio</Text>
                      <NumberInput
                        label="Cambiar precio"
                        description="Déjalo vacío para usar el precio del servicio. Escribe 0 para una cita gratuita."
                        prefix="$ "
                        thousandSeparator=","
                        min={0}
                        placeholder={String(appointment.totalPrice ?? 0)}
                        value={customPrice ?? ""}
                        onChange={(value) => setCustomPrice(value === "" ? null : Number(value))}
                      />
                    </Box>

                    <Box style={{ border: "1px solid #e9ecef", borderRadius: 12, padding: 12 }}>
                      <Text fw={700} size="sm" mb={8}>Adicionales</Text>
                      <Flex align="flex-end" gap="xs">
                        <TextInput
                          label="Nombre"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          style={{ flex: 2 }}
                        />
                        <NumberInput
                          label="Precio"
                          prefix="$ "
                          thousandSeparator=","
                          value={newItem.price}
                          onChange={(value) => setNewItem({ ...newItem, price: (value as number) || 0 })}
                          style={{ flex: 1 }}
                        />
                        <ActionIcon color="green" onClick={handleAddItem} mt="lg" variant="filled">
                          <BiPlus size={18} />
                        </ActionIcon>
                      </Flex>
                      <Box mt="md">
                        <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="xs">
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Nombre</Table.Th>
                              <Table.Th>Precio</Table.Th>
                              <Table.Th style={{ width: 70 }}>Acción</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {additionalItems.map((item, index) => (
                              <Table.Tr key={index}>
                                <Table.Td>{item.name}</Table.Td>
                                <Table.Td>{formatCurrency(item.price, organization?.currency || "COP")}</Table.Td>
                                <Table.Td>
                                  <ActionIcon color="red" onClick={() => handleRemoveItem(index)} variant="subtle">
                                    <BiTrash size={16} />
                                  </ActionIcon>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Box>
                      <Button fullWidth mt="md" onClick={handleSaveCobro} loading={savingCobro}>
                        Guardar cambios
                      </Button>
                    </Box>

                    <Text fw={800} size="md">Resumen de facturación</Text>
                    <Table.ScrollContainer minWidth={520}>
                      <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Servicio</Table.Th>
                            <Table.Th>Base</Table.Th>
                            <Table.Th>Usado</Table.Th>
                            <Table.Th>Adic.</Table.Th>
                            <Table.Th>Total</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {appoinments
                            .filter((appt) => appt.client._id === appointment.client._id)
                            .map((appt, index) => {
                              const additionalTotal =
                                appt.additionalItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
                              const usedPrice = appt.customPrice ?? appt.totalPrice ?? 0;
                              const total = usedPrice + additionalTotal;
                              return (
                                <Table.Tr key={index}>
                                  <Table.Td>
                                    {appt.service ? (
                                      appt.service.name
                                    ) : (
                                      <Text c="red" fw={800} size="sm">Sin servicio</Text>
                                    )}
                                  </Table.Td>
                                  <Table.Td>
                                    <Text>{formatCurrency(appt.totalPrice || 0, organization?.currency || "COP")}</Text>
                                    {appt.customPrice != null && <Text size="xs" c="dimmed">No usado</Text>}
                                  </Table.Td>
                                  <Table.Td>
                                    <Text fw={800}>{formatCurrency(usedPrice, organization?.currency || "COP")}</Text>
                                    {appt.customPrice != null && <Text size="xs" c="green">Personalizado</Text>}
                                  </Table.Td>
                                  <Table.Td>{formatCurrency(additionalTotal, organization?.currency || "COP")}</Table.Td>
                                  <Table.Td>
                                    <Text fw={800}>{formatCurrency(total, organization?.currency || "COP")}</Text>
                                  </Table.Td>
                                </Table.Tr>
                              );
                            })}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>

                    <Flex
                      justify="space-between"
                      align="center"
                      mt="xs"
                      style={{ background: "#e7f5ff", borderRadius: 12, padding: "12px 14px", border: "1px solid #a5d8ff" }}
                    >
                      <Text fw={900} size="sm">Total general</Text>
                      <Text fw={900} size="lg">
                        {formatCurrency(
                          appoinments
                            .filter((appt) => appt.client._id === appointment.client._id)
                            .reduce((acc, appt) => {
                              const additionalTotal =
                                appt.additionalItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
                              const total = (appt.customPrice ?? appt.totalPrice ?? 0) + additionalTotal;
                              return acc + total;
                            }, 0),
                          organization?.currency || "COP",
                        )}
                      </Text>
                    </Flex>

                    <Divider my="sm" label="Cobro de esta cita" labelPosition="center" />

                    <Flex align="center" justify="space-between">
                      <Text size="sm" fw={700}>Estado de cobro</Text>
                      <Badge color={psConfig.color} size="md" variant="filled">{psConfig.label}</Badge>
                    </Flex>

                    <Box style={{ border: "1px solid #e9ecef", borderRadius: 10, padding: "10px 12px", background: "#f8f9fa" }}>
                      <Flex justify="space-between" mb={2}>
                        <Text size="sm" c="dimmed">Total esta cita</Text>
                        <Text size="sm" fw={600}>{formatCurrency(thisTotal, organization?.currency || "COP")}</Text>
                      </Flex>
                      <Flex justify="space-between" mb={2}>
                        <Text size="sm" c="dimmed">Abono inicial</Text>
                        <Text size="sm">{formatCurrency(appointment.advancePayment || 0, organization?.currency || "COP")}</Text>
                      </Flex>
                      {payments.length > 0 && (
                        <Flex justify="space-between" mb={2}>
                          <Text size="sm" c="dimmed">Pagos adicionales</Text>
                          <Text size="sm">
                            {formatCurrency(payments.reduce((s, p) => s + (p.amount || 0), 0), organization?.currency || "COP")}
                          </Text>
                        </Flex>
                      )}
                      <Flex justify="space-between" pt={4} style={{ borderTop: "1px solid #dee2e6" }}>
                        <Text size="sm" fw={700}>Saldo pendiente</Text>
                        <Text size="sm" fw={700} c={pending > 0 ? "red" : "green"}>
                          {formatCurrency(pending, organization?.currency || "COP")}
                        </Text>
                      </Flex>
                    </Box>

                    {payments.length > 0 && (
                      <Box>
                        <Text size="sm" fw={700} mb={6}>Historial de pagos</Text>
                        <Flex direction="column" gap={4}>
                          {payments.map((p) => (
                            <Flex
                              key={p._id}
                              justify="space-between"
                              align="center"
                              px={10}
                              py={6}
                              style={{ borderRadius: 8, border: "1px solid #e9ecef", background: "#f8f9fa" }}
                            >
                              <Box>
                                <Text size="sm" fw={600}>
                                  {formatCurrency(p.amount, organization?.currency || "COP")}
                                  {" · "}{methodLabels[p.method] || p.method}
                                </Text>
                                {p.note && <Text size="xs" c="dimmed">{p.note}</Text>}
                                <Text size="xs" c="dimmed">{dayjs(p.date).locale("es").format("D MMM YYYY")}</Text>
                              </Box>
                              <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemovePayment(p._id)}>
                                <BiX size={14} />
                              </ActionIcon>
                            </Flex>
                          ))}
                        </Flex>
                      </Box>
                    )}

                    {paymentStatus !== "paid" && paymentStatus !== "free" && (
                      <Box style={{ border: "1px solid #e9ecef", borderRadius: 10, padding: "10px 12px" }}>
                        <Text size="sm" fw={700} mb={8}>Registrar pago</Text>
                        <Flex gap="xs" align="flex-end" mb="sm">
                          <Select
                            label="Método de pago"
                            value={newPayment.method}
                            onChange={(v) => setNewPayment({ ...newPayment, method: v || "cash", otherLabel: "" })}
                            data={[
                              { value: "cash", label: "Efectivo" },
                              { value: "card", label: "Tarjeta" },
                              { value: "transfer", label: "Transferencia" },
                              { value: "other", label: "Otro" },
                            ]}
                            style={{ flex: 1 }}
                          />
                          {newPayment.method === "other" && (
                            <TextInput
                              label="¿Cuál? (opcional)"
                              placeholder="Ej: Nequi, Daviplata..."
                              value={newPayment.otherLabel}
                              onChange={(e) => setNewPayment({ ...newPayment, otherLabel: e.target.value })}
                              style={{ flex: 1 }}
                            />
                          )}
                          <Button
                            size="sm"
                            color="teal"
                            variant="filled"
                            loading={savingPayment}
                            disabled={pending <= 0}
                            onClick={handleFullPayment}
                            style={{ flex: 1 }}
                          >
                            Pago completo ({formatCurrency(pending, organization?.currency || "COP")})
                          </Button>
                        </Flex>
                        <Divider label="o ingresa un monto parcial" labelPosition="center" mb="sm" />
                        <Flex gap="xs" align="flex-end">
                          <NumberInput
                            label="Monto parcial"
                            prefix="$ "
                            thousandSeparator=","
                            value={newPayment.amount || ""}
                            onChange={(v) => setNewPayment({ ...newPayment, amount: Number(v) || 0 })}
                            style={{ flex: 1 }}
                            min={0}
                          />
                        </Flex>
                        <TextInput
                          label="Nota (opcional)"
                          value={newPayment.note}
                          onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                          mt="xs"
                        />
                        <Button
                          fullWidth
                          mt="sm"
                          size="sm"
                          variant="light"
                          loading={savingPayment}
                          disabled={!newPayment.amount || newPayment.amount <= 0}
                          onClick={handleAddPayment}
                        >
                          Registrar monto parcial
                        </Button>
                      </Box>
                    )}
                  </Flex>
                </Tabs.Panel>
              </Tabs>
            </>
          ) : (
            <>
              {schedulingForm}
              {customFieldsBox}
              {actionButtons}
            </>
          )}
        </Box>
      </Modal>

      {/* Modal para crear cliente */}
      <ClientFormModal
        opened={createClientModalOpened}
        onClose={(createdClient) => {
          setCreateClientModalOpened(false);

          if (createdClient) {
            // 🎯 Auto-seleccionar el cliente recién creado, sin tener que
            // buscarlo de nuevo en el desplegable.
            setSearchedClients((prev) => [
              createdClient,
              ...prev.filter((c) => c._id !== createdClient._id),
            ]);
            onClientChange(createdClient);
            setClientSearchQuery("");
            return;
          }

          // Se cerró sin crear cliente: solo refrescar la búsqueda actual
          if (organizationId) {
            searchClients(organizationId, clientSearchQuery, 20).then(
              setSearchedClients,
            );
          }
        }}
        fetchClients={fetchClients ?? (() => {})}
      />
    </>
  );
};

export default AppointmentModal;
