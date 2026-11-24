// Cambiar fecha u hora desde el enlace de la cita (rediseño, CancelarCita).
// Cerrado: botón «Cambiar fecha u hora» con las reglas debajo («Puedes cambiarla
// hasta 24 h antes · te queda 1 cambio»). Abierto: reglas del negocio, nuevo día,
// horarios disponibles y «Confirmar nuevo horario». Si no se permite, muestra el
// motivo del backend en lugar del botón; si el negocio no usa la función, nada.
import React, { useCallback, useEffect, useState } from "react";
import { Button, Skeleton } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCalendarEvent, IconCheck, IconInfoCircle, IconLock } from "@tabler/icons-react";
import cancellationService, { type RescheduleInfo, type RescheduleSlot } from "../../services/cancellationService";
import { getBookingRescheduleInfo, getBookingRescheduleSlots, rescheduleBooking } from "../../services/clientBookingsService";
import { formatFullDateInTimezone, todayInTimezone } from "../../utils/timezoneUtils";
import { formatTimeLabel } from "../../utils/timeOfDay";

interface RescheduleCardProps {
  /** Token del enlace de la cita (/cancel). */
  token?: string;
  /** Desde Mis reservas: enlace del cliente + id de la cita (Fase 3). */
  booking?: { token: string; id: string };
  /** Se llama tras reagendar con éxito (la página recarga la info de la cita). */
  onRescheduled: () => void;
  /** Avisa si el cliente abrió el cambio de fecha (la página oculta sus otras acciones). */
  onOpenChange?: (open: boolean) => void;
  /** Avisa si esta cita se puede cambiar de fecha (para ofrecer «Mejor cambiar la fecha»). */
  onAvailability?: (allowed: boolean) => void;
  /** Cada vez que cambia (y es > 0) abre el cambio de fecha desde fuera. */
  openRequest?: number;
}

// Fecha local del selector → "YYYY-MM-DD"
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const amPm = (s: string) => s.replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");

const RescheduleCard: React.FC<RescheduleCardProps> = ({ token, booking, onRescheduled, onOpenChange, onAvailability, openRequest = 0 }) => {
  // Mismo flujo con dos orígenes: el enlace de la cita o Mis reservas.
  const key = booking ? `${booking.token}:${booking.id}` : token ?? "";
  const api = {
    info: () => (booking ? getBookingRescheduleInfo(booking.token, booking.id) : cancellationService.getRescheduleInfo(token ?? "")),
    slots: (date: string) => (booking ? getBookingRescheduleSlots(booking.token, booking.id, date) : cancellationService.getRescheduleSlots(token ?? "", date)),
    move: (datetime: string) => (booking ? rescheduleBooking(booking.token, booking.id, datetime) : cancellationService.rescheduleByToken(token ?? "", datetime)),
  };
  const [info, setInfo] = useState<RescheduleInfo | null>(null);
  const [open, setOpenState] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<RescheduleSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<RescheduleSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneLabel, setDoneLabel] = useState<string | null>(null);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    let alive = true;
    api
      .info()
      .then((res) => {
        if (!alive) return;
        setInfo(res.data);
        onAvailability?.(!!res.data?.enabled && !!res.data?.allowed);
      })
      .catch(() => {
        if (!alive) return;
        setInfo(null);
        onAvailability?.(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (openRequest > 0) {
      setOpenState(true);
      onOpenChange?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const loadSlots = useCallback(
    async (d: Date) => {
      setLoadingSlots(true);
      setSelected(null);
      setSlots(null);
      setError(null);
      try {
        const res = await api.slots(toDateStr(d));
        setSlots(res.data?.slots ?? []);
      } catch (err) {
        setError(errorMessage(err, "No se pudieron cargar los horarios."));
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  if (doneLabel) {
    return (
      <div className="ag-alert ag-alert--success">
        <IconCheck size={20} />
        <div>
          <b style={{ display: "block" }}>Cita reagendada</b>
          Tu nueva cita es el {doneLabel}. Te enviaremos un recordatorio antes de la nueva fecha.
        </div>
      </div>
    );
  }

  if (!info || !info.enabled) return null;

  if (!info.allowed) {
    return (
      <div className="ag-subtle" style={{ display: "flex", gap: 6, alignItems: "flex-start", justifyContent: "center", textAlign: "center" }}>
        <IconLock size={14} style={{ flex: "none", marginTop: 2 }} />
        <span>{info.reason || "Esta cita no se puede cambiar de fecha."}</span>
      </div>
    );
  }

  const tz = info.timezone || "America/Bogota";
  const is24h = info.timeFormat === "24h";
  const minHours = info.minHoursBeforeAppointment ?? 24;
  const remaining = info.remaining;
  const rulesLine = [
    minHours > 0 ? `Puedes cambiarla hasta ${minHours} h antes` : "Puedes cambiarla",
    remaining !== undefined ? (remaining === 1 ? "te queda 1 cambio" : `te quedan ${remaining} cambios`) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!open) {
    return (
      <div className="ag-stack" style={{ gap: 6 }}>
        <Button variant="outline" fullWidth size="md" leftSection={<IconCalendarEvent size={18} />} onClick={() => setOpen(true)}>
          Cambiar fecha u hora
        </Button>
        <div className="ag-subtle" style={{ textAlign: "center" }}>{rulesLine}</div>
      </div>
    );
  }

  // «Hoy» y el tope de 120 días según el calendario del negocio (no el del navegador)
  const [ty, tm, td] = todayInTimezone(tz).split("-").map(Number);
  const orgToday = new Date(ty, tm - 1, td);
  const orgMax = new Date(ty, tm - 1, td + 120);
  const fmtFull = (d: string) => {
    const s = amPm(formatFullDateInTimezone(d, tz, is24h ? "dddd D [de] MMMM, HH:mm" : "dddd D [de] MMMM, h:mm A"));
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.move(selected.datetime);
      setDoneLabel(fmtFull(res.data?.startDate ?? selected.datetime).replace(/^./, (c) => c.toLowerCase()));
      onOpenChange?.(false);
      onRescheduled();
    } catch (err) {
      setError(errorMessage(err, "No se pudo cambiar la cita. Intenta de nuevo."));
      // El horario pudo ocuparse mientras elegías: se recargan los disponibles
      if (date) loadSlots(date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ag-stack" style={{ gap: 14 }}>
      <h2 className="ag-h" style={{ margin: 0 }}>Cambiar fecha u hora</h2>

      <div className="ag-card" style={{ padding: 14, background: "var(--surface-muted)" }}>
        <b style={{ display: "block", fontSize: 14, marginBottom: 6 }}>Así funciona</b>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-muted)", display: "flex", flexDirection: "column", gap: 2 }}>
          {minHours > 0 && <li>Hasta {minHours} {minHours === 1 ? "hora" : "horas"} antes de la cita.</li>}
          {info.maxReschedules !== undefined && (
            <li>
              {info.maxReschedules === 1 ? "1 cambio por cita" : `${info.maxReschedules} cambios por cita`}
              {remaining !== undefined ? ` · ${remaining === 1 ? "te queda 1" : `te quedan ${remaining}`}` : ""}.
            </li>
          )}
          <li>
            Mismo servicio y profesional
            {info.appointment?.employeeName ? ` (${info.appointment.employeeName})` : ""}.
          </li>
          <li>Fechas hasta dentro de 120 días.</li>
        </ul>
      </div>

      {info.appointment && (
        <div className="ag-muted" style={{ fontSize: 14 }}>
          Cita actual: <b style={{ color: "var(--ink)" }}>{fmtFull(info.appointment.startDate)}</b>
        </div>
      )}

      <DateInput
        label="Nuevo día"
        placeholder="Elige una fecha"
        value={date}
        minDate={orgToday}
        maxDate={orgMax}
        valueFormat="dddd D [de] MMMM"
        onChange={(d) => {
          setDate(d);
          if (d) loadSlots(d);
        }}
      />

      {loadingSlots && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={36} radius="md" />
          ))}
        </div>
      )}

      {!loadingSlots && slots && slots.length === 0 && date && (
        <div className="ag-muted" style={{ fontSize: 14 }}>No hay horarios disponibles ese día. Prueba con otra fecha.</div>
      )}

      {!loadingSlots && slots && slots.length > 0 && (
        <div>
          <b style={{ display: "block", fontSize: 14, marginBottom: 8 }}>Horarios disponibles</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
            {slots.map((s) => (
              <Button key={s.datetime} size="sm" variant={selected?.datetime === s.datetime ? "filled" : "default"} onClick={() => setSelected(s)}>
                {amPm(formatTimeLabel(s.time, is24h))}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="ag-alert ag-alert--danger" style={{ padding: "8px 12px" }}>
          <IconInfoCircle size={18} />
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      )}

      <div className="ag-stack" style={{ gap: 8 }}>
        <Button size="md" fullWidth onClick={handleConfirm} disabled={!selected} loading={saving}>
          Confirmar nuevo horario
        </Button>
        <Button variant="subtle" color="gray" fullWidth onClick={() => setOpen(false)} disabled={saving}>
          Volver
        </Button>
      </div>
    </div>
  );
};

export default RescheduleCard;
