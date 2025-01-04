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
} from "@mantine/core";
import { BiDotsVertical, BiEdit, BiTrash, BiCheck } from "react-icons/bi";
import { format } from "date-fns";
import { Appointment } from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es"; // Importar el idioma español
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat); // Extender con el plugin de formatos localizados
dayjs.locale("es"); // Configurar el idioma español

interface AppointmentCardProps {
  appointment: Appointment;
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
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
}) => {
  const { borderColor } = getStatusStyles(appointment.status);
  const { hasPermission } = usePermissions();
  const textColor = getTextColor(appointment.employee.color || "#ffffff");

  const [modalOpened, setModalOpened] = useState(false);

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

  return (
    <>
      {/* Modal para mostrar detalles de la cita */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Detalles de la Cita"
        size="lg"
      >
        <Flex
          direction="column"
          gap="md"
          onClick={(event) => event.stopPropagation()} 
        >
          <Text fw={700} size="md">
            Servicio: {appointment.service.name}
          </Text>
          <Text size="sm">
            Horario:{" "}
            {dayjs(appointment.startDate).format("dddd, D MMMM YYYY, h:mm A")} -{" "}
            {dayjs(appointment.endDate).format("h:mm A")}
          </Text>
          <Text size="sm">Abono: {appointment.advancePayment}</Text>
          <Text size="sm">Empleado: {appointment.employee.names}</Text>
          <Text size="sm">Estado: {appointment.status}</Text>
          <Text size="sm">Cliente: {appointment.client.name}</Text>
          {getIsBirthday(appointment.client.birthDate) && (
            <Text size="sm" c="orange">
              🎉 Hoy es el cumpleaños de {appointment.client.name} 🎉
            </Text>
          )}
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
          backgroundColor: appointment.employee.color,
          color: textColor,
          padding: "10px",
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
        <Text mt="xs" c="blue" style={{ fontSize: "9px" }}>
          {format(appointment.startDate, "h:mm")}{" - "}
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
              style={{ position: "absolute", bottom: -5, left: -12, zIndex: 10 }}
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
