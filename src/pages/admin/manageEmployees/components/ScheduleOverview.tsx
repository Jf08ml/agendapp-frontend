/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ScheduleOverviewHeatmap (HOURLY + COMPACT)
 * - Días como columnas
 * - Filas por HORA
 * - Disponibilidad REAL = (Org ∩ Empleado) - breaks
 * - Muestra huecos (slots vacíos) cuando los empleados están en descanso
 * - Drawer: Disponibles + En descanso + resumen de horario aplicado (Org/Personalizado)
 */

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Center,
  Skeleton,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Switch,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IoInformationCircleOutline } from "react-icons/io5";
import { BiX } from "react-icons/bi";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import { Employee } from "../../../../services/employeeService";
import { getEmployeeSchedule } from "../../../../services/scheduleService";

const DAY_LABELS = [
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

interface DaySchedule {
  day: number;
  isAvailable?: boolean;
  isOpen?: boolean;
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
}

interface WeeklySchedule {
  enabled: boolean;
  schedule: DaySchedule[];
}

interface OpeningHours {
  businessDays: number[];
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
  stepMinutes: number;
}

interface OrgScheduleData {
  weeklySchedule?: WeeklySchedule;
  openingHours?: OpeningHours;
}

interface Props {
  organizationId: string;
  employees: Employee[];
}

// -------- time helpers --------
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function floorToHour(mins: number) {
  return Math.floor(mins / 60) * 60;
}
function ceilToHour(mins: number) {
  return Math.ceil(mins / 60) * 60;
}

type Range = { start: number; end: number };
type Break = { start: string; end: string };

function overlaps(a: Range, b: Range) {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start;
}

// Normaliza el horario de la organización según el formato que use
function getOrgDaySchedule(orgData: OrgScheduleData, dayOfWeek: number): DaySchedule | null {
  if (orgData.weeklySchedule?.enabled && orgData.weeklySchedule.schedule) {
    const daySchedule = orgData.weeklySchedule.schedule.find((d) => d.day === dayOfWeek);
    if (daySchedule && (daySchedule.isOpen || daySchedule.isAvailable)) {
      return {
        day: dayOfWeek,
        isAvailable: true,
        start: daySchedule.start,
        end: daySchedule.end,
        breaks: daySchedule.breaks || [],
      };
    }
    return null;
  }

  if (orgData.openingHours) {
    const isOpen = orgData.openingHours.businessDays?.includes(dayOfWeek);
    if (isOpen) {
      return {
        day: dayOfWeek,
        isAvailable: true,
        start: orgData.openingHours.start,
        end: orgData.openingHours.end,
        breaks: orgData.openingHours.breaks || [],
      };
    }
  }

  return null;
}

function calculateIntersection(
  orgStart: string,
  orgEnd: string,
  empStart: string,
  empEnd: string
): { start: string; end: string; valid: boolean } {
  const orgStartMin = timeToMinutes(orgStart);
  const orgEndMin = timeToMinutes(orgEnd);
  const empStartMin = timeToMinutes(empStart);
  const empEndMin = timeToMinutes(empEnd);

  const effectiveStart = Math.max(orgStartMin, empStartMin);
  const effectiveEnd = Math.min(orgEndMin, empEndMin);

  return {
    start: minutesToTime(effectiveStart),
    end: minutesToTime(effectiveEnd),
    valid: effectiveStart < effectiveEnd,
  };
}

function subtractBreaks(range: Range, breaks: Break[]): Range[] {
  const sorted = [...(breaks ?? [])].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  let blocks: Range[] = [{ ...range }];

  for (const brk of sorted) {
    const bs = timeToMinutes(brk.start);
    const be = timeToMinutes(brk.end);

    blocks = blocks.flatMap((b) => {
      // no overlap
      if (be <= b.start || bs >= b.end) return [b];

      const res: Range[] = [];
      if (b.start < bs) res.push({ start: b.start, end: clamp(bs, b.start, b.end) });
      if (be < b.end) res.push({ start: clamp(be, b.start, b.end), end: b.end });
      return res.filter((x) => x.end > x.start);
    });
  }

  return blocks;
}

/**
 * Bloques efectivos de trabajo para el empleado ese día:
 * 1) intersección org vs emp
 * 2) restar breaks del empleado
 * 3) opcional: restar breaks de la org (si el negocio realmente NO atiende ahí)
 */
function getEffectiveWorkBlocksForEmployeeDay(params: {
  orgStart: string;
  orgEnd: string;
  orgBreaks: Break[];
  empStart: string;
  empEnd: string;
  empBreaks: Break[];
  subtractOrgBreaks: boolean; // <-- si quieres que breaks de la org también creen huecos
}): { activeRange: Range | null; workBlocks: Range[] } {
  const inter = calculateIntersection(params.orgStart, params.orgEnd, params.empStart, params.empEnd);
  if (!inter.valid) return { activeRange: null, workBlocks: [] };

  const activeRange: Range = { start: timeToMinutes(inter.start), end: timeToMinutes(inter.end) };

  const breaksToSubtract = params.subtractOrgBreaks
    ? [...(params.orgBreaks ?? []), ...(params.empBreaks ?? [])]
    : (params.empBreaks ?? []);

  const workBlocks = subtractBreaks(activeRange, breaksToSubtract);

  return { activeRange, workBlocks };
}

type HourIndexCell = { available: string[]; resting: string[] };
type HourIndex = Map<number /*day*/, Map<number /*hourStart*/, HourIndexCell>>;

function buildAvailabilityIndexHourly(args: {
  dayValues: number[];
  orgData: OrgScheduleData;
  employees: Employee[];
  employeeSchedules: Map<string, WeeklySchedule>;
  subtractOrgBreaks: boolean;
}): HourIndex {
  const idx: HourIndex = new Map();

  for (const day of args.dayValues) {
    const orgDay = getOrgDaySchedule(args.orgData, day);
    const dayMap = new Map<number, HourIndexCell>();
    idx.set(day, dayMap);

    if (!orgDay) continue;

    const dayStartMin = timeToMinutes(orgDay.start);
    const dayEndMin = timeToMinutes(orgDay.end);

    const hourStart = floorToHour(dayStartMin);
    const hourEnd = ceilToHour(dayEndMin);

    for (let t = hourStart; t < hourEnd; t += 60) {
      dayMap.set(t, { available: [], resting: [] });
    }

    for (const emp of args.employees) {
      const empSchedule = args.employeeSchedules.get(emp._id);

      // Por defecto, aplica horario org completo
      let empStart = orgDay.start;
      let empEnd = orgDay.end;
      let empBreaks: Break[] = [];
      let qualifiesByCustom = false;

      // Si tiene personalizado, respeta su disponibilidad
      if (empSchedule?.enabled) {
        qualifiesByCustom = true;
        const empDay = empSchedule.schedule?.find((d) => d.day === day);
        if (!empDay?.isAvailable) continue;
        empStart = empDay.start;
        empEnd = empDay.end;
        empBreaks = empDay.breaks ?? [];
      }

      const { activeRange, workBlocks } = getEffectiveWorkBlocksForEmployeeDay({
        orgStart: orgDay.start,
        orgEnd: orgDay.end,
        orgBreaks: orgDay.breaks ?? [],
        empStart,
        empEnd,
        empBreaks,
        subtractOrgBreaks: args.subtractOrgBreaks,
      });

      if (!activeRange) continue;

      for (const [hour, cell] of dayMap) {
        const hourRange: Range = { start: hour, end: hour + 60 };

        // Está dentro del rango activo del día?
        const isInActive = overlaps(activeRange, hourRange);

        if (!isInActive) continue;

        // ¿Trabaja realmente en esa hora, ya sin breaks?
        const worksThisHour = workBlocks.some((b) => overlaps(b, hourRange));

        if (worksThisHour) {
          cell.available.push(emp._id);
        } else {
          // Está activo por horario, pero no trabaja por breaks (o por breaks org si aplica)
          // Lo marcamos como "resting" (útil para el drawer)
          cell.resting.push(emp._id);
        }
      }

      // Nota: qualifiesByCustom no se usa aquí, pero lo dejamos por claridad
      void qualifiesByCustom;
    }
  }

  return idx;
}

function buildEmployeeMap(employees: Employee[]) {
  const m = new Map<string, Employee>();
  for (const e of employees) m.set(e._id, e);
  return m;
}

function getEmployeeDaySummary(args: {
  day: number;
  orgDay: DaySchedule;
  empSchedule?: WeeklySchedule;
}) {
  const hasCustom = !!args.empSchedule?.enabled;

  if (!hasCustom) {
    return {
      modeLabel: "Org",
      rawEmpDay: null as DaySchedule | null,
      start: args.orgDay.start,
      end: args.orgDay.end,
      breaksEmp: [] as Break[],
      breaksOrg: args.orgDay.breaks ?? [],
      isAvailable: true,
      note: "Aplica horario de organización",
    };
  }

  const empDay = args.empSchedule!.schedule?.find((d) => d.day === args.day) ?? null;

  if (!empDay || !empDay.isAvailable) {
    return {
      modeLabel: "Personalizado",
      rawEmpDay: empDay,
      start: "",
      end: "",
      breaksEmp: empDay?.breaks ?? [],
      breaksOrg: args.orgDay.breaks ?? [],
      isAvailable: false,
      note: "No disponible",
    };
  }

  const inter = calculateIntersection(args.orgDay.start, args.orgDay.end, empDay.start, empDay.end);
  if (!inter.valid) {
    return {
      modeLabel: "Personalizado",
      rawEmpDay: empDay,
      start: "",
      end: "",
      breaksEmp: empDay.breaks ?? [],
      breaksOrg: args.orgDay.breaks ?? [],
      isAvailable: false,
      note: "Sin intersección con el horario de la org",
    };
  }

  return {
    modeLabel: "Personalizado",
    rawEmpDay: empDay,
    start: inter.start,
    end: inter.end,
    breaksEmp: empDay.breaks ?? [],
    breaksOrg: args.orgDay.breaks ?? [],
    isAvailable: true,
    note: "Aplica horario personalizado (intersectado con org)",
  };
}

export default function ScheduleOverviewHeatmap({ organizationId, employees }: Props) {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const [loading, setLoading] = useState(true);
  const [employeeSchedules, setEmployeeSchedules] = useState<Map<string, WeeklySchedule>>(new Map());

  const [drawerOpened, setDrawerOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [showOnlyAvailability, setShowOnlyAvailability] = useState(false);

  const organization = useSelector((state: RootState) => state.organization.organization);

  const orgData: OrgScheduleData | null = useMemo(() => {
    if (!organization) return null;

    const normalizeBreaks = (breaks?: { start: string; end: string; note?: string }[]) =>
      (breaks ?? []).map(({ start, end }) => ({ start, end }));

    let weeklySchedule: WeeklySchedule | undefined = undefined;
    if (organization.weeklySchedule) {
      weeklySchedule = {
        enabled: organization.weeklySchedule.enabled,
        schedule: (organization.weeklySchedule.schedule ?? []).map((d: any) => ({
          day: d.day,
          isAvailable: d.isAvailable,
          isOpen: d.isOpen,
          start: d.start,
          end: d.end,
          breaks: normalizeBreaks(d.breaks),
        })),
      };
    }

    let openingHours: OpeningHours | undefined = undefined;
    if (organization.openingHours) {
      openingHours = {
        businessDays: organization.openingHours.businessDays ?? [],
        start: organization.openingHours.start ?? "00:00",
        end: organization.openingHours.end ?? "23:59",
        breaks: normalizeBreaks(organization.openingHours.breaks),
        stepMinutes: organization.openingHours.stepMinutes ?? 30,
      };
    }

    return { weeklySchedule, openingHours };
  }, [organization]);

  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true);
      try {
        const entries = await Promise.all(
          employees.map(async (emp) => {
            const empData = await getEmployeeSchedule(emp._id);
            return [emp._id, empData] as const;
          })
        );

        const schedules = new Map<string, WeeklySchedule>();
        for (const [empId, empData] of entries) {
          if (empData) schedules.set(empId, empData);
        }

        setEmployeeSchedules(schedules);
      } catch (error) {
        console.error("Error cargando horarios:", error);
        showNotification({
          title: "Error",
          message: "No se pudieron cargar los horarios",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [organizationId, employees]);

  const employeeMap = useMemo(() => buildEmployeeMap(employees), [employees]);

  // ✅ Decide si los breaks de ORG también deben crear huecos
  // Si tu org break significa "cerrado para todos", déjalo true.
  // Si solo es informativo, ponlo false.
  const subtractOrgBreaks = true;

  const hourlyIndex = useMemo(() => {
    if (!orgData) return new Map() as HourIndex;

    return buildAvailabilityIndexHourly({
      dayValues: DAY_LABELS.map((d) => d.value),
      orgData,
      employees,
      employeeSchedules,
      subtractOrgBreaks,
    });
  }, [orgData, employees, employeeSchedules]);

  // Filas (horas): todas las horas del rango operativo de la organización (unión por días)
  const allHours = useMemo(() => {
    if (!orgData) return [];

    const set = new Set<number>();
    for (const day of DAY_LABELS.map((d) => d.value)) {
      const orgDay = getOrgDaySchedule(orgData, day);
      if (!orgDay) continue;

      const dayStartMin = timeToMinutes(orgDay.start);
      const dayEndMin = timeToMinutes(orgDay.end);

      const hourStart = floorToHour(dayStartMin);
      const hourEnd = ceilToHour(dayEndMin);

      for (let t = hourStart; t < hourEnd; t += 60) set.add(t);
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [orgData]);

  // Horas con al menos 1 disponible en cualquier día
  const availableHours = useMemo(() => {
    if (!orgData) return [];
    const set = new Set<number>();

    for (const day of DAY_LABELS.map((d) => d.value)) {
      const dayMap = hourlyIndex.get(day);
      if (!dayMap) continue;

      for (const [hourStart, cell] of dayMap.entries()) {
        if (cell.available.length > 0) set.add(hourStart);
      }
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [orgData, hourlyIndex]);

  // Lista final según el toggle
  const hoursForTable = useMemo(
    () => (showOnlyAvailability ? availableHours : allHours),
    [showOnlyAvailability, availableHours, allHours]
  );

  const skeletonHours = useMemo(() => {
    if (hoursForTable.length > 0) return hoursForTable.slice(0, Math.min(hoursForTable.length, 8));
    return [480, 540, 600, 660, 720, 780]; // 08:00-13:00 fallback to keep layout stable
  }, [hoursForTable]);

  const openDrawer = (day: number, hourStart: number) => {
    setSelectedDay(day);
    setSelectedHour(hourStart);
    setDrawerOpened(true);
  };

  const renderCell = (day: number, hourStart: number) => {
    if (!orgData) return <Box h={32} />;

    const orgDay = getOrgDaySchedule(orgData, day);
    if (!orgDay) {
      return (
        <Center h={32}>
          <Text size="xs" c="dimmed">
            —
          </Text>
        </Center>
      );
    }

    const dayStart = timeToMinutes(orgDay.start);
    const dayEnd = timeToMinutes(orgDay.end);
    const hr: Range = { start: hourStart, end: hourStart + 60 };

    if (hr.end <= dayStart || hr.start >= dayEnd) return <Box h={32} />;

    const cell = hourlyIndex.get(day)?.get(hourStart);
    const availableIds = cell?.available ?? [];
    const restingIds = cell?.resting ?? [];

    const count = availableIds.length;

    const hasOrgBreakOverlap = subtractOrgBreaks
      ? (orgDay.breaks ?? []).some((brk) => overlaps(hr, {
          start: timeToMinutes(brk.start),
          end: timeToMinutes(brk.end),
        }))
      : false;

    let status: "available" | "break" | "no-staff" = "no-staff";
    if (count > 0) status = "available";
    else if (hasOrgBreakOverlap || restingIds.length > 0) status = "break";

    const previewIds = availableIds.slice(0, 3);
    const remaining = count - previewIds.length;

    const tooltipContent = (
      <Stack gap={6}>
        <Text size="xs" fw={700}>
          {DAY_LABELS.find((d) => d.value === day)?.label} · {minutesToTime(hourStart)} -{" "}
          {minutesToTime(hourStart + 60)}
        </Text>

        <Divider />

        <Group gap={8} wrap="wrap">
          <Badge size="xs" color={count ? "green" : "gray"} variant="light">
            Disponibles: {count}
          </Badge>
          <Badge size="xs" color={restingIds.length ? "yellow" : "gray"} variant="light">
            En descanso: {restingIds.length}
          </Badge>
          {hasOrgBreakOverlap && (
            <Badge size="xs" color="yellow" variant="dot">
              Break org
            </Badge>
          )}
          {status === "no-staff" && !hasOrgBreakOverlap && restingIds.length === 0 && (
            <Badge size="xs" color="gray" variant="light">
              Sin personal
            </Badge>
          )}
        </Group>

        <Divider />
        <Text size="xs" c="dimmed">
          Click para ver detalle.
        </Text>
      </Stack>
    );

    const bg =
      status === "available"
        ? "var(--mantine-color-green-0)"
        : status === "break"
        ? "var(--mantine-color-yellow-0)"
        : "var(--mantine-color-gray-0)";

    const label =
      status === "available"
        ? "Disponible"
        : status === "break"
        ? "En descanso"
        : "Sin personal";

    return (
      <Tooltip multiline w={320} label={tooltipContent} position="top" withArrow>
        <Box
          onClick={() => openDrawer(day, hourStart)}
          style={{
            cursor: "pointer",
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            borderRadius: 8,
            border: "1px solid var(--mantine-color-gray-3)",
            background: bg,
          }}
        >
          {count === 0 ? (
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          ) : (
            <Group gap={6} wrap="nowrap">
              <Badge color="green" variant="filled" size="sm">
                {count}
              </Badge>
              <Group gap={-6} wrap="nowrap">
                {previewIds.map((id) => {
                  const emp = employeeMap.get(id);
                  if (!emp) return null;
                  return (
                    <Avatar
                      key={id}
                      src={emp.profileImage}
                      size={20}
                      radius="xl"
                      color={emp.color || "blue"}
                      style={{ border: "2px solid var(--mantine-color-body)" }}
                    >
                      {emp.names?.charAt(0) || "?"}
                    </Avatar>
                  );
                })}
                {remaining > 0 && (
                  <Avatar size={20} radius="xl" color="gray">
                    +{remaining}
                  </Avatar>
                )}
              </Group>
            </Group>
          )}
        </Box>
      </Tooltip>
    );
  };

  const renderDrawerDetail = () => {
    if (!orgData || selectedDay === null || selectedHour === null) return null;

    const dayLabel = DAY_LABELS.find((d) => d.value === selectedDay)?.label ?? "Día";
    const orgDay = getOrgDaySchedule(orgData, selectedDay);

    const hourStart = selectedHour;
    const hourEnd = selectedHour + 60;

    const cell = hourlyIndex.get(selectedDay)?.get(hourStart);
    const availableIds = cell?.available ?? [];
    const restingIds = cell?.resting ?? [];

    const availableEmployees = availableIds
      .map((id) => employeeMap.get(id))
      .filter(Boolean) as Employee[];

    const restingEmployees = restingIds
      .map((id) => employeeMap.get(id))
      .filter(Boolean) as Employee[];

    const renderEmpCard = (emp: Employee, status: "available" | "resting") => {
      if (!orgDay) return null;

      const empSchedule = employeeSchedules.get(emp._id);
      const summary = getEmployeeDaySummary({ day: selectedDay, orgDay, empSchedule });

      return (
        <Paper key={`${status}-${emp._id}`} withBorder p="sm" radius="md">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Avatar src={emp.profileImage} radius="xl" color={emp.color || "blue"}>
                {emp.names?.charAt(0) || "?"}
              </Avatar>

              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={700} lineClamp={1}>
                  {emp.names}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {emp.position}
                </Text>

                <Group gap={6} wrap="wrap">
                  <Badge size="xs" color={summary.modeLabel === "Personalizado" ? "blue" : "gray"} variant="light">
                    {summary.modeLabel}
                  </Badge>

                  {summary.isAvailable ? (
                    <Badge size="xs" color="green" variant="light">
                      Activo día: {summary.start}-{summary.end}
                    </Badge>
                  ) : (
                    <Badge size="xs" color="red" variant="light">
                      {summary.note}
                    </Badge>
                  )}

                  <Badge size="xs" color={status === "available" ? "green" : "yellow"} variant="light">
                    {status === "available" ? "Trabajando" : "En descanso"}
                  </Badge>
                </Group>
              </Stack>
            </Group>
          </Group>

          {(summary.breaksEmp.length > 0 || (subtractOrgBreaks && summary.breaksOrg.length > 0)) && (
            <Stack gap={6} mt="sm">
              <Divider />
              <Text size="xs" fw={700}>
                Breaks del día
              </Text>
              <Group gap={8} wrap="wrap">
                {subtractOrgBreaks &&
                  summary.breaksOrg.map((b, i) => (
                    <Badge key={`o-${emp._id}-${i}`} size="xs" color="yellow" variant="light">
                      Org {b.start}-{b.end}
                    </Badge>
                  ))}
                {summary.breaksEmp.map((b, i) => (
                  <Badge key={`e-${emp._id}-${i}`} size="xs" color="yellow" variant="light">
                    Emp {b.start}-{b.end}
                  </Badge>
                ))}
              </Group>
            </Stack>
          )}
        </Paper>
      );
    };

    return (
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={4}>
              {dayLabel} · {minutesToTime(hourStart)} - {minutesToTime(hourEnd)}
            </Title>
            {orgDay ? (
              <Text size="sm" c="dimmed">
                Org: {orgDay.start} - {orgDay.end}
                {subtractOrgBreaks && orgDay.breaks?.length ? ` · breaks org: ${orgDay.breaks.length}` : ""}
              </Text>
            ) : (
              <Text size="sm" c="red">
                La organización está cerrada este día.
              </Text>
            )}
          </Stack>

          <ActionIcon variant="light" onClick={() => setDrawerOpened(false)}>
            <BiX size={18} />
          </ActionIcon>
        </Group>

        {!orgDay ? (
          <Text size="sm" c="dimmed">
            No hay detalle porque el día está cerrado.
          </Text>
        ) : (
          <>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Text fw={700}>Trabajando (disponibles)</Text>
                <Badge color={availableEmployees.length ? "green" : "gray"} variant="light">
                  {availableEmployees.length}
                </Badge>
              </Group>

              {availableEmployees.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Nadie trabajando en esta hora.
                </Text>
              ) : (
                <Stack gap="sm">
                  {availableEmployees.map((emp) => renderEmpCard(emp, "available"))}
                </Stack>
              )}
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Text fw={700}>En descanso</Text>
                <Badge color={restingEmployees.length ? "yellow" : "gray"} variant="light">
                  {restingEmployees.length}
                </Badge>
              </Group>

              {restingEmployees.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Nadie en descanso en esta hora (o no cae en su rango activo).
                </Text>
              ) : (
                <Stack gap="sm">
                  {restingEmployees.map((emp) => renderEmpCard(emp, "resting"))}
                </Stack>
              )}
            </Paper>

            <Text size="xs" c="dimmed">
              Nota: La celda queda vacía cuando “Trabajando” = 0 (por breaks o por no disponibilidad).
            </Text>
          </>
        )}
      </Stack>
    );
  };

  const shouldShowLoading = loading && !orgData;
  const shouldShowNoOrg = !loading && !orgData;

  return (
    <Stack gap="md">
      {shouldShowLoading && (
        <Paper p="md" withBorder>
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text>Cargando horarios...</Text>
          </Group>
        </Paper>
      )}

      {shouldShowNoOrg && (
        <Alert icon={<IoInformationCircleOutline size={20} />} title="Sin configuración" color="blue">
          No se ha configurado el horario de la organización
        </Alert>
      )}

      {orgData && (
        <>
          <Paper p="md" withBorder>
            <Group justify="space-between" align="flex-start" mb="sm">
              <Stack gap={2}>
                <Title order={4}>Disponibilidad (por hora)</Title>
                <Text size="sm" c="dimmed">
                  Los descansos (breaks) se restan: generan huecos visuales cuando no hay nadie trabajando.
                </Text>
              </Stack>

              <Stack gap={6} align={isMobile ? "flex-start" : "flex-end"}>
                <Switch
                  size="sm"
                  checked={showOnlyAvailability}
                  onChange={(e) => setShowOnlyAvailability(e.currentTarget.checked)}
                  label="Solo horas con disponibilidad"
                  disabled={loading}
                />

                <Badge variant="light" color={subtractOrgBreaks ? "blue" : "gray"}>
                  Breaks org restan: {subtractOrgBreaks ? "Sí" : "No"}
                </Badge>
              </Stack>
            </Group>

            <Group gap="xs" mb="sm" wrap="wrap">
              <Text size="xs" c="dimmed" fw={600}>
                Leyenda:
              </Text>
              <Badge size="xs" color="green" variant="light">
                Disponible
              </Badge>
              <Badge size="xs" color="yellow" variant="light">
                En descanso
              </Badge>
              <Badge size="xs" color="gray" variant="light">
                Sin personal
              </Badge>
            </Group>

            {loading ? (
              <ScrollArea>
                <Table withTableBorder withColumnBorders striped highlightOnHover style={{ minWidth: isMobile ? 920 : 860 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        style={{
                          position: "sticky",
                          left: 0,
                          backgroundColor: "var(--mantine-color-body)",
                          zIndex: 3,
                          width: 85,
                          minWidth: 85,
                        }}
                      >
                        Hora
                      </Table.Th>

                      {DAY_LABELS.map((day) => {
                        const orgDay = getOrgDaySchedule(orgData, day.value);
                        return (
                          <Table.Th key={day.value} style={{ textAlign: "center", minWidth: 130 }}>
                            <Stack gap={2} align="center">
                              <Text size="sm" fw={700}>
                                {isMobile ? day.short : day.label}
                              </Text>
                              {orgDay ? (
                                <Text size="10px" c="dimmed">
                                  {orgDay.start}-{orgDay.end}
                                </Text>
                              ) : (
                                <Text size="10px" c="red">
                                  Cerrado
                                </Text>
                              )}
                            </Stack>
                          </Table.Th>
                        );
                      })}
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {skeletonHours.map((hourStart) => (
                      <Table.Tr key={`sk-${hourStart}`}>
                        <Table.Td
                          style={{
                            position: "sticky",
                            left: 0,
                            backgroundColor: "var(--mantine-color-body)",
                            zIndex: 2,
                            padding: 6,
                            verticalAlign: "middle",
                          }}
                        >
                          <Skeleton height={16} width={54} radius="sm" />
                        </Table.Td>

                        {DAY_LABELS.map((day) => (
                          <Table.Td key={`sk-${day.value}-${hourStart}`} style={{ padding: 6, verticalAlign: "middle" }}>
                            <Skeleton height={24} radius="sm" />
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            ) : hoursForTable.length === 0 ? (
              <Alert icon={<IoInformationCircleOutline size={20} />} title="Sin horarios configurados" color="yellow">
                {orgData
                  ? "No hay horas con disponibilidad para mostrar."
                  : "No se encontraron horarios configurados en la organización."}
              </Alert>
            ) : (
              <ScrollArea>
                <Table
                  withTableBorder
                  withColumnBorders
                  striped
                  highlightOnHover
                  style={{ minWidth: isMobile ? 920 : 860 }}
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        style={{
                          position: "sticky",
                          left: 0,
                          backgroundColor: "var(--mantine-color-body)",
                          zIndex: 3,
                          width: 85,
                          minWidth: 85,
                        }}
                      >
                        Hora
                      </Table.Th>

                      {DAY_LABELS.map((day) => {
                        const orgDay = getOrgDaySchedule(orgData, day.value);
                        return (
                          <Table.Th key={day.value} style={{ textAlign: "center", minWidth: 130 }}>
                            <Stack gap={2} align="center">
                              <Text size="sm" fw={700}>
                                {isMobile ? day.short : day.label}
                              </Text>
                              {orgDay ? (
                                <Text size="10px" c="dimmed">
                                  {orgDay.start}-{orgDay.end}
                                </Text>
                              ) : (
                                <Text size="10px" c="red">
                                  Cerrado
                                </Text>
                              )}
                            </Stack>
                          </Table.Th>
                        );
                      })}
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {hoursForTable.map((hourStart) => (
                      <Table.Tr key={hourStart}>
                        <Table.Td
                          style={{
                            position: "sticky",
                            left: 0,
                            backgroundColor: "var(--mantine-color-body)",
                            zIndex: 2,
                            padding: 6,
                            verticalAlign: "middle",
                          }}
                        >
                          <Text size="sm" fw={800}>
                            {minutesToTime(hourStart)}
                          </Text>
                        </Table.Td>

                        {DAY_LABELS.map((day) => (
                          <Table.Td key={day.value} style={{ padding: 6, verticalAlign: "middle" }}>
                            {renderCell(day.value, hourStart)}
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Paper>

          <Drawer
            opened={drawerOpened}
            onClose={() => setDrawerOpened(false)}
            title="Detalle"
            position="right"
            size={isMobile ? "100%" : "md"}
          >
            {renderDrawerDetail()}
          </Drawer>
        </>
      )}
    </Stack>
  );
}
