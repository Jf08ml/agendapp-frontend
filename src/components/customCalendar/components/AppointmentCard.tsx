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
  BiDotsVertical,
  BiEdit,
  BiTrash,
  BiCheck,
  BiCheckCircle,
  BiCopy,
  BiPlus,
} from "react-icons/bi";
import { format } from "date-fns";
import {
  Appointment,
  updateAppointment,
} from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { FaWhatsapp } from "react-icons/fa";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { showNotification } from "@mantine/notifications";

dayjs.extend(localizedFormat);
dayjs.locale("es");

interface AppointmentCardProps {
  appointment: Appointment;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  appoinments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
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

const getStatusStyles = (status: string) => {
  switch (status) {
    case "confirmed":
      return { backgroundColor: "#d4edda", borderColor: "#28a745" };
    case "pending":
      return { backgroundColor: "#fff3cd", borderColor: "#ffc107" };
    case "cancelled":
      return { backgroundColor: "#f8d7da", borderColor: "#dc3545" };
    default:
      return { backgroundColor: "#f0f4f8", borderColor: "#007bff" };
  }
};

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  setAppointments,
  appoinments,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
}) => {
  const { borderColor } = getStatusStyles(appointment.status);
  const { hasPermission } = usePermissions();
  const textColor = getTextColor(appointment.employee.color || "#ffffff");

  const [modalOpened, setModalOpened] = useState(false);

  const isPastAppointment = dayjs(appointment.endDate).isBefore(dayjs());

  const { role } = useSelector((state: RootState) => state.auth);

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
      // Crea una copia del appointment con los nuevos valores
      const updatedAppointmentData = {
        ...appointment,
        customPrice,
        additionalItems,
      };

      // Llama a la API para actualizar el appointment
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

        // Si necesitas actualizar la lista de appointments en la UI:
        const updatedAppointments = appoinments.map((appt) =>
          appt._id === updatedAppointmentData._id
            ? updatedAppointmentData
            : appt
        );

        // Aquí puedes llamar a una función de actualización en el componente padre o en el estado global
        // Por ejemplo: setAppointments(updatedAppointments);
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
      .join("\n\n"); // Salto de línea adicional entre servicios

    return `*DETALLES DE LA CITA*
👩‍🦰 *Cliente:* ${appointment.client.name}
📅 *Horario:* ${dayjs(appointment.startDate).format(
      "dddd, D MMMM YYYY, h:mm A"
    )} - ${dayjs(appointment.endDate).format("h:mm A")}
💵 *Abono:* ${appointment.advancePayment}

${clientServices}`;
  };

  const whatsappURL = `https://wa.me/${appointment.client.phoneNumber}`;

  return (
    <>
      {/* Modal para mostrar detalles de la cita */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        withCloseButton={false}
        size="lg"
        title={null}
        centered
      >
        <Flex
          direction="column"
          gap="md"
          // Evita que se cierre el modal si hacen clic en estos hijos
          onClick={(event) => event.stopPropagation()}
        >
          {/* Contenedor principal */}
          <Tabs defaultValue="details">
            <Tabs.List>
              <Tabs.Tab value="details">Detalle de la Cita</Tabs.Tab>
              <Tabs.Tab value="modify">Modificar Precio y Adicionales</Tabs.Tab>
              <Tabs.Tab value="invoice">Facturar</Tabs.Tab>
            </Tabs.List>

            {/* Detalle de la cita */}
            <Tabs.Panel value="details">
              <Flex
                direction="column"
                gap="md"
                // Evita que se cierre el modal si hacen clic en estos hijos
                onClick={(event) => event.stopPropagation()}
              >
                {/* Lista de citas del cliente */}
                <Box mt="lg">
                  {appoinments
                    .filter(
                      (appt) => appt.client._id === appointment.client._id
                    )
                    .map((appt, index) => {
                      const isCurrentAppointment = appt._id === appointment._id; // Resaltar la cita actual
                      return (
                        <Flex
                          key={index}
                          direction="row"
                          gap="xs"
                          align="center"
                          py={5}
                          style={{
                            borderBottom: "1px solid #e0e0e0",
                            backgroundColor: isCurrentAppointment
                              ? "#d4f5ff"
                              : "transparent",
                            padding: isCurrentAppointment ? "5px" : "2px",
                            borderRadius: isCurrentAppointment ? "4px" : "0",
                            border: isCurrentAppointment
                              ? "2px solid #007bff"
                              : "none",
                          }}
                        >
                          {appt.service ? (
                            appt.service.name
                          ) : (
                            <Text c="red" fw={700} size="sm">
                              Sin Servicio
                            </Text>
                          )}
                          <Text size="sm" c="dimmed">
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

                {/* Sección de Horario y detalles */}
                <Box>
                  <Flex direction="column" gap="xs">
                    <Text size="sm">
                      <strong>Horario:</strong>{" "}
                      {dayjs(appointment.startDate).format(
                        "dddd, D MMMM YYYY, h:mm A"
                      )}{" "}
                      - {dayjs(appointment.endDate).format("h:mm A")}
                    </Text>

                    <Text size="sm">
                      <strong>Abono:</strong>{" "}
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(appointment.advancePayment)}
                    </Text>

                    {/* <Text size="sm">
                      <strong>Estado:</strong> {appointment.status}
                    </Text> */}

                    <Text size="sm">
                      <strong>Cliente: </strong> {appointment.client.name}
                    </Text>

                    {role === "admin" && (
                      <Flex align="center">
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
                                size="md"
                                variant="subtle"
                              >
                                {copied ? (
                                  <BiCheckCircle size={16} />
                                ) : (
                                  <BiCopy size={16} />
                                )}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Flex>
                    )}

                    {getIsBirthday(appointment.client.birthDate) && (
                      <Text size="sm" c="orange">
                        🎉 Hoy es el cumpleaños de {appointment.client.name} 🎉
                      </Text>
                    )}
                  </Flex>
                </Box>

                <Divider />

                <Flex gap="md" align="center">
                  {/* Botón para copiar texto */}
                  <Flex direction="column" align="center">
                    <ActionIcon
                      color="blue"
                      size="lg"
                      variant="filled"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          generateAppointmentDetails(appointment, appoinments)
                        )
                      }
                      style={{
                        backgroundColor: "#007bff",
                        color: "#fff",
                      }}
                    >
                      <BiCopy size={16} />
                    </ActionIcon>
                    <Text size="xs" mt={4}>
                      Copiar detalle para WhatsApp
                    </Text>
                  </Flex>

                  {/* Botón para enviar por WhatsApp */}
                  {role === "admin" && (
                    <Flex direction="column" align="center">
                      <ActionIcon
                        color="green"
                        size="lg"
                        variant="filled"
                        onClick={() => {
                          window.open(whatsappURL, "_blank");
                        }}
                        style={{ backgroundColor: "#25D366", color: "#fff" }}
                      >
                        <FaWhatsapp size={16} />
                      </ActionIcon>
                      <Text size="xs" mt={4}>
                        Enviar WhatsApp
                      </Text>
                    </Flex>
                  )}
                </Flex>

                <Divider />
              </Flex>
            </Tabs.Panel>

            {/* Pestaña 2: Modificar precio y adicionales */}
            <Tabs.Panel value="modify">
              {/* Precio personalizado */}
              <Flex direction="column" gap="xs" mt="sm">
                <NumberInput
                  label="Cambiar precio del servicio"
                  prefix="$ "
                  thousandSeparator=","
                  value={customPrice || ""}
                  onChange={(value) => setCustomPrice(Number(value) || null)}
                />
              </Flex>

              <Divider />

              <Flex direction="column" mt="md" gap="xs">
                <Text>Añadir adicionales</Text>
                <Flex align="center" gap="xs">
                  <TextInput
                    label="Nombre"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
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
                  />
                  <ActionIcon color="green" onClick={handleAddItem} mt="lg">
                    <BiPlus size={24} />
                  </ActionIcon>
                </Flex>
              </Flex>

              {/* Elementos adicionales */}
              <Box mt="md">
                <Text fw={700} mb="sm">
                  Elementos adicionales
                </Text>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
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
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(item.price)}
                        </Table.Td>

                        <Table.Td>
                          <ActionIcon
                            color="red"
                            onClick={() => handleRemoveItem(index)}
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
                Guardar Cambios
              </Button>
            </Tabs.Panel>

            {/* Pestaña 3: Facturar */}
            <Tabs.Panel value="invoice">
              <Flex direction="column" gap="sm" mt="sm">
                <Text fw={700} size="lg" mb="md">
                  Resumen de Facturación
                </Text>

                {/* Filtro de citas del cliente */}
                <Table.ScrollContainer minWidth={500}>
                  <Table
                    striped
                    highlightOnHover
                    withTableBorder
                    withColumnBorders
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Servicio</Table.Th>
                        <Table.Th>Precio Base</Table.Th>
                        <Table.Th>Precio Usado</Table.Th>
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
                              {/* Servicio */}
                              <Table.Td>
                                {" "}
                                {appt.service ? (
                                  appt.service.name
                                ) : (
                                  <Text c="red" fw={700} size="sm">
                                    Sin Servicio
                                  </Text>
                                )}
                              </Table.Td>

                              {/* Precio Base */}
                              <Table.Td>
                                <Text>
                                  {new Intl.NumberFormat("es-CO", {
                                    style: "currency",
                                    currency: "COP",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(appt.totalPrice || 0)}
                                </Text>
                                {appt.customPrice && (
                                  <Text size="xs" color="red">
                                    (No se usa para facturar)
                                  </Text>
                                )}
                              </Table.Td>

                              {/* Precio Usado */}
                              <Table.Td>
                                <Text fw={700}>
                                  {new Intl.NumberFormat("es-CO", {
                                    style: "currency",
                                    currency: "COP",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(usedPrice)}
                                </Text>
                                {appt.customPrice && (
                                  <Text size="xs" color="green">
                                    (Precio personalizado)
                                  </Text>
                                )}
                              </Table.Td>

                              {/* Adicionales */}
                              <Table.Td>
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(additionalTotal)}
                              </Table.Td>

                              {/* Total */}
                              <Table.Td>
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(total)}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

                {/* Total general */}
                <Flex
                  justify="space-between"
                  align="center"
                  mt="xs"
                  style={{
                    backgroundColor: "#e8f4fc", // Fondo resaltado
                    borderRadius: "8px", // Bordes redondeados
                    padding: "12px 16px", // Espaciado interno
                    border: "2px solid #007bff", // Borde resaltado
                  }}
                >
                  <Text fw={900} size="xl" color="blue">
                    Total General:
                  </Text>
                  <Text fw={900} size="xl" color="green">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
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
                        }, 0)
                    )}
                  </Text>
                </Flex>
              </Flex>
            </Tabs.Panel>
          </Tabs>
          {/* Botón para cerrar */}
          <Group justify="right">
            <Button
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setModalOpened(false);
              }}
            >
              Cerrar
            </Button>
          </Group>
        </Flex>
      </Modal>

      {/* Card de la cita */}
      <Paper
        shadow="xs"
        radius="sm"
        style={{
          backgroundColor: isPastAppointment
            ? "#ffffff"
            : appointment.employee.color,
          color: textColor,
          paddingTop: "10px",
          paddingLeft: "5PX",
          borderLeft: `4px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          overflow: "visible",
          position: "relative",
          cursor: "pointer",
        }}
        onClick={(e) => {
          // Para saber si el usuario hizo clic en el ícono
          const isIconClick = (e.target as HTMLElement).closest(
            ".ignore-modal"
          );
          if (!isIconClick) {
            setModalOpened(true);
          }
        }}
      >
        {appointment.employeeRequestedByClient && (
          <Badge
            color="violet"
            size="xxs"
            radius="xxs"
            style={{
              position: "absolute",
              top: "-1px",
              right: "0px",
              fontSize: "8px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            🌟Cita con {appointment.employee.names}
          </Badge>
        )}
        <Text mt="xs" fw={800} style={{ fontSize: "10px" }}>
          {format(appointment.startDate, "h:mm")}
          {" - "}
          {format(appointment.endDate, "h:mm a")}
        </Text>

        <Text style={{ color: textColor, fontSize: "12px" }}>
          <Flex gap="xs">
            {getIsBirthday(appointment.client.birthDate)
              ? `🎉 ${appointment.client.name} 🎉`
              : appointment.client.name}
          </Flex>
        </Text>

        <Menu position="top-end" withArrow>
          <Menu.Target>
            <Tooltip label="Opciones" withArrow>
              <ActionIcon
                className="ignore-modal"
                variant="transparent"
                color="dark"
                style={{
                  position: "absolute",
                  top: -5,
                  left: -17,
                  zIndex: 10,
                }}
              >
                <BiDotsVertical size={24} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
            <Menu.Item
              leftSection={<BiEdit size={16} />}
              disabled={!hasPermission("appointments:update")}
              onClick={() => onEditAppointment(appointment)}
            >
              Editar Cita
            </Menu.Item>
            <Menu.Item
              leftSection={<BiTrash size={16} />}
              disabled={!hasPermission("appointments:cancel")}
              onClick={() => onCancelAppointment(appointment._id)}
              color="red"
            >
              Cancelar Cita
            </Menu.Item>
            <Menu.Item
              leftSection={<BiCheck size={16} />}
              disabled={!hasPermission("appointments:confirm")}
              onClick={() => onConfirmAppointment(appointment._id)}
              color="green"
            >
              Confirmar Cita Realizada
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Paper>
    </>
  );
};

export default AppointmentCard;
