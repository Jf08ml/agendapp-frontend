/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Box, Group, Text, ActionIcon, Tooltip, Badge, SegmentedControl, Center, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconCalendarOff } from "@tabler/icons-react";
import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassSession } from "../../../../services/classService";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

// ──────────────────────────────────────────────────────────────
// Calendario propio del módulo de clases (Mes / Semana / Día).
// Aislado del calendario de citas: no comparte componentes ni lógica.
// ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 56;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

const STATUS_DOT: Record<string, string> = {
  open: "var(--mantine-color-green-6)",
  full: "var(--mantine-color-red-6)",
  cancelled: "var(--mantine-color-gray-5)",
  completed: "var(--mantine-color-blue-6)",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type ViewMode = "month" | "week" | "day";

interface Props {
  sessions: ClassSession[];
  timezone?: string;
  onSelectSession: (session: ClassSession) => void;
}

// ── Helpers ───────────────────────────────────────────────────

const classOf = (s: ClassSession) => (typeof s.classId === "object" ? s.classId : null);
const employeeOf = (s: ClassSession) =>
  typeof s.employeeId === "object" ? (s.employeeId as { _id: string; names: string }) : null;

/** Asigna carriles (lanes) a sesiones que se solapan dentro de una misma columna. */
function layoutLanes(list: ClassSession[]) {
  const sorted = [...list].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const laneEnds: number[] = [];
  const placement = new Map<string, number>();
  for (const s of sorted) {
    const start = new Date(s.startDate).getTime();
    const end = new Date(s.endDate).getTime();
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      laneEnds.push(end);
      lane = laneEnds.length - 1;
    } else {
      laneEnds[lane] = end;
    }
    placement.set(s._id, lane);
  }
  return { laneCount: Math.max(laneEnds.length, 1), placement };
}

// ── Bloque de sesión (usado en grilla día/semana) ─────────────

function SessionBlock({
  s, tz, top, height, leftPct, widthPct, onSelect,
}: {
  s: ClassSession; tz: string; top: number; height: number;
  leftPct: number; widthPct: number; onSelect: (s: ClassSession) => void;
}) {
  const c = classOf(s);
  const color = c?.color || "var(--mantine-color-blue-5)";
  const cancelled = s.status === "cancelled";
  const start = dayjs(s.startDate).tz(tz).format("HH:mm");
  const end = dayjs(s.endDate).tz(tz).format("HH:mm");
  const emp = employeeOf(s);

  return (
    <Box
      onClick={() => onSelect(s)}
      title={`${c?.name ?? "Clase"} · ${start}–${end} · ${emp?.names ?? ""} · ${s.enrolledCount}/${s.capacity}`}
      style={{
        position: "absolute",
        top, height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        background: cancelled ? "var(--mantine-color-gray-1)" : `color-mix(in srgb, ${color} 16%, white)`,
        borderLeft: `3px solid ${cancelled ? "var(--mantine-color-gray-4)" : color}`,
        borderRadius: 6,
        padding: "2px 5px",
        overflow: "hidden",
        cursor: "pointer",
        fontSize: 11,
        lineHeight: 1.25,
      }}
    >
      <Group gap={4} wrap="nowrap" mb={1}>
        <Box style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[s.status] ?? "gray", flexShrink: 0 }} />
        <Text size="xs" fw={600} lineClamp={1} style={{ textDecoration: cancelled ? "line-through" : undefined }}>
          {start} {c?.name ?? "Clase"}
        </Text>
      </Group>
      {height > 34 && (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {emp?.names ? `${emp.names} · ` : ""}{s.enrolledCount}/{s.capacity}
        </Text>
      )}
    </Box>
  );
}

// ── Grilla horaria (día/semana) ───────────────────────────────

function TimeGrid({
  columns, startHour, endHour, tz, onSelectSession,
}: {
  columns: { id: string; label: React.ReactNode; sessions: ClassSession[]; minWidth?: number }[];
  startHour: number; endHour: number; tz: string;
  onSelectSession: (s: ClassSession) => void;
}) {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;

  const topFor = (s: ClassSession) => {
    const d = dayjs(s.startDate).tz(tz);
    return ((d.hour() - startHour) * 60 + d.minute()) * MINUTE_HEIGHT;
  };
  const heightFor = (s: ClassSession) => {
    const a = dayjs(s.startDate).tz(tz);
    const b = dayjs(s.endDate).tz(tz);
    return Math.max(20, b.diff(a, "minute") * MINUTE_HEIGHT);
  };

  return (
    <Box style={{ display: "flex", overflowX: "auto", border: "1px solid var(--mantine-color-gray-2)", borderRadius: 8 }}>
      {/* Columna de horas */}
      <Box style={{ flexShrink: 0, width: 48, borderRight: "1px solid var(--mantine-color-gray-2)" }}>
        <Box style={{ height: 34 }} />
        {hours.map((h) => (
          <Box key={h} style={{ height: HOUR_HEIGHT, position: "relative" }}>
            <Text size="xs" c="dimmed" style={{ position: "absolute", top: -7, right: 6 }}>
              {dayjs().hour(h).minute(0).format("HH:mm")}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Columnas de contenido */}
      {columns.map((col) => {
        const { laneCount, placement } = layoutLanes(col.sessions);
        return (
          <Box key={col.id} style={{ flex: 1, minWidth: col.minWidth ?? 120, borderRight: "1px solid var(--mantine-color-gray-1)" }}>
            {/* Encabezado de columna */}
            <Box style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--mantine-color-gray-2)", position: "sticky", top: 0, background: "white", zIndex: 2 }}>
              {col.label}
            </Box>
            {/* Cuerpo con líneas de hora + bloques */}
            <Box style={{ position: "relative", height: gridHeight }}>
              {hours.slice(0, -1).map((h, i) => (
                <Box key={h} style={{ position: "absolute", top: i * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT, borderBottom: "1px solid var(--mantine-color-gray-1)" }} />
              ))}
              {col.sessions.map((s) => {
                const lane = placement.get(s._id) ?? 0;
                const widthPct = 100 / laneCount;
                return (
                  <SessionBlock
                    key={s._id}
                    s={s} tz={tz}
                    top={topFor(s)} height={heightFor(s)}
                    leftPct={lane * widthPct} widthPct={widthPct}
                    onSelect={onSelectSession}
                  />
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function ClassCalendar({ sessions, timezone: tz = "America/Bogota", onSelectSession }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => dayjs().tz(tz));

  const todayKey = dayjs().tz(tz).format("YYYY-MM-DD");

  // Agrupar por día (YYYY-MM-DD en tz)
  const byDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      const key = dayjs(s.startDate).tz(tz).format("YYYY-MM-DD");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
    return map;
  }, [sessions, tz]);

  const sessionsForDay = (d: Dayjs) => byDay.get(d.format("YYYY-MM-DD")) || [];

  // Límites horarios para grilla día/semana
  const hourBounds = (list: ClassSession[]) => {
    if (!list.length) return { startHour: 7, endHour: 20 };
    let min = 23, max = 1;
    for (const s of list) {
      const a = dayjs(s.startDate).tz(tz);
      const b = dayjs(s.endDate).tz(tz);
      min = Math.min(min, a.hour());
      max = Math.max(max, b.minute() > 0 ? b.hour() + 1 : b.hour());
    }
    return { startHour: Math.min(min, 7), endHour: Math.max(max, 19) };
  };

  // ── Navegación ─────────────────────────────────────────────
  const navigate = (dir: -1 | 1) => {
    const unit = view === "month" ? "month" : view === "week" ? "week" : "day";
    setCursor((c) => c.add(dir, unit));
  };
  const goToday = () => setCursor(dayjs().tz(tz));

  const label = useMemo(() => {
    if (view === "month") return cursor.format("MMMM [de] YYYY");
    if (view === "day") return cursor.format("dddd, D [de] MMMM");
    const start = cursor.subtract((cursor.day() + 6) % 7, "day"); // lunes de la semana
    const end = start.add(6, "day");
    return start.isSame(end, "month")
      ? `${start.format("D")} – ${end.format("D MMM YYYY")}`
      : `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
  }, [view, cursor]);

  // ── Datos por vista ────────────────────────────────────────
  const monthDays = useMemo(() => {
    const monthStart = cursor.startOf("month");
    const offset = (monthStart.day() + 6) % 7;
    const gridStart = monthStart.subtract(offset, "day");
    const monthEnd = cursor.endOf("month");
    const endOffset = (7 - ((monthEnd.day() + 6) % 7) - 1) % 7;
    const total = monthEnd.add(endOffset, "day").diff(gridStart, "day") + 1;
    return Array.from({ length: total }, (_, i) => gridStart.add(i, "day"));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = cursor.subtract((cursor.day() + 6) % 7, "day"); // lunes de la semana
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  }, [cursor]);

  // ── Render ─────────────────────────────────────────────────
  return (
    <Box>
      {/* Toolbar */}
      <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
        <SegmentedControl
          size="xs"
          value={view}
          onChange={(v) => setView(v as ViewMode)}
          data={[
            { value: "month", label: "Mes" },
            { value: "week", label: "Semana" },
            { value: "day", label: "Día" },
          ]}
        />
        <Group gap={6} wrap="nowrap">
          <Text fw={600} tt="capitalize" size={isMobile ? "sm" : "md"} style={{ minWidth: isMobile ? 0 : 180, textAlign: "center" }}>
            {label}
          </Text>
          <ActionIcon variant="default" radius="xl" onClick={() => navigate(-1)}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Tooltip label="Hoy" withArrow>
            <Box
              onClick={goToday}
              style={{ padding: "4px 12px", borderRadius: 999, border: "1px solid var(--mantine-color-gray-3)", fontSize: 12, fontWeight: 600, cursor: "pointer", userSelect: "none" }}
            >
              Hoy
            </Box>
          </Tooltip>
          <ActionIcon variant="default" radius="xl" onClick={() => navigate(1)}>
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* ── Vista Mes ──────────────────────────────────────── */}
      {view === "month" && (
        <>
          <Box style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {WEEKDAYS.map((d) => (
              <Text key={d} ta="center" size="xs" c="dimmed" fw={600}>{d}</Text>
            ))}
          </Box>
          <Box style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {monthDays.map((day) => {
              const key = day.format("YYYY-MM-DD");
              const inMonth = day.month() === cursor.month();
              const isToday = key === todayKey;
              const list = sessionsForDay(day);
              return (
                <Box
                  key={key}
                  style={{
                    minHeight: isMobile ? 64 : 104, maxHeight: isMobile ? 120 : 160, overflowY: "auto",
                    border: "1px solid var(--mantine-color-gray-2)", borderRadius: 8, padding: 4,
                    background: inMonth ? "white" : "var(--mantine-color-gray-0)", opacity: inMonth ? 1 : 0.6,
                  }}
                >
                  <Group justify="space-between" gap={2} mb={2} wrap="nowrap">
                    <Text
                      size="xs" fw={isToday ? 700 : 500} c={isToday ? "blue" : inMonth ? undefined : "dimmed"}
                      onClick={() => { setCursor(day); setView("day"); }}
                      style={{
                        cursor: "pointer",
                        ...(isToday ? { background: "var(--mantine-color-blue-1)", borderRadius: 999, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" } : {}),
                      }}
                    >
                      {day.date()}
                    </Text>
                    {list.length > 0 && <Badge size="xs" variant="light" color="gray" circle>{list.length}</Badge>}
                  </Group>
                  {list.map((s) => {
                    const c = classOf(s);
                    const color = c?.color || "var(--mantine-color-blue-5)";
                    const cancelled = s.status === "cancelled";
                    return (
                      <Box
                        key={s._id}
                        onClick={() => onSelectSession(s)}
                        title={`${c?.name ?? "Clase"} · ${dayjs(s.startDate).tz(tz).format("HH:mm")} · ${s.enrolledCount}/${s.capacity}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", marginBottom: 2, borderRadius: 4,
                          background: cancelled ? "var(--mantine-color-gray-1)" : `color-mix(in srgb, ${color} 14%, white)`,
                          borderLeft: `3px solid ${cancelled ? "var(--mantine-color-gray-4)" : color}`, cursor: "pointer",
                        }}
                      >
                        <Box style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_DOT[s.status] ?? "gray", flexShrink: 0 }} />
                        <Text size="xs" lineClamp={1} style={{ flex: 1, textDecoration: cancelled ? "line-through" : undefined, color: cancelled ? "var(--mantine-color-dimmed)" : undefined }}>
                          {dayjs(s.startDate).tz(tz).format("HH:mm")} {c?.name ?? "Clase"}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </>
      )}

      {/* ── Vista Semana (columnas = días) ─────────────────── */}
      {view === "week" && (() => {
        const weekSessions = weekDays.flatMap((d) => sessionsForDay(d));
        const { startHour, endHour } = hourBounds(weekSessions);
        const columns = weekDays.map((d) => {
          const isToday = d.format("YYYY-MM-DD") === todayKey;
          return {
            id: d.format("YYYY-MM-DD"),
            minWidth: isMobile ? 110 : 130,
            sessions: sessionsForDay(d),
            label: (
              <Box style={{ textAlign: "center", cursor: "pointer" }} onClick={() => { setCursor(d); setView("day"); }}>
                <Text size="xs" c={isToday ? "blue" : "dimmed"} fw={600}>{WEEKDAYS[(d.day() + 6) % 7]}</Text>
                <Text size="sm" fw={isToday ? 700 : 500} c={isToday ? "blue" : undefined}>{d.date()}</Text>
              </Box>
            ),
          };
        });
        return <TimeGrid columns={columns} startHour={startHour} endHour={endHour} tz={tz} onSelectSession={onSelectSession} />;
      })()}

      {/* ── Vista Día (columnas = instructores) ────────────── */}
      {view === "day" && (() => {
        const list = sessionsForDay(cursor);
        const { startHour, endHour } = hourBounds(list);
        // Agrupar por instructor
        const byEmp = new Map<string, { names: string; sessions: ClassSession[] }>();
        for (const s of list) {
          const emp = employeeOf(s);
          const id = emp?._id || "—";
          if (!byEmp.has(id)) byEmp.set(id, { names: emp?.names || "Sin instructor", sessions: [] });
          byEmp.get(id)!.sessions.push(s);
        }
        if (byEmp.size === 0) {
          return (
            <Center h={220} style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 8 }}>
              <Stack align="center" gap="xs">
                <IconCalendarOff size={34} color="var(--mantine-color-gray-5)" />
                <Text c="dimmed" size="sm">No hay clases programadas este día</Text>
              </Stack>
            </Center>
          );
        }
        const columns = Array.from(byEmp.entries()).map(([id, v]) => ({
          id,
          minWidth: isMobile ? 150 : 180,
          sessions: v.sessions,
          label: <Text size="sm" fw={600} lineClamp={1}>{v.names}</Text>,
        }));
        return <TimeGrid columns={columns} startHour={startHour} endHour={endHour} tz={tz} onSelectSession={onSelectSession} />;
      })()}

      {/* Leyenda */}
      <Group gap="md" mt="sm" justify="center">
        {[
          { c: STATUS_DOT.open, l: "Disponible" },
          { c: STATUS_DOT.full, l: "Llena" },
          { c: STATUS_DOT.completed, l: "Completada" },
          { c: STATUS_DOT.cancelled, l: "Cancelada" },
        ].map(({ c, l }) => (
          <Group key={l} gap={4} wrap="nowrap">
            <Box style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            <Text size="xs" c="dimmed">{l}</Text>
          </Group>
        ))}
      </Group>
    </Box>
  );
}
