import { useState } from "react";
import {
  Modal,
  Stack,
  Group,
  Switch,
  Checkbox,
  MultiSelect,
  TextInput,
  Collapse,
  Button,
  Text,
  Alert,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { IconInfoCircle } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { Employee, EmployeeScheduleException } from "../../../../services/employeeService";
import {
  addEmployeeException,
  type ScheduleException,
} from "../../../../services/scheduleService";

interface AgendaBlockModalProps {
  opened: boolean;
  onClose: () => void;
  employees: Employee[];
  /** Se llama tras guardar, con las excepciones ya actualizadas por empleado */
  onSaved?: (updatesByEmployee: Record<string, EmployeeScheduleException[]>) => void;
}

interface BlockForm {
  startDate: Date | null;
  endDate: Date | null;
  allDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

const DEFAULT_FORM: BlockForm = {
  startDate: null,
  endDate: null,
  allDay: true,
  startTime: "09:00",
  endTime: "10:00",
  reason: "",
};

// Fecha local → "YYYY-MM-DD" (mismo formato que usa la config de empleados)
const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function AgendaBlockModal({
  opened,
  onClose,
  employees,
  onSaved,
}: AgendaBlockModalProps) {
  const [form, setForm] = useState<BlockForm>(DEFAULT_FORM);
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm(DEFAULT_FORM);
    setApplyToAll(false);
    setSelectedIds([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    const targetIds = applyToAll ? employees.map((e) => e._id) : selectedIds;

    if (targetIds.length === 0) {
      showNotification({
        title: "Validación",
        message: "Selecciona al menos un profesional",
        color: "orange",
      });
      return;
    }
    if (!form.startDate || !form.endDate) {
      showNotification({
        title: "Validación",
        message: "Selecciona las fechas de inicio y fin",
        color: "orange",
      });
      return;
    }
    if (!form.allDay && form.startTime >= form.endTime) {
      showNotification({
        title: "Validación",
        message: "La hora de inicio debe ser anterior a la hora de fin",
        color: "orange",
      });
      return;
    }

    const payload: Omit<ScheduleException, "_id" | "createdAt"> = {
      startDate: toDateStr(form.startDate),
      endDate: toDateStr(form.endDate),
      allDay: form.allDay,
      ...(form.reason ? { reason: form.reason } : {}),
      ...(!form.allDay
        ? { startTime: form.startTime, endTime: form.endTime }
        : {}),
    };

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        targetIds.map((id) => addEmployeeException(id, payload))
      );
      const updatesByEmployee: Record<string, EmployeeScheduleException[]> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          updatesByEmployee[targetIds[i]] = r.value;
        }
      });
      const ok = Object.keys(updatesByEmployee).length;
      const failed = results.length - ok;

      if (ok > 0) {
        showNotification({
          title: "Bloqueo aplicado",
          message:
            failed > 0
              ? `Bloqueo aplicado a ${ok} profesional(es). ${failed} fallaron.`
              : `Bloqueo aplicado a ${ok} profesional(es).`,
          color: failed > 0 ? "yellow" : "green",
        });
        onSaved?.(updatesByEmployee);
        handleClose();
      } else {
        showNotification({
          title: "Error",
          message: "No se pudo aplicar el bloqueo",
          color: "red",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Bloquear horario"
      size="md"
      zIndex={1000}
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
          <Text size="xs">
            Los bloqueos impiden que se reserve en línea ese horario para el/los profesional(es)
            seleccionados.
          </Text>
        </Alert>

        <Checkbox
          label="Aplicar a todos los profesionales"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.currentTarget.checked)}
        />

        {!applyToAll && (
          <MultiSelect
            label="Profesionales"
            placeholder="Selecciona uno o varios"
            data={employees.map((e) => ({ value: e._id, label: e.names.trim() }))}
            value={selectedIds}
            onChange={setSelectedIds}
            searchable
            clearable
            comboboxProps={{ zIndex: 1100 }}
          />
        )}

        <Group grow>
          <DatePickerInput
            label="Fecha inicio"
            placeholder="Seleccionar fecha"
            value={form.startDate}
            onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
            required
            clearable
            popoverProps={{ zIndex: 1100 }}
          />
          <DatePickerInput
            label="Fecha fin"
            placeholder="Seleccionar fecha"
            value={form.endDate}
            minDate={form.startDate ?? undefined}
            onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
            required
            clearable
            popoverProps={{ zIndex: 1100 }}
          />
        </Group>

        <Switch
          label="Todo el día"
          description="Si está desactivado, solo se bloquea la franja horaria indicada"
          checked={form.allDay}
          onChange={(e) => setForm((f) => ({ ...f, allDay: e.currentTarget.checked }))}
        />

        <Collapse in={!form.allDay}>
          <Group grow>
            <TimeInput
              label="Hora inicio"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.currentTarget.value }))}
            />
            <TimeInput
              label="Hora fin"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.currentTarget.value }))}
            />
          </Group>
        </Collapse>

        <TextInput
          label="Motivo (opcional)"
          placeholder="Vacaciones, permiso médico, capacitación..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.currentTarget.value }))}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar bloqueo
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
