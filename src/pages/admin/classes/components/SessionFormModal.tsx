import React, { useEffect, useState } from "react";
import {
  Modal, Select, NumberInput, Textarea, Button, Group,
  Stack, SimpleGrid, Text, Alert,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconAlertCircle } from "@tabler/icons-react";
import { ClassType, ClassSession, Room } from "../../../../services/classService";
import { Employee } from "../../../../services/employeeService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: {
    classId: string;
    employeeId: string;
    roomId: string;
    startDate: string;
    endDate: string;
    capacity?: number;
    notes?: string;
  }) => Promise<void>;
  classes: ClassType[];
  employees: Employee[];
  rooms: Room[];
  editing?: ClassSession | null;
  loading?: boolean;
}

export default function SessionFormModal({
  opened, onClose, onSubmit, classes, employees, rooms, editing, loading,
}: Props) {
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      classId: "",
      employeeId: "",
      roomId: "",
      startDate: null as Date | null,
      endDate: null as Date | null,
      capacity: undefined as number | undefined,
      notes: "",
    },
    validate: {
      classId: (v) => (!v ? "Selecciona una clase" : null),
      employeeId: (v) => (!v ? "Selecciona un instructor" : null),
      roomId: (v) => (!v ? "Selecciona un salón" : null),
      startDate: (v) => (!v ? "La fecha de inicio es requerida" : null),
      endDate: (v, values) => {
        if (!v) return "La fecha de fin es requerida";
        if (values.startDate && v <= values.startDate) return "La fecha de fin debe ser posterior al inicio";
        return null;
      },
    },
  });

  // Al seleccionar clase, auto-calcular endDate si hay startDate
  const selectedClass = classes.find((c) => c._id === form.values.classId);

  useEffect(() => {
    if (form.values.startDate && selectedClass) {
      const end = new Date(form.values.startDate);
      end.setMinutes(end.getMinutes() + selectedClass.duration);
      form.setFieldValue("endDate", end);
    }
  }, [form.values.startDate, form.values.classId]);

  useEffect(() => {
    if (editing) {
      const classId = typeof editing.classId === "object" ? editing.classId._id : editing.classId;
      const employeeId = typeof editing.employeeId === "object" ? editing.employeeId._id : editing.employeeId;
      const roomId = typeof editing.roomId === "object" ? editing.roomId._id : editing.roomId;
      form.setValues({
        classId,
        employeeId,
        roomId,
        startDate: new Date(editing.startDate),
        endDate: new Date(editing.endDate),
        capacity: editing.capacity,
        notes: editing.notes || "",
      });
    } else {
      form.reset();
    }
    setConflictError(null);
  }, [editing, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setConflictError(null);
    try {
      await onSubmit({
        classId: values.classId,
        employeeId: values.employeeId,
        roomId: values.roomId,
        startDate: values.startDate!.toISOString(),
        endDate: values.endDate!.toISOString(),
        capacity: values.capacity,
        notes: values.notes,
      });
      form.reset();
    } catch (err) {
      setConflictError(err instanceof Error ? err.message : "Error al guardar la sesión");
    }
  };

  const classOptions = classes.map((c) => ({ value: c._id, label: c.name }));
  const employeeOptions = employees.map((e) => ({ value: e._id, label: e.names }));
  const roomOptions = rooms.map((r) => ({
    value: r._id,
    label: `${r.name} (cupo: ${r.capacity})`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Editar sesión" : "Nueva sesión"}
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          {conflictError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Conflicto de horario">
              {conflictError}
            </Alert>
          )}

          <Select
            label="Clase"
            placeholder="Selecciona la clase"
            data={classOptions}
            required
            searchable
            {...form.getInputProps("classId")}
          />

          {selectedClass && (
            <Text size="xs" c="dimmed">
              Duración: {selectedClass.duration} min · Precio: ${selectedClass.pricePerPerson.toLocaleString("es-CO")} por persona
            </Text>
          )}

          <SimpleGrid cols={2}>
            <Select
              label="Instructor"
              placeholder="Selecciona el instructor"
              data={employeeOptions}
              required
              searchable
              {...form.getInputProps("employeeId")}
            />
            <Select
              label="Salón"
              placeholder="Selecciona el salón"
              data={roomOptions}
              required
              searchable
              {...form.getInputProps("roomId")}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <DateTimePicker
              label="Inicio"
              placeholder="Fecha y hora de inicio"
              required
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps("startDate")}
            />
            <DateTimePicker
              label="Fin"
              placeholder="Fecha y hora de fin"
              required
              valueFormat="DD/MM/YYYY HH:mm"
              {...form.getInputProps("endDate")}
            />
          </SimpleGrid>

          <NumberInput
            label="Cupo de la sesión"
            description={
              selectedClass
                ? `Por defecto: ${selectedClass.defaultCapacity} personas`
                : "Opcional, usa el cupo por defecto de la clase"
            }
            min={1}
            placeholder="Cupo personalizado (opcional)"
            {...form.getInputProps("capacity")}
          />

          <Textarea
            label="Notas internas"
            placeholder="Notas sobre esta sesión (solo visibles para el admin)"
            autosize
            minRows={2}
            {...form.getInputProps("notes")}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "Guardar cambios" : "Crear sesión"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
