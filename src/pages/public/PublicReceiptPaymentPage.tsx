import { useEffect, useRef, useState } from "react";
import { Button, CopyButton, ActionIcon, Tooltip, Image, Skeleton, Drawer, Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import {
  IconBrandWhatsapp,
  IconCheck,
  IconClock,
  IconClockHour4,
  IconCopy,
  IconInfoCircle,
  IconPhoto,
  IconQrcode,
  IconReceipt,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  submitReceipt,
  getOrderStatus,
  getReceiptCheckout,
  type ReceiptPaymentMethod,
} from "../../services/collectionService";
import { trackReservationConversion } from "../../utils/orgGoogleTags";

// Pantalla de pago por transferencia + comprobante. El flujo de reserva/clase/
// paquete navega aquí (react-router state) tras crear el Order manual; el cliente
// transfiere a la cuenta del negocio, sube la foto del comprobante y la IA valida.

interface ReceiptPaymentState {
  externalReference: string;
  amount: number;
  currency: string;
  paymentMethods: ReceiptPaymentMethod[];
  orderType?: "reservation" | "class" | "package" | "store";
  // Vencimiento de la orden (solo llega al abrir el enlace ?ref=)
  expiresAt?: string;
}

// Tiempo para pagar una cita (decisión 7b del rediseño): el horario NO queda
// apartado mientras se paga. Con expiresAt, cuenta regresiva real; si no, texto fijo.
function ReservationPaymentWindow({ expiresAt }: { expiresAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const msLeft = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const mmss =
    msLeft !== null && msLeft > 0
      ? `${Math.floor(msLeft / 60000)}:${String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0")}`
      : null;
  return (
    <div className="ag-alert ag-alert--warning" role="status">
      <IconClock size={20} stroke={1.75} />
      <div>
        <b>
          {mmss
            ? `Te quedan ${mmss} min para completar el pago`
            : msLeft !== null
              ? "El tiempo para pagar terminó"
              : "Completa el pago en 60 min para confirmar tu cita"}
        </b>
        <div className="ag-muted" style={{ fontSize: 13, lineHeight: "18px" }}>
          Mientras tanto el horario no queda apartado: si otra persona lo reserva primero, te avisamos.
        </div>
      </div>
    </div>
  );
}

type View = "upload" | "submitting" | "paid" | "review" | "rejected";

// Texto de confirmación por tipo de objeto pagado (default: reserva).
const PAID_TEXT: Record<string, string> = {
  store:
    "Validamos tu comprobante y tu pedido quedó confirmado. El negocio te escribe para coordinar la entrega.",
};
const DEFAULT_PAID_TEXT =
  "Validamos tu comprobante y tu reserva quedó confirmada. Te enviamos los detalles por WhatsApp.";

const METHOD_LABEL: Record<string, string> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  daviplata: "Daviplata",
  mercado_pago: "Mercado Pago",
  pix: "Pix",
  yape: "Yape",
  sinpe: "SINPE",
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  otros: "Otro",
};

function CopyField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "nowrap", padding: "4px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div className="ag-subtle">{label}</div>
        <div className="ag-num" style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-all" }}>{value}</div>
      </div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
            <ActionIcon variant="subtle" color="gray" onClick={copy} aria-label={`Copiar ${label.toLowerCase()}`}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </div>
  );
}

const shell = { maxWidth: 520, margin: "0 auto", padding: "32px 16px 56px" } as const;

export default function PublicReceiptPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as ReceiptPaymentState | null;
  // Enlace directo (?ref=...): lo envía el bot de WhatsApp, sin state de navegación.
  const refParam = new URLSearchParams(location.search).get("ref");
  const [fetchedState, setFetchedState] = useState<ReceiptPaymentState | null>(null);
  const [loadingRef, setLoadingRef] = useState(!navState && !!refParam);
  const state = navState ?? fetchedState;
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [file, setFile] = useState<FileWithPath | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [view, setView] = useState<View>("upload");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qrFor, setQrFor] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 48em)");
  const whatsappUrl = organization?.whatsappUrl as string | undefined;

  const resultCard = (tone: "success" | "warning" | "danger" | "neutral", icon: React.ReactNode, title: string, text: string, actions: React.ReactNode) => (
    <div style={{ ...shell, paddingTop: 56 }}>
      <div className="ag-card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            display: "inline-grid",
            placeItems: "center",
            background: tone === "neutral" ? "var(--surface-hover)" : `var(--${tone}-soft)`,
            color: tone === "neutral" ? "var(--ink-muted)" : `var(--${tone})`,
          }}
        >
          {icon}
        </span>
        <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>{title}</h1>
        <div className="ag-muted" style={{ fontSize: 14 }}>{text}</div>
        <div style={{ marginTop: 4 }}>{actions}</div>
      </div>
    </div>
  );

  useEffect(() => {
    if (navState || !refParam) return;
    getReceiptCheckout(refParam)
      .then((info) => {
        if (!info) return;
        setFetchedState({
          externalReference: info.externalReference,
          amount: info.amount,
          currency: info.currency,
          paymentMethods: info.paymentMethods,
          orderType: info.orderType,
          expiresAt: info.expiresAt,
        });
        // El cliente puede reabrir el enlace después de pagar o de que venza.
        const status: string = info.status;
        if (status === "paid") setView("paid");
        else if (status === "in_review") setView("review");
        else if (["failed", "expired", "refunded"].includes(status)) setView("rejected");
      })
      .finally(() => setLoadingRef(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refParam]);

  // Polling: si quedó en revisión manual, escuchamos cuando el negocio lo
  // apruebe (→ paid) o rechace (→ failed/expired) para actualizar al cliente.
  useEffect(() => {
    if (view !== "review" || !state?.externalReference) return;
    const ref = state.externalReference;
    const stop = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    const tick = async () => {
      const order = await getOrderStatus(ref);
      if (!order) return;
      if (order.status === "paid") {
        stop();
        setView("paid");
      } else if (order.status === "failed" || order.status === "expired") {
        stop();
        setView("rejected");
      }
    };
    pollRef.current = setInterval(tick, 6000);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  if (loadingRef) {
    return (
      <div style={shell}>
        <Skeleton height={28} width={260} mb={10} />
        <Skeleton height={64} radius="md" mb={16} />
        <Skeleton height={150} radius="md" mb={16} />
        <Skeleton height={140} radius="md" />
      </div>
    );
  }

  // Sin datos (recarga directa): no podemos continuar.
  if (!state?.externalReference) {
    return resultCard(
      "neutral",
      <IconReceipt size={28} />,
      "No encontramos tu pago",
      "Vuelve a iniciar la reserva para subir tu comprobante.",
      <Button onClick={() => navigate("/")}>Volver al inicio</Button>
    );
  }

  const amountLabel = formatCurrency(state.amount, state.currency);

  const handleDrop = (files: FileWithPath[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setView("submitting");
    setError(null);
    const { result, message } = await submitReceipt(state.externalReference, file);
    if (!result) {
      setError(message);
      setView("upload");
      return;
    }
    if (result.autoApproved && (state.orderType ?? "reservation") === "reservation") {
      trackReservationConversion(organization?.analyticsConfig);
    }
    setView(result.autoApproved ? "paid" : "review");
  };

  if (view === "paid") {
    return resultCard(
      "success",
      <IconCheck size={28} />,
      "Pago confirmado",
      PAID_TEXT[state.orderType ?? ""] ?? DEFAULT_PAID_TEXT,
      <Button onClick={() => navigate(state.orderType === "store" ? "/tienda" : "/mis-reservas")}>
        {state.orderType === "store" ? "Volver a la tienda" : "Ver mis reservas"}
      </Button>
    );
  }

  // Sin spinner: la revisión depende del negocio y puede tardar horas. El
  // polling sigue en segundo plano por si lo aprueban mientras está abierta.
  if (view === "review") {
    return resultCard(
      "warning",
      <IconClockHour4 size={28} />,
      "Tu comprobante está en revisión",
      `Lo recibimos y ${organization?.name?.trim() || "el negocio"} lo está revisando. Te avisamos por WhatsApp apenas quede validado. Ya puedes cerrar esta página.`,
      <Button variant="default" onClick={() => navigate("/")}>
        Volver al inicio
      </Button>
    );
  }

  if (view === "rejected") {
    return resultCard(
      "danger",
      <IconX size={28} />,
      "Tu comprobante no fue aprobado",
      "El negocio no pudo validar tu pago. Si crees que es un error, escríbele; si no, vuelve a reservar.",
      <div className="ag-row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {whatsappUrl && (
          <Button component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer" leftSection={<IconBrandWhatsapp size={16} />}>
            Escribir al negocio
          </Button>
        )}
        <Button variant="default" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  const qrMethod = qrFor !== null ? state.paymentMethods[qrFor] : null;

  return (
    <div style={shell}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Paga y sube tu comprobante</h1>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>Transfiere a una de las cuentas y sube la captura. Lo validamos al instante.</div>
        </div>

        <div className="ag-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="ag-subtle">Monto a pagar</div>
            <div className="ag-num" style={{ font: "600 26px/32px var(--font-sans)" }}>{amountLabel}</div>
          </div>
          <CopyButton value={String(state.amount)}>
            {({ copied, copy }) => (
              <Button variant="default" size="xs" onClick={copy} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </CopyButton>
        </div>

        {(state.orderType ?? "reservation") === "reservation" && <ReservationPaymentWindow expiresAt={state.expiresAt} />}

        <section className="ag-card" style={{ padding: 16 }}>
          <b style={{ display: "block", fontSize: 15, marginBottom: 10 }}>Cuentas para pagar</b>
          {state.paymentMethods.length === 0 ? (
            <div className="ag-stack" style={{ gap: 8 }}>
              <div className="ag-muted" style={{ fontSize: 14 }}>El negocio no configuró cuentas. Escríbele para coordinar el pago.</div>
              {whatsappUrl && (
                <div>
                  <Button component="a" href={whatsappUrl} target="_blank" rel="noopener noreferrer" size="xs" variant="default" leftSection={<IconBrandWhatsapp size={14} />}>
                    Escribir al negocio
                  </Button>
                </div>
              )}
            </div>
          ) : (
            state.paymentMethods.map((pm, i) => (
              <div key={i} style={{ paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0, borderTop: i > 0 ? "1px solid var(--line)" : undefined }}>
                <div className="ag-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="ag-badge">{METHOD_LABEL[pm.type] || pm.type}</span>
                  {pm.qrCodeUrl && (
                    <Button size="compact-xs" variant="subtle" leftSection={<IconQrcode size={14} />} onClick={() => setQrFor(i)}>
                      Ver QR
                    </Button>
                  )}
                </div>
                <CopyField label="Titular" value={pm.accountName} />
                <CopyField label="Número de cuenta" value={pm.accountNumber} />
                <CopyField label="Teléfono" value={pm.phoneNumber} />
                {pm.notes && <div className="ag-subtle" style={{ marginTop: 4 }}>{pm.notes}</div>}
              </div>
            ))
          )}
        </section>

        <section className="ag-card" style={{ padding: 16 }}>
          <b style={{ display: "block", fontSize: 15, marginBottom: 10 }}>Sube tu comprobante</b>
          {preview ? (
            <div className="ag-stack" style={{ gap: 8, alignItems: "center" }}>
              <Image src={preview} alt="Comprobante" mah={320} fit="contain" radius="md" />
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} maxSize={8 * 1024 ** 2} multiple={false} radius="md">
              <div style={{ minHeight: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, pointerEvents: "none", textAlign: "center" }}>
                <Dropzone.Accept>
                  <IconUpload size={32} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={32} color="var(--danger)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size={32} color="var(--ink-subtle)" />
                </Dropzone.Idle>
                <span style={{ fontSize: 14 }}>Toca para elegir la captura o arrástrala aquí</span>
                <span className="ag-subtle">JPG, PNG o WEBP · máximo 8 MB</span>
              </div>
            </Dropzone>
          )}
        </section>

        {error && (
          <div className="ag-alert ag-alert--danger">
            <IconInfoCircle size={20} />
            <div>{error}</div>
          </div>
        )}

        <Button size="md" fullWidth disabled={!file} loading={view === "submitting"} onClick={handleSubmit}>
          {view === "submitting" ? "Validando comprobante…" : "Enviar comprobante"}
        </Button>
        {!file && <div className="ag-subtle" style={{ textAlign: "center", marginTop: -8 }}>Elige la captura para poder enviarla.</div>}
        <div className="ag-subtle" style={{ textAlign: "center" }}>
          Validamos el comprobante automáticamente. Si todo coincide, se confirma al instante; si no, el negocio lo revisa.
        </div>
      </div>

      {isMobile ? (
        <Drawer opened={!!qrMethod} onClose={() => setQrFor(null)} position="bottom" size="auto" radius="lg" title={<b>QR para pagar</b>}>
          {qrMethod?.qrCodeUrl && <Image src={qrMethod.qrCodeUrl} alt="QR de pago" mah={320} fit="contain" />}
        </Drawer>
      ) : (
        <Modal opened={!!qrMethod} onClose={() => setQrFor(null)} title={<b>QR para pagar</b>} centered>
          {qrMethod?.qrCodeUrl && <Image src={qrMethod.qrCodeUrl} alt="QR de pago" mah={360} fit="contain" />}
        </Modal>
      )}
    </div>
  );
}
