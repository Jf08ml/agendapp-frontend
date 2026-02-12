import { useState, useMemo } from "react";
import {
  Switch,
  Stack,
  Text,
  Group,
  Checkbox,
  Paper,
  ActionIcon,
  Collapse,
  Badge,
  Divider,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarOff,
} from "@tabler/icons-react";
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../app/store";
import { useHolidays } from "../../../../../hooks/useHolidays";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function OnlineBookingTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const country = organization?.default_country || "CO";

  const blockHolidays = form.values.blockHolidaysForReservations ?? false;
  const allowedDates: string[] =
    (form.values.allowedHolidayDates as string[]) ?? [];

  const { isHoliday, holidayNames } = useHolidays(currentDate, {
    country,
    language: "es",
  });

  // Obtener todos los festivos del mes actual
  const monthHolidays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    return days
      .filter((d) => isHoliday(d))
      .map((d) => ({
        date: format(d, "yyyy-MM-dd"),
        dateLabel: format(d, "EEEE d 'de' MMMM", { locale: es }),
        names: holidayNames(d),
      }));
  }, [currentDate, isHoliday, holidayNames]);

  const toggleAllowedDate = (dateStr: string) => {
    const current = [...allowedDates];
    const idx = current.indexOf(dateStr);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(dateStr);
    }
    form.setFieldValue("allowedHolidayDates", current);
  };

  return (
    <SectionCard
      title="Configuración de reserva en línea"
      description="Controla la disponibilidad y visibilidad del sistema de reservas en línea para tus clientes."
    >
      <Stack gap="md">
        <Switch
          label="Habilitar reserva en línea"
          description="Permite a los clientes hacer reservas en línea. Al desactivar, se ocultará el botón de reserva en el menú de navegación y en la página principal."
          {...form.getInputProps("enableOnlineBooking", { type: "checkbox" })}
          disabled={!isEditing}
        />

        <Divider />

        <Switch
          label="Bloquear días festivos"
          description="Los días festivos del país no estarán disponibles para reservas en línea. Esto no afecta la agenda del administrador."
          {...form.getInputProps("blockHolidaysForReservations", {
            type: "checkbox",
          })}
          disabled={!isEditing}
        />

        <Collapse in={blockHolidays}>
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group gap="xs">
                <IconCalendarOff size={18} />
                <Text size="sm" fw={600}>
                  Días festivos ({country})
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Marca los festivos en los que deseas permitir reservas
                (excepciones al bloqueo).
              </Text>

              {/* Navegación de mes */}
              <Group justify="center" gap="xs">
                <ActionIcon
                  variant="subtle"
                  onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                  disabled={!isEditing}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Text
                  fw={600}
                  size="sm"
                  style={{
                    textTransform: "capitalize",
                    minWidth: 150,
                    textAlign: "center",
                  }}
                >
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </Text>
                <ActionIcon
                  variant="subtle"
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                  disabled={!isEditing}
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </Group>

              {/* Lista de festivos */}
              {monthHolidays.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No hay días festivos en este mes.
                </Text>
              ) : (
                <Stack gap="xs">
                  {monthHolidays.map((h) => (
                    <Paper key={h.date} withBorder p="xs" radius="sm">
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text
                            size="sm"
                            fw={500}
                            style={{ textTransform: "capitalize" }}
                          >
                            {h.dateLabel}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {h.names.join(", ")}
                          </Text>
                        </div>
                        <Checkbox
                          label="Permitir"
                          size="sm"
                          checked={allowedDates.includes(h.date)}
                          onChange={() => toggleAllowedDate(h.date)}
                          disabled={!isEditing}
                        />
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}

              {allowedDates.length > 0 && (
                <Badge variant="light" size="sm" color="green">
                  {allowedDates.length} excepcion
                  {allowedDates.length === 1 ? "" : "es"} configurada
                  {allowedDates.length === 1 ? "" : "s"}
                </Badge>
              )}
            </Stack>
          </Paper>
        </Collapse>

        <Text size="sm" c="dimmed" mt="md">
          Cuando la reserva en línea está deshabilitada, los clientes no podrán
          acceder al sistema de reservas. Solo podrán agendar citas a través del
          administrador o por otros medios de contacto.
        </Text>
      </Stack>
    </SectionCard>
  );
}
