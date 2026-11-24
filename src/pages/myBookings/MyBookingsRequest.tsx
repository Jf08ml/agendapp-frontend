// Mis reservas (rediseño, MisReservas): consulta por teléfono en modo solo
// lectura. Para cancelar, el cliente pide su enlace personal, que llega por
// WhatsApp (cancelar exige tener el teléfono, no solo saber el número). Si el
// enlace ya se abrió en este dispositivo, se va directo a él.
import React, { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IconBrandWhatsapp, IconInfoCircle } from "@tabler/icons-react";
import { type CountryCode } from "libphonenumber-js";
import { RootState } from "../../app/store";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import {
  lookupMyBookings,
  requestMyBookingsLink,
  savedBookingsKey,
  type BookingsLinkRequestResult,
  type MyBookings,
} from "../../services/clientBookingsService";
import MyBookingsView from "./MyBookingsView";
import { maskPhone } from "./bookingFormat";

const RESEND_SECONDS = 60;

const MyBookingsRequest: React.FC = () => {
  const navigate = useNavigate();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState<MyBookings | null>(null);
  const [linkStatus, setLinkStatus] = useState<BookingsLinkRequestResult["status"] | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!organization?._id) return;
    try {
      const token = localStorage.getItem(savedBookingsKey(organization._id as string));
      if (token) navigate(`/mis-reservas/${token}`, { replace: true });
    } catch {
      /* almacenamiento no disponible */
    }
  }, [organization?._id, navigate]);

  // Cuenta regresiva para reenviar el enlace
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const handleLookup = async () => {
    setError("");
    if (!phoneE164) {
      setError("Escribe un número de WhatsApp válido, con su indicativo.");
      return;
    }
    setSearching(true);
    try {
      setData(await lookupMyBookings(phoneE164));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar tus reservas.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendLink = async () => {
    if (!phoneE164) return;
    setLinkError("");
    setSendingLink(true);
    try {
      const res = await requestMyBookingsLink(phoneE164);
      setLinkStatus(res.status);
      if (res.status === "sent" || res.status === "cooldown") setResendIn(RESEND_SECONDS);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "No pudimos enviar el enlace. Inténtalo de nuevo.");
    } finally {
      setSendingLink(false);
    }
  };

  const reset = () => {
    // El campo de teléfono se vuelve a montar vacío: no dejar el número anterior.
    setPhoneE164(null);
    setData(null);
    setLinkStatus(null);
    setLinkError("");
    setError("");
    setResendIn(0);
  };

  const whatsappUrl = organization?.whatsappUrl as string | undefined;
  const writeBusiness = whatsappUrl && (
    <Button component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="default" size="xs" leftSection={<IconBrandWhatsapp size={14} />}>
      Escribir al negocio
    </Button>
  );

  if (data) {
    const hasCancellable =
      data.appointments.some((a) => a.canCancel) || data.pendingReservations.some((r) => r.canCancel) || data.classes.some((c) => c.canCancel);
    const sent = linkStatus === "sent" || linkStatus === "cooldown";

    const notice = hasCancellable ? (
      sent ? (
        <div className="ag-alert ag-alert--success" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <IconBrandWhatsapp size={20} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <b style={{ display: "block" }}>Revisa tu WhatsApp</b>
            Te enviamos el enlace para cancelar o cambiar tus reservas a {maskPhone(phoneE164)}.
          </div>
          <Button size="xs" variant="default" onClick={handleSendLink} loading={sendingLink} disabled={resendIn > 0}>
            {resendIn > 0 ? `Reenviar en ${resendIn} s` : "Reenviar"}
          </Button>
        </div>
      ) : linkStatus === "unavailable" ? (
        <div className="ag-alert ag-alert--warning" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1, minWidth: 200 }}>No pudimos enviarte el enlace por WhatsApp. Si necesitas cancelar, escríbele al negocio.</div>
          {writeBusiness}
        </div>
      ) : (
        <div className="ag-alert ag-alert--info" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <IconInfoCircle size={20} />
          <div style={{ flex: 1, minWidth: 200 }}>
            ¿Necesitas cancelar? Por seguridad te enviamos un enlace a tu WhatsApp.
            {linkError && <div style={{ color: "var(--danger)", marginTop: 4 }}>{linkError}</div>}
          </div>
          <Button size="xs" leftSection={<IconBrandWhatsapp size={14} />} onClick={handleSendLink} loading={sendingLink}>
            Enviarme el enlace
          </Button>
        </div>
      )
    ) : null;

    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        <MyBookingsView
          data={data}
          notice={notice}
          footer={
            <div style={{ textAlign: "center" }}>
              <button type="button" className="ag-link" style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13 }} onClick={reset}>
                Consultar otro número
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="ag-card" style={{ width: "100%", maxWidth: 400, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Mis reservas</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Escribe tu número de WhatsApp para ver tus próximas citas y clases.</div>
        </div>

        <InternationalPhoneInput
          label="Número de WhatsApp"
          organizationDefaultCountry={(organization?.default_country as CountryCode) || "CO"}
          onChange={(e164) => setPhoneE164(e164)}
          required
          compact
        />

        {error && (
          <div className="ag-alert ag-alert--danger" style={{ padding: "8px 12px", flexWrap: "wrap" }}>
            <IconInfoCircle size={18} />
            <div style={{ flex: 1, fontSize: 13 }}>{error}</div>
            {writeBusiness}
          </div>
        )}

        <Button fullWidth size="md" onClick={handleLookup} loading={searching} disabled={!phoneE164}>
          Ver mis reservas
        </Button>
      </div>
    </div>
  );
};

export default MyBookingsRequest;
