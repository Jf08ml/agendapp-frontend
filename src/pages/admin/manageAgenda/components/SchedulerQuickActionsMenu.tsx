// components/schedule/SchedulerQuickActionsMenu.tsx
import React from "react";
import {
  ActionIcon,
  Menu,
  Tooltip,
  Loader,
  Divider,
  Text,
  Box,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates"; // 👈 cambio aquí
import {
  BiDotsVerticalRounded,
  BiSearch,
  BiRefresh,
  BiPlus,
  BiSort,
} from "react-icons/bi";
import { IoNotificationsOutline } from "react-icons/io5";

export interface SchedulerQuickActionsMenuProps {
  // handlers
  onOpenSearch: () => void;
  onReloadMonth: () => void;
  onAddAppointment: () => void;
  onReorderEmployees: () => void;
  onSendReminders: () => void;

  // estado/flags
  isWhatsappReady: boolean;
  sendingReminders: boolean;
  reasonForDisabled?: string | null;

  // permisos
  canSearchAppointments: boolean;
  canCreate: boolean;
  canSendReminders: boolean;
  canReorderEmployees: boolean;

  // fecha de recordatorios
  reminderDate: Date | null;
  onChangeReminderDate: (date: Date | null) => void;

  // opcional: accesibilidad
  ariaLabel?: string;
}

const SchedulerQuickActionsMenu: React.FC<SchedulerQuickActionsMenuProps> = ({
  onOpenSearch,
  onReloadMonth,
  onAddAppointment,
  onReorderEmployees,
  onSendReminders,
  isWhatsappReady,
  sendingReminders,
  reasonForDisabled,
  canSearchAppointments,
  canCreate,
  canSendReminders,
  canReorderEmployees,
  reminderDate,
  onChangeReminderDate,
  ariaLabel = "Más acciones",
}) => {
  const remindersDisabled =
    sendingReminders ||
    !canSendReminders ||
    !isWhatsappReady ||
    !reminderDate;

  const remindersTitle = (() => {
    if (!canSendReminders) return "No tienes permiso para enviar recordatorios.";
    if (sendingReminders) return "Ya se está enviando una campaña.";
    if (!reminderDate)
      return "Selecciona una fecha para enviar recordatorios.";
    if (!isWhatsappReady) {
      return reasonForDisabled || "Conecta tu sesión de WhatsApp.";
    }
    return undefined;
  })();

  return (
    <Menu position="bottom-end" withArrow shadow="md">
      <Menu.Target>
        <Tooltip label="Acciones" withArrow>
          <ActionIcon variant="subtle" aria-label={ariaLabel} size="md">
            <BiDotsVerticalRounded size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<BiSearch size={16} />}
          onClick={onOpenSearch}
          disabled={!canSearchAppointments}
        >
          Buscar citas
        </Menu.Item>

        <Menu.Item
          leftSection={<BiRefresh size={16} />}
          onClick={onReloadMonth}
        >
          Recargar agenda
        </Menu.Item>

        <Menu.Item
          leftSection={<BiPlus size={16} />}
          onClick={onAddAppointment}
          disabled={!canCreate}
        >
          Añadir cita
        </Menu.Item>

        <Menu.Item
          leftSection={<BiSort size={16} />}
          onClick={onReorderEmployees}
          disabled={!canReorderEmployees}
        >
          Reordenar empleados
        </Menu.Item>

        {canSendReminders && (
          <>
            <Divider my="xs" />
            <Menu.Label>Recordatorios por WhatsApp</Menu.Label>

            {/* Calendario embebido, siempre visible */}
            <Box px="xs" py={4}>
              <Text size="xs" mb={4}>
                Selecciona el día de las citas a recordar.
              </Text>
              <DatePicker
                value={reminderDate}
                onChange={onChangeReminderDate}
                locale="es"
                // número de meses visibles, si quieres uno solo:
                numberOfColumns={1}
              />
              {!reminderDate && (
                <Text size="xs" c="dimmed" mt={4}>
                  Elige una fecha para habilitar el envío.
                </Text>
              )}
            </Box>

            <Menu.Item
              leftSection={
                sendingReminders ? (
                  <Loader size="xs" />
                ) : (
                  <IoNotificationsOutline size={16} />
                )
              }
              onClick={onSendReminders}
              disabled={remindersDisabled}
              title={remindersTitle}
            >
              Enviar recordatorios
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default React.memo(SchedulerQuickActionsMenu);
