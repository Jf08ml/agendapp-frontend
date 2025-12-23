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

// Helper para asegurar Date valido
const ensureDate = (d: unknown): Date | null => {
  if (!d) return null;
  
  // Si ya es Date valido
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : d;
  }
  
  // Si es string, intentar parsear
  if (typeof d === "string") {
    // Verificar si es string ISO o fecha parseable
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    
    // Intentar con dayjs para formatos mas flexibles
    const dj = dayjs(d);
    if (dj.isValid()) return dj.toDate();
  }
  
  // Si es numero (timestamp)
  if (typeof d === "number") {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
};

// Helper para formatear fecha con fallback
const safeFormat = (d: unknown, format: string, fallback = "-"): string => {
  const date = ensureDate(d);
  if (!date) return fallback;
  const dj = dayjs(date);
  return dj.isValid() ? dj.format(format) : fallback;
};

interface Props {
  splitDates: boolean;
  services: Service[];
  employees: Employee[];
  dates: ServiceWithDate[];
  times: MultiServiceBlockSelection | ServiceTimeSelection[];
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// --- Helpers de precio ---
function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
function fmtMoney(v: number, currency = "COP", locale = "es-CO") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(v);
  } catch {
    // fallback simple
    return `${v.toFixed(0)}`;
  }
}

export default function StepMultiServiceSummary({
  splitDates,
  services,
  employees,
  dates,
  times,
}: Props) {
  if (!times) return null;

  // Lookups
  const svcMap = Object.fromEntries(services.map((s) => [s._id, s]));
  const empMap = Object.fromEntries(employees.map((e) => [e._id, e]));

  // === Totales ===
  let grandTotal = 0;

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
                        safeFormat(dates[0].date, "dddd, D MMM YYYY", "-")
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
              ? capitalize(safeFormat(dates[0].date, "dddd, D MMM YYYY", "-"))
              : "-";
            const startText = block.startTime
              ? safeFormat(block.startTime, "h:mm A", "-")
              : block.intervals?.[0]
              ? safeFormat(block.intervals[0].from, "h:mm A", "-")
              : "-";

            // total del bloque
            const blockTotal = block.intervals.reduce((acc, iv) => {
              const svc = svcMap[iv.serviceId];
              return acc + toNumber(svc?.price);
            }, 0);
            grandTotal = blockTotal;

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
                      const price = toNumber(svc?.price);

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
                            <Group justify="space-between" wrap="nowrap">
                              <Text fw={600} size="sm">
                                {svc?.name ?? "Servicio"}
                              </Text>
                              <Text fw={600} size="sm">
                                {fmtMoney(price)}
                              </Text>
                            </Group>
                            <Text c="dimmed" size="sm">
                              {safeFormat(iv.from, "h:mm A", "-")} -{" "}
                              {safeFormat(iv.to, "h:mm A", "-")}
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
            const cols = arr.length >= 3 ? 3 : 2;

            // total en modo split
            grandTotal = arr.reduce((acc, t) => {
              const svc = svcMap[t.serviceId];
              return acc + toNumber(svc?.price);
            }, 0);

            return (
              <>
                <SimpleGrid
                  cols={{ base: 1, sm: 2, md: cols }}
                  spacing={{ base: "sm", md: "md" }}
                >
                  {arr.map((t) => {
                    const svc = svcMap[t.serviceId];
                    const d = dates.find((x) => x.serviceId === t.serviceId);

                    const effectiveEmpId =
                      t.employeeId ?? d?.employeeId ?? null;
                    const emp = effectiveEmpId
                      ? empMap[effectiveEmpId]
                      : undefined;

                    const displayDate = d?.date
                      ? capitalize(safeFormat(d.date, "dddd, D MMM YYYY", "-"))
                      : "-";
                    const price = toNumber(svc?.price);

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
                            <Group justify="space-between" wrap="nowrap">
                              <Text fw={700} size="sm">
                                {svc?.name ?? "Servicio"}
                              </Text>
                              <Text fw={700} size="sm">
                                {fmtMoney(price)}
                              </Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                              {displayDate} · {t.time ?? "—"}
                            </Text>
                            <Text size="sm">
                              {emp ? (
                                emp.names
                              ) : (
                                <span
                                  style={{
                                    color: "var(--mantine-color-dimmed)",
                                  }}
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

                <Group justify="flex-end" mt="sm">
                  <Badge size="lg" color="green" variant="filled">
                    Total: {fmtMoney(grandTotal)}
                  </Badge>
                </Group>
              </>
            );
          })()}

      {/* Total también visible al final en modo bloque, por consistencia */}
      {!splitDates && (
        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group justify="space-between">
            <Text fw={700} size="md">
              Total a pagar
            </Text>
            <Text fw={800} size="lg" c="green">
              {fmtMoney(grandTotal)}
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
