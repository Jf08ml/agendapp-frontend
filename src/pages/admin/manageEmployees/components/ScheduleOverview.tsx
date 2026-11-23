/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Horarios (rediseño, ProfesionalesPanel): mapa de calor día × hora con «N libres»
 * escrito en cada celda y el detalle de la franja elegida. Móvil: un día a la vez.
 * Lógica de disponibilidad sin cambios:
 * - Días como columnas
 * - Filas por HORA
 * - Disponibilidad REAL = (Org ∩ Profesional) - breaks
 * - Muestra huecos (slots vacíos) cuando los profesionales están en descanso
 * - Drawer: Disponibles + En descanso + resumen de horario aplicado (Org/Personalizado)
 */

import { useEffect, useMemo, useState } from "react";
import { SegmentedControl, Switch } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { toSpanishMeridiem } from "../../../../utils/timeFormatUtils";
import { formatTimeLabel } from "../../../../utils/timeOfDay";
import { EmployeeAvatar } from "./EmployeeRow";
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
// Las filas de la tabla duran 60 min, o 30 min cuando algún horario no cae en hora
// exacta (p. ej. el negocio abre a las 9:30): así la primera fila arranca a las 9:30 y
// no a las 9:00.
function floorToSlot(mins: number, slot: number) {
  return Math.floor(mins / slot) * slot;
}
function ceilToSlot(mins: number, slot: number) {
  return Math.ceil(mins / slot) * slot;
}
const isValidTime = (t?: string): t is string => !!t && /^\d{1,2}:\d{2}$/.test(t);

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
      // Filtrar breaks solo para este día específico
      const dayBreaks = (orgData.openingHours.breaks || []).filter(
        (brk: any) => brk.day === dayOfWeek
      );
      
      return {
        day: dayOfWeek,
        isAvailable: true,
        start: orgData.openingHours.start,
        end: orgData.openingHours.end,
        breaks: dayBreaks,
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
 * Bloques efectivos de trabajo para el profesional ese día:
 * 1) intersección org vs emp
 * 2) restar breaks del profesional
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
  slotMinutes: number;
}): HourIndex {
  const idx: HourIndex = new Map();

  for (const day of args.dayValues) {
    const orgDay = getOrgDaySchedule(args.orgData, day);
    const dayMap = new Map<number, HourIndexCell>();
    idx.set(day, dayMap);

    if (!orgDay) continue;

    const dayStartMin = timeToMinutes(orgDay.start);
    const dayEndMin = timeToMinutes(orgDay.end);

    const hourStart = floorToSlot(dayStartMin, args.slotMinutes);
    const hourEnd = ceilToSlot(dayEndMin, args.slotMinutes);

    for (let t = hourStart; t < hourEnd; t += args.slotMinutes) {
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
        const hourRange: Range = { start: hour, end: hour + args.slotMinutes };

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

  const [resolution, setResolution] = useState<30 | 60 | null>(null);
  const [showOnlyAvailability, setShowOnlyAvailability] = useState(false);

  const organization = useSelector((state: RootState) => state.organization.organization);
  const is24h = organization?.timeFormat === "24h";

  const orgData: OrgScheduleData | null = useMemo(() => {
    if (!organization) return null;

    const normalizeBreaks = (breaks?: { start: string; end: string; note?: string }[]) =>
      (breaks ?? []).map(({ start, end }) => ({ start, end }));

    const normalizeBreaksWithDay = (breaks?: { start: string; end: string; note?: string; day?: number }[]) =>
      (breaks ?? []).map(({ start, end, day }) => ({ start, end, day }));

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
        breaks: normalizeBreaksWithDay(organization.openingHours.breaks) as any,
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

  // Duración de cada fila: 60 min, o 30 si algún horario (de la organización, de un
  // profesional o un descanso) empieza o termina en una hora no exacta, como 9:30.
  const autoSlotMinutes = useMemo(() => {
    if (!orgData) return 60;
    const times: (string | undefined)[] = [];
    for (const day of DAY_LABELS.map((d) => d.value)) {
      const orgDay = getOrgDaySchedule(orgData, day);
      if (!orgDay) continue;
      times.push(orgDay.start, orgDay.end);
      for (const b of orgDay.breaks ?? []) times.push(b.start, b.end);
      for (const sched of employeeSchedules.values()) {
        if (!sched.enabled) continue;
        const empDay = sched.schedule?.find((d) => d.day === day);
        if (!empDay?.isAvailable) continue;
        times.push(empDay.start, empDay.end);
        for (const b of empDay.breaks ?? []) times.push(b.start, b.end);
      }
    }
    return times.some((t) => isValidTime(t) && timeToMinutes(t) % 60 !== 0) ? 30 : 60;
  }, [orgData, employeeSchedules]);
  const slotMinutes = resolution ?? autoSlotMinutes;

  const hourlyIndex = useMemo(() => {
    if (!orgData) return new Map() as HourIndex;

    return buildAvailabilityIndexHourly({
      dayValues: DAY_LABELS.map((d) => d.value),
      orgData,
      employees,
      employeeSchedules,
      subtractOrgBreaks,
      slotMinutes,
    });
  }, [orgData, employees, employeeSchedules, slotMinutes]);

  // Filas (horas): todas las horas del rango operativo de la organización (unión por días)
  const allHours = useMemo(() => {
    if (!orgData) return [];

    const set = new Set<number>();
    for (const day of DAY_LABELS.map((d) => d.value)) {
      const orgDay = getOrgDaySchedule(orgData, day);
      if (!orgDay) continue;

      const dayStartMin = timeToMinutes(orgDay.start);
      const dayEndMin = timeToMinutes(orgDay.end);

      const hourStart = floorToSlot(dayStartMin, slotMinutes);
      const hourEnd = ceilToSlot(dayEndMin, slotMinutes);

      for (let t = hourStart; t < hourEnd; t += slotMinutes) set.add(t);
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [orgData, slotMinutes]);

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

  const timeLabel = (mins: number) => toSpanishMeridiem(formatTimeLabel(minutesToTime(mins), is24h));
  // Versión corta para encabezados y filas: «9 a. m.», «9:30 a. m.»
  const shortLabel = (t: string) => (is24h ? formatTimeLabel(t, true) : toSpanishMeridiem(formatTimeLabel(t, false).replace(":00 ", " ")));
  const hhmmLabel = (t: string) => toSpanishMeridiem(formatTimeLabel(t, is24h));

  // Máximo de profesionales libres en una franja: escala del mapa de calor
  const maxCount = useMemo(() => {
    let max = 0;
    for (const dayMap of hourlyIndex.values()) for (const c of dayMap.values()) max = Math.max(max, c.available.length);
    return max;
  }, [hourlyIndex]);

  type CellInfo = {
    status: "closed" | "outside" | "available" | "break" | "no-staff";
    available: string[];
    resting: string[];
  };

  const cellInfo = (day: number, hourStart: number): CellInfo => {
    const empty = { available: [], resting: [] };
    if (!orgData) return { status: "outside", ...empty };
    const orgDay = getOrgDaySchedule(orgData, day);
    if (!orgDay) return { status: "closed", ...empty };
    const hr: Range = { start: hourStart, end: hourStart + slotMinutes };
    if (hr.end <= timeToMinutes(orgDay.start) || hr.start >= timeToMinutes(orgDay.end)) return { status: "outside", ...empty };
    const cell = hourlyIndex.get(day)?.get(hourStart);
    const available = cell?.available ?? [];
    const resting = cell?.resting ?? [];
    const orgBreak =
      subtractOrgBreaks &&
      (orgDay.breaks ?? []).some((b) => overlaps(hr, { start: timeToMinutes(b.start), end: timeToMinutes(b.end) }));
    if (available.length > 0) return { status: "available", available, resting };
    if (orgBreak || resting.length > 0) return { status: "break", available, resting };
    return { status: "no-staff", available, resting };
  };

  const [selected, setSelected] = useState<{ day: number; hour: number } | null>(null);
  const todayDow = new Date().getDay();
  // Móvil: un día a la vez; por defecto hoy o el siguiente día que abre
  const [chosenMobileDay, setMobileDay] = useState<number | null>(null);
  const mobileDay =
    chosenMobileDay ??
    (orgData
      ? ([0, 1, 2, 3, 4, 5, 6].map((i) => (todayDow + i) % 7).find((d) => getOrgDaySchedule(orgData, d)) ?? todayDow)
      : todayDow);

  const renderCell = (day: number, hourStart: number) => {
    const info = cellInfo(day, hourStart);
    if (info.status === "closed" || info.status === "outside") {
      return <div style={{ height: 36, borderRadius: "var(--radius-sm)", background: "transparent" }} aria-hidden="true" />;
    }
    const n = info.available.length;
    const isSel = selected?.day === day && selected?.hour === hourStart;
    // Intensidad 14–52 % según cuántos están libres respecto al máximo de la semana:
    // suave para que el texto se lea siempre en tinta
    const pct = n > 0 && maxCount > 0 ? Math.round(14 + (38 * n) / maxCount) : 0;
    const bg =
      info.status === "available"
        ? `color-mix(in srgb, var(--success) ${pct}%, var(--surface-raised))`
        : info.status === "break"
          ? "var(--warning-soft)"
          : "var(--surface-muted)";
    const color = info.status === "available" ? "var(--ink)" : info.status === "break" ? "var(--warning)" : "var(--ink-subtle)";
    const text = info.status === "available" ? `${n} ${n === 1 ? "libre" : "libres"}` : info.status === "break" ? "Descanso" : "Sin personal";
    const dayLabel = DAY_LABELS.find((d) => d.value === day)?.label ?? "";
    return (
      <button
        type="button"
        onClick={() => setSelected({ day, hour: hourStart })}
        aria-pressed={isSel}
        aria-label={`${dayLabel} ${timeLabel(hourStart)}: ${text}`}
        style={{
          width: "100%",
          height: 36,
          border: 0,
          borderRadius: "var(--radius-sm)",
          background: bg,
          color,
          font: `${info.status === "available" ? 600 : 500} 12px/16px var(--mantine-font-family)`,
          fontVariantNumeric: "tabular-nums",
          cursor: "pointer",
          outline: isSel ? "2px solid var(--ink)" : "none",
          outlineOffset: 1,
          whiteSpace: "nowrap",
          padding: "0 4px",
        }}
      >
        {text}
      </button>
    );
  };

  const renderDetail = () => {
    if (!orgData || !selected) {
      return <span className="ag-muted" style={{ fontSize: 14 }}>Toca una franja para ver quién trabaja y quién está en descanso.</span>;
    }
    const { day, hour } = selected;
    const dayLabel = DAY_LABELS.find((d) => d.value === day)?.label ?? "Día";
    const orgDay = getOrgDaySchedule(orgData, day);
    const info = cellInfo(day, hour);
    const list = (ids: string[]) => ids.map((id) => employeeMap.get(id)).filter(Boolean) as Employee[];
    const working = list(info.available);
    const resting = list(info.resting);

    const empRow = (emp: Employee, resting: boolean) => {
      const summary = orgDay ? getEmployeeDaySummary({ day, orgDay, empSchedule: employeeSchedules.get(emp._id) }) : null;
      const breaks = summary ? [...(subtractOrgBreaks ? summary.breaksOrg : []), ...summary.breaksEmp] : [];
      return (
        <div key={`${resting ? "r" : "w"}-${emp._id}`} className="ag-list-row" style={{ padding: "10px 0", alignItems: "flex-start" }}>
          <EmployeeAvatar employee={emp} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: "block", fontSize: 14 }}>{emp.names}</b>
            {summary && (
              <span className="ag-subtle" style={{ display: "block" }}>
                {summary.isAvailable
                  ? `${hhmmLabel(summary.start)} – ${hhmmLabel(summary.end)} · ${summary.modeLabel === "Org" ? "horario del negocio" : "horario propio"}`
                  : "No trabaja este día"}
              </span>
            )}
            {breaks.length > 0 && (
              <span className="ag-subtle" style={{ display: "block" }}>
                Descanso: {breaks.map((b) => `${hhmmLabel(b.start)} – ${hhmmLabel(b.end)}`).join(", ")}
              </span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
        <div>
          <h3 style={{ margin: 0, font: "600 16px/22px var(--mantine-font-family)" }}>
            {dayLabel} · {timeLabel(hour)} – {timeLabel(hour + slotMinutes)}
          </h3>
          {orgDay && (
            <span className="ag-subtle">
              El negocio abre de {hhmmLabel(orgDay.start)} a {hhmmLabel(orgDay.end)}
            </span>
          )}
        </div>
        <div>
          <div className="ag-row" style={{ gap: 6 }}>
            <b style={{ fontSize: 14 }}>Trabajando</b>
            <span className="ag-badge ag-badge--success">{working.length}</span>
          </div>
          {working.length === 0 ? (
            <span className="ag-subtle">Nadie trabaja en esta franja.</span>
          ) : (
            working.map((e) => empRow(e, false))
          )}
        </div>
        <div>
          <div className="ag-row" style={{ gap: 6 }}>
            <b style={{ fontSize: 14 }}>En descanso</b>
            <span className="ag-badge ag-badge--warning">{resting.length}</span>
          </div>
          {resting.length === 0 ? <span className="ag-subtle">Nadie está en descanso.</span> : resting.map((e) => empRow(e, true))}
        </div>
      </div>
    );
  };

  const legend = (
    <div className="ag-row" style={{ gap: 12, fontSize: 13, color: "var(--ink-muted)" }}>
      <span className="ag-row" style={{ gap: 6 }}>
        <i style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb, var(--success) 18%, var(--surface-raised))" }} />
        <i style={{ width: 12, height: 12, borderRadius: 3, marginLeft: -4, background: "color-mix(in srgb, var(--success) 52%, var(--surface-raised))" }} />
        Más libres, más oscuro
      </span>
      <span className="ag-row" style={{ gap: 6 }}>
        <i style={{ width: 12, height: 12, borderRadius: 3, background: "var(--warning-soft)" }} /> Descanso
      </span>
      <span className="ag-row" style={{ gap: 6 }}>
        <i style={{ width: 12, height: 12, borderRadius: 3, background: "var(--surface-muted)", border: "1px solid var(--line)" }} /> Sin personal
      </span>
    </div>
  );

  const toolbar = (
    <div className="ag-row" style={{ gap: 12 }}>
      <SegmentedControl
        size="xs"
        value={String(slotMinutes)}
        onChange={(v) => setResolution(Number(v) as 30 | 60)}
        data={[
          { label: "Por hora", value: "60" },
          { label: "Cada 30 min", value: "30" },
        ]}
      />
      <Switch
        size="sm"
        checked={showOnlyAvailability}
        onChange={(e) => setShowOnlyAvailability(e.currentTarget.checked)}
        label="Solo horas con disponibilidad"
        disabled={loading}
      />
    </div>
  );

  if (!orgData) {
    return loading ? (
      <div className="ag-card" aria-busy="true" style={{ padding: "var(--space-4)" }}>
        <span className="ag-skeleton" style={{ width: "30%" }} />
      </div>
    ) : (
      <div className="ag-alert ag-alert--info">
        <IconInfoCircle size={18} />
        <div>Aún no está configurado el horario del negocio.</div>
      </div>
    );
  }

  const rows = loading ? skeletonHours : hoursForTable;
  const days = isMobile ? DAY_LABELS.filter((d) => d.value === mobileDay) : DAY_LABELS;

  const grid = (
    <div className="ag-card" style={{ padding: "var(--space-3)", overflowX: "auto" }}>
      <div
        role="grid"
        aria-label="Disponibilidad de la semana"
        style={{
          display: "grid",
          gridTemplateColumns: `64px repeat(${days.length}, minmax(${isMobile ? 0 : 76}px, 1fr))`,
          gap: 4,
          minWidth: isMobile ? 0 : 64 + 7 * 80,
        }}
      >
        <span />
        {days.map((d) => {
          const orgDay = getOrgDaySchedule(orgData, d.value);
          return (
            <div key={d.value} style={{ textAlign: "center", padding: "0 0 6px" }}>
              <b style={{ display: "block", fontSize: 13 }}>{isMobile ? d.label : d.short}</b>
              <span className="ag-subtle" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {orgDay ? `${shortLabel(orgDay.start)}–${shortLabel(orgDay.end)}` : "Cerrado"}
              </span>
            </div>
          );
        })}
        {isMobile && !getOrgDaySchedule(orgData, mobileDay) ? (
          <span className="ag-muted" style={{ gridColumn: "1 / -1", padding: "var(--space-4)", textAlign: "center" }}>
            El negocio no abre este día.
          </span>
        ) : rows.length === 0 && !loading ? (
          <span className="ag-muted" style={{ gridColumn: "1 / -1", padding: "var(--space-4)", textAlign: "center" }}>
            No hay horas con disponibilidad para mostrar.
          </span>
        ) : (
          rows.map((h) => (
            <div key={h} style={{ display: "contents" }}>
              <span className="ag-subtle ag-num" style={{ alignSelf: "center", fontSize: 12, whiteSpace: "nowrap" }}>
                {shortLabel(minutesToTime(h))}
              </span>
              {days.map((d) => (
                <div key={d.value}>
                  {loading ? (
                    <span className="ag-skeleton" style={{ height: 36, borderRadius: "var(--radius-sm)" }} />
                  ) : (
                    renderCell(d.value, h)
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
      {toolbar}
      {isMobile && (
        <div className="ag-tabs" role="tablist" aria-label="Día" style={{ scrollbarWidth: "none" }}>
          {DAY_LABELS.map((d) => (
            <button
              key={d.value}
              type="button"
              role="tab"
              className="ag-chip"
              aria-selected={mobileDay === d.value}
              onClick={() => {
                setMobileDay(d.value);
                setSelected(null);
              }}
            >
              {d.short}
            </button>
          ))}
        </div>
      )}
      {legend}
      {isMobile ? (
        <>
          {grid}
          <div className="ag-card" style={{ padding: "var(--space-4)" }}>{renderDetail()}</div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: "var(--space-4)", alignItems: "start" }}>
          {grid}
          <div className="ag-card" style={{ padding: "var(--space-4)", position: "sticky", top: 16 }}>{renderDetail()}</div>
        </div>
      )}
    </div>
  );
}
