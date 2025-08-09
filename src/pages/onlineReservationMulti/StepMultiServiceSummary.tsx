// StepMultiServiceSummary.tsx
import {
  Paper,
  Stack,
  Text,
  Group,
  Divider,
  Badge,
  Avatar,
  SimpleGrid,
  Box,
} from "@mantine/core";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import {
  ServiceWithDate,
  MultiServiceBlockSelection,
  ServiceTimeSelection,
} from "../../types/multiBooking";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

interface Props {
  splitDates: boolean;
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  times: MultiServiceBlockSelection | ServiceTimeSelection[];
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function StepMultiServiceSummary({
  splitDates,
  services,
  employees,
  dates,
  times,
}: Props) {
  if (!times) return null;

  // Lookup rápidos
  const svcMap = Object.fromEntries(services.map((s) => [s._id, s]));
  const empMap = Object.fromEntries(employees.map((e) => [e._id, e]));

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Text fw={700} size="lg">
          Resumen de tu reserva
        </Text>

        {!splitDates
          ? (() => {
              const block = times as MultiServiceBlockSelection;
              const count = block?.intervals?.length ?? 0;
              return (
                <Group gap="xs" wrap="wrap">
                  <Badge variant="light">
                    {count} servicio{count === 1 ? "" : "s"}
                  </Badge>
                  {dates[0]?.date && (
                    <Badge variant="outline">
                      {capitalize(
                        dayjs(dates[0].date).format("dddd, D MMM YYYY")
                      )}
                    </Badge>
                  )}
                </Group>
              );
            })()
          : (() => {
              const arr = times as ServiceTimeSelection[];
              return (
                <Group gap="xs" wrap="wrap">
                  <Badge variant="light">
                    {arr.length} servicio{arr.length === 1 ? "" : "s"}
                  </Badge>
                </Group>
              );
            })()}
      </Group>

      <Divider />

      {!splitDates
        ? // ===== BLOQUE ÚNICO (mismo día encadenado) =====
          (() => {
            const block = times as MultiServiceBlockSelection;
            const displayDate = dates[0]?.date
              ? capitalize(dayjs(dates[0].date).format("dddd, D MMM YYYY"))
              : "—";
            const startText = block.startTime
              ? dayjs(block.startTime).format("h:mm A")
              : block.intervals?.[0]
              ? dayjs(block.intervals[0].from).format("h:mm A")
              : "—";

            return (
              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Group gap="xs" wrap="wrap">
                    <Badge size="sm" variant="filled">
                      {displayDate}
                    </Badge>
                    <Badge size="sm" variant="outline">
                      Inicio {startText}
                    </Badge>
                  </Group>

                  <Divider my="xs" />

                  <Stack gap="sm">
                    {block.intervals.map((iv) => {
                      const svc = svcMap[iv.serviceId];
                      const emp = iv.employeeId
                        ? empMap[iv.employeeId]
                        : undefined;

                      return (
                        <Group
                          key={`${iv.serviceId}-${iv.from}`}
                          align="center"
                          wrap="nowrap"
                        >
                          <Box style={{ width: 40 }}>
                            {emp ? (
                              <Avatar
                                radius="xl"
                                size="sm"
                                src={emp.profileImage || undefined}
                              >
                                {!emp.profileImage && emp.names
                                  ? emp.names.charAt(0)
                                  : null}
                              </Avatar>
                            ) : (
                              <Badge size="xs" variant="dot">
                                Libre
                              </Badge>
                            )}
                          </Box>

                          <Stack gap={2} style={{ flex: 1 }}>
                            <Text fw={600} size="sm">
                              {svc?.name ?? "Servicio"}
                            </Text>
                            <Text c="dimmed" size="sm">
                              {dayjs(iv.from).format("h:mm A")} –{" "}
                              {dayjs(iv.to).format("h:mm A")}
                              {emp ? ` · ${emp.names}` : " · Sin preferencia"}
                            </Text>
                          </Stack>
                        </Group>
                      );
                    })}
                  </Stack>
                </Stack>
              </Paper>
            );
          })()
        : // ===== FECHAS SEPARADAS =====
          (() => {
            const arr = times as ServiceTimeSelection[];
            // Grid responsive: 1 col en móvil, 2–3 en desktop según cantidad
            const cols = arr.length >= 3 ? 3 : 2;

            return (
              <SimpleGrid
                cols={{ base: 1, sm: 2, md: cols }}
                spacing={{ base: "sm", md: "md" }}
              >
                {arr.map((t) => {
                  const svc = svcMap[t.serviceId];
                  const d = dates.find((x) => x.serviceId === t.serviceId);
                  const emp = d?.employeeId ? empMap[d.employeeId] : undefined;
                  const displayDate = d?.date
                    ? capitalize(dayjs(d.date).format("dddd, D MMM YYYY"))
                    : "—";

                  return (
                    <Paper key={t.serviceId} withBorder p="md" radius="md">
                      <Group align="flex-start" gap="md" wrap="nowrap">
                        <Avatar
                          radius="xl"
                          size={48}
                          src={emp?.profileImage || undefined}
                        >
                          {!emp?.profileImage && emp?.names
                            ? emp.names.charAt(0)
                            : null}
                        </Avatar>

                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={700} size="sm">
                            {svc?.name ?? "Servicio"}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {displayDate} · {t.time ?? "—"}
                          </Text>
                          <Text size="sm">
                            {emp ? (
                              emp.names
                            ) : (
                              <span
                                style={{ color: "var(--mantine-color-dimmed)" }}
                              >
                                Sin preferencia
                              </span>
                            )}
                          </Text>
                        </Stack>
                      </Group>
                    </Paper>
                  );
                })}
              </SimpleGrid>
            );
          })()}
    </Stack>
  );
}
