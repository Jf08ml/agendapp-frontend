import { Group, Input, Select } from "@mantine/core";
import { parseTime } from "../utils/timeOfDay";

/**
 * Selector de hora con AM/PM explícito. Reemplaza al <TimeInput> de Mantine (que es un
 * <input type="time"> nativo) en los formularios de bloqueos: en el celular el campo
 * nativo sigue el formato del sistema y el AM/PM es un segmento fácil de pasar por alto,
 * así que "02:00" se guardaba como 02:00 de la madrugada aunque la persona quisiera 2 PM.
 *
 * El valor de entrada y salida es SIEMPRE "HH:mm" en 24 h (el formato del backend); el
 * formato de la organización (12h/24h) solo cambia cómo se elige.
 */

const pad = (n: number) => String(n).padStart(2, "0");

const HOURS_24 = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: pad(i) }));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: pad(i) }));
const PERIODS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

interface TimeOfDayInputProps {
  label: string;
  /** "HH:mm" en 24 h */
  value: string;
  onChange: (value: string) => void;
  /** Formato de la organización: "12h" (por defecto) o "24h" */
  timeFormat?: string;
  error?: boolean;
  /** Los selectores se abren dentro de modales: debe quedar por encima de ellos */
  zIndex?: number;
}

export default function TimeOfDayInput({
  label,
  value,
  onChange,
  timeFormat,
  error,
  zIndex = 1100,
}: TimeOfDayInputProps) {
  const is24h = timeFormat === "24h";
  const { h, m } = parseTime(value);
  const isPM = h >= 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  const emit = (hour24: number, minute: number) => onChange(`${pad(hour24)}:${pad(minute)}`);

  const common = {
    size: "sm" as const,
    allowDeselect: false,
    error: !!error,
    comboboxProps: { zIndex, withinPortal: true },
    maxDropdownHeight: 220,
  };

  return (
    <Input.Wrapper label={label}>
      <Group gap={6} wrap="nowrap" grow>
        {is24h ? (
          <Select
            {...common}
            aria-label={`${label}: hora`}
            data={HOURS_24}
            value={String(h)}
            onChange={(v) => v !== null && emit(parseInt(v, 10), m)}
          />
        ) : (
          <Select
            {...common}
            aria-label={`${label}: hora`}
            data={HOURS_12}
            value={String(hour12)}
            // 12 AM = 00 h, 12 PM = 12 h
            onChange={(v) => v !== null && emit((parseInt(v, 10) % 12) + (isPM ? 12 : 0), m)}
          />
        )}
        <Select
          {...common}
          aria-label={`${label}: minutos`}
          data={MINUTES}
          value={String(m)}
          onChange={(v) => v !== null && emit(h, parseInt(v, 10))}
        />
        {!is24h && (
          <Select
            {...common}
            aria-label={`${label}: AM o PM`}
            data={PERIODS}
            value={isPM ? "PM" : "AM"}
            onChange={(v) => v !== null && emit((h % 12) + (v === "PM" ? 12 : 0), m)}
          />
        )}
      </Group>
    </Input.Wrapper>
  );
}
