// components/ReservationDepositAlert.tsx
// Abono manual (rediseño, PagosPublico): para negocios sin pago en línea. Monto con
// «Copiar monto», métodos como chips, datos de la cuenta y «Enviar comprobante»
// por WhatsApp con el mensaje armado como antes.
import { Button, CopyButton, ActionIcon, Tooltip, Image, Modal, Drawer } from "@mantine/core";
import { IconBrandWhatsapp, IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import { formatCurrency } from "../utils/formatCurrency";

interface ReservationDepositAlertProps {
  reservationId?: string;
  clientName?: string;
  serviceName?: string;
  servicePrice?: number;
  /** Abono ya calculado (suma de las reglas por servicio). Si se omite, se usa el % general sobre servicePrice. */
  depositAmount?: number;
  /** % común a todos los servicios; undefined si el abono es un monto fijo o mezcla reglas. */
  depositPercentage?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  /** Si algún servicio de la reserva tiene el precio oculto, no se muestra el monto exacto del abono. */
  hidePrice?: boolean;
}

export function ReservationDepositAlert({
  reservationId,
  clientName,
  serviceName,
  servicePrice = 0,
  depositAmount: depositAmountProp,
  depositPercentage: depositPercentageProp,
  appointmentDate,
  appointmentTime,
  hidePrice = false,
}: ReservationDepositAlertProps) {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedQR, setSelectedQR] = useState<{ url: string; label: string } | null>(null);
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [methodIdx, setMethodIdx] = useState(0);
  
  const requireDeposit = organization?.requireReservationDeposit || false;
  const hasExplicitDeposit = depositAmountProp !== undefined;
  const depositPercentage = hasExplicitDeposit
    ? depositPercentageProp
    : organization?.reservationDepositPercentage || 50;
  const paymentMethods = organization?.paymentMethods || [];
  const whatsappUrl = organization?.whatsappUrl || "";
  const currency = organization?.currency || "COP";

  // Si no se requiere depósito, no mostrar nada
  if (!requireDeposit) {
    return null;
  }

  const depositAmount = hasExplicitDeposit ? depositAmountProp : (servicePrice * (depositPercentage ?? 0)) / 100;

  const paymentTypeLabels: Record<string, string> = {
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    daviplata: "Daviplata",
    mercado_pago: "Mercado Pago",
    pix: "Pix",
    yape: "Yape",
    sinpe: "SINPE Móvil",
    transferencia_bancaria: "Transferencia bancaria",
    efectivo: "Efectivo",
    otros: "Otros",
  };

  const handleSendWhatsApp = () => {
    // Extraer número de WhatsApp de la URL
    let phoneNumber = "";
    if (whatsappUrl) {
      const match = whatsappUrl.match(/wa\.me\/(\d+)/);
      if (match) {
        phoneNumber = match[1];
      }
    }

    if (!phoneNumber) {
      phoneNumber = organization?.phoneNumber || "";
    }

    const message = encodeURIComponent(
      `Hola! Adjunto comprobante de pago para mi reserva:\n\n` +
      `Fecha: ${appointmentDate || "N/A"}\n` +
      `Hora: ${appointmentTime || "N/A"}\n` +
      `Servicio: ${serviceName || "N/A"}\n` +
      `Cliente: ${clientName || "N/A"}\n` +
      (hidePrice
        ? `Abono: ${depositPercentage ? `${depositPercentage}%` : "según el servicio"}\n`
        : `Abono: ${formatCurrency(depositAmount, currency)}${depositPercentage ? ` (${depositPercentage}%)` : ""}\n`) +
      `ID Reserva: ${reservationId || "N/A"}\n\n` +
      `Espero confirmacion de la reserva. Gracias!`
    );

    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handleQRClick = (qrUrl: string, methodType: string) => {
    setSelectedQR({ url: qrUrl, label: paymentTypeLabels[methodType] });
    open();
  };

  const method = paymentMethods[Math.min(methodIdx, Math.max(0, paymentMethods.length - 1))];

  const copyRow = (label: string, value?: string) =>
    value ? (
      <div className="ag-row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "nowrap", padding: "3px 0" }}>
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
    ) : null;

  return (
    <div className="ag-alert ag-alert--warning" style={{ display: "block", padding: 16 }}>
      <div className="ag-stack" style={{ gap: 12 }}>
        <div>
          <b style={{ display: "block" }}>Abono para confirmar tu reserva</b>
          <div className="ag-muted" style={{ fontSize: 13, lineHeight: "18px" }}>
            {depositPercentage
              ? `Para asegurar tu cita, haz un abono del ${depositPercentage}% del valor del servicio y envíanos el comprobante.`
              : hidePrice
                ? "Para asegurar tu cita, haz un abono. El negocio te confirma el monto."
                : "Para asegurar tu cita, haz el abono y envíanos el comprobante."}{" "}
            El resto lo pagas en el establecimiento.
          </div>
        </div>

        {!hidePrice && (
          <div className="ag-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="ag-subtle">Monto del abono</div>
              <div className="ag-num" style={{ font: "600 22px/28px var(--font-sans)" }}>{formatCurrency(depositAmount, currency)}</div>
            </div>
            <CopyButton value={depositAmount.toString()}>
              {({ copied, copy }) => (
                <Button variant="default" size="xs" onClick={copy} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                  {copied ? "Copiado" : "Copiar monto"}
                </Button>
              )}
            </CopyButton>
          </div>
        )}

        {paymentMethods.length > 0 && method && (
          <div className="ag-stack" style={{ gap: 8 }}>
            <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }} role="group" aria-label="Método de pago">
              {paymentMethods.map((m, i) => (
                <button key={i} type="button" className="ag-chip" aria-pressed={i === methodIdx} onClick={() => setMethodIdx(i)}>
                  {paymentTypeLabels[m.type] || m.type}
                </button>
              ))}
            </div>
            <div className="ag-card" style={{ padding: 12 }}>
              {copyRow("Titular", method.accountName)}
              {copyRow("Número de cuenta", method.accountNumber)}
              {copyRow("Teléfono", method.phoneNumber)}
              {method.notes && <div className="ag-subtle" style={{ marginTop: 4 }}>{method.notes}</div>}
              {method.qrCodeUrl && (
                <Button size="compact-xs" variant="subtle" mt={6} leftSection={<IconQrcode size={14} />} onClick={() => handleQRClick(method.qrCodeUrl!, method.type)}>
                  Ver QR
                </Button>
              )}
            </div>
          </div>
        )}

        <Button leftSection={<IconBrandWhatsapp size={18} />} onClick={handleSendWhatsApp} fullWidth>
          Enviar comprobante
        </Button>
        <div className="ag-subtle" style={{ textAlign: "center" }}>Se abre WhatsApp con el mensaje listo; adjunta la captura del pago.</div>
      </div>

      {isMobile ? (
        <Drawer opened={opened} onClose={close} position="bottom" size="auto" radius="lg" title={<b>QR · {selectedQR?.label || ""}</b>}>
          {selectedQR && <Image src={selectedQR.url} alt={`QR ${selectedQR.label}`} mah={340} fit="contain" />}
        </Drawer>
      ) : (
        <Modal opened={opened} onClose={close} title={<b>QR · {selectedQR?.label || ""}</b>} centered>
          {selectedQR && <Image src={selectedQR.url} alt={`QR ${selectedQR.label}`} mah={400} fit="contain" />}
        </Modal>
      )}
    </div>
  );
}
