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
  updateAppointment,
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

dayjs.extend(localizedFormat);
dayjs.locale("es");

interface AppointmentCardProps {
  appointment: Appointment;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  appoinments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
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
          color: isCancelled ? "#868e96" : textColor, // ❌ Texto gris si cancelada
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "6px 8px 6px 8px",
          height: "100%",
          position: "relative",
          cursor: isCancelled ? "default" : "pointer",
          fontSize: 10,
          border: isCancelled ? "1px solid #ced4da" : "1px solid gray", // ❌ Borde gris si cancelada
          opacity: isCancelled ? 0.5 : 1, // ❌ Opacidad reducida si cancelada
          textDecoration: isCancelled ? "line-through" : "none", // ❌ Tachado si cancelada
          pointerEvents: isCancelled ? "none" : "auto", // ❌ Permitir click a través de citas canceladas
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

        {/* Horario */}
        <Text fw={700} style={{ fontSize: 10, marginTop: 6 }}>
          {formatInTimezone(appointment.startDate, timezone, "h:mm")}
          {" - "}
          {formatInTimezone(appointment.endDate, timezone, "h:mm a")}
        </Text>

        {/* Cliente */}
        <Text
          style={{
            color: textColor,
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
