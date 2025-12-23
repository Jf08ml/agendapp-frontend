/**
 * Componente para configurar horarios semanales diferenciados
 * Adaptado para Mantine UI
 */
import { useState } from "react";
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
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { BiPlus, BiTrash } from "react-icons/bi";
import { IoInformationCircleOutline } from "react-icons/io5";

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
  isOpen: boolean;
  start: string;
  end: string;
  breaks: BreakPeriod[];
}

interface WeeklyScheduleData {
  enabled: boolean;
  schedule: DaySchedule[];
  stepMinutes: number;
}

interface WeeklyScheduleSectionProps {
  value: WeeklyScheduleData;
  onChange: (value: WeeklyScheduleData) => void;
  disabled?: boolean;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 0, isOpen: false, start: "08:00", end: "20:00", breaks: [] },
  { day: 1, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 2, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 3, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 4, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 5, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 6, isOpen: true, start: "08:00", end: "14:00", breaks: [] },
];

export default function WeeklyScheduleSection({
  value,
  onChange,
  disabled = false,
}: WeeklyScheduleSectionProps) {
  const schedule = value?.schedule || DEFAULT_SCHEDULE;
  const enabled = value?.enabled ?? false;

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

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
    onChange({
      ...value,
      enabled: checked,
      schedule: schedule.length === 0 ? DEFAULT_SCHEDULE : schedule,
    });
  };

  const handleDayToggle = (dayIndex: number, isOpen: boolean) => {
    const newSchedule = schedule.map((day) =>
      day.day === dayIndex ? { ...day, isOpen } : day
    );
    onChange({ ...value, schedule: newSchedule });
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "start" | "end",
    time: string
  ) => {
    const newSchedule = schedule.map((day) =>
      day.day === dayIndex ? { ...day, [field]: time } : day
    );
    onChange({ ...value, schedule: newSchedule });
  };

  const handleAddBreak = (dayIndex: number) => {
    const newSchedule = schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: [...day.breaks, { start: "12:00", end: "13:00", note: "" }],
          }
        : day
    );
    onChange({ ...value, schedule: newSchedule });
  };

  const handleRemoveBreak = (dayIndex: number, breakIndex: number) => {
    const newSchedule = schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: day.breaks.filter((_, i) => i !== breakIndex),
          }
        : day
    );
    onChange({ ...value, schedule: newSchedule });
  };

  const handleBreakChange = (
    dayIndex: number,
    breakIndex: number,
    field: "start" | "end",
    time: string
  ) => {
    const newSchedule = schedule.map((day) =>
      day.day === dayIndex
        ? {
            ...day,
            breaks: day.breaks.map((brk, i) =>
              i === breakIndex ? { ...brk, [field]: time } : brk
            ),
          }
        : day
    );
    onChange({ ...value, schedule: newSchedule });
  };

  return (
    <Box>
      <Alert
        icon={<IoInformationCircleOutline size={20} />}
        title="Horarios Semanales Personalizados"
        color="blue"
        variant="light"
        mb="md"
      >
        <Text size="sm">
          Con esta opción puedes configurar horarios diferentes para cada día de la semana
          (ej: Lun-Vie 8AM-8PM, Sáb 8AM-2PM, Dom cerrado). Esto mejora el sistema de reservas
          en línea mostrando solo los horarios realmente disponibles.
        </Text>
      </Alert>

      <Group mb="lg">
        <Switch
          label="Activar horarios semanales personalizados"
          description="Si está desactivado, se usará el horario general configurado arriba"
          checked={enabled}
          onChange={(e) => handleToggleEnabled(e.currentTarget.checked)}
          disabled={disabled}
        />
      </Group>

      <Collapse in={enabled}>
        <Stack gap="md">
          {schedule.map((daySchedule) => {
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
                    {!daySchedule.isOpen && (
                      <Badge color="red" variant="light">
                        Cerrado
                      </Badge>
                    )}
                    {daySchedule.isOpen && (
                      <Badge color="green" variant="light">
                        {daySchedule.start} - {daySchedule.end}
                      </Badge>
                    )}
                  </Group>
                  <Group>
                    <Switch
                      label={daySchedule.isOpen ? "Abierto" : "Cerrado"}
                      checked={daySchedule.isOpen}
                      onChange={(e) =>
                        handleDayToggle(daySchedule.day, e.currentTarget.checked)
                      }
                      disabled={disabled}
                    />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => toggleDay(daySchedule.day)}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </ActionIcon>
                  </Group>
                </Group>

                <Collapse in={isExpanded && daySchedule.isOpen}>
                  <Stack gap="md" mt="md">
                    <Group grow>
                      <TimeInput
                        label="Hora de apertura"
                        value={daySchedule.start}
                        onChange={(e) =>
                          handleTimeChange(
                            daySchedule.day,
                            "start",
                            e.currentTarget.value
                          )
                        }
                        disabled={disabled}
                      />
                      <TimeInput
                        label="Hora de cierre"
                        value={daySchedule.end}
                        onChange={(e) =>
                          handleTimeChange(
                            daySchedule.day,
                            "end",
                            e.currentTarget.value
                          )
                        }
                        disabled={disabled}
                      />
                    </Group>

                    <Divider label="Períodos de descanso" labelPosition="left" />

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
                          disabled={disabled}
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
                          disabled={disabled}
                          style={{ flex: 1 }}
                        />
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() =>
                            handleRemoveBreak(daySchedule.day, breakIndex)
                          }
                          disabled={disabled}
                        >
                          <BiTrash size={16} />
                        </ActionIcon>
                      </Group>
                    ))}

                    <Button
                      leftSection={<BiPlus size={16} />}
                      variant="light"
                      onClick={() => handleAddBreak(daySchedule.day)}
                      disabled={disabled}
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
