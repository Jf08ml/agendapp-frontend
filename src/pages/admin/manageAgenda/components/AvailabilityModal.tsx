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
} from "@mantine/core";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { format } from "date-fns";
import { RootState } from "../../../../app/store";
import DateSelector from "./DateSelector";
import { Employee } from "../../../../services/employeeService";
import { getAvailableSlots, TimeSlot } from "../../../../services/scheduleService";

interface AvailabilityModalProps {
  opened: boolean;
  onClose: () => void;
  employees: Employee[];
  organizationId?: string;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  opened,
  onClose,
  employees,
  organizationId,
}) => {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const timeFormat = organization?.timeFormat || "12h";

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

  useEffect(() => {
    if (!opened || !organizationId || targets.length === 0) {
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
  }, [opened, organizationId, date.toDateString(), duration, targets.map((e) => e._id).join(",")]);

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
      size="xl"
      centered
      radius="md"
      styles={{ body: { padding: "1.5rem" } }}
    >
      <Text size="sm" c="dimmed" mb="md">
        Consulta los horarios libres de cada profesional para un día, sin
        importar el servicio que se vaya a atender.
      </Text>

      <Grid gutter="md" mb="lg">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <DateSelector label="Fecha" value={date} onChange={setDate} />
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
        <Grid.Col span={{ base: 12, sm: 5 }}>
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

      {targets.length === 0 ? (
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
