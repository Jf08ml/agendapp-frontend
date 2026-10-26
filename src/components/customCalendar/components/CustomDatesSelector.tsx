import { FC } from 'react';
import { ActionIcon, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import TimeOfDayInput from '../../TimeOfDayInput';

/**
 * Fechas sueltas para una serie 'custom' (ej. sesiones de un paquete el 23/10, 26/10
 * y 4/11). La primera cita es la del formulario; aquí se agregan las demás, cada una
 * con su hora. Los valores son "YYYY-MM-DDTHH:mm:ss" sin zona: la hora que se ve es
 * la de la organización (mismo criterio que asISO en appointmentService).
 */

const NAIVE_FMT = 'YYYY-MM-DDTHH:mm:ss';

interface CustomDatesSelectorProps {
  value: string[];
  onChange: (dates: string[]) => void;
  /** Fecha y hora de la primera cita (la del formulario) */
  firstDate?: Date | null;
  timeFormat?: string;
  /** Los desplegables se abren dentro del modal de la cita (zIndex 300) */
  zIndex?: number;
}

const CustomDatesSelector: FC<CustomDatesSelectorProps> = ({
  value,
  onChange,
  firstDate,
  timeFormat,
  zIndex = 400,
}) => {
  const timeFmt = timeFormat === '24h' ? 'HH:mm' : 'h:mm A';

  const update = (index: number, next: dayjs.Dayjs) => {
    const dates = [...value];
    dates[index] = next.format(NAIVE_FMT);
    onChange(dates);
  };

  const addDate = () => {
    // Por defecto: una semana después de la última fecha, a la hora de la primera cita
    const last = value.length > 0 ? dayjs(value[value.length - 1]) : dayjs(firstDate ?? new Date());
    const base = dayjs(firstDate ?? last.toDate());
    const next = last.add(7, 'day').hour(base.hour()).minute(base.minute()).second(0);
    onChange([...value, next.format(NAIVE_FMT)]);
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Text size="sm" fw={500}>
          Elige el día y la hora de cada cita
        </Text>

        <Group gap="xs">
          <Text size="sm" fw={600} w={22}>1.</Text>
          <Text size="sm">
            {firstDate
              ? `${dayjs(firstDate).format('dddd D [de] MMMM')} · ${dayjs(firstDate).format(timeFmt)}`
              : 'Elige la fecha y hora arriba'}
          </Text>
          <Text size="xs" c="dimmed">(la de arriba)</Text>
        </Group>

        {value.map((iso, index) => {
          const d = dayjs(iso);
          return (
            <Group key={index} gap="xs" align="flex-end" wrap="wrap">
              <Text size="sm" fw={600} w={22} pb={8}>{index + 2}.</Text>
              <DateInput
                label="Fecha"
                value={d.toDate()}
                onChange={(date) => {
                  if (!date) return;
                  const picked = dayjs(date);
                  update(index, d.year(picked.year()).month(picked.month()).date(picked.date()));
                }}
                clearable={false}
                popoverProps={{ withinPortal: true, zIndex }}
                style={{ flex: "1 1 140px", minWidth: 0 }}
              />
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <TimeOfDayInput
                  label="Hora"
                  value={d.format('HH:mm')}
                  onChange={(hhmm) => {
                    const [h, m] = hhmm.split(':').map(Number);
                    update(index, d.hour(h).minute(m).second(0));
                  }}
                  timeFormat={timeFormat}
                  zIndex={zIndex}
                />
              </div>
              <ActionIcon
                variant="subtle"
                color="red"
                mb={6}
                aria-label="Quitar fecha"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        })}

        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addDate}
          disabled={!firstDate}
          style={{ alignSelf: 'flex-start' }}
        >
          Agregar fecha
        </Button>

        {value.length === 0 && (
          <Text size="xs" c="red">
            Agrega al menos una fecha más
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

export default CustomDatesSelector;
