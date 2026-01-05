/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Componente para configurar horarios de disponibilidad de empleados
 * Adaptado para Mantine UI
 */
import { useState, useEffect } from "react";
import {
  Box,
  Text,
  Switch,
  Group,
  Stack,
  Paper,
  ActionIcon,
  Button,
  Divider,
  Collapse,
  Badge,
  Alert,
  Loader,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { BiPlus, BiTrash, BiSave } from "react-icons/bi";
import { IoInformationCircleOutline } from "react-icons/io5";
import { showNotification } from "@mantine/notifications";
import {
  getEmployeeSchedule,
  updateEmployeeSchedule,
} from "../../../../services/scheduleService";

const DAY_LABELS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

interface BreakPeriod {
  start: string;
  end: string;
  note?: string;
}

interface DaySchedule {
  day: number;
  isAvailable: boolean;
  start: string;
  end: string;
  breaks: BreakPeriod[];
}

interface WeeklyScheduleData {
  enabled: boolean;
  schedule: DaySchedule[];
}

interface EmployeeScheduleSectionProps {
  employeeId: string;
  employeeName?: string;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 0, isAvailable: false, start: "08:00", end: "18:00", breaks: [] },
  { day: 1, isAvailable: true, start: "08:00", end: "18:00", breaks: [] },
  { day: 2, isAvailable: true, start: "08:00", end: "18:00", breaks: [] },
  { day: 3, isAvailable: true, start: "08:00", end: "18:00", breaks: [] },
  { day: 4, isAvailable: true, start: "08:00", end: "18:00", breaks: [] },
  { day: 5, isAvailable: true, start: "08:00", end: "18:00", breaks: [] },
  { day: 6, isAvailable: false, start: "08:00", end: "18:00", breaks: [] },
];

export default function EmployeeScheduleSection({
  employeeId,
  employeeName,
}: EmployeeScheduleSectionProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WeeklyScheduleData>({
    enabled: false,
    schedule: DEFAULT_SCHEDULE,
  });
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [hasLoaded, setHasLoaded] = useState(false);

  // Cargar horario del empleado
  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await getEmployeeSchedule(employeeId);
      if (data) {
        setSchedule({
          enabled: data.enabled ?? false,
          schedule:
            data.schedule && data.schedule.length > 0
              ? data.schedule.map((day: any) => ({
                  ...day,
                  isAvailable: day.isAvailable ?? false,
                }))
              : DEFAULT_SCHEDULE,
        });
      }
      setHasLoaded(true);
    } catch (error: any) {
      console.error("Error al cargar horario:", error);
      showNotification({
        title: "Error",
        message: "No se pudo cargar el horario",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validar horarios
  const validateSchedule = (): { valid: boolean; message?: string } => {
    for (const day of schedule.schedule) {
      if (!day.isAvailable) continue;

      // Validar que la hora de inicio sea anterior a la hora de fin
      if (day.start >= day.end) {
        const dayLabel = DAY_LABELS.find((d) => d.value === day.day)?.label;
        return {
          valid: false,
          message: `${dayLabel}: La hora de inicio debe ser anterior a la hora de fin`,
        };
      }

      // Validar breaks
      for (const brk of day.breaks) {
        if (brk.start >= brk.end) {
          const dayLabel = DAY_LABELS.find((d) => d.value === day.day)?.label;
          return {
            valid: false,
            message: `${dayLabel}: Los descansos deben tener hora de inicio anterior a la de fin`,
          };
        }

        if (brk.start < day.start || brk.end > day.end) {
          const dayLabel = DAY_LABELS.find((d) => d.value === day.day)?.label;
          return {
            valid: false,
            message: `${dayLabel}: Los descansos deben estar dentro del horario laboral`,
          };
        }
      }
    }

    return { valid: true };
  };

  // Guardar horario
  const saveSchedule = async () => {
    // Validar antes de guardar
    const validation = validateSchedule();
    if (!validation.valid) {
      showNotification({
        title: "Validación",
        message: validation.message || "Revisa los horarios configurados",
        color: "orange",
      });
      return;
    }

    setSaving(true);
    try {
      await updateEmployeeSchedule(employeeId, schedule);
      showNotification({
        title: "Éxito",
        message: "Horario guardado correctamente",
        color: "green",
      });
    } catch (error: any) {
      console.error("Error al guardar horario:", error);
      showNotification({
        title: "Error",
        message: error.response?.data?.message || "No se pudo guardar el horario",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cargar automáticamente cuando el componente se monta
  useEffect(() => {
    if (!hasLoaded && !loading) {
      loadSchedule();
    }
  }, [employeeId, hasLoaded, loading]);

  const toggleDay = (dayIndex: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex);
    } else {
      newExpanded.add(dayIndex);
    }
    setExpandedDays(newExpanded);
  };

  const handleToggleEnabled = (checked: boolean) => {
    setSchedule({
      ...schedule,
      enabled: checked,
      schedule: schedule.schedule.length === 0 ? DEFAULT_SCHEDULE : schedule.schedule,
    });
  };

  const handleDayToggle = (dayIndex: number, isAvailable: boolean) => {
    const newSchedule = schedule.schedule.map((day) =>
      day.day === dayIndex ? { ...day, isAvailable } : day
    );
    setSchedule({ ...schedule, schedule: newSchedule });
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "start" | "end",
    time: string
  ) => {
    const newSchedule = schedule.schedule.map((day) =>
      day.day === dayIndex ? { ...day, [field]: time } : day
    );
    setSchedule({ ...schedule, schedule: newSchedule });
  };

  const handleAddBreak = (dayIndex: number) => {
    const newSchedule = schedule.schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: [...day.breaks, { start: "12:00", end: "13:00", note: "" }],
          }
        : day
    );
    setSchedule({ ...schedule, schedule: newSchedule });
  };

  const handleRemoveBreak = (dayIndex: number, breakIndex: number) => {
    const newSchedule = schedule.schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: day.breaks.filter((_, i) => i !== breakIndex),
          }
        : day
    );
    setSchedule({ ...schedule, schedule: newSchedule });
  };

  const handleBreakChange = (
    dayIndex: number,
    breakIndex: number,
    field: "start" | "end",
    time: string
  ) => {
    const newSchedule = schedule.schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: day.breaks.map((brk, i) =>
              i === breakIndex ? { ...brk, [field]: time } : brk
            ),
          }
        : day
    );
    setSchedule({ ...schedule, schedule: newSchedule });
  };

  if (loading) {
    return (
      <Box ta="center" py="xl">
        <Loader size="md" />
        <Text mt="md" c="dimmed">
          Cargando horario...
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Alert
        icon={<IoInformationCircleOutline size={20} />}
        title={`Horario de Disponibilidad${employeeName ? ` - ${employeeName}` : ""}`}
        color="blue"
        variant="light"
        mb="md"
      >
        <Text size="sm">
          Configura los días y horarios en que este empleado estará disponible para atender
          clientes. Si no se activa, seguirá el horario general de la organización.
        </Text>
      </Alert>

      <Group mb="lg" justify="space-between">
        <Switch
          label="Activar horario personalizado para este empleado"
          description="Si está desactivado, usará el horario de la organización"
          checked={schedule.enabled}
          onChange={(e) => handleToggleEnabled(e.currentTarget.checked)}
        />
        <Button
          leftSection={<BiSave size={16} />}
          onClick={saveSchedule}
          loading={saving}
          disabled={!schedule.enabled}
        >
          Guardar Horario
        </Button>
      </Group>

      <Collapse in={schedule.enabled}>
        <Stack gap="md">
          {schedule.schedule.map((daySchedule) => {
            const dayInfo = DAY_LABELS.find((d) => d.value === daySchedule.day);
            if (!dayInfo) return null;

            const isExpanded = expandedDays.has(daySchedule.day);

            return (
              <Paper key={daySchedule.day} p="md" withBorder>
                <Group justify="space-between" mb={isExpanded ? "md" : 0}>
                  <Group>
                    <Text fw={600} size="lg">
                      {dayInfo.label}
                    </Text>
                    {!daySchedule.isAvailable && (
                      <Badge color="gray" variant="light">
                        No disponible
                      </Badge>
                    )}
                    {daySchedule.isAvailable && (
                      <Badge color="green" variant="light">
                        {daySchedule.start} - {daySchedule.end}
                      </Badge>
                    )}
                  </Group>
                  <Group>
                    <Switch
                      label={daySchedule.isAvailable ? "Disponible" : "No disponible"}
                      checked={daySchedule.isAvailable}
                      onChange={(e) =>
                        handleDayToggle(daySchedule.day, e.currentTarget.checked)
                      }
                    />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => toggleDay(daySchedule.day)}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </ActionIcon>
                  </Group>
                </Group>

                <Collapse in={isExpanded && daySchedule.isAvailable}>
                  <Stack gap="md" mt="md">
                    <Group grow>
                      <TimeInput
                        label="Hora de inicio"
                        value={daySchedule.start}
                        onChange={(e) =>
                          handleTimeChange(
                            daySchedule.day,
                            "start",
                            e.currentTarget.value
                          )
                        }
                      />
                      <TimeInput
                        label="Hora de fin"
                        value={daySchedule.end}
                        onChange={(e) =>
                          handleTimeChange(
                            daySchedule.day,
                            "end",
                            e.currentTarget.value
                          )
                        }
                      />
                    </Group>

                    <Divider label="Descansos" labelPosition="left" />

                    {daySchedule.breaks.map((brk, breakIndex) => (
                      <Group key={breakIndex} align="flex-end">
                        <TimeInput
                          label="Desde"
                          value={brk.start}
                          onChange={(e) =>
                            handleBreakChange(
                              daySchedule.day,
                              breakIndex,
                              "start",
                              e.currentTarget.value
                            )
                          }
                          style={{ flex: 1 }}
                        />
                        <TimeInput
                          label="Hasta"
                          value={brk.end}
                          onChange={(e) =>
                            handleBreakChange(
                              daySchedule.day,
                              breakIndex,
                              "end",
                              e.currentTarget.value
                            )
                          }
                          style={{ flex: 1 }}
                        />
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleRemoveBreak(daySchedule.day, breakIndex)}
                        >
                          <BiTrash size={16} />
                        </ActionIcon>
                      </Group>
                    ))}

                    <Button
                      leftSection={<BiPlus size={16} />}
                      variant="light"
                      onClick={() => handleAddBreak(daySchedule.day)}
                      size="xs"
                    >
                      Agregar descanso
                    </Button>
                  </Stack>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}
