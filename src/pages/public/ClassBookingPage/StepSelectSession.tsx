import { useEffect, useMemo, useState } from "react";
import { Button, CloseButton, Skeleton } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconRepeat } from "@tabler/icons-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
import { ClassSession, ClassType } from "../../../services/classService";
import ClassRepeatPanel from "./ClassRepeatPanel";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

// Mismo tope que el backend (MAX_SESSIONS_PER_BOOKING en enrollmentService).
const MAX_SESSIONS_PER_BOOKING = 31;

interface Props {
  sessions: ClassSession[];
  loading: boolean;
  selected: ClassSession[];
  onChange: (sessions: ClassSession[]) => void;
  selectedClass: ClassType | null;
  timezone?: string;
  /** Créditos del paquete con que se reserva: tope de sesiones a marcar. */
  maxSelectable?: number | null;
  /** Formato de hora del negocio ("12h" | "24h"). */
  timeFormat?: string;
  /** Volver al paso de clase cuando esta no tiene sesiones. */
  onChooseOtherClass?: () => void;
}

// Un día del calendario es una etiqueta pura (YYYY-MM-DD), no un instante:
// se construye/lee con getters locales para que coincida siempre con las
// celdas del propio DatePicker, sin pasar por conversión de timezone.
const dayKeyToDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const byStart = (a: ClassSession, b: ClassSession) =>
  new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

export default function StepSelectSession({
  sessions, loading, selected, onChange, selectedClass, timezone: tz = "America/Bogota",
  maxSelectable = null, timeFormat, onChooseOtherClass,
}: Props) {

  const limit = Math.min(maxSelectable ?? MAX_SESSIONS_PER_BOOKING, MAX_SESSIONS_PER_BOOKING);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s._id)), [selected]);
  const atLimit = selected.length >= limit;

  const availableSessions = useMemo(
    () => sessions.filter((s) => s.status === "open" && dayjs(s.startDate).isAfter(dayjs())),
    [sessions]
  );

  // Agrupar sesiones disponibles por día, en el timezone de la organización
  // (una sesión a las 11pm en Bogotá puede caer en otro día en UTC).
  const sessionsByDay = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    for (const s of availableSessions) {
      const key = dayjs(s.startDate).tz(tz).format("YYYY-MM-DD");
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [availableSessions, tz]);

  const availableDays = useMemo(
    () => Object.keys(sessionsByDay).sort(),
    [sessionsByDay]
  );

  const selectedDays = useMemo(
    () => new Set(selected.map((s) => dayjs(s.startDate).tz(tz).format("YYYY-MM-DD"))),
    [selected, tz]
  );

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  // Sesión desde la que se abrió "Repetir…" (una a la vez).
  const [repeatBaseId, setRepeatBaseId] = useState<string | null>(null);

  // Preseleccionar el día de la primera sesión marcada (al volver a este paso)
  // o, si no hay ninguna, el primer día con disponibilidad.
  useEffect(() => {
    if (selected.length) {
      setSelectedDayKey(dayjs([...selected].sort(byStart)[0].startDate).tz(tz).format("YYYY-MM-DD"));
      return;
    }
    setSelectedDayKey(availableDays[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDays.join(","), tz]);

  const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const amPm = (s: string) => s.replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");

  if (loading) {
    return (
      <div className="ag-stack" style={{ gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={60} width={56} radius="md" />
          ))}
        </div>
        {[0, 1].map((i) => (
          <Skeleton key={i} height={84} radius="md" />
        ))}
      </div>
    );
  }

  if (!selectedClass) {
    return <div className="ag-muted" style={{ fontSize: 14 }}>Elige una clase primero.</div>;
  }

  if (availableSessions.length === 0) {
    return (
      <div className="ag-card" style={{ padding: "32px 16px", textAlign: "center" }}>
        <b style={{ display: "block", marginBottom: 4 }}>No hay sesiones próximas</b>
        <div className="ag-muted" style={{ fontSize: 14, marginBottom: onChooseOtherClass ? 12 : 0 }}>Esta clase no tiene sesiones con cupo por ahora.</div>
        {onChooseOtherClass && (
          <Button size="xs" variant="default" onClick={onChooseOtherClass}>
            Elegir otra clase
          </Button>
        )}
      </div>
    );
  }

  // Sesiones del día elegido: las abiertas y también las llenas (deshabilitadas)
  const sessionsOfSelectedDay = selectedDayKey
    ? sessions
        .filter((s) => (s.status === "open" || s.status === "full") && dayjs(s.startDate).isAfter(dayjs()) && dayjs(s.startDate).tz(tz).format("YYYY-MM-DD") === selectedDayKey)
        .sort(byStart)
    : [];

  const toggle = (s: ClassSession) => {
    if (selectedIds.has(s._id)) {
      onChange(selected.filter((x) => x._id !== s._id));
      if (repeatBaseId === s._id) setRepeatBaseId(null);
    } else if (!atLimit) {
      onChange([...selected, s].sort(byStart));
    }
  };

  const addSessions = (toAdd: ClassSession[]) => {
    const next = [...selected];
    for (const s of toAdd) {
      if (next.length >= limit) break;
      if (!next.some((x) => x._id === s._id)) next.push(s);
    }
    onChange(next.sort(byStart));
  };

  const repeatBase = repeatBaseId ? selected.find((s) => s._id === repeatBaseId) ?? null : null;

  return (
    <div className="ag-stack" style={{ gap: 14 }}>
      <div>
        <h2 className="ag-h" style={{ margin: 0 }}>Elige la sesión</h2>
        <div className="ag-subtle">
          {selectedClass.name} · {selectedClass.duration} min. Puedes elegir varias o repetir una cada semana.
        </div>
      </div>

      {maxSelectable != null && (
        <div className="ag-alert ag-alert--info" style={{ padding: "8px 12px" }}>
          <IconInfoCircle size={18} />
          <div style={{ fontSize: 13 }}>
            Tu paquete cubre hasta {maxSelectable} {maxSelectable === 1 ? "sesión" : "sesiones"} de esta clase.
          </div>
        </div>
      )}

      {/* Tira de días con sesiones */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin" }} role="tablist" aria-label="Días con sesiones">
        {availableDays.map((key) => {
          const d = dayKeyToDate(key);
          const active = key === selectedDayKey;
          const hasPicked = selectedDays.has(key);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedDayKey(key)}
              style={{
                flex: "none",
                width: 58,
                padding: "8px 0",
                borderRadius: "var(--radius-md)",
                border: active ? "2px solid var(--ink)" : "1px solid var(--line-control)",
                background: active ? "var(--ink)" : "var(--surface-raised)",
                color: active ? "var(--ink-inverse)" : "var(--ink)",
                cursor: "pointer",
                position: "relative",
                font: "inherit",
              }}
            >
              <div style={{ fontSize: 11, textTransform: "capitalize", opacity: 0.8 }}>{dayjs(d).format("ddd").replace(".", "")}</div>
              <div style={{ fontSize: 18, fontWeight: 600, lineHeight: "22px" }}>{dayjs(d).format("D")}</div>
              <div style={{ fontSize: 10, textTransform: "capitalize", opacity: 0.7 }}>{dayjs(d).format("MMM").replace(".", "")}</div>
              {hasPicked && <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: 999, background: active ? "var(--ink-inverse)" : "var(--brand)" }} />}
            </button>
          );
        })}
      </div>

      {selectedDayKey && (
        <div className="ag-stack" style={{ gap: 8 }}>
          <b style={{ fontSize: 14, textTransform: "capitalize" }}>{dayjs(dayKeyToDate(selectedDayKey)).format("dddd D [de] MMMM")}</b>
          {sessionsOfSelectedDay.map((s) => {
            const isSelected = selectedIds.has(s._id);
            const full = s.status === "full" || s.capacity - s.enrolledCount <= 0;
            const disabled = full || (!isSelected && atLimit);
            const start = dayjs(s.startDate).tz(tz);
            const end = dayjs(s.endDate).tz(tz);
            const remaining = Math.max(0, s.capacity - s.enrolledCount);
            const pct = s.capacity > 0 ? Math.round((s.enrolledCount / s.capacity) * 100) : 0;
            const employee = typeof s.employeeId === "object" ? s.employeeId : null;
            const room = typeof s.roomId === "object" ? s.roomId : null;
            return (
              <div
                key={s._id}
                className="ag-pick"
                role="checkbox"
                tabIndex={disabled ? -1 : 0}
                aria-checked={isSelected}
                aria-disabled={disabled || undefined}
                onClick={() => !disabled && toggle(s)}
                onKeyDown={(e) => !disabled && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(s))}
                style={{ gridTemplateColumns: "1fr auto", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled && !isSelected ? 0.55 : 1 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="ag-pick__name ag-num">
                    {amPm(start.format(fmt))} – {amPm(end.format(fmt))}
                  </div>
                  <div className="ag-subtle">
                    {[employee?.names, room?.name].filter(Boolean).join(" · ") || " "}
                  </div>
                  <div className="ag-row" style={{ gap: 8, marginTop: 6, flexWrap: "nowrap" }}>
                    <div style={{ flex: 1, maxWidth: 160, height: 4, borderRadius: 999, background: "var(--surface-hover)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: full ? "var(--danger)" : "var(--ink)" }} />
                    </div>
                    <span className="ag-subtle" style={{ color: full ? "var(--danger)" : undefined, fontWeight: full ? 600 : undefined, whiteSpace: "nowrap" }}>
                      {full ? "Sin cupos" : `${remaining} ${remaining === 1 ? "cupo" : "cupos"} de ${s.capacity}`}
                    </span>
                  </div>
                  {isSelected && !atLimit && repeatBaseId !== s._id && (
                    <Button
                      mt={8}
                      size="compact-xs"
                      variant="subtle"
                      leftSection={<IconRepeat size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepeatBaseId(s._id);
                      }}
                    >
                      Repetir cada semana
                    </Button>
                  )}
                </div>
                <span className="ag-pick__check">{isSelected && <IconCheck size={14} />}</span>
              </div>
            );
          })}
        </div>
      )}

      {repeatBase && (
        <ClassRepeatPanel
          key={repeatBase._id}
          base={repeatBase}
          sessions={sessions}
          selectedIds={selectedIds}
          remainingSlots={limit - selected.length}
          hasCreditLimit={maxSelectable != null}
          tz={tz}
          onAdd={addSessions}
          onClose={() => setRepeatBaseId(null)}
        />
      )}

      {selected.length > 0 && (
        <div className="ag-card" style={{ padding: 12 }}>
          <div className="ag-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <b style={{ fontSize: 14 }}>
              {selected.length} {selected.length === 1 ? "sesión elegida" : "sesiones elegidas"}
              {maxSelectable != null && ` de ${maxSelectable}`}
            </b>
            <Button size="compact-xs" variant="subtle" color="gray" onClick={() => onChange([])}>
              Quitar todas
            </Button>
          </div>
          {selected.map((s) => {
            const start = dayjs(s.startDate).tz(tz);
            return (
              <div key={s._id} className="ag-row" style={{ justifyContent: "space-between", flexWrap: "nowrap", fontSize: 13 }}>
                <span style={{ textTransform: "capitalize" }}>
                  {start.format("ddd D [de] MMM")} · {amPm(start.format(fmt))}
                </span>
                <CloseButton size="sm" aria-label="Quitar sesión" onClick={() => toggle(s)} />
              </div>
            );
          })}
          {atLimit && (
            <div className="ag-subtle" style={{ marginTop: 6 }}>
              {maxSelectable != null ? "Llegaste al máximo de sesiones de tu paquete." : `Puedes reservar hasta ${MAX_SESSIONS_PER_BOOKING} sesiones a la vez.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
