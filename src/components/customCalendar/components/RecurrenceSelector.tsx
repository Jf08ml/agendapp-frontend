import { FC } from 'react';
import {
  Stack,
  Radio,
  Group,
  NumberInput,
  Checkbox,
  Text,
  Paper
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { RecurrencePattern } from '../../../services/appointmentService';

interface RecurrenceSelectorProps {
  value: RecurrencePattern;
  onChange: (pattern: RecurrencePattern) => void;
  startDate?: Date | null;
  disabled?: boolean;
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Dom', shortLabel: 'D' },
  { value: 1, label: 'Lun', shortLabel: 'L' },
  { value: 2, label: 'Mar', shortLabel: 'M' },
  { value: 3, label: 'Mié', shortLabel: 'X' },
  { value: 4, label: 'Jue', shortLabel: 'J' },
  { value: 5, label: 'Vie', shortLabel: 'V' },
  { value: 6, label: 'Sáb', shortLabel: 'S' },
];

const RecurrenceSelector: FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  startDate,
  disabled = false
}) => {
  const isWeekly = value.type === 'weekly';

  const handleTypeChange = (newType: 'none' | 'weekly') => {
    if (newType === 'none') {
      onChange({
        type: 'none',
        intervalWeeks: 1,
        weekdays: [],
        endType: 'count',
        count: 1
      });
    } else {
      // Obtener el día de la semana de la fecha de inicio
      const dayOfWeek = startDate ? startDate.getDay() : 1; // 0=Domingo, 1=Lunes, etc.
      
      onChange({
        type: 'weekly',
        intervalWeeks: 1,
        weekdays: [dayOfWeek], // Día correspondiente a la fecha de inicio
        endType: 'count',
        count: 4
      });
    }
  };

  const handleWeekdayToggle = (day: number) => {
    const currentWeekdays = value.weekdays || [];
    const newWeekdays = currentWeekdays.includes(day)
      ? currentWeekdays.filter(d => d !== day)
      : [...currentWeekdays, day].sort((a, b) => a - b);
    
    onChange({ ...value, weekdays: newWeekdays });
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Radio.Group
          value={value.type}
          onChange={(val) => handleTypeChange(val as 'none' | 'weekly')}
          label="Tipo de cita"
        >
          <Stack mt="xs" gap="xs">
            <Radio value="none" label="No repetir (cita única)" />
            <Radio value="weekly" label="Repetir semanalmente" />
          </Stack>
        </Radio.Group>

        {isWeekly && (
          <Stack gap="sm" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            {/* Intervalo de semanas */}
            <Group align="flex-start">
              <Text size="sm" fw={500} style={{ minWidth: 120 }}>
                Cada
              </Text>
              <NumberInput
                value={value.intervalWeeks}
                onChange={(val) => onChange({ ...value, intervalWeeks: Number(val) || 1 })}
                min={1}
                max={52}
                style={{ width: 80 }}
                disabled={disabled}
              />
              <Text size="sm" fw={500}>
                {value.intervalWeeks === 1 ? 'semana' : 'semanas'}
              </Text>
            </Group>

            {/* Selector de días */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                En los días:
              </Text>
              <Group gap="xs">
                {WEEKDAY_OPTIONS.map((day) => (
                  <Checkbox
                    key={day.value}
                    checked={value.weekdays?.includes(day.value)}
                    onChange={() => handleWeekdayToggle(day.value)}
                    label={day.label}
                    disabled={disabled}
                  />
                ))}
              </Group>
              {value.weekdays?.length === 0 && (
                <Text size="xs" c="red">
                  Selecciona al menos un día
                </Text>
              )}
            </Stack>

            {/* Tipo de finalización */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Finalizar:
              </Text>
              <Radio.Group
                value={value.endType}
                onChange={(val) => onChange({ ...value, endType: val as 'date' | 'count' })}
              >
                <Stack gap="sm">
                  <Radio
                    value="count"
                    label={
                      <Group gap="xs" align="center">
                        <Text size="sm">Después de</Text>
                        {value.endType === 'count' && (
                          <>
                            <NumberInput
                              value={value.count}
                              onChange={(val) => onChange({ ...value, count: Number(val) || 1 })}
                              min={1}
                              max={100}
                              style={{ width: 80 }}
                              disabled={disabled}
                            />
                            <Text size="sm">ocurrencias</Text>
                          </>
                        )}
                      </Group>
                    }
                  />
                  <Radio
                    value="date"
                    label={
                      <Group gap="xs" align="center">
                        <Text size="sm">Hasta el</Text>
                        {value.endType === 'date' && (
                          <DateInput
                            value={value.endDate ? new Date(value.endDate) : null}
                            onChange={(date) => 
                              onChange({ 
                                ...value, 
                                endDate: date?.toISOString() 
                              })
                            }
                            minDate={new Date()}
                            placeholder="Selecciona fecha"
                            valueFormat="DD/MM/YYYY"
                            disabled={disabled}
                            style={{ width: 150 }}
                          />
                        )}
                      </Group>
                    }
                  />
                </Stack>
              </Radio.Group>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default RecurrenceSelector;
