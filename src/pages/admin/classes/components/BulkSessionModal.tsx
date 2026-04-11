import React, { useEffect, useMemo, useState } from "react";
import {
  Modal, Select, NumberInput, Textarea, Button, Group,
  Stack, SimpleGrid, Text, Alert, Badge, Chip, Divider,
  List, ThemeIcon, ScrollArea,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import {
  IconAlertCircle, IconCheck, IconX, IconCalendarRepeat,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
import { ClassType, Room, BulkSessionPayload } from "../../../../services/classService";
import { Employee } from "../../../../services/employeeService";

dayjs.extend(isoWeek);
dayjs.locale("es");

const WEEKDAYS = [
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Miércoles" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sábado" },
  { value: 0, label: "D", full: "Domingo" },
];

interface BulkResult {
  created: { _id: string; startDate: string }[];
  skipped: { startDate: string; reason: string }[];
}

interface Props {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: BulkSessionPayload) => Promise<BulkResult | undefined>;
  classes: ClassType[];
  employees: Employee[];
  rooms: Room[];
  loading?: boolean;
}

export default function BulkSessionModal({
  opened, onClose, onSubmit, classes, employees, rooms, loading,
}: Props) {
  const [result, setResult] = useState<BulkResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      classId: "",
      employeeId: "",
      roomId: "",
      weekdays: [] as number[],
      time: "08:00",
      periodStart: null as Date | null,
      periodEnd: null as Date | null,
      capacity: undefined as number | undefined,
      notes: "",
    },
    validate: {
      classId:     (v) => (!v ? "Selecciona una clase" : null),
      employeeId:  (v) => (!v ? "Selecciona un instructor" : null),
      roomId:      (v) => (!v ? "Selecciona un salón" : null),
      weekdays:    (v) => (!v.length ? "Selecciona al menos un día" : null),
      time:        (v) => (!v || !/^\d{2}:\d{2}$/.test(v) ? "Hora inválida (HH:MM)" : null),
      periodStart: (v) => (!v ? "Selecciona la fecha de inicio" : null),
      periodEnd:   (v, vals) => {
        if (!v) return "Selecciona la fecha de fin";
        if (vals.periodStart && v < vals.periodStart) return "Debe ser posterior al inicio";
        return null;
      },
    },
  });

  useEffect(() => {
    if (!opened) {
      form.reset();
      setResult(null);
    }
  }, [opened]);

  // Preview de sesiones que se generarían
  const previewDates = useMemo(() => {
    const { weekdays, time, periodStart, periodEnd, classId } = form.values;
    if (!weekdays.length || !time || !periodStart || !periodEnd) return [];

    const selectedClass = classes.find((c) => c._id === classId);
    const durationMin = selectedClass?.duration ?? 60;
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return [];

    const result: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
    const cursor = dayjs(periodStart).startOf("day");
    const end = dayjs(periodEnd).endOf("day");
    const MAX = 100;

    let current = cursor;
    while (current.isBefore(end) && result.length < MAX) {
      if (weekdays.includes(current.day())) {
        const start = current.hour(h).minute(m).second(0);
        result.push({ start, end: start.add(durationMin, "minute") });
      }
      current = current.add(1, "day");
    }
    return result;
  }, [form.values.weekdays, form.values.time, form.values.periodStart, form.values.periodEnd, form.values.classId]);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitting(true);
    try {
      const payload: BulkSessionPayload = {
        classId: values.classId,
        employeeId: values.employeeId,
        roomId: values.roomId,
        weekdays: values.weekdays,
        time: values.time,
        periodStart: dayjs(values.periodStart!).format("YYYY-MM-DD"),
        periodEnd: dayjs(values.periodEnd!).format("YYYY-MM-DD"),
        capacity: values.capacity,
        notes: values.notes,
      };
      const res = await onSubmit(payload);
      if (res) setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c._id === form.values.classId);

  // Si ya tenemos resultado, mostrar resumen
  if (result) {
    return (
      <Modal opened={opened} onClose={onClose} title="Resultado de programación" centered size="md">
        <Stack gap="md">
          <Group gap="sm">
            <Badge size="lg" color="green" leftSection={<IconCheck size={14} />}>
              {result.created.length} sesión{result.created.length !== 1 ? "es" : ""} creada{result.created.length !== 1 ? "s" : ""}
            </Badge>
            {result.skipped.length > 0 && (
              <Badge size="lg" color="orange" leftSection={<IconX size={14} />}>
                {result.skipped.length} omitida{result.skipped.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </Group>

          {result.skipped.length > 0 && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Sesiones omitidas por conflicto">
              <ScrollArea mah={160}>
                <List size="xs" spacing={4}>
                  {result.skipped.map((s, i) => (
                    <List.Item key={i}>
                      <Text size="xs" fw={500}>{dayjs(s.startDate).format("ddd D MMM, HH:mm")}</Text>
                      <Text size="xs" c="dimmed">{s.reason}</Text>
                    </List.Item>
                  ))}
                </List>
              </ScrollArea>
            </Alert>
          )}

          {result.created.length > 0 && (
            <ScrollArea mah={200}>
              <List size="sm" spacing={2}>
                {result.created.map((s) => (
                  <List.Item
                    key={s._id}
                    icon={<ThemeIcon size="xs" color="green" radius="xl"><IconCheck size={10} /></ThemeIcon>}
                  >
                    {dayjs(s.startDate).format("dddd D [de] MMMM, HH:mm")}
                  </List.Item>
                ))}
              </List>
            </ScrollArea>
          )}

          <Button onClick={onClose} fullWidth>Cerrar</Button>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconCalendarRepeat size={18} />
          <Text fw={600}>Programar horario semanal</Text>
        </Group>
      }
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          {/* Clase, instructor, salón */}
          <Select
            label="Clase"
            placeholder="Selecciona la clase"
            data={classes.map((c) => ({ value: c._id, label: c.name }))}
            required
            searchable
            {...form.getInputProps("classId")}
          />
          {selectedClass && (
            <Text size="xs" c="dimmed">
              Duración: {selectedClass.duration} min · Cupo por defecto: {selectedClass.defaultCapacity}
            </Text>
          )}

          <SimpleGrid cols={2}>
            <Select
              label="Instructor"
              placeholder="Selecciona el instructor"
              data={employees.map((e) => ({ value: e._id, label: e.names }))}
              required
              searchable
              {...form.getInputProps("employeeId")}
            />
            <Select
              label="Salón"
              placeholder="Selecciona el salón"
              data={rooms.map((r) => ({ value: r._id, label: `${r.name} (${r.capacity})` }))}
              required
              searchable
              {...form.getInputProps("roomId")}
            />
          </SimpleGrid>

          <Divider label="Patrón semanal" labelPosition="left" />

          {/* Días de la semana */}
          <div>
            <Text size="sm" fw={500} mb={6}>
              Días de la semana <Text span c="red">*</Text>
            </Text>
            <Chip.Group
              multiple
              value={form.values.weekdays.map(String)}
              onChange={(vals) => form.setFieldValue("weekdays", vals.map(Number))}
            >
              <Group gap="xs">
                {WEEKDAYS.map((d) => (
                  <Chip key={d.value} value={String(d.value)} size="sm" radius="md">
                    {d.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {form.errors.weekdays && (
              <Text size="xs" c="red" mt={4}>{form.errors.weekdays}</Text>
            )}
          </div>

          {/* Hora + cupo */}
          <SimpleGrid cols={2}>
            <TimeInput
              label="Hora de inicio"
              required
              {...form.getInputProps("time")}
            />
            <NumberInput
              label="Cupo por sesión"
              description={selectedClass ? `Default: ${selectedClass.defaultCapacity}` : "Opcional"}
              min={1}
              {...form.getInputProps("capacity")}
            />
          </SimpleGrid>

          {/* Período */}
          <SimpleGrid cols={2}>
            <DatePickerInput
              label="Inicio del período"
              placeholder="Fecha de inicio"
              required
              valueFormat="DD/MM/YYYY"
              {...form.getInputProps("periodStart")}
            />
            <DatePickerInput
              label="Fin del período"
              placeholder="Fecha de fin"
              required
              valueFormat="DD/MM/YYYY"
              minDate={form.values.periodStart ?? undefined}
              {...form.getInputProps("periodEnd")}
            />
          </SimpleGrid>

          <Textarea
            label="Notas internas"
            placeholder="Se aplicarán a todas las sesiones generadas"
            autosize
            minRows={2}
            {...form.getInputProps("notes")}
          />

          {/* Preview */}
          {previewDates.length > 0 && (
            <Alert icon={<IconCalendarRepeat size={16} />} color="blue" variant="light">
              <Text size="sm" fw={600} mb={6}>
                Se generarán {previewDates.length} sesión{previewDates.length !== 1 ? "es" : ""}:
              </Text>
              <ScrollArea mah={140}>
                <Group gap={6} wrap="wrap">
                  {previewDates.map((d, i) => (
                    <Badge key={i} size="xs" variant="light" color="blue">
                      {d.start.format("ddd D MMM")} {d.start.format("HH:mm")}
                    </Badge>
                  ))}
                </Group>
              </ScrollArea>
              {previewDates.length >= 100 && (
                <Text size="xs" c="dimmed" mt={4}>
                  (Mostrando primeras 100 — algunas podrían omitirse por conflictos)
                </Text>
              )}
            </Alert>
          )}

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              loading={submitting || loading}
              leftSection={<IconCalendarRepeat size={16} />}
              disabled={previewDates.length === 0}
            >
              Programar {previewDates.length > 0 ? `${previewDates.length} sesiones` : ""}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
