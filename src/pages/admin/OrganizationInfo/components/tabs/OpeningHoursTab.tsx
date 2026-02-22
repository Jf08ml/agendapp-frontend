// src/pages/admin/OrganizationInfo/components/tabs/OpeningHoursTab.tsx
import { useState, useMemo } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Group,
  MultiSelect,
  NativeSelect,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { UseFormReturnType } from "@mantine/form";
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
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarOff,
  IconInfoCircle,
} from "@tabler/icons-react";
import { BiPlus, BiTrash } from "react-icons/bi";
import { RootState } from "../../../../../app/store";
import { useHolidays } from "../../../../../hooks/useHolidays";
import SectionCard from "../SectionCard";
import WeeklyScheduleSection from "../WeeklyScheduleSection";
import type { FormValues } from "../../schema";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function DayPill({ d }: { d: number }) {
  return (
    <Box
      px="xs"
      py={4}
      style={{
        borderRadius: 8,
        border: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Text size="xs">{DAY_LABELS[d]}</Text>
    </Box>
  );
}

type OpeningHours = NonNullable<FormValues["openingHours"]>;
type OpeningBreak = NonNullable<OpeningHours["breaks"]>[number];

type OpeningHoursSafe = {
  start: string;
  end: string;
  businessDays: number[];
  breaks: OpeningBreak[];
};

// Helpers
function toHHmmStrict(v: string): string {
  const m = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function toHHmmLenient(v: string): string {
  if (!v) return "";
  const onlyDigits = v.replace(/[^\d:]/g, "");
  const parts = onlyDigits.split(":");
  let h = "";
  let m = "";
  if (parts.length === 1) {
    const d = parts[0];
    if (d.length <= 2) { h = d.padStart(2, "0"); m = "00"; }
    else if (d.length === 3) { h = d.slice(0, 1).padStart(2, "0"); m = d.slice(1).padStart(2, "0"); }
    else { h = d.slice(0, 2); m = d.slice(2, 4).padStart(2, "0"); }
  } else {
    h = (parts[0] || "").padStart(2, "0");
    m = (parts[1] || "00").padStart(2, "0").slice(0, 2);
  }
  let hi = Number(h);
  let mi = Number(m);
  if (Number.isNaN(hi)) hi = 0;
  if (Number.isNaN(mi)) mi = 0;
  if (hi > 23) hi = 23;
  if (mi > 59) mi = 59;
  return `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

export default function OpeningHoursTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  // ── Horario base ──────────────────────────────────────────────────────────
  const opening: OpeningHoursSafe = {
    start: form.values.openingHours?.start ?? "",
    end: form.values.openingHours?.end ?? "",
    businessDays: [...(form.values.openingHours?.businessDays ?? [1, 2, 3, 4, 5])],
    breaks: [...(form.values.openingHours?.breaks ?? [])],
  };
  const breaks: OpeningBreak[] = opening.breaks;
  const businessDays: number[] = opening.businessDays;

  const [newBreak, setNewBreak] = useState<{
    day: string; start: string; end: string; note?: string;
  }>({ day: "1", start: "12:00", end: "13:00", note: "" });

  const dayOptions = useMemo(
    () => DAY_LABELS.map((label, idx) => ({ value: String(idx), label })),
    []
  );

  const addBreak = () => {
    if (!isEditing) return;
    const nb: OpeningBreak = {
      day: Number(newBreak.day),
      start: toHHmmStrict(toHHmmLenient(newBreak.start)),
      end: toHHmmStrict(toHHmmLenient(newBreak.end)),
      note: (newBreak.note || "").trim() || undefined,
    };
    form.setValues({ ...form.values, openingHours: { ...opening, breaks: [...breaks, nb] } });
  };

  const removeBreak = (idx: number) => {
    if (!isEditing) return;
    form.setValues({
      ...form.values,
      openingHours: { ...opening, breaks: breaks.filter((_, i) => i !== idx) },
    });
  };

  // ── Reserva en línea — festivos ───────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const organization = useSelector((s: RootState) => s.organization.organization);
  const country = organization?.default_country || "CO";
  const blockHolidays = form.values.blockHolidaysForReservations ?? false;
  const allowedDates: string[] = (form.values.allowedHolidayDates as string[]) ?? [];

  const { isHoliday, holidayNames } = useHolidays(currentDate, { country, language: "es" });

  const monthHolidays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end })
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
    if (idx >= 0) current.splice(idx, 1);
    else current.push(dateStr);
    form.setFieldValue("allowedHolidayDates", current);
  };

  // ── Intervalo de slots ────────────────────────────────────────────────────
  const PRESET_STEPS = [5, 10, 15, 30, 60];
  const weeklyStepMinutes = form.values.weeklySchedule?.stepMinutes ?? 30;
  const isCustomStep = !PRESET_STEPS.includes(weeklyStepMinutes);

  const weeklyScheduleEnabled = form.values.weeklySchedule?.enabled ?? false;

  return (
    <Stack gap="xl">
      {/* ── SECCIÓN 1: Horario base ────────────────────────────────────────── */}
      <SectionCard
        title="Horario base de atención"
        description={
          weeklyScheduleEnabled
            ? "Este horario actúa como respaldo. Actualmente está usando los horarios personalizados por día configurados abajo."
            : "Define los días y horas en que atiendes. Este horario se aplica a toda la semana y determina la disponibilidad tanto en la agenda del administrador como en la reserva en línea de los clientes."
        }
      >
        {weeklyScheduleEnabled && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            mb="md"
          >
            Los <strong>horarios personalizados por día</strong> están activos — el horario base de abajo no se usa actualmente para la disponibilidad.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TimeInput
            label="Apertura"
            {...form.getInputProps("openingHours.start")}
            withSeconds={false}
            disabled={!isEditing}
          />
          <TimeInput
            label="Cierre"
            {...form.getInputProps("openingHours.end")}
            withSeconds={false}
            disabled={!isEditing}
          />
        </SimpleGrid>

        <Box mt="md">
          <Text fw={600} mb={6}>Días laborables</Text>
          <MultiSelect
            data={dayOptions}
            value={businessDays.map(String)}
            onChange={(vals) => {
              if (!isEditing) return;
              const nums = Array.from(new Set(vals.map((v) => Number(v)))).sort((a, b) => a - b);
              form.setValues({ ...form.values, openingHours: { ...opening, businessDays: nums } });
            }}
            disabled={!isEditing}
            placeholder="Selecciona los días en los que trabajas"
          />
          <Group mt="xs" gap="xs">
            {businessDays.map((d) => <DayPill key={d} d={d} />)}
          </Group>
        </Box>

        <Box mt="lg">
          <Text fw={600} mb={4}>Bloqueos dentro del horario</Text>
          <Text size="xs" c="dimmed" mb="sm">
            Períodos específicos en que no atiendes, como almuerzo o inventario. Se aplican sobre el horario base.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm" mb="sm">
            <NativeSelect
              label="Día"
              value={newBreak.day}
              onChange={(e) => setNewBreak((s) => ({ ...s, day: e.currentTarget.value }))}
              data={DAY_LABELS.map((l, i) => ({ value: String(i), label: l }))}
              disabled={!isEditing}
            />
            <TimeInput
              label="Desde"
              value={newBreak.start}
              onChange={(e) => setNewBreak((s) => ({ ...s, start: e.currentTarget.value }))}
              onBlur={() => setNewBreak((s) => ({ ...s, start: toHHmmStrict(toHHmmLenient(s.start)) }))}
              disabled={!isEditing}
            />
            <TimeInput
              label="Hasta"
              value={newBreak.end}
              onChange={(e) => setNewBreak((s) => ({ ...s, end: e.currentTarget.value }))}
              onBlur={() => setNewBreak((s) => ({ ...s, end: toHHmmStrict(toHHmmLenient(s.end)) }))}
              disabled={!isEditing}
            />
            <TextInput
              label="Nota (opcional)"
              placeholder="Almuerzo, inventario, etc."
              value={newBreak.note || ""}
              onChange={(e) => setNewBreak((s) => ({ ...s, note: e.currentTarget.value }))}
              disabled={!isEditing}
            />
          </SimpleGrid>

          <Group justify="flex-end" mb="sm">
            <Button leftSection={<BiPlus size={16} />} onClick={addBreak} disabled={!isEditing}>
              Agregar bloqueo
            </Button>
          </Group>

          <Table withTableBorder withColumnBorders striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Día</Table.Th>
                <Table.Th>Desde</Table.Th>
                <Table.Th>Hasta</Table.Th>
                <Table.Th>Nota</Table.Th>
                {isEditing && <Table.Th style={{ width: 48 }} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {breaks.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isEditing ? 5 : 4}>
                    <Text c="dimmed" ta="center">No hay bloqueos configurados.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                breaks.map((b, idx) => (
                  <Table.Tr key={`${b.day}-${b.start}-${b.end}-${idx}`}>
                    <Table.Td>
                      {b.day !== null && b.day !== undefined
                        ? DAY_LABELS[b.day]
                        : <Text c="dimmed" size="sm">Todos los días</Text>}
                    </Table.Td>
                    <Table.Td>{b.start}</Table.Td>
                    <Table.Td>{b.end}</Table.Td>
                    <Table.Td>{b.note || "—"}</Table.Td>
                    {isEditing && (
                      <Table.Td>
                        <ActionIcon variant="light" color="red" onClick={() => removeBreak(idx)}>
                          <BiTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </SectionCard>

      {/* ── SECCIÓN 2: Horarios personalizados por día ────────────────────── */}
      <SectionCard
        title="Horarios personalizados por día"
        description="Cuando los días de la semana tienen horarios distintos (ej: lunes a viernes 8AM–8PM, sábado 8AM–2PM, domingo cerrado), activa esta opción para configurarlos individualmente. Al activarlos, reemplazan completamente el horario base."
      >
        <WeeklyScheduleSection
          value={{
            enabled: form.values.weeklySchedule?.enabled ?? false,
            schedule: (form.values.weeklySchedule?.schedule ?? []).map((s) => ({
              ...s,
              start: s.start ?? "",
              end: s.end ?? "",
              breaks: (s.breaks ?? []).map((b) => ({
                start: b.start ?? "",
                end: b.end ?? "",
                note: b.note,
              })),
            })),
            stepMinutes: form.values.weeklySchedule?.stepMinutes ?? 30,
          }}
          onChange={(weeklySchedule) => form.setFieldValue("weeklySchedule", weeklySchedule)}
          disabled={!isEditing}
        />
      </SectionCard>

      {/* ── SECCIÓN 3: Reserva en línea ───────────────────────────────────── */}
      <SectionCard
        title="Reserva en línea"
        description="Configura cómo los clientes reservan desde tu página pública. Los horarios disponibles provienen del sistema de horarios configurado arriba."
      >
        <Stack gap="md">
          <Switch
            label="Habilitar reserva en línea"
            description="Permite a los clientes hacer reservas en línea. Al desactivar, se ocultará el botón de reserva en el menú de navegación y en la página principal."
            {...form.getInputProps("enableOnlineBooking", { type: "checkbox" })}
            disabled={!isEditing}
          />

          <Divider />

          <Box>
            <Text fw={600} mb={4}>Intervalo de horarios disponibles</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Cada cuántos minutos aparece una opción de hora en la reserva en línea. Un intervalo menor da más opciones pero puede ser excesivo; uno mayor es más limpio pero menos flexible.
            </Text>
            <NativeSelect
              value={isCustomStep ? "custom" : String(weeklyStepMinutes)}
              onChange={(e) => {
                if (!isEditing) return;
                const newStep = e.currentTarget.value === "custom" ? 120 : Number(e.currentTarget.value);
                form.setFieldValue("weeklySchedule.stepMinutes", newStep);
              }}
              data={[
                { value: "5", label: "Cada 5 minutos (recomendado)" },
                { value: "10", label: "Cada 10 minutos" },
                { value: "15", label: "Cada 15 minutos" },
                { value: "30", label: "Cada 30 minutos" },
                { value: "60", label: "Cada 60 minutos" },
                { value: "custom", label: "Personalizada..." },
              ]}
              disabled={!isEditing}
              w={{ base: "100%", sm: 280 }}
            />
            {isCustomStep && (
              <NumberInput
                label="Intervalo personalizado (minutos)"
                min={1}
                max={1440}
                value={weeklyStepMinutes}
                onChange={(v) => {
                  if (!isEditing) return;
                  form.setFieldValue("weeklySchedule.stepMinutes", Number(v) || 1);
                }}
                disabled={!isEditing}
                mt="xs"
                w={200}
              />
            )}
          </Box>

          <Divider />

          <Switch
            label="Bloquear días festivos"
            description="Los días festivos del país no estarán disponibles para reservas en línea. Esto no afecta la agenda del administrador."
            {...form.getInputProps("blockHolidaysForReservations", { type: "checkbox" })}
            disabled={!isEditing}
          />

          <Collapse in={blockHolidays}>
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group gap="xs">
                  <IconCalendarOff size={18} />
                  <Text size="sm" fw={600}>Días festivos ({country})</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Marca los festivos en los que deseas <strong>permitir</strong> reservas (excepciones al bloqueo).
                </Text>

                <Group justify="center" gap="xs">
                  <ActionIcon variant="subtle" onClick={() => setCurrentDate((d) => subMonths(d, 1))} disabled={!isEditing}>
                    <IconChevronLeft size={16} />
                  </ActionIcon>
                  <Text fw={600} size="sm" style={{ textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>
                    {format(currentDate, "MMMM yyyy", { locale: es })}
                  </Text>
                  <ActionIcon variant="subtle" onClick={() => setCurrentDate((d) => addMonths(d, 1))} disabled={!isEditing}>
                    <IconChevronRight size={16} />
                  </ActionIcon>
                </Group>

                {monthHolidays.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="md">No hay días festivos en este mes.</Text>
                ) : (
                  <Stack gap="xs">
                    {monthHolidays.map((h) => (
                      <Paper key={h.date} withBorder p="xs" radius="sm">
                        <Group justify="space-between" wrap="nowrap">
                          <div>
                            <Text size="sm" fw={500} style={{ textTransform: "capitalize" }}>{h.dateLabel}</Text>
                            <Text size="xs" c="dimmed">{h.names.join(", ")}</Text>
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
                    {allowedDates.length} excepción{allowedDates.length === 1 ? "" : "es"} configurada{allowedDates.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </Stack>
            </Paper>
          </Collapse>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
