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
  Modal,
  TextInput,
} from "@mantine/core";
import { TimeInput, DatePickerInput } from "@mantine/dates";
import { BiPlus, BiTrash, BiSave } from "react-icons/bi";
import { IoInformationCircleOutline } from "react-icons/io5";
import { showNotification } from "@mantine/notifications";
import {
  getEmployeeSchedule,
  updateEmployeeSchedule,
  getEmployeeExceptions,
  addEmployeeException,
  removeEmployeeException,
  type ScheduleException,
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

interface ExceptionForm {
  startDate: Date | null;
  endDate: Date | null;
  allDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}

const DEFAULT_EXCEPTION_FORM: ExceptionForm = {
  startDate: null,
  endDate: null,
  allDay: true,
  startTime: "09:00",
  endTime: "10:00",
  reason: "",
};

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
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>(DEFAULT_EXCEPTION_FORM);
  const [savingException, setSavingException] = useState(false);

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

  const formatDisplayDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const toDateStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const loadExceptions = async () => {
    setLoadingExceptions(true);
    try {
      const data = await getEmployeeExceptions(employeeId);
      setExceptions(data || []);
    } catch (error) {
      console.error("Error al cargar excepciones:", error);
    } finally {
      setLoadingExceptions(false);
    }
  };

  const handleAddException = async () => {
    if (!exceptionForm.startDate || !exceptionForm.endDate) {
      showNotification({
        title: "Validación",
        message: "Selecciona las fechas de inicio y fin",
        color: "orange",
      });
      return;
    }
    if (!exceptionForm.allDay && exceptionForm.startTime >= exceptionForm.endTime) {
      showNotification({
        title: "Validación",
        message: "La hora de inicio debe ser anterior a la hora de fin",
        color: "orange",
      });
      return;
    }
    setSavingException(true);
    try {
      const payload: Omit<ScheduleException, "_id" | "createdAt"> = {
        startDate: toDateStr(exceptionForm.startDate),
        endDate: toDateStr(exceptionForm.endDate),
        allDay: exceptionForm.allDay,
        ...(exceptionForm.reason ? { reason: exceptionForm.reason } : {}),
        ...(!exceptionForm.allDay
          ? { startTime: exceptionForm.startTime, endTime: exceptionForm.endTime }
          : {}),
      };
      const updated = await addEmployeeException(employeeId, payload);
      if (updated) setExceptions(updated);
      setExceptionModalOpen(false);
      setExceptionForm(DEFAULT_EXCEPTION_FORM);
      showNotification({
        title: "Éxito",
        message: "Bloqueo agregado correctamente",
        color: "green",
      });
    } catch (error: any) {
      showNotification({
        title: "Error",
        message: error.response?.data?.message || "No se pudo agregar el bloqueo",
        color: "red",
      });
    } finally {
      setSavingException(false);
    }
  };

  const handleRemoveException = async (exceptionId: string) => {
    try {
      const updated = await removeEmployeeException(employeeId, exceptionId);
      if (updated) setExceptions(updated);
      showNotification({
        title: "Éxito",
        message: "Bloqueo eliminado",
        color: "green",
      });
    } catch (error: any) {
      showNotification({
        title: "Error",
        message: "No se pudo eliminar el bloqueo",
        color: "red",
      });
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
      loadExceptions();
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

      {/* Sección de Bloqueos Temporales */}
      <Box mt="xl">
        <Divider mb="lg" />
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={600} size="lg">
              Bloqueos Temporales
            </Text>
            <Text size="sm" c="dimmed">
              Fechas u horas específicas donde el empleado no estará disponible para reservas online
            </Text>
          </div>
          <Button
            leftSection={<BiPlus size={16} />}
            variant="light"
            color="orange"
            onClick={() => setExceptionModalOpen(true)}
          >
            Agregar bloqueo
          </Button>
        </Group>

        {loadingExceptions ? (
          <Box ta="center" py="md">
            <Loader size="sm" />
          </Box>
        ) : exceptions.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            No hay bloqueos configurados
          </Text>
        ) : (
          <Stack gap="xs">
            {exceptions.map((exc) => (
              <Paper key={exc._id} p="sm" withBorder>
                <Group justify="space-between">
                  <div>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {exc.startDate === exc.endDate
                          ? formatDisplayDate(exc.startDate)
                          : `${formatDisplayDate(exc.startDate)} → ${formatDisplayDate(exc.endDate)}`}
                      </Text>
                      {exc.allDay ? (
                        <Badge size="xs" color="red" variant="light">
                          Todo el día
                        </Badge>
                      ) : (
                        <Badge size="xs" color="orange" variant="light">
                          {exc.startTime} - {exc.endTime}
                        </Badge>
                      )}
                    </Group>
                    {exc.reason && (
                      <Text size="xs" c="dimmed" mt={2}>
                        {exc.reason}
                      </Text>
                    )}
                  </div>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => handleRemoveException(exc._id!)}
                  >
                    <BiTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Modal para agregar excepción */}
      <Modal
        opened={exceptionModalOpen}
        onClose={() => {
          setExceptionModalOpen(false);
          setExceptionForm(DEFAULT_EXCEPTION_FORM);
        }}
        title="Agregar Bloqueo Temporal"
        size="md"
      >
        <Stack gap="md">
          <Group grow>
            <DatePickerInput
              label="Fecha inicio"
              placeholder="Seleccionar fecha"
              value={exceptionForm.startDate}
              onChange={(val) =>
                setExceptionForm((f) => ({ ...f, startDate: val }))
              }
              required
              clearable
            />
            <DatePickerInput
              label="Fecha fin"
              placeholder="Seleccionar fecha"
              value={exceptionForm.endDate}
              minDate={exceptionForm.startDate ?? undefined}
              onChange={(val) =>
                setExceptionForm((f) => ({ ...f, endDate: val }))
              }
              required
              clearable
            />
          </Group>

          <Switch
            label="Todo el día"
            description="Si está desactivado, solo se bloqueará la franja horaria indicada"
            checked={exceptionForm.allDay}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setExceptionForm((f) => ({ ...f, allDay: checked }));
            }}
          />

          <Collapse in={!exceptionForm.allDay}>
            <Group grow>
              <TimeInput
                label="Hora inicio"
                value={exceptionForm.startTime}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setExceptionForm((f) => ({ ...f, startTime: val }));
                }}
              />
              <TimeInput
                label="Hora fin"
                value={exceptionForm.endTime}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setExceptionForm((f) => ({ ...f, endTime: val }));
                }}
              />
            </Group>
          </Collapse>

          <TextInput
            label="Motivo (opcional)"
            placeholder="Vacaciones, Permiso médico, Capacitación..."
            value={exceptionForm.reason}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setExceptionForm((f) => ({ ...f, reason: val }));
            }}
          />

          <Group justify="flex-end" mt="sm">
            <Button
              variant="subtle"
              onClick={() => {
                setExceptionModalOpen(false);
                setExceptionForm(DEFAULT_EXCEPTION_FORM);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddException} loading={savingException}>
              Guardar bloqueo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
