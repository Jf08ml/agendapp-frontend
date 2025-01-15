import React from "react";
import { Input, Text } from "@mantine/core";
import { format, set } from "date-fns";

interface DateSelectorProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  label,
  value,
  onChange,
}) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.currentTarget.value.split("-").map(Number);
    const updatedDate = set(value || new Date(), {
      year: year || new Date().getFullYear(),
      month: (month || new Date().getMonth() + 1) - 1,
      date: day || new Date().getDate(),
    });
    onChange(updatedDate);
  };

  return (
    <div>
      <Text>{label}</Text>
      <Input
        type="date"
        size="md"
        value={value ? format(value, "yyyy-MM-dd") : ""}
        onChange={handleDateChange}
      />
    </div>
  );
};

export default DateSelector;
