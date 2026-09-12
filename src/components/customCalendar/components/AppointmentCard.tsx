import React, { useState } from "react";
import {
  Paper,
  Text,
  Badge,
  Menu,
  ActionIcon,
  Flex,
  Box,
  Tooltip,
} from "@mantine/core";
import {
  BiEdit,
  BiTrash,
  BiCheck,
  BiCheckCircle,
  BiXCircle,
  BiTimeFive,
  BiExpand,
} from "react-icons/bi";
import { Appointment, updateAppointment } from "../../../services/appointmentService";
import { usePermissions } from "../../../hooks/usePermissions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { formatInTimezone } from "../../../utils/timezoneUtils";
import { FaWhatsapp } from "react-icons/fa";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { showNotification } from "@mantine/notifications";
import { IoSettings } from "react-icons/io5";
import { IconUserCheck, IconUserX, IconListDetails } from "@tabler/icons-react";

dayjs.extend(localizedFormat);
dayjs.locale("es");

interface AppointmentCardProps {
  appointment: Appointment;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  appoinments: Appointment[];
  onEditAppointment: (appointment: Appointment, initialTab?: string) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  isExpanded?: (appointment: Appointment) => boolean;
  handleToggleExpand?: (appointmentId: string) => void;
  timezone?: string; // 🌍 Timezone de la organización
  timeFormat?: string;
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
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  isExpanded,
  handleToggleExpand,
  timezone = "America/Bogota", // 🌍 Default timezone
  timeFormat,
}) => {
  // const { borderColor } = getStatusStyles(appointment.status);
  const { hasPermission } = usePermissions();

  const employeeColor = appointment.employee.color || "#ffffff";
  const textColor = getTextColor(employeeColor);

  // 👇 esto debe seguir funcionando: citas pasadas cambian color
  const isPastAppointment = dayjs(appointment.endDate).isBefore(dayjs());

  // 🚫 Detectar si está cancelada
  const isCancelled = appointment.status.includes("cancelled");

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const [updatingReminder, setUpdatingReminder] = useState(false);

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

  const isBirthday = getIsBirthday(appointment.client.birthDate);

  // 📨 Confirmación de WhatsApp: color + texto según el resultado que el
  // backend guardó al intentar enviar el mensaje de agendamiento.
  const waConfirmationConfig: Record<string, { color: string; shortLabel: string; fullLabel: string }> = {
    sent: { color: "#25D366", shortLabel: "Enviada", fullLabel: "Confirmación de WhatsApp enviada" },
    failed: { color: "#e03131", shortLabel: "Falló el envío", fullLabel: "Confirmación de WhatsApp: falló el envío" },
    blocked: { color: "#f08c00", shortLabel: "Bloqueada", fullLabel: "Confirmación de WhatsApp bloqueada (plan o plantilla deshabilitada)" },
    skipped: { color: "#868e96", shortLabel: "Omitida", fullLabel: "Confirmación de WhatsApp omitida (sin teléfono utilizable)" },
  };
  // 📶 Entrega real reportada por WhatsApp (ack de Baileys) — refina "sent"
  // (que solo significa "el envío no lanzó error") cuando ya sabemos si
  // WhatsApp la aceptó (✓), la entregó (✓✓) o la rechazó. blocked/skipped/
  // failed en waConfirmationStatus ya son definitivos y no llevan ack.
  const waDeliveryConfig: Record<string, { color: string; shortLabel: string; fullLabel: string }> = {
    sent: { color: "#25D366", shortLabel: "Enviada (✓)", fullLabel: "Confirmación de WhatsApp enviada — WhatsApp la aceptó, esperando confirmación de entrega" },
    delivered: { color: "#25D366", shortLabel: "Entregada (✓✓)", fullLabel: "Confirmación de WhatsApp entregada" },
    failed: { color: "#e03131", shortLabel: "No entregada", fullLabel: "Confirmación de WhatsApp: WhatsApp no pudo entregarla (revisar el número del cliente)" },
  };
  const waConfirmationDelivery =
    appointment.waConfirmationStatus === "sent" && appointment.waConfirmationDeliveryStatus
      ? waDeliveryConfig[appointment.waConfirmationDeliveryStatus]
      : null;
  const waConfirmation =
    waConfirmationDelivery ??
    (appointment.waConfirmationStatus ? waConfirmationConfig[appointment.waConfirmationStatus] : null);
  const waConfirmationColor = waConfirmation?.color || "#868e96";
  const waConfirmationTooltip = waConfirmation ? (
    <>
      {waConfirmation.fullLabel}
      {appointment.waConfirmationError && (
        <>
          <br />
          {appointment.waConfirmationError}
        </>
      )}
      {appointment.waConfirmationSentAt && (
        <>
          <br />
          {dayjs(appointment.waConfirmationSentAt).locale("es").format("D MMM YYYY, h:mm A")}
        </>
      )}
    </>
  ) : (
    ""
  );

  // 🔔 Recordatorio: misma idea que la confirmación — reminderSent solo dice
  // "se intentó enviar"; reminderDeliveryStatus/secondReminderDeliveryStatus
  // (el que aplique según la última etapa enviada) dice si WhatsApp lo aceptó,
  // lo entregó, o lo rechazó.
  const reminderDeliveryStatus =
    appointment.secondReminderDeliveryStatus || appointment.reminderDeliveryStatus;
  const reminderDeliveryConfig: Record<string, { color: string; label: string }> = {
    sent: { color: "teal", label: "Recordatorio enviado (✓), esperando confirmación de entrega" },
    delivered: { color: "#25D366", label: "Recordatorio entregado (✓✓)" },
    failed: { color: "#e03131", label: "WhatsApp no pudo entregar el recordatorio (❌)" },
  };
  const reminderDelivery = reminderDeliveryStatus ? reminderDeliveryConfig[reminderDeliveryStatus] : null;

  // 🕒 Hora de inicio/fin — se muestra en una esquina fija (position absolute) para
  // no agregar una fila al flujo del contenido y evitar que desborde cards chicas.
  const cardTimeFormat = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const startTimeLabel = formatInTimezone(appointment.startDate, timezone, cardTimeFormat);
  const endTimeLabel = formatInTimezone(appointment.endDate, timezone, cardTimeFormat);

  return (
    <Paper
        radius={10}
        style={{
          backgroundColor: isCancelled
            ? "#F0EBE0"
            : isPastAppointment
            ? "#FAF7F2"
            : employeeColor,
          color: isCancelled ? "#9CA3AF" : isPastAppointment ? "#8B92A6" : textColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "6px 8px",
          height: "100%",
          position: "relative",
          cursor: isCancelled ? "default" : "pointer",
          fontSize: 10,
          border: isCancelled
            ? "1px dashed #C9C2B5"
            : appointment.status === "attended"
            ? "2px solid #12b886"
            : appointment.status === "no_show"
            ? "2px solid #e64980"
            : isPastAppointment
            ? "1px solid #E7E2D6"
            : "1px solid rgba(0,0,0,0.12)",
          boxShadow: isCancelled || isPastAppointment
            ? "none"
            : "0 1px 4px rgba(0,0,0,0.10)",
          opacity: isCancelled ? 0.5 : appointment.status === "no_show" ? 0.65 : 1,
          textDecoration: isCancelled ? "line-through" : "none",
          pointerEvents: isCancelled ? "none" : "auto",
          transition: "opacity 0.12s",
        }}
        onClick={(e) => {
          // clave para que NO se propague al onClick de la columna
          e.stopPropagation();
          const isIconClick = (e.target as HTMLElement).closest(
            ".ignore-modal"
          );
          if (!isIconClick) {
            onEditAppointment(appointment);
          }
        }}
      >
        {/* Hora de inicio-fin (esquina fija arriba-derecha, texto simple sin badge) */}
        <Text
          style={{
            position: "absolute",
            top: 0,
            right: 2,
            fontSize: 8,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -0.2,
            whiteSpace: "nowrap",
            color: isPastAppointment ? "#8B92A6" : textColor,
            opacity: 0.85,
          }}
        >
          {startTimeLabel}–{endTimeLabel}
        </Text>

        {/* Badge "solicitado" */}
        {appointment.employeeRequestedByClient && (
          <Badge
            color="violet"
            size="xxs"
            radius="sm"
            style={{
              position: "absolute",
              top: 10,
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
              top: appointment.employeeRequestedByClient ? 45 : 10,
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
              onClick={() => onEditAppointment(appointment, "edicion")}
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

        {/* Servicio (la hora ya se identifica por la columna de línea de tiempo) */}
        <Text
          style={{
            fontSize: 10,
            fontWeight: 700,
            marginTop: 6,
            letterSpacing: -0.2,
            lineHeight: 1.15,
          }}
        >
          {appointment.service ? appointment.service.name : "Sin servicio"}
        </Text>

        {/* Cliente */}
        <Flex align="center" gap={3} wrap="nowrap">
          <Text
            style={{
              color: isPastAppointment ? "#8B92A6" : textColor,
              fontSize: 10,
            }}
          >
            {isBirthday
              ? `🎉 ${appointment.client.name} 🎉`
              : appointment.client.name}
          </Text>
          {appointment.customFieldValues &&
            Object.keys(appointment.customFieldValues).length > 0 && (
              <Tooltip
                withArrow
                multiline
                w={220}
                label={
                  <>
                    {Object.entries(appointment.customFieldValues).map(([key, value]) => {
                      if (value === undefined || value === null || value === "") return null;
                      const def = organization?.clientFormConfig?.fields?.find((f) => f.key === key);
                      const label = def?.label || key;
                      return (
                        <div key={key}>
                          {label}: {String(value)}
                        </div>
                      );
                    })}
                  </>
                }
              >
                <Box style={{ display: "inline-flex" }}>
                  <IconListDetails
                    size={10}
                    color={isPastAppointment ? "#8B92A6" : textColor}
                  />
                </Box>
              </Tooltip>
            )}
        </Flex>

        {/* Ícono de recordatorio (esquina fija, clickeable) */}
        <Tooltip
          label={
            updatingReminder
              ? "Actualizando..."
              : appointment.reminderSent
              ? reminderDelivery
                ? `${reminderDelivery.label} — Click para marcar como pendiente`
                : "Recordatorio enviado - Click para marcar como pendiente"
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
              reminderDeliveryStatus === "failed" ? (
                <BiXCircle size={12} color={reminderDelivery?.color} />
              ) : (
                <BiCheckCircle size={12} color={reminderDelivery?.color || "teal"} />
              )
            ) : (
              <BiTimeFive size={12} color="gray" />
            )}
          </ActionIcon>
        </Tooltip>

        {/* Ícono de confirmación de WhatsApp (esquina fija, solo informativo) */}
        {appointment.waConfirmationStatus && (
          <Tooltip
            label={waConfirmationTooltip}
            withArrow
            multiline
            w={220}
          >
            <Box
              style={{
                position: "absolute",
                bottom: -2,
                left: -2,
                display: "flex",
                pointerEvents: "auto",
              }}
            >
              <FaWhatsapp size={12} color={waConfirmationColor} />
            </Box>
          </Tooltip>
        )}
    </Paper>
  );
};

export default React.memo(AppointmentCard);
