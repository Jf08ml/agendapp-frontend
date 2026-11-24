// components/MpDepositNotice.tsx
// Aviso pre-pago: informa al cliente que, para confirmar, debe realizar un abono
// (depósito) por un %. Copy genérico (no menciona el medio de pago concreto),
// válido tanto para Mercado Pago como para transferencia + comprobante.
// Rediseño (PagosPublico): alerta warning-soft antes del botón.
import { IconAlertCircle } from "@tabler/icons-react";
import { formatCurrency } from "../utils/formatCurrency";

interface MpDepositNoticeProps {
  /** % del abono. Omitir cuando el abono es un monto fijo o mezcla reglas distintas por servicio. */
  percentage?: number;
  currency: string;
  /** Monto del abono ya calculado. Si se omite o es 0, solo se muestra el %. */
  amount?: number;
  /** Lo que se confirma, ej. "tu reserva" | "tu inscripción". */
  objectLabel?: string;
  /**
   * Minutos que tiene la orden para pagarse (15 con Mercado Pago, 60 con
   * comprobante). Solo para citas: el horario NO queda apartado mientras se paga
   * (decisión 7b), así que se dice sin prometer de más. Las clases sí retienen
   * el cupo y no lo pasan.
   */
  paymentWindowMinutes?: number;
}

export function MpDepositNotice({
  percentage,
  currency,
  amount,
  objectLabel = "tu reserva",
  paymentWindowMinutes,
}: MpDepositNoticeProps) {
  const amountText = amount && amount > 0 ? formatCurrency(amount, currency) : null;
  const pctText = percentage && percentage > 0 ? `${percentage}%` : null;
  const title = amountText
    ? `Abono de ${amountText} para confirmar`
    : pctText
      ? `Abono del ${pctText} para confirmar`
      : "Se requiere un abono para confirmar";

  return (
    <div className="ag-alert ag-alert--warning" role="note">
      <IconAlertCircle size={20} stroke={1.75} />
      <div>
        <b>{title}</b>
        <div className="ag-muted" style={{ fontSize: 13, lineHeight: "18px" }}>
          Para confirmar {objectLabel} lo pagas en el siguiente paso
          {amountText && pctText ? ` (${pctText} del total)` : ""}. El valor restante se paga en el
          establecimiento.
          {paymentWindowMinutes ? (
            <>
              {" "}
              Completa el pago en {paymentWindowMinutes} min para confirmar tu cita. Mientras tanto el
              horario no queda apartado: si otra persona lo reserva primero, te avisamos.
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default MpDepositNotice;
