/* eslint-disable @typescript-eslint/no-explicit-any */
// Paso 3 de Nueva campaña (rediseño, CampanasPanel): resumen, «¿Probar primero?»
// con «Simular envío», dos casillas de confirmación y aviso de que no se deshace.
import { Button, Checkbox } from "@mantine/core";
import { IconFlask, IconInfoCircle, IconSend } from "@tabler/icons-react";
import type { PhoneValidation } from "../../../../types/campaign";
import { sendBlockedReason } from "../campaignsModel";

interface CampaignSummaryProps {
  title: string;
  message: string;
  templateName?: string;
  hasMedia?: boolean;
  validation?: PhoneValidation;
  confirmations: {
    reviewedRecipients: boolean;
    reviewedMessage: boolean;
  };
  onUpdate: (updates: any) => void;
  onSend: (dryRun: boolean) => void;
  loading: boolean;
}

export default function CampaignSummary({ title, templateName, hasMedia, validation, confirmations, onUpdate, onSend, loading }: CampaignSummaryProps) {
  const validRecipients = validation?.valid || 0;
  const invalidCount = validation?.invalid || 0;
  const withoutConsent = validation?.withoutConsent || 0;
  const blocked = sendBlockedReason(confirmations);
  const people = validRecipients === 1 ? "1 cliente" : `${validRecipients} clientes`;

  return (
    <div className="ag-stack" style={{ gap: 16 }}>
      <h2 className="ag-h" style={{ margin: 0 }}>Revisa antes de enviar</h2>

      <dl className="ag-kv">
        <dt>Campaña</dt>
        <dd>{title}</dd>
        {templateName && (
          <>
            <dt>Plantilla</dt>
            <dd>
              {templateName} <span className="ag-badge ag-badge--success" style={{ marginLeft: 6 }}>Aprobada</span>
            </dd>
          </>
        )}
        <dt>Destinatarios</dt>
        <dd className="ag-num">
          <b>{validRecipients}</b> con número válido
        </dd>
        {invalidCount > 0 && (
          <>
            <dt>Omitidos</dt>
            <dd className="ag-num">{invalidCount} números no válidos</dd>
          </>
        )}
        {withoutConsent > 0 && (
          <>
            <dt>Sin permiso</dt>
            <dd className="ag-num">{withoutConsent} pidieron no recibir mensajes y se omiten</dd>
          </>
        )}
        <dt>Imagen</dt>
        <dd>{hasMedia ? "Sí" : "No"}</dd>
      </dl>

      <div className="ag-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--surface-muted)" }}>
        <IconFlask size={22} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <b style={{ display: "block" }}>¿Probar primero?</b>
          <span className="ag-muted" style={{ fontSize: 14 }}>La simulación recorre la lista y te muestra qué pasaría, sin enviar ningún mensaje.</span>
        </div>
        <Button variant="default" leftSection={<IconFlask size={16} />} onClick={() => onSend(true)} loading={loading}>
          Simular envío
        </Button>
      </div>

      <div className="ag-stack" style={{ gap: 10 }}>
        <Checkbox
          label="Revisé los destinatarios y son correctos"
          checked={confirmations.reviewedRecipients}
          onChange={(e) => onUpdate({ confirmations: { ...confirmations, reviewedRecipients: e.currentTarget.checked } })}
        />
        <Checkbox
          label="Revisé el mensaje y está listo"
          checked={confirmations.reviewedMessage}
          onChange={(e) => onUpdate({ confirmations: { ...confirmations, reviewedMessage: e.currentTarget.checked } })}
        />
      </div>

      <div className="ag-alert ag-alert--warning">
        <IconInfoCircle size={20} />
        <div>
          El envío no se puede deshacer: los mensajes que ya salieron no se pueden borrar. Mientras se envía puedes detener la campaña. Meta cobra
          cada mensaje.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <Button leftSection={<IconSend size={16} />} onClick={() => onSend(false)} disabled={!!blocked || loading} loading={loading}>
          Enviar a {people}
        </Button>
        {blocked && <span className="ag-subtle">{blocked}</span>}
      </div>
    </div>
  );
}
