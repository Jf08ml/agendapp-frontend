import React from "react";
import {
  SimpleGrid, Card, Text, Badge, Group, Stack, ThemeIcon,
  Center, Loader, rem,
} from "@mantine/core";
import { IconSchool, IconUsers, IconDiscount, IconClock } from "@tabler/icons-react";
import { ClassType } from "../../../services/classService";

interface Props {
  classes: ClassType[];
  loading: boolean;
  selected: ClassType | null;
  onSelect: (c: ClassType) => void;
}

export default function StepSelectClass({ classes, loading, selected, onSelect }: Props) {
  if (loading) {
    return <Center h={200}><Loader /></Center>;
  }

  if (classes.length === 0) {
    return (
      <Center h={200}>
        <Stack align="center" gap="xs">
          <IconSchool size={40} color="gray" />
          <Text c="dimmed">No hay clases disponibles por el momento.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Elige una clase</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {classes.map((c) => {
          const isSelected = selected?._id === c._id;
          return (
            <Card
              key={c._id}
              withBorder
              radius="md"
              p="md"
              onClick={() => onSelect(c)}
              style={{
                cursor: "pointer",
                borderColor: isSelected ? "var(--mantine-color-blue-5)" : undefined,
                borderWidth: isSelected ? 2 : 1,
                boxShadow: isSelected ? "0 0 0 2px var(--mantine-color-blue-2)" : undefined,
                transition: "all 0.15s ease",
              }}
            >
              <Group gap="xs" mb="xs">
                {c.color && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: c.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Text fw={700} size="md" style={{ flex: 1 }}>
                  {c.name}
                </Text>
                {isSelected && (
                  <Badge size="xs" color="blue">Seleccionada</Badge>
                )}
              </Group>

              {c.description && (
                <Text size="sm" c="dimmed" mb="sm" lineClamp={2}>
                  {c.description}
                </Text>
              )}

              <Stack gap={6}>
                <Group gap="xs">
                  <ThemeIcon size="xs" variant="transparent" color="gray">
                    <IconClock size={13} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">{c.duration} minutos</Text>
                </Group>
                <Group gap="xs">
                  <ThemeIcon size="xs" variant="transparent" color="gray">
                    <IconUsers size={13} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">Cupo máximo: {c.defaultCapacity} personas</Text>
                </Group>
                <Group gap="xs">
                  <ThemeIcon size="xs" variant="transparent" color="green">
                    <IconSchool size={13} />
                  </ThemeIcon>
                  <Text size="sm" fw={600} c="green">
                    ${c.pricePerPerson.toLocaleString("es-CO")} / persona
                  </Text>
                </Group>

                {c.groupDiscount?.enabled && (
                  <Group gap="xs" mt={2}>
                    <ThemeIcon size="xs" variant="transparent" color="blue">
                      <IconDiscount size={13} />
                    </ThemeIcon>
                    <Text size="xs" c="blue" fw={500}>
                      {c.groupDiscount.discountPercent}% de descuento al reservar{" "}
                      {c.groupDiscount.minPeople}
                      {c.groupDiscount.maxPeople ? `–${c.groupDiscount.maxPeople}` : "+"}{" "}
                      personas juntas
                    </Text>
                  </Group>
                )}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
