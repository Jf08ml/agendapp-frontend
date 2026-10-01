/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Componente para configurar horarios de disponibilidad de profesionales
 * Adaptado para Mantine UI
 */
import { todayInTimezone } from "../../../../utils/timezoneUtils";
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
  Tooltip,
} from "@mantine/core";
import { TimeInput, DatePickerInput } from "@mantine/dates";
import { BiPlus, BiTrash, BiSave, BiChevronDown, BiChevronUp } from "react-icons/bi";
import { IoInformationCircleOutline } from "react-icons/io5";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import TimeOfDayInput from "../../../../components/TimeOfDayInput";
import { formatTimeLabel } from "../../../../utils/timeOfDay";
import BlockRepeatFields, { DEFAULT_REPEAT, repeatError, repeatPayload, type BlockRepeatValue } from "../../../../components/BlockRepeatFields";
import { NO_END_DATE, describeRecurrence, hasNoEnd, listUpcomingOccurrences } from "../../../../utils/scheduleExceptions";
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

// Fecha local → "YYYY-MM-DD"
const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Cada día ("YYYY-MM-DD") comprendido entre startDate y endDate, ambos inclusive
const listDaysInRange = (startDate: string, endDate: string): string[] => {
  const [y, m, d] = startDate.split("-").map(Number);
  const days: string[] = [];
  for (let i = 0; ; i++) {
    const day = formatDateStr(new Date(y, m - 1, d + i));
    if (day > endDate) break;
    days.push(day);
  }
  return days;
};

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
  const [exceptionRepeat, setExceptionRepeat] = useState<BlockRepeatValue>(DEFAULT_REPEAT);
  const [exceptionNoEnd, setExceptionNoEnd] = useState(false);
  const is24h = useSelector((s: RootState) => s.organization.organization?.timeFormat) === "24h";
  const orgTimezone = useSelector((s: RootState) => s.organization.organization?.timezone) || "America/Bogota";
  // Con 12 h el mensaje muestra las horas con AM/PM para que se note si "2:00" quedó en AM
  const exceptionTimeError =
    !exceptionForm.allDay && exceptionForm.startTime >= exceptionForm.endTime
      ? `La hora de fin (${formatTimeLabel(exceptionForm.endTime, is24h)}) debe ser posterior a la de inicio (${formatTimeLabel(exceptionForm.startTime, is24h)}).${is24h ? "" : " Revisa que AM/PM sea el correcto."}`
      : null;
  // Bloqueos multi-día con el detalle de días desplegado (por _id)
  const [expandedExceptions, setExpandedExceptions] = useState<Set<string>>(new Set());

  // Cargar horario del profesional
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

  // Igual que formatDisplayDate pero con día de la semana, para la lista de días de un bloqueo
  const formatDayWithWeekday = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const label = new Date(year, month - 1, day).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const toDateStr = formatDateStr;

  const toggleExceptionExpanded = (exceptionId: string) => {
    setExpandedExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(exceptionId)) next.delete(exceptionId);
      else next.add(exceptionId);
      return next;
    });
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
    const isRecurring = exceptionRepeat.recurrence !== "none";
    const endMissing = isRecurring ? !exceptionNoEnd && !exceptionForm.endDate : !exceptionForm.endDate;
    if (!exceptionForm.startDate || endMissing) {
      showNotification({
        title: "Validación",
        message: isRecurring ? "Selecciona la fecha de inicio y, si aplica, la de fin" : "Selecciona las fechas de inicio y fin",
        color: "orange",
      });
      return;
    }
    const repeatErr = repeatError(exceptionRepeat);
    if (repeatErr) {
      showNotification({ title: "Validación", message: repeatErr, color: "orange" });
      return;
    }
    if (exceptionTimeError) {
      showNotification({ title: "Validación", message: exceptionTimeError, color: "orange" });
      return;
    }
    setSavingException(true);
    try {
      const payload: Omit<ScheduleException, "_id" | "createdAt"> = {
        startDate: toDateStr(exceptionForm.startDate),
        endDate: isRecurring && exceptionNoEnd ? NO_END_DATE : toDateStr(exceptionForm.endDate!),
        ...repeatPayload(exceptionRepeat),
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
      setExceptionRepeat(DEFAULT_REPEAT);
      setExceptionNoEnd(false);
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

  // Sin `date` elimina el bloqueo completo; con `date` solo ese día de un bloqueo multi-día
  const handleRemoveException = async (exceptionId: string, date?: string) => {
    try {
      const updated = await removeEmployeeException(employeeId, exceptionId, date);
      if (updated) setExceptions(updated);
      showNotification({
        title: "Éxito",
        message: date ? "Día eliminado del bloqueo" : "Bloqueo eliminado",
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
          Configura los días y horarios en que este profesional estará disponible para atender
          clientes. Si no se activa, seguirá el horario general de la organización.
        </Text>
      </Alert>

      <Group mb="lg" justify="space-between">
        <Switch
          label="Activar horario personalizado para este profesional"
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
              Fechas u horas específicas donde el profesional no estará disponible para reservas online
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
            {exceptions.map((exc) => {
              const isRecurring = !!exc.recurrence;
              // Recurrente: se despliegan las próximas ocurrencias para quitarlas una a una
              const isMultiDay = isRecurring || exc.startDate !== exc.endDate;
              const occurrenceDays = isRecurring
                ? listUpcomingOccurrences(exc, todayInTimezone(orgTimezone), 12)
                : listDaysInRange(exc.startDate, exc.endDate);
              const daysExpanded = isMultiDay && expandedExceptions.has(exc._id!);
              return (
                <Paper key={exc._id} p="sm" withBorder>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <div>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {isRecurring
                            ? describeRecurrence(exc)
                            : isMultiDay
                            ? `${formatDisplayDate(exc.startDate)} → ${formatDisplayDate(exc.endDate)}`
                            : formatDisplayDate(exc.startDate)}
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
                      {isRecurring && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {hasNoEnd(exc)
                            ? `Desde el ${formatDisplayDate(exc.startDate)}, sin fecha de fin`
                            : `Del ${formatDisplayDate(exc.startDate)} al ${formatDisplayDate(exc.endDate)}`}
                        </Text>
                      )}
                      {exc.reason && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {exc.reason}
                        </Text>
                      )}
                      {isMultiDay && (
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          mt={4}
                          px={0}
                          rightSection={
                            daysExpanded ? <BiChevronUp size={14} /> : <BiChevronDown size={14} />
                          }
                          onClick={() => toggleExceptionExpanded(exc._id!)}
                        >
                          {daysExpanded ? "Ocultar días" : isRecurring ? "Ver y quitar fechas" : "Ver y quitar días"}
                        </Button>
                      )}
                    </div>
                    <Tooltip label={isRecurring ? "Eliminar toda la repetición" : isMultiDay ? "Eliminar todo el bloqueo" : "Eliminar bloqueo"}>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleRemoveException(exc._id!)}
                      >
                        <BiTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>

                  {isMultiDay && (
                    <Collapse in={daysExpanded}>
                      {daysExpanded && (
                        <Stack
                          gap={4}
                          mt="xs"
                          pt="xs"
                          style={{
                            borderTop: "1px solid var(--mantine-color-gray-3)",
                            maxHeight: 240,
                            overflowY: "auto",
                          }}
                        >
                          {occurrenceDays.map((day) => (
                            <Group key={day} justify="space-between" wrap="nowrap">
                              <Text size="sm">{formatDayWithWeekday(day)}</Text>
                              <Tooltip label="Eliminar solo este día">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleRemoveException(exc._id!, day)}
                                >
                                  <BiTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          ))}
                        </Stack>
                      )}
                    </Collapse>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Modal para agregar excepción */}
      <Modal
        opened={exceptionModalOpen}
        onClose={() => {
          setExceptionModalOpen(false);
          setExceptionForm(DEFAULT_EXCEPTION_FORM);
          setExceptionRepeat(DEFAULT_REPEAT);
          setExceptionNoEnd(false);
        }}
        title="Agregar Bloqueo Temporal"
        size="md"
      >
        <Stack gap="md">
          <BlockRepeatFields value={exceptionRepeat} onChange={setExceptionRepeat} referenceDate={exceptionForm.startDate} />

          <Group grow>
            <DatePickerInput
              label={exceptionRepeat.recurrence === "none" ? "Fecha inicio" : "Desde"}
              placeholder="Seleccionar fecha"
              value={exceptionForm.startDate}
              onChange={(val) =>
                setExceptionForm((f) => ({ ...f, startDate: val }))
              }
              required
              clearable
            />
            {!(exceptionRepeat.recurrence !== "none" && exceptionNoEnd) && (
              <DatePickerInput
                label={exceptionRepeat.recurrence === "none" ? "Fecha fin" : "Hasta"}
                placeholder="Seleccionar fecha"
                value={exceptionForm.endDate}
                minDate={exceptionForm.startDate ?? undefined}
                onChange={(val) =>
                  setExceptionForm((f) => ({ ...f, endDate: val }))
                }
                required
                clearable
              />
            )}
          </Group>

          {exceptionRepeat.recurrence !== "none" && (
            <Switch
              label="Sin fecha de fin"
              description="El bloqueo se repite indefinidamente; puedes quitarlo o excluir días cuando quieras"
              checked={exceptionNoEnd}
              onChange={(e) => setExceptionNoEnd(e.currentTarget.checked)}
            />
          )}

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
            <Stack gap="xs">
              <TimeOfDayInput
                label="Hora inicio"
                value={exceptionForm.startTime}
                timeFormat={is24h ? "24h" : "12h"}
                onChange={(startTime) => setExceptionForm((f) => ({ ...f, startTime }))}
              />
              <TimeOfDayInput
                label="Hora fin"
                value={exceptionForm.endTime}
                timeFormat={is24h ? "24h" : "12h"}
                error={!!exceptionTimeError}
                onChange={(endTime) => setExceptionForm((f) => ({ ...f, endTime }))}
              />
              {exceptionTimeError && (
                <Text size="xs" c="red">
                  {exceptionTimeError}
                </Text>
              )}
            </Stack>
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
