// Enlace personal /mis-reservas/:token (llega por WhatsApp): ver y cancelar
// (rediseño, MisReservas). Cancelar abre una hoja inferior en móvil.
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Drawer, Modal, Skeleton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { cancelMyBooking, getMyBookings, savedBookingsKey, type MyBookings as MyBookingsData } from "../../services/clientBookingsService";
import MyBookingsView, { type BookingRow } from "./MyBookingsView";
import { bookingFormatters, TYPE_NOUN } from "./bookingFormat";

const page = { maxWidth: 640, margin: "0 auto", padding: "24px 16px" } as const;

const MyBookings: React.FC = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [data, setData] = useState<MyBookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toCancel, setToCancel] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const orgId = organization?._id as string | undefined;

  const setSavedToken = useCallback(
    (value: string | null) => {
      if (!orgId) return;
      try {
        if (value) localStorage.setItem(savedBookingsKey(orgId), value);
        else localStorage.removeItem(savedBookingsKey(orgId));
      } catch {
        /* almacenamiento no disponible */
      }
    },
    [orgId]
  );

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getMyBookings(token);
      if (!res) {
        setInvalid(true);
        setSavedToken(null);
        return;
      }
      setData(res);
      setSavedToken(token);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudieron cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  }, [token, setSavedToken]);

  useEffect(() => {
    load();
  }, [load]);

  const forgetDevice = () => {
    setSavedToken(null);
    navigate("/mis-reservas", { replace: true });
  };

  const closeCancel = () => {
    if (cancelling) return;
    setToCancel(null);
    setCancelError("");
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    setCancelError("");
    try {
      const message = await cancelMyBooking(token, toCancel.type, toCancel.id);
      showNotification({ title: `${TYPE_NOUN[toCancel.type].charAt(0).toUpperCase()}${TYPE_NOUN[toCancel.type].slice(1)} cancelada`, message: message || "Listo.", color: "green" });
      setToCancel(null);
      await load();
    } catch (e) {
      setCancelError((e as Error).message || "No se pudo cancelar. Intenta de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={page}>
        <Skeleton height={30} width={200} mb={8} />
        <Skeleton height={14} width={260} mb={24} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={120} radius="md" mb={12} />
        ))}
      </div>
    );
  }

  if (invalid) {
    return (
      <div style={{ ...page, maxWidth: 440 }}>
        <div className="ag-card" style={{ padding: 24, textAlign: "center" }}>
          <h1 className="ag-h" style={{ margin: "0 0 6px", fontSize: 20 }}>Este enlace ya no funciona</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginBottom: 16 }}>Consulta tus reservas con tu número de WhatsApp.</div>
          <Button component={Link} to="/mis-reservas" replace>
            Consultar mis reservas
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ ...page, maxWidth: 440 }}>
        <div className="ag-alert ag-alert--danger" style={{ alignItems: "center" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1 }}>{loadError || "No se pudieron cargar tus reservas."}</div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setLoading(true);
              load();
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const { dayLabel, timeLabel } = bookingFormatters(data);
  const firstName = (data.client.name || "").trim().split(/\s+/)[0];
  const minHours = data.organization.cancellationPolicy.minHoursBeforeAppointment;

  const cancelBody = toCancel && (
    <div className="ag-stack" style={{ gap: 14 }}>
      <div className="ag-card" style={{ padding: 14 }}>
        <b style={{ display: "block" }}>{toCancel.title}</b>
        <div className="ag-muted" style={{ fontSize: 14 }}>
          {dayLabel(toCancel.startDate)} · {timeLabel(toCancel.startDate, toCancel.endDate)}
        </div>
      </div>
      <div className="ag-muted" style={{ fontSize: 14 }}>
        El negocio recibirá el aviso y el horario quedará libre. No se puede deshacer.
        {minHours > 0 && ` ${data.organization.name} permite cancelar hasta ${minHours} ${minHours === 1 ? "hora" : "horas"} antes.`}
      </div>
      {cancelError && (
        <div className="ag-alert ag-alert--danger" style={{ padding: "8px 12px" }}>
          <IconInfoCircle size={18} />
          <div style={{ fontSize: 13 }}>{cancelError}</div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row", justifyContent: "flex-end", gap: 8 }}>
        <Button variant="default" onClick={closeCancel} disabled={cancelling} fullWidth={isMobile}>
          No, mantenerla
        </Button>
        <Button color="red" onClick={confirmCancel} loading={cancelling} fullWidth={isMobile}>
          Sí, cancelar {TYPE_NOUN[toCancel.type]}
        </Button>
      </div>
    </div>
  );
  const cancelTitle = toCancel ? `¿Cancelar esta ${TYPE_NOUN[toCancel.type]}?` : "";

  return (
    <div style={page}>
      <MyBookingsView
        data={data}
        onCancel={setToCancel}
        rescheduleToken={token}
        onRescheduled={() => void load()}
        footer={
          <div className="ag-subtle" style={{ textAlign: "center" }}>
            Este enlace es personal; no lo compartas. ¿No eres {firstName || "tú"}?{" "}
            <button type="button" className="ag-link" style={{ background: "none", border: 0, cursor: "pointer", fontSize: 12, padding: 0 }} onClick={forgetDevice}>
              Usar otro número
            </button>
          </div>
        }
      />

      {isMobile ? (
        <Drawer opened={!!toCancel} onClose={closeCancel} position="bottom" size="auto" radius="lg" title={<b>{cancelTitle}</b>}>
          {cancelBody}
        </Drawer>
      ) : (
        <Modal opened={!!toCancel} onClose={closeCancel} title={<b>{cancelTitle}</b>} centered>
          {cancelBody}
        </Modal>
      )}
    </div>
  );
};

export default MyBookings;
