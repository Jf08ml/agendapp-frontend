import React, { useState } from "react";
import {
  Paper,
  Text,
  Badge,
  Menu,
  ActionIcon,
  Flex,
  Modal,
  Button,
  Box,
  CopyButton,
  Tooltip,
  Group,
  TextInput,
  Table,
  NumberInput,
  Tabs,
  ScrollArea,
  Select,
  Divider,
} from "@mantine/core";
import {
  BiEdit,
  BiTrash,
  BiCheck,
  BiCheckCircle,
  BiCopy,
  BiPlus,
  BiTimeFive,
  BiExpand,
  BiX,
} from "react-icons/bi";
import {
  Appointment,
  PaymentRecord,
  updateAppointment,
  addAppointmentPayment,
  removeAppointmentPayment,
} from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import localizedFormat from "dayjs/plugin/localizedFormat";
import {
  formatInTimezone,
  formatFullDateInTimezone,
} from "../../../utils/timezoneUtils";
import { FaWhatsapp } from "react-icons/fa";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { formatCurrency } from "../../../utils/formatCurrency";
import { showNotification } from "@mantine/notifications";
import { IoSettings } from "react-icons/io5";
import { IconUserCheck, IconUserX } from "@tabler/icons-react";

dayjs.extend(localizedFormat);
dayjs.locale("es");

interface AppointmentCardProps {
  appointment: Appointment;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  appoinments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  isExpanded?: (appointment: Appointment) => boolean;
  handleToggleExpand?: (appointmentId: string) => void;
  timezone?: string; // 🌍 Timezone de la organización
}

// Función para calcular el contraste del color
const getTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF";
};

// const getStatusStyles = (status: string) => {
//   switch (status) {
//     case "confirmed":
//       return { backgroundColor: "#d4edda", borderColor: "#2f9e44" };
//     case "pending":
//       return { backgroundColor: "#fff3cd", borderColor: "#f08c00" };
//     case "cancelled":
//       return { backgroundColor: "#f8d7da", borderColor: "#e03131" };
//     default:
//       return { backgroundColor: "#edf2ff", borderColor: "#4c6ef5" };
//   }
// };

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  setAppointments,
  appoinments,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  isExpanded,
  handleToggleExpand,
  timezone = "America/Bogota", // 🌍 Default timezone
}) => {
  // const { borderColor } = getStatusStyles(appointment.status);
  const { hasPermission } = usePermissions();

  const employeeColor = appointment.employee.color || "#ffffff";
  const textColor = getTextColor(employeeColor);

  const [modalOpened, setModalOpened] = useState(false);

  // 👇 esto debe seguir funcionando: citas pasadas cambian color
  const isPastAppointment = dayjs(appointment.endDate).isBefore(dayjs());

  // 🚫 Detectar si está cancelada
  const isCancelled = appointment.status.includes("cancelled");

  const { role } = useSelector((state: RootState) => state.auth);
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const [customPrice, setCustomPrice] = useState<number | null>(
    appointment.customPrice || 0
  );
  const [additionalItems, setAdditionalItems] = useState(
    appointment.additionalItems || []
  );
  const [newItem, setNewItem] = useState({ name: "", price: 0 });
  const [updatingReminder, setUpdatingReminder] = useState(false);

  // 💰 Estado de pagos
  const [payments, setPayments] = useState<PaymentRecord[]>(appointment.payments || []);
  const [paymentStatus, setPaymentStatus] = useState(appointment.paymentStatus || "unpaid");
  const [newPayment, setNewPayment] = useState({ amount: 0, method: "cash", note: "" });
  const [savingPayment, setSavingPayment] = useState(false);

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

  const handleSaveChanges = async () => {
    try {
      const updatedAppointmentData = {
        ...appointment,
        customPrice,
        additionalItems,
      };

      const response = await updateAppointment(
        updatedAppointmentData._id,
        updatedAppointmentData
      );

      if (response) {
        showNotification({
          title: "Éxito",
          message: "Cita actualizada correctamente",
          color: "green",
          autoClose: 3000,
          position: "top-right",
        });

        const updatedAppointments = appoinments.map((appt) =>
          appt._id === updatedAppointmentData._id
            ? updatedAppointmentData
            : appt
        );

        setAppointments(updatedAppointments);
        setModalOpened(false);
      }
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "No se pudo actualizar la cita",
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
    }
  };

  const handleFullPayment = async () => {
    if (pending <= 0) return;
    setSavingPayment(true);
    try {
      const updated = await addAppointmentPayment(appointment._id, {
        amount: pending,
        method: newPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: "",
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments((prev) => prev.map((a) =>
          a._id === appointment._id
            ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
            : a
        ));
        showNotification({ title: "Pago completo registrado", message: "Se registró el saldo pendiente como pagado", color: "green", autoClose: 3000, position: "top-right" });
      }
    } catch (err) {
      console.error(err);
      showNotification({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || newPayment.amount <= 0) return;
    setSavingPayment(true);
    try {
      const updated = await addAppointmentPayment(appointment._id, {
        amount: newPayment.amount,
        method: newPayment.method as PaymentRecord["method"],
        date: new Date().toISOString(),
        note: newPayment.note,
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments((prev) => prev.map((a) =>
          a._id === appointment._id
            ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
            : a
        ));
        setNewPayment({ amount: 0, method: "cash", note: "" });
        showNotification({ title: "Pago registrado", message: "El pago fue registrado correctamente", color: "green", autoClose: 3000, position: "top-right" });
      }
    } catch (err) {
      console.error(err);
      showNotification({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    try {
      const updated = await removeAppointmentPayment(appointment._id, paymentId);
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setAppointments((prev) => prev.map((a) =>
          a._id === appointment._id
            ? { ...a, payments: updated.payments, paymentStatus: updated.paymentStatus }
            : a
        ));
      }
    } catch (err) {
      console.error(err);
      showNotification({ title: "Error", message: "No se pudo eliminar el pago", color: "red", autoClose: 3000, position: "top-right" });
    }
  };

  const getIsBirthday = (
    birthDate: string | number | dayjs.Dayjs | Date | null | undefined
  ): boolean => {
    if (!birthDate) return false;
    const today = dayjs();
    const birthDateClient = dayjs(birthDate);
    if (!birthDateClient.isValid()) return false;
    return (
      birthDateClient.month() === today.month() &&
      birthDateClient.date() === today.date()
    );
  };

  const generateAppointmentDetails = (
    appointment: Appointment,
    appoinments: Appointment[]
  ) => {
    const clientServices = appoinments
      .filter((appt) => appt.client._id === appointment.client._id)
      .map((appt) =>
        appt.service
          ? `⭐ *Servicio:* ${appt.service.name}\n👤 *Empleado:* ${appt.employee.names}`
          : `⭐ *Servicio:* [Eliminado]\n👤 *Empleado:* ${appt.employee.names}`
      )
      .join("\n\n");

    return `*DETALLES DE LA CITA*
👩‍🦰 *Cliente:* ${appointment.client.name}
📅 *Horario:* ${formatFullDateInTimezone(
      appointment.startDate,
      timezone,
      "dddd, D MMMM YYYY, h:mm A"
    )} - ${formatInTimezone(appointment.endDate, timezone, "h:mm A")}
💵 *Abono:* ${appointment.advancePayment}

${clientServices}`;
  };

  const whatsappURL = `https://wa.me/${appointment.client.phoneNumber}`;
  const isBirthday = getIsBirthday(appointment.client.birthDate);

  // 💰 Cálculos de cobro para esta cita
  // Usar || en lugar de ?? porque customPrice se inicializa como 0 cuando no hay precio personalizado
  const thisTotal = (customPrice || appointment.totalPrice || 0) +
    additionalItems.reduce((s, i) => s + (i.price || 0), 0);
  const totalPaid = (appointment.advancePayment || 0) +
    payments.reduce((s, p) => s + (p.amount || 0), 0);
  const pending = Math.max(0, thisTotal - totalPaid);

  const paymentStatusConfig = {
    paid:    { color: "green",  label: "Pagado" },
    partial: { color: "yellow", label: "Abono" },
    unpaid:  { color: "red",    label: "Sin pagar" },
    free:    { color: "blue",   label: "Incluido en paquete" },
  };
  const psConfig = paymentStatusConfig[paymentStatus as keyof typeof paymentStatusConfig] ?? paymentStatusConfig.unpaid;

  const methodLabels: Record<string, string> = {
    cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro",
  };

  return (
    <>
      {/* MODAL */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        withCloseButton={false}
        size="lg"
        centered
        radius="lg"
        padding={0}
        onClick={(e) => e.stopPropagation()}
      >
        <Box onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <Flex
            align="center"
            justify="space-between"
            px="md"
            py="sm"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-3)",
              position: "sticky",
              top: 0,
              background: "var(--mantine-color-body)",
              zIndex: 2,
            }}
          >
            <Box>
              <Text fw={800} size="md">
                Detalle de la cita
              </Text>
              <Text size="xs" c="dimmed">
                {appointment.client.name} •{" "}
                {formatFullDateInTimezone(
                  appointment.startDate,
                  timezone,
                  "ddd, D MMM • h:mm A"
                )}
                {" - "}
                {formatInTimezone(appointment.endDate, timezone, "h:mm A")}
              </Text>
            </Box>

            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setModalOpened(false)}
              aria-label="Cerrar"
            >
              {/* usa el icono que prefieras */}
              <BiX size={18} />
            </ActionIcon>
          </Flex>

          {/* BODY */}
          <Box px="md" py="sm">
            {/* ACCIONES RÁPIDAS */}
            <Flex
              justify="space-between"
              align="center"
              mb="sm"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "var(--mantine-color-gray-0)",
                border: "1px solid var(--mantine-color-gray-2)",
              }}
            >
              <Flex direction="column" gap={2}>
                <Text size="xs" c="dimmed">
                  Acciones rápidas
                </Text>
                <Text size="sm" fw={600}>
                  Copiar / WhatsApp
                </Text>
              </Flex>

              <Group gap="xs">
                <Tooltip label="Copiar detalle de la cita" withArrow>
                  <ActionIcon
                    color="blue"
                    size="lg"
                    variant="filled"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        generateAppointmentDetails(appointment, appoinments)
                      )
                    }
                  >
                    <BiCopy size={18} />
                  </ActionIcon>
                </Tooltip>

                {role === "admin" && (
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
              defaultValue="invoice"
              keepMounted={false}
              variant="pills"
              radius="xl"
            >
              <Tabs.List mb="sm">
                <Tabs.Tab value="details">Detalle</Tabs.Tab>
                <Tabs.Tab value="modify">Precio</Tabs.Tab>
                <Tabs.Tab value="invoice">Facturar</Tabs.Tab>
              </Tabs.List>

              {/* -------- PANEL: Detalle -------- */}
              <Tabs.Panel value="details">
                <Flex direction="column" gap="md">
                  {/* RESUMEN */}
                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text fw={700} size="sm">
                        Resumen
                      </Text>
                      {isBirthday && (
                        <Text size="xs" c="orange" fw={700}>
                          🎉 Cumpleaños hoy
                        </Text>
                      )}
                    </Group>

                    <Flex direction="column" gap={6}>
                      <Text size="sm">
                        <strong>Abono:</strong>{" "}
                        {formatCurrency(
                          appointment.advancePayment,
                          organization?.currency || "COP"
                        )}
                      </Text>

                      {role === "admin" && (
                        <Flex align="center" gap={6} wrap="wrap">
                          <Text size="sm">
                            <strong>Tel:</strong>{" "}
                            {appointment.client.phoneNumber}
                          </Text>

                          <CopyButton
                            value={appointment.client.phoneNumber}
                            timeout={2000}
                          >
                            {({ copied, copy }) => (
                              <Tooltip
                                label={copied ? "Copiado" : "Copiar"}
                                withArrow
                              >
                                <ActionIcon
                                  color={copied ? "green" : "blue"}
                                  onClick={copy}
                                  size="sm"
                                  variant="subtle"
                                >
                                  {copied ? (
                                    <BiCheckCircle size={14} />
                                  ) : (
                                    <BiCopy size={14} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        </Flex>
                      )}
                    </Flex>
                  </Box>

                  {/* HISTORIAL */}
                  <Box>
                    <Group justify="space-between" mb={6}>
                      <Text fw={700} size="sm">
                        Historial de citas
                      </Text>
                      <Text size="xs" c="dimmed">
                        Mismo cliente
                      </Text>
                    </Group>

                    <ScrollArea h={220} offsetScrollbars>
                      <Flex direction="column" gap="xs">
                        {appoinments
                          .filter(
                            (appt) => appt.client._id === appointment.client._id
                          )
                          .map((appt, index) => {
                            const isCurrentAppointment =
                              appt._id === appointment._id;

                            return (
                              <Flex
                                key={index}
                                justify="space-between"
                                align="center"
                                py={8}
                                px={10}
                                style={{
                                  borderRadius: 10,
                                  border: isCurrentAppointment
                                    ? "1px solid var(--mantine-color-blue-6)"
                                    : "1px solid var(--mantine-color-gray-2)",
                                  background: isCurrentAppointment
                                    ? "var(--mantine-color-blue-0)"
                                    : "var(--mantine-color-gray-0)",
                                }}
                              >
                                <Box>
                                  <Text size="sm" fw={600}>
                                    {appt.service ? (
                                      appt.service.name
                                    ) : (
                                      <Text
                                        component="span"
                                        c="red"
                                        fw={800}
                                        size="sm"
                                      >
                                        Sin servicio
                                      </Text>
                                    )}
                                  </Text>

                                  <Text size="xs" c="dimmed">
                                    Empleado:{" "}
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
                                  <Text size="xs" fw={800} c="blue">
                                    ACTUAL
                                  </Text>
                                )}
                              </Flex>
                            );
                          })}
                      </Flex>
                    </ScrollArea>
                  </Box>
                </Flex>
              </Tabs.Panel>

              {/* -------- PANEL: Modificar precio -------- */}
              <Tabs.Panel value="modify">
                <Flex direction="column" gap="md" mt="sm">
                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text fw={700} size="sm" mb={8}>
                      Precio del servicio
                    </Text>

                    <NumberInput
                      label="Cambiar precio"
                      prefix="$ "
                      thousandSeparator=","
                      value={customPrice || ""}
                      onChange={(value) =>
                        setCustomPrice(Number(value) || null)
                      }
                    />
                  </Box>

                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-2)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text fw={700} size="sm" mb={8}>
                      Adicionales
                    </Text>

                    <Flex align="flex-end" gap="xs">
                      <TextInput
                        label="Nombre"
                        value={newItem.name}
                        onChange={(e) =>
                          setNewItem({ ...newItem, name: e.target.value })
                        }
                        style={{ flex: 2 }}
                      />
                      <NumberInput
                        label="Precio"
                        prefix="$ "
                        thousandSeparator=","
                        value={newItem.price}
                        onChange={(value) =>
                          setNewItem({
                            ...newItem,
                            price: (value as number) || 0,
                          })
                        }
                        style={{ flex: 1 }}
                      />
                      <ActionIcon
                        color="green"
                        onClick={handleAddItem}
                        mt="lg"
                        variant="filled"
                      >
                        <BiPlus size={18} />
                      </ActionIcon>
                    </Flex>

                    <Box mt="md">
                      <Table
                        striped
                        highlightOnHover
                        withTableBorder
                        withColumnBorders
                        verticalSpacing="xs"
                      >
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
                              <Table.Td>
                                {formatCurrency(
                                  item.price,
                                  organization?.currency || "COP"
                                )}
                              </Table.Td>
                              <Table.Td>
                                <ActionIcon
                                  color="red"
                                  onClick={() => handleRemoveItem(index)}
                                  variant="subtle"
                                >
                                  <BiTrash size={16} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Box>

                    <Button fullWidth mt="md" onClick={handleSaveChanges}>
                      Guardar cambios
                    </Button>
                  </Box>
                </Flex>
              </Tabs.Panel>

              {/* -------- PANEL: Facturar -------- */}
              <Tabs.Panel value="invoice">
                <Flex direction="column" gap="sm" mt="sm">
                  <Text fw={800} size="md">
                    Resumen de facturación
                  </Text>

                  <Table.ScrollContainer minWidth={520}>
                    <Table
                      striped
                      highlightOnHover
                      withTableBorder
                      withColumnBorders
                      verticalSpacing="xs"
                    >
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
                          .filter(
                            (appt) => appt.client._id === appointment.client._id
                          )
                          .map((appt, index) => {
                            const additionalTotal =
                              appt.additionalItems?.reduce(
                                (sum, item) => sum + (item.price || 0),
                                0
                              ) || 0;

                            const usedPrice =
                              appt.customPrice || appt.totalPrice || 0;
                            const total = usedPrice + additionalTotal;

                            return (
                              <Table.Tr key={index}>
                                <Table.Td>
                                  {appt.service ? (
                                    appt.service.name
                                  ) : (
                                    <Text c="red" fw={800} size="sm">
                                      Sin servicio
                                    </Text>
                                  )}
                                </Table.Td>

                                <Table.Td>
                                  <Text>
                                    {formatCurrency(
                                      appt.totalPrice || 0,
                                      organization?.currency || "COP"
                                    )}
                                  </Text>
                                  {appt.customPrice && (
                                    <Text size="xs" c="dimmed">
                                      No usado
                                    </Text>
                                  )}
                                </Table.Td>

                                <Table.Td>
                                  <Text fw={800}>
                                    {formatCurrency(
                                      usedPrice,
                                      organization?.currency || "COP"
                                    )}
                                  </Text>
                                  {appt.customPrice && (
                                    <Text size="xs" c="green">
                                      Personalizado
                                    </Text>
                                  )}
                                </Table.Td>

                                <Table.Td>
                                  {formatCurrency(
                                    additionalTotal,
                                    organization?.currency || "COP"
                                  )}
                                </Table.Td>

                                <Table.Td>
                                  <Text fw={800}>
                                    {formatCurrency(
                                      total,
                                      organization?.currency || "COP"
                                    )}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>

                  {/* TOTAL */}
                  <Flex
                    justify="space-between"
                    align="center"
                    mt="xs"
                    style={{
                      background: "var(--mantine-color-blue-0)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      border: "1px solid var(--mantine-color-blue-2)",
                    }}
                  >
                    <Text fw={900} size="sm">
                      Total general
                    </Text>

                    <Text fw={900} size="lg">
                      {formatCurrency(
                        appoinments
                          .filter(
                            (appt) => appt.client._id === appointment.client._id
                          )
                          .reduce((acc, appt) => {
                            const additionalTotal =
                              appt.additionalItems?.reduce(
                                (sum, item) => sum + (item.price || 0),
                                0
                              ) || 0;

                            const total =
                              (appt.customPrice ?? appt.totalPrice ?? 0) +
                              additionalTotal;
                            return acc + total;
                          }, 0),
                        organization?.currency || "COP"
                      )}
                    </Text>
                  </Flex>

                  <Divider my="sm" label="Cobro de esta cita" labelPosition="center" />

                  {/* ESTADO DE PAGO */}
                  <Flex align="center" justify="space-between">
                    <Text size="sm" fw={700}>Estado de cobro</Text>
                    <Badge color={psConfig.color} size="md" variant="filled">
                      {psConfig.label}
                    </Badge>
                  </Flex>

                  {/* RESUMEN COBRO */}
                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-2)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "var(--mantine-color-gray-0)",
                    }}
                  >
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
                        <Text size="sm">{formatCurrency(payments.reduce((s, p) => s + (p.amount || 0), 0), organization?.currency || "COP")}</Text>
                      </Flex>
                    )}
                    <Flex justify="space-between" pt={4} style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
                      <Text size="sm" fw={700}>Saldo pendiente</Text>
                      <Text size="sm" fw={700} c={pending > 0 ? "red" : "green"}>
                        {formatCurrency(pending, organization?.currency || "COP")}
                      </Text>
                    </Flex>
                  </Box>

                  {/* HISTORIAL DE PAGOS */}
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
                            style={{
                              borderRadius: 8,
                              border: "1px solid var(--mantine-color-gray-2)",
                              background: "var(--mantine-color-gray-0)",
                            }}
                          >
                            <Box>
                              <Text size="sm" fw={600}>
                                {formatCurrency(p.amount, organization?.currency || "COP")}
                                {" · "}{methodLabels[p.method] || p.method}
                              </Text>
                              {p.note && <Text size="xs" c="dimmed">{p.note}</Text>}
                              <Text size="xs" c="dimmed">
                                {dayjs(p.date).locale("es").format("D MMM YYYY")}
                              </Text>
                            </Box>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              size="sm"
                              onClick={() => handleRemovePayment(p._id)}
                            >
                              <BiX size={14} />
                            </ActionIcon>
                          </Flex>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* FORMULARIO AGREGAR PAGO */}
                  {paymentStatus !== "paid" && paymentStatus !== "free" && (
                    <Box
                      style={{
                        border: "1px solid var(--mantine-color-gray-2)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <Text size="sm" fw={700} mb={8}>Registrar pago</Text>

                      {/* Acción rápida */}
                      <Flex gap="xs" align="flex-end" mb="sm">
                        <Select
                          label="Método de pago"
                          value={newPayment.method}
                          onChange={(v) => setNewPayment({ ...newPayment, method: v || "cash" })}
                          data={[
                            { value: "cash", label: "Efectivo" },
                            { value: "card", label: "Tarjeta" },
                            { value: "transfer", label: "Transferencia" },
                            { value: "other", label: "Otro" },
                          ]}
                          style={{ flex: 1 }}
                        />
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
          </Box>

          {/* FOOTER */}
          <Flex
            justify="flex-end"
            px="md"
            py="sm"
            style={{
              borderTop: "1px solid var(--mantine-color-gray-3)",
              background: "var(--mantine-color-body)",
            }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpened(false)}
            >
              Cerrar
            </Button>
          </Flex>
        </Box>
      </Modal>

      {/* -------- CARD EN LA COLUMNA -------- */}
      <Paper
        shadow={isPastAppointment ? "xs" : "sm"}
        radius="md"
        withBorder
        style={{
          backgroundColor: isCancelled
            ? "#f1f3f5"
            : isPastAppointment
            ? "#ffffff"
            : employeeColor, // ❌ Gris si cancelada
          color: isCancelled ? "#868e96" : isPastAppointment ? "#495057" : textColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "6px 8px 6px 8px",
          height: "100%",
          position: "relative",
          cursor: isCancelled ? "default" : "pointer",
          fontSize: 10,
          border: isCancelled
            ? "1px solid #ced4da"
            : appointment.status === "attended"
            ? "2px solid #12b886"
            : appointment.status === "no_show"
            ? "2px solid #e64980"
            : "1px solid gray",
          opacity: isCancelled ? 0.5 : appointment.status === "no_show" ? 0.65 : 1,
          textDecoration: isCancelled ? "line-through" : "none",
          pointerEvents: isCancelled ? "none" : "auto",
        }}
        onClick={(e) => {
          // clave para que NO se propague al onClick de la columna
          e.stopPropagation();
          const isIconClick = (e.target as HTMLElement).closest(
            ".ignore-modal"
          );
          if (!isIconClick) {
            setModalOpened(true);
          }
        }}
      >
        {/* Badge "solicitado" */}
        {appointment.employeeRequestedByClient && (
          <Badge
            color="violet"
            size="xxs"
            radius="sm"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              fontSize: 7,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.18)",
              backgroundColor: "rgba(111, 66, 193, 0.9)",
            }}
          >
            Solicitado
          </Badge>
        )}

        {/* Badge "confirmado por cliente" */}
        {appointment.clientConfirmed && !isCancelled && (
          <Badge
            color="green"
            size="xxs"
            radius="sm"
            style={{
              position: "absolute",
              top: appointment.employeeRequestedByClient ? 35 : 0,
              right: 0,
              fontSize: 7,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.18)",
              backgroundColor: "rgba(37, 134, 87, 0.9)",
            }}
          >
            ✓ Cliente
          </Badge>
        )}

        {/* Menú opciones */}
        <Menu position="top-start" withArrow>
          <Menu.Target>
            <Tooltip label="Opciones" withArrow>
              <ActionIcon
                className="ignore-modal"
                variant="transparent"
                color="dark"
                size="xs"
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  zIndex: 10,
                  pointerEvents: "auto", // ✅ Menú siempre clickeable, incluso en citas canceladas
                }}
              >
                <IoSettings size={10} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
            {handleToggleExpand && isExpanded && (
              <Menu.Item
                leftSection={
                  isExpanded(appointment) ? (
                    <BiCheck size={16} />
                  ) : (
                    <BiExpand size={16} />
                  )
                }
                onClick={() => handleToggleExpand(appointment._id)}
              >
                {isExpanded(appointment) ? "Contraer detalle" : "Ver detalle"}
              </Menu.Item>
            )}
            <Menu.Item
              leftSection={<BiEdit size={16} />}
              disabled={!hasPermission("appointments:update")}
              onClick={() => onEditAppointment(appointment)}
            >
              Editar cita
            </Menu.Item>
            <Menu.Item
              leftSection={<BiTrash size={16} />}
              disabled={!hasPermission("appointments:cancel")}
              onClick={() => onCancelAppointment(appointment._id)}
              color="red"
            >
              Cancelar cita
            </Menu.Item>
            <Menu.Item
              leftSection={<BiCheck size={16} />}
              disabled={!hasPermission("appointments:confirm")}
              onClick={() => onConfirmAppointment(appointment._id)}
              color="green"
            >
              Confirmar realizada
            </Menu.Item>
            {isPastAppointment && !isCancelled && (
              <>
                <Menu.Divider />
                <Menu.Label>Asistencia</Menu.Label>
                <Menu.Item
                  leftSection={<IconUserCheck size={16} />}
                  disabled={!hasPermission("appointments:update")}
                  onClick={() => onMarkAttendance(appointment._id, "attended")}
                  color="teal"
                >
                  Asistió
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconUserX size={16} />}
                  disabled={!hasPermission("appointments:update")}
                  onClick={() => onMarkAttendance(appointment._id, "no_show")}
                  color="pink"
                >
                  No asistió
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>

        {/* Badge de cancelada */}
        {isCancelled && (
          <Badge
            color="red"
            size="xs"
            radius="sm"
            style={{
              fontSize: 8,
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            ❌ CANCELADA
          </Badge>
        )}

        {/* Badge de asistencia */}
        {appointment.status === "attended" && (
          <Badge
            color="teal"
            size="xs"
            radius="sm"
            style={{
              fontSize: 8,
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            ✓ ASISTIÓ
          </Badge>
        )}
        {appointment.status === "no_show" && (
          <Badge
            color="pink"
            size="xs"
            radius="sm"
            style={{
              fontSize: 8,
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            ✗ NO ASISTIÓ
          </Badge>
        )}

        {/* Horario */}
        <Text fw={700} style={{ fontSize: 10, marginTop: 6 }}>
          {formatInTimezone(appointment.startDate, timezone, "h:mm")}
          {" - "}
          {formatInTimezone(appointment.endDate, timezone, "h:mm a")}
        </Text>

        {/* Cliente */}
        <Text
          style={{
            color: isPastAppointment ? "#495057" : textColor,
            fontSize: 10,
          }}
        >
          {isBirthday
            ? `🎉 ${appointment.client.name} 🎉`
            : appointment.client.name}
        </Text>

        {/* Ícono de recordatorio (esquina fija, clickeable) */}
        <Tooltip
          label={
            updatingReminder
              ? "Actualizando..."
              : appointment.reminderSent
              ? "Recordatorio enviado - Click para marcar como pendiente"
              : "Recordatorio pendiente"
          }
          withArrow
        >
          <ActionIcon
            className="ignore-modal"
            size="xs"
            variant="transparent"
            loading={updatingReminder}
            disabled={updatingReminder}
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              pointerEvents: "auto",
              cursor: appointment.reminderSent && !updatingReminder ? "pointer" : "default",
            }}
            onClick={
              appointment.reminderSent && !updatingReminder
                ? async (e) => {
                    e.stopPropagation();
                    setUpdatingReminder(true);
                    try {
                      const updatedAppointment = await updateAppointment(
                        appointment._id,
                        { reminderSent: false }
                      );

                      if (updatedAppointment) {
                        showNotification({
                          title: "Recordatorio actualizado",
                          message: "El recordatorio se marcó como pendiente",
                          color: "blue",
                          autoClose: 3000,
                          position: "top-right",
                        });

                        // Actualizar solo este appointment en el estado local
                        setAppointments((prevAppointments) =>
                          prevAppointments.map((appt) =>
                            appt._id === appointment._id
                              ? { ...appt, reminderSent: false }
                              : appt
                          )
                        );
                      }
                    } catch (error) {
                      console.error(error);
                      showNotification({
                        title: "Error",
                        message: "No se pudo actualizar el recordatorio",
                        color: "red",
                        autoClose: 3000,
                        position: "top-right",
                      });
                    } finally {
                      setUpdatingReminder(false);
                    }
                  }
                : undefined
            }
          >
            {appointment.reminderSent ? (
              <BiCheckCircle size={12} color="teal" />
            ) : (
              <BiTimeFive size={12} color="gray" />
            )}
          </ActionIcon>
        </Tooltip>
      </Paper>
    </>
  );
};

export default React.memo(AppointmentCard);
