// components/MpDepositNotice.tsx
// Aviso pre-pago: informa al cliente que, para confirmar, se le cobrará un abono
// (depósito) por un % vía Mercado Pago, ANTES de redirigirlo al checkout.
import { Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { formatCurrency } from "../utils/formatCurrency";

interface MpDepositNoticeProps {
  percentage: number;
  currency: string;
  /** Monto del abono (subtotal * pct/100). Si se omite o es 0, solo se muestra el %. */
  amount?: number;
  /** Lo que se confirma, ej. "tu reserva" | "tu inscripción". */
  objectLabel?: string;
}

export function MpDepositNotice({
  percentage,
  currency,
  amount,
  objectLabel = "tu reserva",
}: MpDepositNoticeProps) {
  return (
    <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />} radius="md">
      <Text size="sm" fw={600} mb={2}>
        Se requiere un abono para confirmar
      </Text>
      <Text size="sm">
        Para confirmar {objectLabel} se te cobrará un abono del{" "}
        <strong>{percentage}%</strong>
        {amount && amount > 0 ? (
          <>
            {" "}
            (<strong>{formatCurrency(amount, currency)}</strong>)
          </>
        ) : null}{" "}
        a través de Mercado Pago. El valor restante se paga en el establecimiento.
      </Text>
    </Alert>
  );
}

export default MpDepositNotice;
