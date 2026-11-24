// Retorno tras pagar en Mercado Pago (rediseño, PagosPublico): reserva, clase,
// paquete o pedido. MP redirige aquí (back_urls) con ?status=…&ref=<externalReference>.
// La confirmación real la da el webhook → se consulta el estado del Order.
import { useEffect, useRef, useState } from "react";
import { Button, Progress } from "@mantine/core";
import { IconCheck, IconClock, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { getOrderStatus, type OrderStatus } from "../../services/collectionService";
import { trackReservationConversion } from "../../utils/orgGoogleTags";
import AddToCalendarButton from "../../components/AddToCalendarButton";
import { readPendingCalendar } from "../../utils/addToCalendar";

const POLL_INTERVAL_MS = 4000; // cada 4 segundos
const MAX_ATTEMPTS = 15; // ~60 segundos

type PageStatus = "waiting" | "paid" | "failed" | "timeout";
type OrderType = "reservation" | "class" | "package" | "store";

const COPY: Record<OrderType, { paidTitle: string; paidText: string; retryPath: string; retryLabel: string; doneLabel: string; donePath: string }> = {
  reservation: {
    paidTitle: "Reserva confirmada",
    paidText: "Recibimos tu abono y tu reserva quedó confirmada. Te enviamos los detalles por WhatsApp.",
    retryPath: "/online-reservation",
    retryLabel: "Intentar de nuevo",
    doneLabel: "Ver mis reservas",
    donePath: "/mis-reservas",
  },
  class: {
    paidTitle: "Inscripción confirmada",
    paidText: "Recibimos tu abono y tu cupo en la clase quedó reservado. Te enviamos los detalles por WhatsApp.",
    retryPath: "/reservar-clase",
    retryLabel: "Intentar de nuevo",
    doneLabel: "Ver mis reservas",
    donePath: "/mis-reservas",
  },
  package: {
    paidTitle: "Paquete activado",
    paidText: "Recibimos tu pago y tu paquete quedó activo. Ya puedes usar tus sesiones.",
    retryPath: "/",
    retryLabel: "Volver al inicio",
    doneLabel: "Volver al inicio",
    donePath: "/",
  },
  store: {
    paidTitle: "Pedido confirmado",
    paidText: "Recibimos tu pago y tu pedido quedó confirmado. El negocio te escribe para coordinar la entrega.",
    retryPath: "/tienda",
    retryLabel: "Volver a la tienda",
    doneLabel: "Volver a la tienda",
    donePath: "/tienda",
  },
};

const shell = { maxWidth: 480, margin: "0 auto", padding: "56px 16px" } as const;

function ResultIcon({ tone, children }: { tone: "success" | "danger" | "info" | "warning"; children: React.ReactNode }) {
  return (
    <span style={{ width: 56, height: 56, borderRadius: 999, display: "inline-grid", placeItems: "center", background: `var(--${tone}-soft)`, color: `var(--${tone})` }}>
      {children}
    </span>
  );
}

export default function PublicReservationPaymentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const mpStatus = params.get("status"); // pista de MP (no autoritativa)

  const [pageStatus, setPageStatus] = useState<PageStatus>("waiting");
  const [orderType, setOrderType] = useState<OrderType>("reservation");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const conversionFired = useRef(false);
  const organization = useSelector((s: RootState) => s.organization.organization);
  const whatsappUrl = organization?.whatsappUrl as string | undefined;

  const copy = COPY[orderType];

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const mapOrderStatus = (status: OrderStatus): PageStatus | null => {
    if (status === "paid") return "paid";
    if (status === "failed" || status === "expired") return "failed";
    return null; // created/pending/refunded → seguir esperando
  };

  const check = async () => {
    if (!ref) {
      stopPolling();
      setPageStatus("failed");
      return;
    }
    const order = await getOrderStatus(ref);
    if (order) {
      if (order.type === "class" || order.type === "package" || order.type === "store") setOrderType(order.type);
      const mapped = mapOrderStatus(order.status);
      if (mapped) {
        stopPolling();
        setPageStatus(mapped);
        return;
      }
    }
    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      stopPolling();
      setPageStatus("timeout");
    }
  };

  useEffect(() => {
    // Sin referencia o MP ya indicó fallo → no hay nada que confirmar.
    if (!ref || mpStatus === "failure") {
      setPageStatus("failed");
      return;
    }
    setPageStatus("waiting");
    attemptsRef.current = 0;
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Reserva con abono confirmada: conversión de Google Ads de la org
  useEffect(() => {
    if (pageStatus !== "paid" || orderType !== "reservation" || conversionFired.current) return;
    if (!organization) return;
    conversionFired.current = true;
    trackReservationConversion(organization.analyticsConfig);
  }, [pageStatus, orderType, organization]);

  const card = (children: React.ReactNode) => (
    <div style={shell}>
      <div className="ag-card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
  const title = (t: string) => <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>{t}</h1>;

  if (pageStatus === "waiting") {
    return card(
      <>
        <ResultIcon tone="info">
          <IconClock size={28} />
        </ResultIcon>
        {title("Confirmando tu pago")}
        <div className="ag-muted" style={{ fontSize: 14 }}>Estamos verificando el pago con Mercado Pago. Suele tardar menos de 30 segundos.</div>
        <Progress value={100} striped animated color="dark" size="sm" style={{ width: "100%" }} />
        <div className="ag-subtle">No cierres esta página: se confirma sola al recibir el pago.</div>
      </>
    );
  }

  if (pageStatus === "paid") {
    // Guardado al salir hacia Mercado Pago (reserva web, chat o clase)
    const calendarEvents = orderType === "reservation" || orderType === "class" ? readPendingCalendar(ref) : [];
    return card(
      <>
        <ResultIcon tone="success">
          <IconCheck size={28} />
        </ResultIcon>
        {title(copy.paidTitle)}
        <div className="ag-muted" style={{ fontSize: 14 }}>{copy.paidText}</div>
        {calendarEvents.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <AddToCalendarButton events={calendarEvents} fileName={organization?.name} />
          </div>
        )}
        <Button size="md" variant={calendarEvents.length > 0 ? "default" : "filled"} onClick={() => navigate(copy.donePath)} mt={calendarEvents.length > 0 ? 0 : 4}>
          {copy.doneLabel}
        </Button>
      </>
    );
  }

  if (pageStatus === "failed") {
    return card(
      <>
        <ResultIcon tone="danger">
          <IconX size={28} />
        </ResultIcon>
        {title("No se completó el pago")}
        <div className="ag-muted" style={{ fontSize: 14 }}>
          {orderType === "reservation"
            ? "No se cobró nada. Puedes intentarlo de nuevo mientras el horario siga libre; si ya se ocupó, elige otro."
            : "No se cobró nada. Puedes intentarlo de nuevo."}
        </div>
        <Button size="md" onClick={() => navigate(copy.retryPath)} mt={4}>
          {copy.retryLabel}
        </Button>
      </>
    );
  }

  // Demora — el webhook está tardando
  return card(
    <>
      <ResultIcon tone="warning">
        <IconInfoCircle size={28} />
      </ResultIcon>
      {title("Tu pago está siendo procesado")}
      <div className="ag-muted" style={{ fontSize: 14 }}>
        La confirmación está tardando. Si completaste el pago, se confirma en los próximos minutos y te llega un WhatsApp.
      </div>
      <div className="ag-row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
        <Button variant="default" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
        {whatsappUrl && (
          <Button component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="subtle">
            Escribir al negocio
          </Button>
        )}
      </div>
    </>
  );
}
