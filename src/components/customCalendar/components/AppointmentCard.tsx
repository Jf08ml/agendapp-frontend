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
} from "@mantine/core";
import {
  BiDotsVertical,
  BiEdit,
  BiTrash,
  BiCheck,
  BiCheckCircle,
  BiCopy,
} from "react-icons/bi";
import { format } from "date-fns";
import { Appointment } from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { FaWhatsapp } from "react-icons/fa";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

dayjs.extend(localizedFormat);
dayjs.locale("es");

interface AppointmentCardProps {
  appointment: Appointment;
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
      .map(
        (appt) =>
          `⭐ *Servicio:* ${appt.service.name}\n👤 *Empleado:* ${appt.employee.names}`
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
        size="lg"
      >
        <Flex
          direction="column"
          gap="md"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Botón para copiar al portapapeles */}
          <Box
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text fw={700} size="md">
              Detalles de la Cita
            </Text>
            <Flex gap="md">
              {/* Ícono para copiar texto */}
              <CopyButton
                value={generateAppointmentDetails(appointment, appoinments)}
                timeout={2000}
              >
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? "Copiado" : "Copiar en formato WhatsApp"}
                    withArrow
                  >
                    <ActionIcon
                      color={copied ? "green" : "blue"}
                      onClick={copy}
                      size="lg"
                      variant="filled"
                      style={{
                        backgroundColor: copied ? "#25D366" : "#007bff",
                        color: "#fff",
                      }}
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

              {/* Ícono para enviar por WhatsApp */}
              {role === "admin" && (
                <ActionIcon
                  color="green"
                  size="lg"
                  variant="filled"
                  style={{ backgroundColor: "#25D366", color: "#fff" }}
                  onClick={() => {
                    window.open(whatsappURL, "_blank");
                  }}
                >
                  <FaWhatsapp size={16} />
                </ActionIcon>
              )}
            </Flex>
          </Box>
          {/* Servicios asociados */}
          <Box>
            <Text fw={700} size="sm">
              Servicios:
            </Text>
            {appoinments
              .filter((appt) => appt.client._id === appointment.client._id)
              .map((appt, index) => (
                <Flex
                  key={index}
                  direction="row"
                  gap="sm"
                  align="center"
                  style={{
                    padding: "4px 0",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <Text size="sm">- {appt.service.name}</Text>
                  <Text size="sm" color="dimmed">
                    (Empleado: {appt.employee.names})
                  </Text>
                </Flex>
              ))}
          </Box>

          {/* Horario y otros detalles */}
          <Box>
            <Text size="sm">
              Horario:{" "}
              {dayjs(appointment.startDate).format("dddd, D MMMM YYYY, h:mm A")}{" "}
              - {dayjs(appointment.endDate).format("h:mm A")}
            </Text>
            <Text size="sm">Abono: {appointment.advancePayment}</Text>
            <Text size="sm">Estado: {appointment.status}</Text>
            <Text size="sm">Cliente: {appointment.client.name}</Text>
            {getIsBirthday(appointment.client.birthDate) && (
              <Text size="sm" c="orange">
                🎉 Hoy es el cumpleaños de {appointment.client.name} 🎉
              </Text>
            )}
          </Box>
        </Flex>
        <Button
          mt="md"
          fullWidth
          onClick={(event) => {
            event.stopPropagation();
            setModalOpened(false);
          }}
        >
          Cerrar
        </Button>
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
          overflow: "hidden",
          position: "relative",
          cursor: "pointer",
        }}
        onClick={() => setModalOpened(true)}
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
            <ActionIcon
              variant="transparent"
              color="dark"
              style={{
                position: "absolute",
                bottom: -5,
                left: -12,
                zIndex: 10,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <BiDotsVertical />
            </ActionIcon>
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
