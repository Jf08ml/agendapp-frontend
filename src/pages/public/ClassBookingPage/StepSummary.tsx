import {
  Stack, Text, Divider, Card, Group, Badge, ThemeIcon,
} from "@mantine/core";
import { IconCalendar, IconUsers, IconClock, IconDiscount, IconSchool } from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassType, ClassSession } from "../../../services/classService";
import { AttendeeForm } from "./StepAttendees";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

interface Props {
  classDoc: ClassType | null;
  session: ClassSession | null;
  attendee: AttendeeForm;
  companion: AttendeeForm | null;
  timezone?: string;
}

export default function StepSummary({ classDoc, session, attendee, companion, timezone: tz = "America/Bogota" }: Props) {
  if (!classDoc || !session) return null;

  const numPeople = companion ? 2 : 1;
  const discount = classDoc.groupDiscount;
  const discountApplies =
    discount?.enabled &&
    numPeople >= (discount.minPeople ?? 2) &&
    (!discount.maxPeople || numPeople <= discount.maxPeople);
  const discountPct = discountApplies ? discount!.discountPercent : 0;
  const pricePerPerson = classDoc.pricePerPerson;
  const finalPerPerson = Math.round(pricePerPerson * (1 - discountPct / 100));
  const total = finalPerPerson * numPeople;

  const start = dayjs(session.startDate).tz(tz);
  const end = dayjs(session.endDate).tz(tz);
  const employee = typeof session.employeeId === "object" ? session.employeeId : null;
  const room = typeof session.roomId === "object" ? session.roomId : null;

  const attendees = [attendee, ...(companion ? [companion] : [])];

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Resumen de tu reserva</Text>

      {/* Clase y sesión */}
      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group gap="xs">
            {classDoc.color && (
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: classDoc.color }} />
            )}
            <Text fw={700} size="md">{classDoc.name}</Text>
          </Group>

          {classDoc.description && (
            <Text size="sm" c="dimmed">{classDoc.description}</Text>
          )}

          <Divider />

          <Group gap="xs">
            <ThemeIcon size="sm" variant="transparent" color="gray">
              <IconCalendar size={14} />
            </ThemeIcon>
            <Text size="sm">{start.format("dddd D [de] MMMM [de] YYYY")}</Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="sm" variant="transparent" color="gray">
              <IconClock size={14} />
            </ThemeIcon>
            <Text size="sm">{start.format("HH:mm")} – {end.format("HH:mm")}</Text>
          </Group>
          {employee && (
            <Group gap="xs">
              <ThemeIcon size="sm" variant="transparent" color="gray">
                <IconSchool size={14} />
              </ThemeIcon>
              <Text size="sm">Instructor: {employee.names}</Text>
            </Group>
          )}
          {room && (
            <Group gap="xs">
              <ThemeIcon size="sm" variant="transparent" color="gray">
                <IconUsers size={14} />
              </ThemeIcon>
              <Text size="sm">Salón: {room.name}</Text>
            </Group>
          )}
        </Stack>
      </Card>

      {/* Asistentes */}
      <Card withBorder radius="md" p="md">
        <Text fw={600} size="sm" mb="sm">
          {numPeople === 1 ? "Asistente" : "Asistentes"}
        </Text>
        <Stack gap="xs">
          {attendees.map((a, idx) => (
            <Group key={idx} gap="xs" justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={500}>{a.name}</Text>
                <Text size="xs" c="dimmed">{a.phone_e164 || a.phone}</Text>
              </Stack>
              {idx === 0 && <Badge size="xs" variant="light">Titular</Badge>}
              {idx > 0 && <Badge size="xs" color="blue" variant="light">Acompañante</Badge>}
            </Group>
          ))}
        </Stack>
      </Card>

      {/* Precio */}
      <Card withBorder radius="md" p="md" bg="var(--mantine-color-green-0)">
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm">Precio por persona</Text>
            <Text size="sm">${pricePerPerson.toLocaleString("es-CO")}</Text>
          </Group>
          {numPeople > 1 && (
            <Group justify="space-between">
              <Text size="sm">{numPeople} personas</Text>
              <Text size="sm">${(pricePerPerson * numPeople).toLocaleString("es-CO")}</Text>
            </Group>
          )}
          {discountApplies && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconDiscount size={14} color="green" />
                <Text size="sm" c="green" fw={500}>Descuento grupal ({discountPct}%)</Text>
              </Group>
              <Text size="sm" c="green" fw={500}>
                -${(pricePerPerson * numPeople - total).toLocaleString("es-CO")}
              </Text>
            </Group>
          )}
          <Divider my={4} />
          <Group justify="space-between">
            <Text fw={700} size="md">Total a pagar</Text>
            <Text fw={700} size="lg" c="green">${total.toLocaleString("es-CO")}</Text>
          </Group>
          {discountApplies && numPeople > 1 && (
            <Text size="xs" c="dimmed" ta="right">
              ${finalPerPerson.toLocaleString("es-CO")} por persona
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
