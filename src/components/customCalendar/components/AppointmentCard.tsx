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
  Divider,
  TextInput,
  Table,
  NumberInput,
  Tabs,
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
} from "react-icons/bi";
import {
  Appointment,
  updateAppointment,
} from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { formatInTimezone, formatFullDateInTimezone } from "../../../utils/timezoneUtils";
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
  timezone = 'America/Bogota', // 🌍 Default timezone
}) => {
  // const { borderColor } = getStatusStyles(appointment.status);
  const { hasPermission } = usePermissions();

  const employeeColor = appointment.employee.color || "#ffffff";
  const textColor = getTextColor(employeeColor);

  const [modalOpened, setModalOpened] = useState(false);

  // 👇 esto debe seguir funcionando: citas pasadas cambian color
  const isPastAppointment = dayjs(appointment.endDate).isBefore(dayjs());
  
  // 🚫 Detectar si está cancelada
  const isCancelled = appointment.status.includes('cancelled');

  const { role } = useSelector((state: RootState) => state.auth);
  const organization = useSelector((state: RootState) => state.organization.organization);

  const [customPrice, setCustomPrice] = useState<number | null>(
    appointment.customPrice || 0
  );
  const [additionalItems, setAdditionalItems] = useState(
    appointment.additionalItems || []
  );
  const [newItem, setNewItem] = useState({ name: "", price: 0 });

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
        radius="md"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex direction="column" gap="md" onClick={(e) => e.stopPropagation()}>
          <Tabs defaultValue="details" keepMounted={false}>
            <Tabs.List mb="sm">
              <Tabs.Tab value="details">Detalle</Tabs.Tab>
              <Tabs.Tab value="modify">Precio y adicionales</Tabs.Tab>
              <Tabs.Tab value="invoice">Facturar</Tabs.Tab>
            </Tabs.List>

            {/* -------- PANEL: Detalle -------- */}
            <Tabs.Panel value="details">
              <Flex direction="column" gap="md">
                <Box mt="xs">
                  <Text fw={600} size="sm" mb={4}>
                    Historial de citas del cliente
                  </Text>
                  {appoinments
                    .filter(
                      (appt) => appt.client._id === appointment.client._id
                    )
                    .map((appt, index) => {
                      const isCurrentAppointment = appt._id === appointment._id;
                      return (
                        <Flex
                          key={index}
                          direction="row"
                          gap="xs"
                          align="center"
                          py={5}
                          px={8}
                          style={{
                            borderRadius: 6,
                            border: isCurrentAppointment
                              ? "1px solid #1971c2"
                              : "1px solid #e0e0e0",
                            backgroundColor: isCurrentAppointment
                              ? "#e7f5ff"
                              : "#f8f9fa",
                          }}
                        >
                          <Text size="sm" fw={500}>
                            {appt.service ? (
                              appt.service.name
                            ) : (
                              <Text component="span" c="red" fw={700} size="sm">
                                Sin Servicio
                              </Text>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            (Empleado:{" "}
                            {appt.employeeRequestedByClient ? (
                              <strong style={{ color: "purple" }}>
                                {appt.employee.names} (solicitado)
                              </strong>
                            ) : (
                              appt.employee.names
                            )}
                            )
                          </Text>
                        </Flex>
                      );
                    })}
                </Box>

                <Box>
                  <Text fw={600} size="sm" mb={4}>
                    Resumen
                  </Text>
                  <Flex direction="column" gap={4}>
                    <Text size="sm">
                      <strong>Horario:</strong>{" "}
                      {formatFullDateInTimezone(
                        appointment.startDate,
                        timezone,
                        "dddd, D MMMM YYYY, h:mm A"
                      )}
                      - {formatInTimezone(appointment.endDate, timezone, "h:mm A")}
                    </Text>

                    <Text size="sm">
                      <strong>Abono:</strong>{" "}
                      {formatCurrency(appointment.advancePayment, organization?.currency || "COP")}
                    </Text>

                    <Text size="sm">
                      <strong>Cliente: </strong> {appointment.client.name}
                    </Text>

                    {role === "admin" && (
                      <Flex align="center" gap={4}>
                        <Text size="sm">
                          <strong>Teléfono:</strong>{" "}
                          {appointment.client.phoneNumber}
                        </Text>
                        <CopyButton
                          value={appointment.client.phoneNumber}
                          timeout={2000}
                        >
                          {({ copied, copy }) => (
                            <Tooltip
                              label={copied ? "Copiado" : "Copiar número"}
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

                    {isBirthday && (
                      <Text size="sm" c="orange">
                        🎉 Hoy es el cumpleaños de {appointment.client.name} 🎉
                      </Text>
                    )}
                  </Flex>
                </Box>

                <Divider />

                <Group gap="lg">
                  <Flex direction="column" align="center" gap={4}>
                    <Tooltip label="Copiar detalle de la cita" withArrow>
                      <ActionIcon
                        color="blue"
                        size="lg"
                        variant="filled"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            generateAppointmentDetails(
                              appointment,
                              appoinments
                            )
                          )
                        }
                      >
                        <BiCopy size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Text size="xs">Copiar detalle</Text>
                  </Flex>

                  {role === "admin" && (
                    <Flex direction="column" align="center" gap={4}>
                      <Tooltip label="Abrir chat de WhatsApp" withArrow>
                        <ActionIcon
                          color="green"
                          size="lg"
                          variant="filled"
                          onClick={() => {
                            window.open(whatsappURL, "_blank");
                          }}
                        >
                          <FaWhatsapp size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Text size="xs">Enviar WhatsApp</Text>
                    </Flex>
                  )}
                </Group>

                <Divider />
              </Flex>
            </Tabs.Panel>

            {/* -------- PANEL: Modificar precio -------- */}
            <Tabs.Panel value="modify">
              <Flex direction="column" gap="sm" mt="sm">
                <NumberInput
                  label="Cambiar precio del servicio"
                  prefix="$ "
                  thousandSeparator=","
                  value={customPrice || ""}
                  onChange={(value) => setCustomPrice(Number(value) || null)}
                />
              </Flex>

              <Divider my="sm" />

              <Flex direction="column" gap="xs">
                <Text fw={500}>Añadir adicionales</Text>
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
              </Flex>

              <Box mt="md">
                <Text fw={700} mb="sm">
                  Elementos adicionales
                </Text>
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
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {additionalItems.map((item, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{item.name}</Table.Td>
                        <Table.Td>
                          {formatCurrency(item.price, organization?.currency || "COP")}
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

              <Button fullWidth my="md" onClick={handleSaveChanges}>
                Guardar cambios
              </Button>
            </Tabs.Panel>

            {/* -------- PANEL: Facturar -------- */}
            <Tabs.Panel value="invoice">
              <Flex direction="column" gap="sm" mt="sm">
                <Text fw={700} size="lg" mb="md">
                  Resumen de facturación
                </Text>

                <Table.ScrollContainer minWidth={500}>
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
                        <Table.Th>Precio base</Table.Th>
                        <Table.Th>Precio usado</Table.Th>
                        <Table.Th>Adicionales</Table.Th>
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
                                  <Text c="red" fw={700} size="sm">
                                    Sin Servicio
                                  </Text>
                                )}
                              </Table.Td>

                              <Table.Td>
                                <Text>
                                  {formatCurrency(appt.totalPrice || 0, organization?.currency || "COP")}
                                </Text>
                                {appt.customPrice && (
                                  <Text size="xs" c="red">
                                    (No se usa para facturar)
                                  </Text>
                                )}
                              </Table.Td>

                              <Table.Td>
                                <Text fw={700}>
                                  {formatCurrency(usedPrice, organization?.currency || "COP")}
                                </Text>
                                {appt.customPrice && (
                                  <Text size="xs" c="green">
                                    (Precio personalizado)
                                  </Text>
                                )}
                              </Table.Td>

                              <Table.Td>
                                {formatCurrency(additionalTotal, organization?.currency || "COP")}
                              </Table.Td>

                              <Table.Td>
                                {formatCurrency(total, organization?.currency || "COP")}
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
                  style={{
                    backgroundColor: "#e7f5ff",
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: "1px solid #1971c2",
                  }}
                >
                  <Text fw={800} size="sm" c="blue">
                    Total general:
                  </Text>
                  <Text fw={900} size="lg" c="green">
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

                          const total = appt.customPrice
                            ? appt.customPrice + additionalTotal
                            : (appt.totalPrice || 0) + additionalTotal;

                          return acc + total;
                        }, 0),
                      organization?.currency || "COP"
                    )}
                  </Text>
                </Flex>
              </Flex>
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpened(false)}
            >
              Cerrar
            </Button>
          </Group>
        </Flex>
      </Modal>

      {/* -------- CARD EN LA COLUMNA -------- */}
      <Paper
        shadow={isPastAppointment ? "xs" : "sm"}
        radius="md"
        withBorder
        style={{
          backgroundColor: isCancelled ? "#f1f3f5" : (isPastAppointment ? "#ffffff" : employeeColor), // ❌ Gris si cancelada
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
          textDecoration: isCancelled ? 'line-through' : 'none', // ❌ Tachado si cancelada
          pointerEvents: isCancelled ? 'none' : 'auto', // ❌ Permitir click a través de citas canceladas
        }}
        onClick={(e) => {
          // clave para que NO se propague al onClick de la columna
          e.stopPropagation();
          const isIconClick = (e.target as HTMLElement).closest(".ignore-modal");
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
        <Text fw={700} style={{ fontSize: 10, marginTop: 6}}>
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

        {/* Ícono de recordatorio (esquina fija, informativo) */}
        <Tooltip
          label={
            appointment.reminderSent
              ? "Recordatorio enviado"
              : "Recordatorio pendiente"
          }
          withArrow
        >
          <ActionIcon
            className="ignore-modal"
            size="xs"
            variant="transparent"
            style={{
              position: "absolute",
              bottom: -2,
              right: -2, 
              pointerEvents: "auto",
            }}
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
