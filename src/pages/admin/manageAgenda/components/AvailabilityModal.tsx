import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Box,
  Group,
  Text,
  NumberInput,
  MultiSelect,
  Avatar,
  ScrollArea,
  Loader,
  Grid,
  SegmentedControl,
  ActionIcon,
  Button,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { addDays, format, startOfWeek } from "date-fns";
import { RootState } from "../../../../app/store";
import DateSelector from "./DateSelector";
import AvailabilityWeekView from "./AvailabilityWeekView";
import { Employee } from "../../../../services/employeeService";
import { getAvailableSlots, TimeSlot } from "../../../../services/scheduleService";

interface AvailabilityModalProps {
  opened: boolean;
  onClose: () => void;
  employees: Employee[];
  organizationId?: string;
}

type ViewMode = "day" | "week";

const VIEW_MODE_STORAGE_KEY = "agenda_availability_view";

// Recuerda la última vista elegida; localStorage puede no estar disponible (modo privado, etc.)
const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === "week" ? "week" : "day";
  } catch {
    return "day";
  }
};

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  opened,
  onClose,
  employees,
  organizationId,
}) => {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const timeFormat = organization?.timeFormat || "12h";

  const [mode, setMode] = useState<ViewMode>(readStoredViewMode);
  const [date, setDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState<number>(30);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [slotsByEmployee, setSlotsByEmployee] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(false);

  const targets = useMemo(
    () =>
      selectedIds.length > 0
        ? employees.filter((e) => selectedIds.includes(e._id))
        : employees,
    [employees, selectedIds],
  );

  // La semana se muestra de lunes a domingo e incluye la fecha elegida
  const weekStart = useMemo(() => startOfWeek(date, { weekStartsOn: 1 }), [date]);
  const weekLabel = useMemo(() => {
    // "21 de sept" → "21 sept": más corto para que quepa junto a las flechas
    const short = (d: Date, withYear = false) =>
      d
        .toLocaleDateString("es-CO", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })
        .replace(/ de /g, " ");
    return `${short(weekStart)} – ${short(addDays(weekStart, 6), true)}`;
  }, [weekStart]);

  const handleModeChange = (value: string) => {
    const next: ViewMode = value === "week" ? "week" : "day";
    setMode(next);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // preferencia opcional
    }
  };

  useEffect(() => {
    if (!opened || mode !== "day" || !organizationId || targets.length === 0) {
      setSlotsByEmployee({});
      return;
    }
    let cancelled = false;
    const dateStr = format(date, "yyyy-MM-dd");

    setLoading(true);
    Promise.all(
      targets.map(async (emp) => {
        try {
          const slots = await getAvailableSlots(emp._id, dateStr, duration, organizationId);
          return [emp._id, slots ?? []] as const;
        } catch {
          // Un profesional con error no debe tumbar la consulta de los demás.
          return [emp._id, [] as TimeSlot[]] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, TimeSlot[]> = {};
      results.forEach(([id, slots]) => {
        map[id] = slots;
      });
      setSlotsByEmployee(map);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, mode, organizationId, date.toDateString(), duration, targets.map((e) => e._id).join(",")]);

  const formatSlotLabel = (start: string) => {
    const startTime = dayjs(`2000-01-01T${start}`);
    const endTime = startTime.add(duration, "minute");
    const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
    return `${startTime.format(fmt)} – ${endTime.format(fmt)}`;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="xl" fw={700}>
          🕒 Horarios disponibles
        </Text>
      }
      size={mode === "week" ? "70rem" : "xl"}
      centered
      radius="md"
      styles={{ body: { padding: "1.5rem" } }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
        <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 220 }}>
          {mode === "day"
            ? "Consulta los horarios libres de cada profesional para un día, sin importar el servicio que se vaya a atender."
            : `Rangos en los que se puede iniciar una cita de ${duration} min con al menos un profesional libre. Toca un día para ver el detalle por profesional.`}
        </Text>
        <SegmentedControl
          value={mode}
          onChange={handleModeChange}
          data={[
            { label: "Día", value: "day" },
            { label: "Semana", value: "week" },
          ]}
        />
      </Group>

      <Grid gutter="md" mb="lg">
        <Grid.Col span={{ base: 12, sm: mode === "week" ? 5 : 4 }}>
          {mode === "day" ? (
            <DateSelector label="Fecha" value={date} onChange={setDate} />
          ) : (
            <Box>
              <Text>Semana</Text>
              <Group gap="xs" wrap="wrap">
                <ActionIcon
                  variant="default"
                  size={42}
                  aria-label="Semana anterior"
                  onClick={() => setDate(addDays(date, -7))}
                >
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Text fw={600} size="sm" style={{ whiteSpace: "nowrap" }}>
                  {weekLabel}
                </Text>
                <ActionIcon
                  variant="default"
                  size={42}
                  aria-label="Semana siguiente"
                  onClick={() => setDate(addDays(date, 7))}
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
                <Button variant="default" size="md" style={{ flexShrink: 0 }} onClick={() => setDate(new Date())}>
                  Esta semana
                </Button>
              </Group>
            </Box>
          )}
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <NumberInput
            label="Duración (min)"
            value={duration}
            onChange={(value) => setDuration(typeof value === "number" ? value : 30)}
            min={5}
            max={480}
            step={5}
            styles={{ input: { borderRadius: 8 } }}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: mode === "week" ? 4 : 5 }}>
          <MultiSelect
            label="Profesionales"
            placeholder="Todos los profesionales"
            data={employees.map((e) => ({ value: e._id, label: e.names }))}
            value={selectedIds}
            onChange={setSelectedIds}
            clearable
            searchable
            styles={{ input: { borderRadius: 8 } }}
          />
        </Grid.Col>
      </Grid>

      {mode === "week" ? (
        <AvailabilityWeekView
          weekStart={weekStart}
          employees={targets}
          duration={duration}
          timeFormat={timeFormat}
          onPickDay={(picked) => {
            // Ir al detalle del día sin cambiar la vista recordada (setMode, no handleModeChange)
            setDate(picked);
            setMode("day");
          }}
        />
      ) : targets.length === 0 ? (
        <Text size="sm" c="dimmed">
          No hay profesionales para mostrar.
        </Text>
      ) : (
        <ScrollArea offsetScrollbars type="auto">
          <Group align="flex-start" wrap="nowrap" gap="md">
            {targets.map((emp) => {
              const slots = slotsByEmployee[emp._id] ?? [];
              return (
                <Box
                  key={emp._id}
                  style={{
                    minWidth: 190,
                    flexShrink: 0,
                    borderRadius: 8,
                    border: "1px solid #e9ecef",
                    borderTop: `3px solid ${emp.color || "#228be6"}`,
                    backgroundColor: "#f8f9fa",
                  }}
                  p="sm"
                >
                  <Group gap="xs" mb="sm" wrap="nowrap">
                    <Avatar src={emp.profileImage || undefined} size={24} radius="xl">
                      {emp.names?.[0]}
                    </Avatar>
                    <Text size="sm" fw={700} truncate>
                      {emp.names}
                    </Text>
                  </Group>

                  {loading ? (
                    <Group justify="center" py="md">
                      <Loader size="xs" />
                    </Group>
                  ) : slots.length === 0 ? (
                    <Text size="xs" c="dimmed">
                      Sin horarios disponibles este día.
                    </Text>
                  ) : (
                    <ScrollArea.Autosize mah={280} offsetScrollbars>
                      <Box style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {slots.map((slot) => (
                          <Box
                            key={slot.start}
                            p={6}
                            style={{
                              backgroundColor: "white",
                              borderRadius: 6,
                              border: "1px solid #d0ebff",
                            }}
                          >
                            <Text size="xs" fw={600}>
                              {formatSlotLabel(slot.start)}
                            </Text>
                          </Box>
                        ))}
                      </Box>
                    </ScrollArea.Autosize>
                  )}
                </Box>
              );
            })}
          </Group>
        </ScrollArea>
      )}
    </Modal>
  );
};

export default AvailabilityModal;
