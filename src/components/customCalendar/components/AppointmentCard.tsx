import React, { useState } from "react";
import {
  Paper,
  Text,
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
import { IconUserCheck, IconUserX, IconListDetails, IconDots } from "@tabler/icons-react";
import { appointmentStatus } from "../appointmentStatus";
import { toSpanishMeridiem } from "../../../utils/timeFormatUtils";

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

  // 🕒 Hora de inicio/fin (panel: «8:00 a. m.», respeta 24 h)
  const cardTimeFormat = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const startTimeLabel = toSpanishMeridiem(formatInTimezone(appointment.startDate, timezone, cardTimeFormat));
  const endTimeLabel = toSpanishMeridiem(formatInTimezone(appointment.endDate, timezone, cardTimeFormat));
  // Bloques cortos (≤ 30 min): solo hora y cliente (AppointmentCard del design system)
  const durationMin =
    (new Date(appointment.endDate).getTime() - new Date(appointment.startDate).getTime()) / 60000;
  const isShort = durationMin <= 30;
  const status = appointmentStatus(appointment.status);
  const StatusIcon = status.icon;
  const muted = "var(--ink-muted)";
  const smallBadge = { height: 20, padding: "0 7px", fontSize: 11 };

  return (
    <Paper
        radius="md"
        style={{
          // ag-appt: superficie elevada, borde line-strong y el color del profesional
          // como franja a la izquierda (antes, todo el fondo en su color)
          backgroundColor: isPastAppointment || isCancelled ? "var(--surface-muted)" : "var(--surface-raised)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          padding: "5px 8px 5px 10px",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          cursor: isCancelled ? "default" : "pointer",
          border: isCancelled ? "1px dashed var(--line-control)" : "1px solid var(--line-strong)",
          borderLeft: `3px solid ${employeeColor}`,
          boxShadow: "none",
          opacity: isCancelled ? 0.5 : appointment.status === "no_show" ? 0.75 : 1,
          pointerEvents: isCancelled ? "none" : "auto",
          transition: "opacity 0.12s",
        }}
        onClick={(e) => {
          // clave para que NO se propague al onClick de la columna
          e.stopPropagation();
          const isIconClick = (e.target as HTMLElement).closest(".ignore-modal");
          if (!isIconClick) {
            onEditAppointment(appointment);
          }
        }}
      >
        {/* Hora + menú de opciones */}
        <Flex align="center" gap={4} wrap="nowrap">
          <Text
            className="ag-num"
            style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: "16px", fontWeight: 500, color: muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {startTimeLabel} – {endTimeLabel}
          </Text>
          <Menu position="top-start" withArrow>
            <Menu.Target>
              <Tooltip label="Opciones" withArrow>
                <ActionIcon
                  className="ignore-modal"
                  variant="subtle"
                  color="gray"
                  size="xs"
                  aria-label="Opciones de la cita"
                  style={{ pointerEvents: "auto", flex: "none" }}
                >
                  <IconDots size={14} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
              {handleToggleExpand && isExpanded && (
                <Menu.Item
                  leftSection={isExpanded(appointment) ? <BiCheck size={16} /> : <BiExpand size={16} />}
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
        </Flex>

        {/* Cliente (body-strong) */}
        <Flex align="center" gap={4} wrap="nowrap">
          <Text
            style={{
              fontSize: 14,
              lineHeight: "18px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textDecoration: isCancelled ? "line-through" : "none",
            }}
          >
            {isBirthday ? `🎉 ${appointment.client.name}` : appointment.client.name}
          </Text>
          {appointment.customFieldValues && Object.keys(appointment.customFieldValues).length > 0 && (
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
              <Box className="ignore-modal" style={{ display: "inline-flex", flex: "none", color: muted }}>
                <IconListDetails size={12} />
              </Box>
            </Tooltip>
          )}
        </Flex>

        {/* Servicio: siempre visible y completo (salta de línea en vez de cortarse
            con «…»). Va antes del pie, así que si falta alto lo que se esconde
            son las insignias; al pasar el mouse la tarjeta crece (ag-appt-slot). */}
        <Text
          style={{
            fontSize: isShort ? 12 : 13,
            lineHeight: isShort ? "15px" : "17px",
            color: muted,
            whiteSpace: "normal",
            overflowWrap: "anywhere",
            flexShrink: 0,
          }}
        >
          {appointment.service ? appointment.service.name : "Sin servicio"}
          {appointment.packageSession &&
            ` · Sesión ${appointment.packageSession.number}/${appointment.packageSession.total}`}
        </Text>

        {/* Pie: estado en palabra + ícono, insignias y avisos de WhatsApp */}
        {!isShort && (
          <Flex align="center" gap={4} wrap="wrap" style={{ marginTop: "auto", paddingTop: 2 }}>
            <span className={`ag-badge ag-badge--${status.tone}`} style={smallBadge}>
              <StatusIcon size={12} stroke={2} />
              {status.label}
            </span>
            {appointment.clientConfirmed && !isCancelled && (
              <Tooltip label="El cliente confirmó su asistencia" withArrow>
                <span className="ag-badge ag-badge--success" style={smallBadge}>
                  <IconUserCheck size={12} stroke={2} />
                  Cliente
                </span>
              </Tooltip>
            )}
            {appointment.employeeRequestedByClient && (
              <Tooltip label="El cliente pidió a este profesional" withArrow>
                <span className="ag-badge ag-badge--info" style={smallBadge}>
                  Solicitado
                </span>
              </Tooltip>
            )}

            <Flex gap={2} align="center" style={{ marginLeft: "auto" }}>
              {/* Confirmación de WhatsApp (solo informativo) */}
              {appointment.waConfirmationStatus && (
                <Tooltip label={waConfirmationTooltip} withArrow multiline w={220}>
                  <Box className="ignore-modal" style={{ display: "flex", pointerEvents: "auto" }}>
                    <FaWhatsapp size={13} color={waConfirmationColor} />
                  </Box>
                </Tooltip>
              )}
              {/* Recordatorio (clic para marcarlo como pendiente) */}
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
                  aria-label="Recordatorio"
                  style={{
                    pointerEvents: "auto",
                    cursor: appointment.reminderSent && !updatingReminder ? "pointer" : "default",
                  }}
                  onClick={
                    appointment.reminderSent && !updatingReminder
                      ? async (e) => {
                          e.stopPropagation();
                          setUpdatingReminder(true);
                          try {
                            const updatedAppointment = await updateAppointment(appointment._id, { reminderSent: false });
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
                                  appt._id === appointment._id ? { ...appt, reminderSent: false } : appt
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
                      <BiXCircle size={13} color={reminderDelivery?.color} />
                    ) : (
                      <BiCheckCircle size={13} color={reminderDelivery?.color || "teal"} />
                    )
                  ) : (
                    <BiTimeFive size={13} color="var(--ink-subtle)" />
                  )}
                </ActionIcon>
              </Tooltip>
            </Flex>
          </Flex>
        )}
    </Paper>
  );
};

export default React.memo(AppointmentCard);
