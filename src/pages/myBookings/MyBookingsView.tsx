import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconSchool,
  IconUser,
} from "@tabler/icons-react";
import { formatInTimezone } from "../../utils/timezoneUtils";
import type { MyBookings, MyBookingType } from "../../services/clientBookingsService";
import { bookingFormatters, TYPE_NOUN } from "./bookingFormat";

export type BookingRow = {
  type: MyBookingType;
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  person?: string | null;
  personLabel: string;
  badge?: { label: string; color: string };
  canCancel: boolean;
  cancelBlockedReason: string | null;
};

const APPT_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: "Agendada", color: "blue" },
  confirmed: { label: "Confirmada", color: "green" },
};

const CLASS_BADGE: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pago pendiente", color: "orange" },
  pending: { label: "Pendiente de aprobación", color: "yellow" },
  confirmed: { label: "Confirmada", color: "green" },
};

const HISTORY_BADGE: Record<string, { label: string; color: string }> = {
  attended: { label: "Asistió", color: "green" },
  no_show: { label: "No asistió", color: "red" },
  cancelled: { label: "Cancelada", color: "gray" },
  cancelled_by_customer: { label: "Cancelada", color: "gray" },
  cancelled_by_admin: { label: "Cancelada", color: "gray" },
};

interface Props {
  data: MyBookings;
  /** Sin esta función la vista es de solo lectura (consulta por teléfono). */
  onCancel?: (row: BookingRow) => void;
  /** Aviso bajo el saludo (p. ej. cómo cancelar en modo consulta). */
  notice?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Lista de reservas del cliente: próximas citas + solicitudes pendientes,
 * clases e historial. La comparten la consulta por teléfono (solo lectura) y
 * el enlace personal (con cancelar).
 */
const MyBookingsView: React.FC<Props> = ({ data, onCancel, notice, footer }) => {
  const theme = useMantineTheme();
  const [showHistory, setShowHistory] = useState(false);
  const { tz, timeFmt, dayLabel, timeLabel } = bookingFormatters(data);

  const upcoming: BookingRow[] = [
    ...data.appointments.map<BookingRow>((a) => ({
      type: "appointment",
      id: a.id,
      title: a.serviceName,
      startDate: a.startDate,
      endDate: a.endDate,
      person: a.employeeName,
      personLabel: "Con",
      badge: a.clientConfirmed ? { label: "Asistencia confirmada", color: "green" } : APPT_BADGE[a.status],
      canCancel: a.canCancel,
      cancelBlockedReason: a.cancelBlockedReason,
    })),
    ...data.pendingReservations.map<BookingRow>((r) => ({
      type: "reservation",
      id: r.id,
      title: r.serviceName,
      startDate: r.startDate,
      person: r.employeeName,
      personLabel: "Con",
      badge: { label: "Pendiente de aprobación", color: "yellow" },
      canCancel: r.canCancel,
      cancelBlockedReason: r.cancelBlockedReason,
    })),
  ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const classes: BookingRow[] = data.classes.map((c) => ({
    type: "enrollment",
    id: c.id,
    title: c.className,
    startDate: c.startDate,
    endDate: c.endDate,
    person: c.instructorName,
    personLabel: "Instructor",
    badge: CLASS_BADGE[c.status],
    canCancel: c.canCancel,
    cancelBlockedReason: c.cancelBlockedReason,
  }));

  const showClassesSection = classes.length > 0 || data.organization.enableClassBooking;
  const firstName = (data.client.name || "").trim().split(/\s+/)[0];
  const minHours = data.organization.cancellationPolicy.minHoursBeforeAppointment;

  const renderRow = (row: BookingRow) => (
    <Card key={`${row.type}-${row.id}`} withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Text fw={700} style={{ minWidth: 0 }}>
          {row.title}
        </Text>
        {row.badge && (
          <Badge color={row.badge.color} variant="light" style={{ flexShrink: 0 }}>
            {row.badge.label}
          </Badge>
        )}
      </Group>
      <Stack gap={4} mt={6}>
        <Group gap={6} wrap="nowrap">
          <IconCalendarEvent size={15} color={theme.colors.gray[6]} />
          <Text size="sm">{dayLabel(row.startDate)}</Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <IconClock size={15} color={theme.colors.gray[6]} />
          <Text size="sm">{timeLabel(row.startDate, row.endDate)}</Text>
        </Group>
        {row.person && (
          <Group gap={6} wrap="nowrap">
            <IconUser size={15} color={theme.colors.gray[6]} />
            <Text size="sm">
              {row.personLabel} {row.person}
            </Text>
          </Group>
        )}
      </Stack>
      {onCancel && row.canCancel && (
        <Button
          mt="sm"
          variant="subtle"
          color="red"
          size="xs"
          onClick={() => onCancel(row)}
          style={{ alignSelf: "flex-start" }}
        >
          Cancelar {TYPE_NOUN[row.type]}
        </Button>
      )}
      {!row.canCancel && row.cancelBlockedReason && (
        <Text mt="sm" size="xs" c="dimmed">
          {row.cancelBlockedReason}. Si necesitas cambiarla, escríbele al negocio.
        </Text>
      )}
    </Card>
  );

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2}>Mis reservas</Title>
        <Text c="dimmed" size="sm">
          {firstName ? `Hola, ${firstName}. ` : ""}Estas son tus reservas en {data.organization.name}.
        </Text>
      </Box>

      {notice}

      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Próximas citas</Title>
          {data.organization.enableOnlineBooking && (
            <Button
              component={Link}
              to="/online-reservation"
              size="xs"
              variant="light"
              leftSection={<IconCalendarPlus size={14} />}
            >
              Reservar
            </Button>
          )}
        </Group>
        {upcoming.length ? (
          upcoming.map(renderRow)
        ) : (
          <Text size="sm" c="dimmed">
            No tienes citas próximas.
          </Text>
        )}
      </Stack>

      {showClassesSection && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>Clases</Title>
            {data.organization.enableClassBooking && (
              <Button
                component={Link}
                to="/reservar-clase"
                size="xs"
                variant="light"
                leftSection={<IconSchool size={14} />}
              >
                Reservar clase
              </Button>
            )}
          </Group>
          {classes.length ? (
            classes.map(renderRow)
          ) : (
            <Text size="sm" c="dimmed">
              No tienes clases próximas.
            </Text>
          )}
        </Stack>
      )}

      {minHours > 0 && (
        <Text size="xs" c="dimmed">
          Las citas se pueden cancelar hasta {minHours} {minHours === 1 ? "hora" : "horas"} antes.
        </Text>
      )}

      {data.history.length > 0 && (
        <Box>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            px={0}
            rightSection={showHistory ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            onClick={() => setShowHistory((v) => !v)}
          >
            Citas anteriores
          </Button>
          <Collapse in={showHistory}>
            <Stack gap={6} mt="xs">
              {data.history.map((h) => (
                <Group key={h.id} justify="space-between" wrap="nowrap" gap="xs">
                  <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600}>
                      {h.serviceName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {dayLabel(h.startDate)} · {formatInTimezone(h.startDate, tz, timeFmt)}
                      {h.employeeName ? ` · ${h.employeeName}` : ""}
                    </Text>
                  </Box>
                  {HISTORY_BADGE[h.status] && (
                    <Badge
                      size="sm"
                      variant="light"
                      color={HISTORY_BADGE[h.status].color}
                      style={{ flexShrink: 0 }}
                    >
                      {HISTORY_BADGE[h.status].label}
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}

      {footer}
    </Stack>
  );
};

export default MyBookingsView;
