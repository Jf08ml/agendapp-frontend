import {
  Stack, Text, Divider, Card, Group, Badge, ThemeIcon,
} from "@mantine/core";
import { IconCalendar, IconUsers, IconClock, IconDiscount, IconSchool, IconPackage } from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassType, ClassSession } from "../../../services/classService";
import { AttendeeForm } from "./StepAttendees";
import { MpDepositNotice } from "../../../components/MpDepositNotice";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

interface Props {
  classDoc: ClassType | null;
  sessions: ClassSession[];
  attendee: AttendeeForm;
  companion: AttendeeForm | null;
  timezone?: string;
  /** Si la inscripción exige abono online (MP), info del depósito a mostrar. */
  deposit?: { percentage: number; currency: string } | null;
  // Se detectó un paquete de sesiones que cubre esta inscripción — el costo es $0.
  usingPackage?: boolean;
}

export default function StepSummary({ classDoc, sessions, attendee, companion, timezone: tz = "America/Bogota", deposit, usingPackage = false }: Props) {
  if (!classDoc || sessions.length === 0) return null;

  const numPeople = companion ? 2 : 1;
  const numSessions = sessions.length;
  const discount = classDoc.groupDiscount;
  const discountApplies =
    discount?.enabled &&
    numPeople >= (discount.minPeople ?? 2) &&
    (!discount.maxPeople || numPeople <= discount.maxPeople);
  const discountPct = discountApplies ? discount!.discountPercent : 0;
  const pricePerPerson = usingPackage ? 0 : classDoc.pricePerPerson;
  const finalPerPerson = usingPackage ? 0 : Math.round(pricePerPerson * (1 - discountPct / 100));
  const total = usingPackage ? 0 : finalPerPerson * numPeople * numSessions;
  const subtotal = pricePerPerson * numPeople * numSessions;

  // Instructor y salón: se muestran si son los mismos en todas las sesiones.
  const first = sessions[0];
  const start = dayjs(first.startDate).tz(tz);
  const end = dayjs(first.endDate).tz(tz);
  const employee = typeof first.employeeId === "object" ? first.employeeId : null;
  const room = typeof first.roomId === "object" ? first.roomId : null;
  const sameEmployee = sessions.every(
    (s) => (typeof s.employeeId === "object" ? s.employeeId?._id : s.employeeId) === employee?._id
  );
  const sameRoom = sessions.every(
    (s) => (typeof s.roomId === "object" ? s.roomId?._id : s.roomId) === room?._id
  );

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

          {numSessions === 1 ? (
            <>
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
            </>
          ) : (
            <Stack gap={4}>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="transparent" color="gray">
                  <IconCalendar size={14} />
                </ThemeIcon>
                <Text size="sm" fw={600}>{numSessions} sesiones</Text>
              </Group>
              {sessions.map((s) => {
                const sStart = dayjs(s.startDate).tz(tz);
                const sEnd = dayjs(s.endDate).tz(tz);
                return (
                  <Text key={s._id} size="sm" pl={28}>
                    {sStart.format("ddd D [de] MMMM")} · {sStart.format("HH:mm")} – {sEnd.format("HH:mm")}
                  </Text>
                );
              })}
            </Stack>
          )}
          {employee && sameEmployee && (
            <Group gap="xs">
              <ThemeIcon size="sm" variant="transparent" color="gray">
                <IconSchool size={14} />
              </ThemeIcon>
              <Text size="sm">Instructor: {employee.names}</Text>
            </Group>
          )}
          {room && sameRoom && (
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
      {usingPackage ? (
        <Card withBorder radius="md" p="md" bg="var(--mantine-color-green-0)">
          <Group gap={6}>
            <IconPackage size={16} color="var(--mantine-color-green-7)" />
            <Text size="sm" fw={600} c="green.8">
              {numSessions > 1
                ? `Tus ${numSessions} sesiones se pagan con tu paquete — no pagas nada ahora.`
                : "Esta inscripción se paga con tu paquete de sesiones — no pagas nada ahora."}
            </Text>
          </Group>
        </Card>
      ) : classDoc.hidePrice ? null : (
        <Card withBorder radius="md" p="md" bg="var(--mantine-color-green-0)">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm">{numSessions > 1 ? "Precio por persona y sesión" : "Precio por persona"}</Text>
              <Text size="sm">${pricePerPerson.toLocaleString("es-CO")}</Text>
            </Group>
            {(numPeople > 1 || numSessions > 1) && (
              <Group justify="space-between">
                <Text size="sm">
                  {[
                    numPeople > 1 ? `${numPeople} personas` : null,
                    numSessions > 1 ? `${numSessions} sesiones` : null,
                  ].filter(Boolean).join(" × ")}
                </Text>
                <Text size="sm">${subtotal.toLocaleString("es-CO")}</Text>
              </Group>
            )}
            {discountApplies && (
              <Group justify="space-between">
                <Group gap="xs">
                  <IconDiscount size={14} color="green" />
                  <Text size="sm" c="green" fw={500}>Descuento grupal ({discountPct}%)</Text>
                </Group>
                <Text size="sm" c="green" fw={500}>
                  -${(subtotal - total).toLocaleString("es-CO")}
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
                ${finalPerPerson.toLocaleString("es-CO")} por persona{numSessions > 1 ? " y sesión" : ""}
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Aviso de abono (pay-to-confirm vía Mercado Pago) */}
      {deposit && deposit.percentage > 0 && (
        <MpDepositNotice
          percentage={deposit.percentage}
          currency={deposit.currency}
          amount={classDoc.hidePrice ? undefined : Math.round((total * deposit.percentage) / 100)}
          objectLabel="tu inscripción"
        />
      )}
    </Stack>
  );
}
