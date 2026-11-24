import { Button, Chip, Group, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { WEEKDAY_SHORT } from "../utils/scheduleExceptions";
import type { BlockRepeatValue } from "../utils/blockRepeat";

// Lunes primero (es como se lee la semana en la región)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  value: BlockRepeatValue;
  onChange: (value: BlockRepeatValue) => void;
  /** Mes que se dibuja en el calendario de "días del mes" (por defecto: el mes actual) */
  referenceDate?: Date | null;
}

const toggle = (list: number[], n: number) =>
  list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);

export default function BlockRepeatFields({ value, onChange, referenceDate }: Props) {
  return (
    <Stack gap="xs">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Repetir
        </Text>
        <SegmentedControl
          fullWidth
          size="xs"
          value={value.recurrence}
          onChange={(v) => onChange({ ...value, recurrence: v as BlockRepeatValue["recurrence"] })}
          data={[
            { label: "No se repite", value: "none" },
            { label: "Días de la semana", value: "weekly" },
            { label: "Días del mes", value: "monthly" },
          ]}
        />
      </div>

      {value.recurrence === "weekly" && (
        <Group gap={6}>
          {WEEK_ORDER.map((d) => (
            <Chip
              key={d}
              size="xs"
              variant="filled"
              checked={value.weekdays.includes(d)}
              onChange={() => onChange({ ...value, weekdays: toggle(value.weekdays, d) })}
            >
              {WEEKDAY_SHORT[d]}
            </Chip>
          ))}
        </Group>
      )}

      {value.recurrence === "monthly" && (
        <MonthDayGrid
          selected={value.monthDays}
          onToggle={(d) => onChange({ ...value, monthDays: toggle(value.monthDays, d) })}
          referenceDate={referenceDate}
        />
      )}
    </Stack>
  );
}

// Calendario del mes de referencia (lunes primero) para elegir días del mes viendo en qué día de la
// semana cae cada uno. La regla se repite todos los meses por NÚMERO de día; el nombre del día
// solo es de referencia (cambia de un mes a otro).
function MonthDayGrid({
  selected,
  onToggle,
  referenceDate,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  referenceDate?: Date | null;
}) {
  const base = referenceDate ?? new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const monthLabel = new Date(year, month, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const header = WEEK_ORDER.map((d) => WEEKDAY_SHORT[d]);
  const missing = Array.from({ length: 31 - daysInMonth }, (_, i) => daysInMonth + 1 + i);

  const cell = (day: number) => (
    <Button
      key={day}
      size="compact-sm"
      variant={selected.includes(day) ? "filled" : "default"}
      onClick={() => onToggle(day)}
      px={0}
    >
      {day}
    </Button>
  );

  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        Calendario de {monthLabel} como referencia. Se repite estos días <strong>todos los meses</strong>.
      </Text>
      <SimpleGrid cols={7} spacing={4}>
        {header.map((h) => (
          <Text key={h} size="xs" fw={600} ta="center" c="dimmed">
            {h}
          </Text>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => cell(i + 1))}
      </SimpleGrid>
      {missing.length > 0 && (
        <Group gap={4} align="center">
          <Text size="xs" c="dimmed">
            Días que este mes no tiene:
          </Text>
          {missing.map(cell)}
        </Group>
      )}
      {selected.some((d) => d > 28) && (
        <Text size="xs" c="dimmed">
          Los días 29, 30 y 31 solo aplican en los meses que los tienen.
        </Text>
      )}
    </Stack>
  );
}
