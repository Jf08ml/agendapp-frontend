// src/pages/admin/OrganizationInfo/components/tabs/OpeningHoursTab.tsx
import {
  ActionIcon,
  Box,
  Button,
  Group,
  MultiSelect,
  NativeSelect,
  SimpleGrid,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { UseFormReturnType } from "@mantine/form";
import SectionCard from "../SectionCard";
import type { FormValues } from "../../schema";
import { useEffect, useMemo, useState } from "react";
import { BiPlus, BiTrash } from "react-icons/bi";

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
  stepMinutes: number;
};

// Helpers
function toHHmmStrict(v: string): string {
  // Acepta "09:00" exactamente
  const m = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function toHHmmLenient(v: string): string {
  // Normaliza entradas comunes: "9", "9:5", "09:5", "9:05" -> "09:00/09:05"
  if (!v) return "";
  const onlyDigits = v.replace(/[^\d:]/g, "");
  const parts = onlyDigits.split(":");

  let h = "";
  let m = "";

  if (parts.length === 1) {
    // "9" -> 09:00, "1234" -> 12:34 (si tiene 3-4 dígitos)
    const d = parts[0];
    if (d.length <= 2) {
      h = d.padStart(2, "0");
      m = "00";
    } else if (d.length === 3) {
      h = d.slice(0, 1).padStart(2, "0");
      m = d.slice(1).padStart(2, "0");
    } else {
      h = d.slice(0, 2);
      m = d.slice(2, 4).padStart(2, "0");
    }
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

  const H = String(hi).padStart(2, "0");
  const M = String(mi).padStart(2, "0");
  return `${H}:${M}`;
}

export default function OpeningHoursTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const opening: OpeningHoursSafe = {
    start: form.values.openingHours?.start ?? "",
    end: form.values.openingHours?.end ?? "",
    businessDays: [
      ...(form.values.openingHours?.businessDays ?? [1, 2, 3, 4, 5]),
    ],
    breaks: [...(form.values.openingHours?.breaks ?? [])],
    stepMinutes: form.values.openingHours?.stepMinutes ?? 5,
  };

  const breaks: OpeningBreak[] = opening.breaks;
  const businessDays: number[] = opening.businessDays;

  // Estados locales de texto para evitar que TimeInput vuelva a "--:--"
  const [, setStartLocal] = useState<string>(opening.start || "");
  const [, setEndLocal] = useState<string>(opening.end || "");

  // Si desde fuera cambian (ej. reset), sincroniza
  useEffect(() => setStartLocal(opening.start || ""), [opening.start]);
  useEffect(() => setEndLocal(opening.end || ""), [opening.end]);

  const [newBreak, setNewBreak] = useState<{
    day: string;
    start: string;
    end: string;
    note?: string;
  }>({
    day: "1",
    start: "12:00",
    end: "13:00",
    note: "",
  });

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
    form.setValues({
      ...form.values,
      openingHours: {
        ...opening,
        breaks: [...breaks, nb],
      },
    });
  };

  const removeBreak = (idx: number) => {
    if (!isEditing) return;
    const next = breaks.filter((_, i) => i !== idx);
    form.setValues({
      ...form.values,
      openingHours: {
        ...opening,
        breaks: next,
      },
    });
  };

  return (
    <SectionCard
      title="Horario de atención"
      description="Define tu horario base y bloquea espacios dentro de ese horario."
    >
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
        <Text fw={600} mb={6}>
          Días laborables
        </Text>
        <MultiSelect
          data={dayOptions}
          value={businessDays.map(String)}
          onChange={(vals) => {
            if (!isEditing) return;
            const nums = Array.from(new Set(vals.map((v) => Number(v)))).sort(
              (a, b) => a - b
            );
            form.setValues({
              ...form.values,
              openingHours: { ...opening, businessDays: nums },
            });
          }}
          disabled={!isEditing}
          placeholder="Selecciona los días en los que trabajas"
        />
        <Group mt="xs" gap="xs">
          {businessDays.map((d) => (
            <DayPill key={d} d={d} />
          ))}
        </Group>
      </Box>

      <NativeSelect
        label="Intervalo de inicio (minutos) - Reserva en línea"
        description="Define cada cuánto aparecen horarios disponibles en la reserva en línea (ej: 5 muestra 8:50, 10 muestra 8:50 si cae en múltiplos de 10, 15 no lo mostrará)."
        value={String(opening.stepMinutes)}
        onChange={(e) => {
          if (!isEditing) return;
          const v = Number(e.currentTarget.value);
          form.setValues({
            ...form.values,
            openingHours: { ...opening, stepMinutes: v },
          });
        }}
        data={[
          { value: "5", label: "Cada 5 minutos (recomendado)" },
          { value: "10", label: "Cada 10 minutos" },
          { value: "15", label: "Cada 15 minutos" },
          { value: "30", label: "Cada 30 minutos" },
        ]}
        disabled={!isEditing}
        mt="lg"
      />

      <Box mt="lg">
        <Text fw={600} mb={6}>
          Espacios no disponibles dentro del horario laboral
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm" mb="sm">
          <NativeSelect
            label="Día"
            value={newBreak.day}
            onChange={(e) =>
              setNewBreak((s) => ({ ...s, day: e.currentTarget.value }))
            }
            data={DAY_LABELS.map((l, i) => ({ value: String(i), label: l }))}
            disabled={!isEditing}
          />
          <TimeInput
            label="Desde"
            value={newBreak.start}
            onChange={(e) =>
              setNewBreak((s) => ({
                ...s,
                start: e.currentTarget.value,
              }))
            }
            onBlur={() =>
              setNewBreak((s) => ({
                ...s,
                start: toHHmmStrict(toHHmmLenient(s.start)),
              }))
            }
            disabled={!isEditing}
          />

          <TimeInput
            label="Hasta"
            value={newBreak.end}
            onChange={(e) =>
              setNewBreak((s) => ({
                ...s,
                end: e.currentTarget.value,
              }))
            }
            onBlur={() =>
              setNewBreak((s) => ({
                ...s,
                end: toHHmmStrict(toHHmmLenient(s.end)),
              }))
            }
            disabled={!isEditing}
          />

          <TextInput
            label="Nota (opcional)"
            placeholder="Almuerzo, inventario, etc."
            value={newBreak.note || ""}
            onChange={(e) =>
              setNewBreak((s) => ({ ...s, note: e.currentTarget.value }))
            }
            disabled={!isEditing}
          />
        </SimpleGrid>

        <Group justify="flex-end" mb="sm">
          <Button
            leftSection={<BiPlus size={16} />}
            onClick={addBreak}
            disabled={!isEditing}
          >
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
              {isEditing && <Table.Th style={{ width: 48 }}></Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {breaks.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={isEditing ? 5 : 4}>
                  <Text c="dimmed" ta="center">
                    No hay bloqueos configurados.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              breaks.map((b, idx) => (
                <Table.Tr key={`${b.day}-${b.start}-${b.end}-${idx}`}>
                  <Table.Td>{DAY_LABELS[b.day]}</Table.Td>
                  <Table.Td>{b.start}</Table.Td>
                  <Table.Td>{b.end}</Table.Td>
                  <Table.Td>{b.note || "—"}</Table.Td>
                  {isEditing && (
                    <Table.Td>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => removeBreak(idx)}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
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
  );
}
