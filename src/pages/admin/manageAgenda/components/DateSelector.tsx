import React from "react";
import { Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { set } from "date-fns";

interface DateSelectorProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
}

// Selector de fecha del modal de citas/disponibilidad. Usa el DateInput de Mantine
// (en español vía <DatesProvider>) en vez de <input type="date">, cuyo calendario
// depende del idioma del navegador.
const DateSelector: React.FC<DateSelectorProps> = ({
  label,
  value,
  onChange,
}) => {
  const handleDateChange = (picked: Date | null) => {
    if (!picked) return;
    // Solo cambia año/mes/día: la hora del valor actual se conserva.
    onChange(
      set(value || new Date(), {
        year: picked.getFullYear(),
        month: picked.getMonth(),
        date: picked.getDate(),
      })
    );
  };

  return (
    <div>
      <Text>{label}</Text>
      <DateInput
        size="md"
        value={value ?? null}
        onChange={handleDateChange}
        valueFormat="DD/MM/YYYY"
        placeholder="DD/MM/AAAA"
        clearable={false}
        // Los modales de la agenda usan zIndex hasta 300: el desplegable debe quedar encima.
        popoverProps={{ withinPortal: true, zIndex: 400 }}
      />
    </div>
  );
};

export default DateSelector;
