// Página del enlace del recordatorio (rediseño, CancelarCita): confirmar
// asistencia, cambiar fecha u hora o cancelar, también para reservas en grupo.
// La ruta (/cancel?token=…) y el token no cambian: los enlaces ya enviados siguen
// funcionando.
import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Checkbox, Drawer, Modal, Skeleton, Textarea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBrandWhatsapp, IconCalendarPlus, IconCheck, IconInfoCircle, IconLock } from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { formatInTimezone, formatFullDateInTimezone } from "../../utils/timezoneUtils";
import cancellationService from "../../services/cancellationService";
import RescheduleCard from "./RescheduleCard";
import AddToCalendarButton from "../../components/AddToCalendarButton";

interface AppointmentInfo {
  id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  clientConfirmed?: boolean;
  isCancelled: boolean;
  isPast: boolean;
  policyBlocked?: boolean;
  policyBlockedReason?: string;
}

interface CancellationInfo {
  customerName: string;
  organizationName: string;
  timezone?: string;
  timeFormat?: string;
  isGroup?: boolean;
  appointments?: AppointmentInfo[];
  allBlockedByPolicy?: boolean;
  cancellationPolicy?: { minHoursBeforeAppointment?: number; preventCancellingConfirmed?: boolean };
  policyBlocked?: boolean; // Para reservaciones
  policyBlockedReason?: string; // Para reservaciones
}

// La política de cancelación (horas mínimas, "ya confirmada") solo limita CANCELAR.
// Confirmar asistencia es válido para cualquier cita futura no cancelada: los
// recordatorios suelen llegar dentro de la ventana de la política.
const isCancellable = (apt: AppointmentInfo) => !apt.isCancelled && !apt.isPast && !apt.policyBlocked;
const isConfirmable = (apt: AppointmentInfo) => !apt.isCancelled && !apt.isPast && !apt.clientConfirmed;

const amPm = (s: string) => s.replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");
const shell = { maxWidth: 520, margin: "0 auto", padding: "32px 16px 48px" } as const;
const h1 = { margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" } as const;

export const PublicCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const source = searchParams.get("source") || "confirmation"; // 'confirmation' o 'reminder'
  const organization = useSelector((s: RootState) => s.organization.organization);
  const whatsappUrl = organization?.whatsappUrl as string | undefined;
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CancellationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [action, setAction] = useState<"cancel" | "confirm" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [canReschedule, setCanReschedule] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(0);

  const loadCancellationInfo = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await cancellationService.getCancellationInfo(token);
      if (response.status === "success") {
        setInfo(response.data);
        if (response.data.appointments) {
          setSelectedAppointments(response.data.appointments.filter(isCancellable).map((apt: AppointmentInfo) => apt.id));
        }
        setError(null);
      } else {
        setError(response.message || "No se pudo cargar la información.");
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "No se pudo cargar la información de tu cita.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Refresco silencioso tras reagendar: la tarjeta conserva su mensaje de éxito
  const refreshInfoSilently = useCallback(async () => {
    if (!token) return;
    try {
      const response = await cancellationService.getCancellationInfo(token);
      if (response.status === "success") setInfo(response.data);
    } catch {
      /* se mantiene la info anterior */
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("El enlace no es válido.");
      setLoading(false);
      return;
    }
    loadCancellationInfo();
  }, [token, loadCancellationInfo]);

  const appointments = info?.appointments || [];
  const isGroupList = !!info?.isGroup && appointments.length > 1;
  const selectableFor = (a: "cancel" | "confirm" | null) => (a === "confirm" ? isConfirmable : isCancellable);

  // Cambia de acción ajustando la selección a lo que esa acción permite
  const switchAction = (next: "cancel" | "confirm" | null) => {
    const eligible = appointments.filter(selectableFor(next)).map((apt) => apt.id);
    setSelectedAppointments((prev) => {
      const kept = prev.filter((id) => eligible.includes(id));
      return kept.length ? kept : eligible;
    });
    setAction(next);
    setError(null);
  };

  const doCancel = async () => {
    if (!token) return;
    if (isGroupList && selectedAppointments.length === 0) {
      setError("Elige al menos una cita para cancelar.");
      return;
    }
    setCancelling(true);
    try {
      const response = await cancellationService.cancelByToken(token, reason || undefined, info?.isGroup ? selectedAppointments : undefined);
      if (response.status === "success") {
        setCancelled(true);
        setSheetOpen(false);
        setError(null);
      } else {
        setError(response.message || "No se pudo cancelar. Intenta de nuevo.");
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "No se pudo cancelar. Intenta de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  const doConfirm = async (ids?: string[]) => {
    if (!token) return;
    const list = ids ?? selectedAppointments;
    if (isGroupList && list.length === 0) {
      setError("Elige al menos una cita para confirmar.");
      return;
    }
    setConfirming(true);
    try {
      const response = await cancellationService.confirmByToken(token, info?.isGroup ? list : undefined);
      if (response.status === "success") {
        setSelectedAppointments(list);
        setConfirmed(true);
        setError(null);
      } else {
        setError(response.message || "No se pudo confirmar. Intenta de nuevo.");
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "No se pudo confirmar. Intenta de nuevo.");
    } finally {
      setConfirming(false);
    }
  };

  const tz = info?.timezone || "America/Bogota";
  const timeFmt = info?.timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const dayLong = (d: string) => {
    const s = formatFullDateInTimezone(d, tz, "dddd D [de] MMMM");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const hours = (a: AppointmentInfo) => amPm(`${formatInTimezone(a.startDate, tz, timeFmt)} – ${formatInTimezone(a.endDate, tz, timeFmt)}`);
  const firstName = (info?.customerName || "").trim().split(/\s+/)[0];
  const n = (count: number) => (count === 1 ? "1 cita" : `${count} citas`);

  const writeBusiness = whatsappUrl && (
    <Button component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="default" size="xs" leftSection={<IconBrandWhatsapp size={14} />}>
      Escribir al negocio
    </Button>
  );

  // ─── Estados de pantalla completa ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={shell}>
        <Skeleton height={28} width={220} mb={8} />
        <Skeleton height={14} width={160} mb={20} />
        <Skeleton height={140} radius="md" mb={16} />
        <Skeleton height={44} radius="md" mb={10} />
        <Skeleton height={44} radius="md" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ ...h1, fontSize: 20 }}>Este enlace ya no funciona</h1>
          <div className="ag-muted" style={{ fontSize: 14, margin: "6px 0 16px" }}>{error}</div>
          <Button component={Link} to="/mis-reservas">
            Ver mis reservas
          </Button>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <h1 style={{ ...h1, fontSize: 22 }}>{isGroupList ? `Cancelaste ${n(selectedAppointments.length)}` : "Tu cita quedó cancelada"}</h1>
          <div className="ag-muted" style={{ fontSize: 14 }}>{info?.organizationName} ya recibió el aviso y el horario quedó libre.</div>
          <Button component={Link} to="/online-reservation" leftSection={<IconCalendarPlus size={16} />} mt={6}>
            Reservar otra fecha
          </Button>
          <Button component={Link} to="/" variant="subtle" color="gray">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    const confirmedList = isGroupList ? appointments.filter((a) => selectedAppointments.includes(a.id)) : appointments.slice(0, 1);
    const calendarEvents = confirmedList.map((a) => ({
      title: [a.serviceName, info?.organizationName].filter(Boolean).join(" · "),
      start: a.startDate,
      end: a.endDate,
      timezone: tz,
      location: organization?.address,
      uid: a.id,
    }));
    return (
      <div style={shell}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <span style={{ width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)" }}>
            <IconCheck size={26} />
          </span>
          <h1 style={{ ...h1, fontSize: 22 }}>Listo, te esperamos</h1>
          <div className="ag-muted" style={{ fontSize: 14 }}>
            {isGroupList ? `Confirmaste ${n(selectedAppointments.length)}.` : "Confirmaste tu asistencia."} {info?.organizationName} ya recibió el aviso.
          </div>
          <div style={{ marginTop: 4 }}>
            <AddToCalendarButton events={calendarEvents} fileName={info?.organizationName} />
          </div>
          <Button component={Link} to="/" variant="subtle" color="gray">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  // ─── Pantalla principal ─────────────────────────────────────────────────────
  const single = appointments[0];
  const confirmableCount = appointments.filter(isConfirmable).length;
  const cancellableCount = appointments.filter(isCancellable).length;
  const canConfirm = source === "reminder" && confirmableCount > 0;
  const canCancel = cancellableCount > 0 && !info?.policyBlocked;
  const isSelectable = selectableFor(action);
  const selectableIds = appointments.filter(isSelectable).map((a) => a.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedAppointments.includes(id));

  const toggleAppointment = (id: string) => setSelectedAppointments((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const statusBadge = (apt: AppointmentInfo) => {
    if (apt.isCancelled) return <span className="ag-badge">Cancelada</span>;
    if (apt.isPast) return <span className="ag-badge">Pasada</span>;
    if (apt.clientConfirmed) return <span className="ag-badge ag-badge--success">Confirmada por ti</span>;
    if (action === "cancel" && apt.policyBlocked)
      return (
        <span className="ag-badge">
          <IconLock size={12} /> No cancelable
        </span>
      );
    return null;
  };

  const header = (
    <div>
      <h1 style={h1}>{firstName ? `Hola, ${firstName}` : "Tu cita"}</h1>
      <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
        {isGroupList ? `Tus ${appointments.length} citas` : "Tu cita"} en {info?.organizationName}.
      </div>
    </div>
  );

  const singleCard = single && (
    <article className="ag-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "nowrap" }}>
        <b style={{ fontSize: 16 }}>{single.serviceName}</b>
        {statusBadge(single)}
      </div>
      <div style={{ fontSize: 15 }}>{dayLong(single.startDate)}</div>
      <div className="ag-muted ag-num" style={{ fontSize: 14 }}>{hours(single)}</div>
    </article>
  );

  const groupList = isGroupList && (
    <div className="ag-stack" style={{ gap: 8 }}>
      {action && (
        <div className="ag-row" style={{ justifyContent: "space-between" }}>
          <b style={{ fontSize: 14 }}>{action === "confirm" ? "¿Cuáles confirmas?" : "¿Cuáles cancelas?"}</b>
          <Button size="compact-xs" variant="subtle" onClick={() => setSelectedAppointments(allSelected ? [] : selectableIds)}>
            {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
          </Button>
        </div>
      )}
      <div className="ag-card" style={{ padding: 0, overflow: "hidden" }}>
        {appointments.map((apt) => {
          const disabled = !action || !isSelectable(apt);
          return (
            <div
              key={apt.id}
              className="ag-list-row"
              style={{ padding: "12px 16px", gap: 12, cursor: disabled ? "default" : "pointer", opacity: action && disabled ? 0.55 : 1 }}
              onClick={() => !disabled && toggleAppointment(apt.id)}
            >
              {action && <Checkbox checked={selectedAppointments.includes(apt.id)} disabled={disabled} onChange={() => toggleAppointment(apt.id)} onClick={(e) => e.stopPropagation()} aria-label={apt.serviceName} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{apt.serviceName}</b>
                <div className="ag-subtle">
                  {dayLong(apt.startDate)} · {hours(apt)}
                </div>
                {action === "cancel" && apt.policyBlocked && apt.policyBlockedReason && <div className="ag-subtle" style={{ color: "var(--warning)" }}>{apt.policyBlockedReason}</div>}
              </div>
              {statusBadge(apt)}
            </div>
          );
        })}
      </div>
    </div>
  );

  const policyNotice =
    (info?.allBlockedByPolicy || (!isGroupList && single?.policyBlocked) || info?.policyBlocked) && (
      <div className="ag-alert ag-alert--warning" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <IconLock size={20} />
        <div style={{ flex: 1, minWidth: 200 }}>
          {single?.policyBlockedReason || info?.policyBlockedReason || "Según la política del negocio ya no se puede cancelar en línea."} Si necesitas cancelar,
          escríbele a {info?.organizationName || "el negocio"}.
        </div>
        {writeBusiness}
      </div>
    );

  const errorAlert = error && (
    <div className="ag-alert ag-alert--danger">
      <IconInfoCircle size={20} />
      <div>{error}</div>
    </div>
  );

  // Grupo con una acción elegida: lista con casillas y barra con cuántas y qué acción
  const groupActionBar = isGroupList && action && (
    <div className="ag-stack" style={{ gap: 8 }}>
      <Button
        size="md"
        fullWidth
        color={action === "cancel" ? "red" : undefined}
        disabled={selectedAppointments.length === 0}
        loading={confirming}
        onClick={() => (action === "confirm" ? doConfirm() : setSheetOpen(true))}
      >
        {action === "confirm" ? `Confirmar ${n(selectedAppointments.length)}` : `Cancelar ${n(selectedAppointments.length)}`}
      </Button>
      <Button variant="subtle" color="gray" fullWidth onClick={() => switchAction(null)} disabled={confirming || cancelling}>
        Volver
      </Button>
    </div>
  );

  // Una sola tarjeta de cambio de fecha: mientras está abierta se ocultan las
  // otras acciones (así su mensaje de «Cita reagendada» no se pierde).
  const mainActions = !action && (
    <div className="ag-stack" style={{ gap: 10 }}>
      {canConfirm && !rescheduling && (
        <Button
          size="md"
          fullWidth
          leftSection={<IconCheck size={18} />}
          loading={confirming}
          onClick={() => (isGroupList ? switchAction("confirm") : doConfirm(appointments.filter(isConfirmable).map((a) => a.id)))}
        >
          Sí, asistiré
        </Button>
      )}
      {!isGroupList && token && (
        <RescheduleCard token={token} onRescheduled={refreshInfoSilently} onOpenChange={setRescheduling} onAvailability={setCanReschedule} openRequest={openReschedule} />
      )}
      {canCancel && !rescheduling && (
        <Button
          size="md"
          fullWidth
          variant="subtle"
          color="red"
          onClick={() => {
            if (isGroupList) switchAction("cancel");
            else {
              switchAction("cancel");
              setSheetOpen(true);
            }
          }}
        >
          No podré asistir
        </Button>
      )}
    </div>
  );

  const sheetTitle = isGroupList ? `Cancelar ${n(selectedAppointments.length)}` : "No podré asistir";
  const minHours = info?.cancellationPolicy?.minHoursBeforeAppointment;
  const sheetBody = (
    <div className="ag-stack" style={{ gap: 14 }}>
      {!isGroupList && single && (
        <div className="ag-card" style={{ padding: 12 }}>
          <b style={{ display: "block", fontSize: 14 }}>{single.serviceName}</b>
          <div className="ag-subtle">
            {dayLong(single.startDate)} · {hours(single)}
          </div>
        </div>
      )}
      <div className="ag-muted" style={{ fontSize: 14 }}>
        {info?.organizationName} recibirá el aviso y el horario quedará libre. No se puede deshacer.
        {minHours ? ` Se puede cancelar hasta ${minHours} ${minHours === 1 ? "hora" : "horas"} antes.` : ""}
      </div>
      <Textarea label="Motivo (opcional)" placeholder="Si quieres, cuéntale al negocio por qué" value={reason} onChange={(e) => setReason(e.currentTarget.value)} minRows={2} autosize />
      {errorAlert}
      <div className="ag-stack" style={{ gap: 8 }}>
        <Button color="red" size="md" fullWidth onClick={doCancel} loading={cancelling}>
          {isGroupList ? `Cancelar ${n(selectedAppointments.length)}` : "Cancelar cita"}
        </Button>
        {!isGroupList && canReschedule ? (
          <Button
            variant="default"
            fullWidth
            disabled={cancelling}
            onClick={() => {
              setSheetOpen(false);
              switchAction(null);
              setOpenReschedule((k) => k + 1);
            }}
          >
            Mejor cambiar la fecha
          </Button>
        ) : (
          <Button
            variant="default"
            fullWidth
            disabled={cancelling}
            onClick={() => {
              setSheetOpen(false);
              if (!isGroupList) switchAction(null);
            }}
          >
            Volver
          </Button>
        )}
      </div>
    </div>
  );

  const closeSheet = () => {
    if (cancelling) return;
    setSheetOpen(false);
    if (!isGroupList) switchAction(null);
  };

  return (
    <div style={shell}>
      <div className="ag-stack" style={{ gap: 18 }}>
        {header}
        {isGroupList ? groupList : !rescheduling && singleCard}
        {!rescheduling && policyNotice}
        {!sheetOpen && errorAlert}
        {groupActionBar}
        {mainActions}
        {!canConfirm && !canCancel && !canReschedule && !isGroupList && !policyNotice && (
          <div className="ag-subtle" style={{ textAlign: "center" }}>
            No hay nada pendiente con esta cita.
          </div>
        )}
      </div>

      {isMobile ? (
        <Drawer opened={sheetOpen} onClose={closeSheet} position="bottom" size="auto" radius="lg" title={<b>{sheetTitle}</b>}>
          {sheetBody}
        </Drawer>
      ) : (
        <Modal opened={sheetOpen} onClose={closeSheet} title={<b>{sheetTitle}</b>} centered>
          {sheetBody}
        </Modal>
      )}
    </div>
  );
};

export default PublicCancelPage;
