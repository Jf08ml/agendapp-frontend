// Campañas (rediseño, CampanasPanel): estados con palabra y tono (sin emoji),
// chips de la lista y errores de envío en palabras. Puro para node --test.

export type CampaignTone = "success" | "warning" | "danger" | "info" | "neutral";

export const CAMPAIGN_STATUS: Record<string, { label: string; tone: CampaignTone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  "dry-run": { label: "Simulación", tone: "warning" },
  running: { label: "Enviando", tone: "info" },
  completed: { label: "Completada", tone: "success" },
  failed: { label: "Fallida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export function campaignStatus(status: string) {
  return CAMPAIGN_STATUS[status] ?? { label: "Desconocido", tone: "neutral" as CampaignTone };
}

/** Chips de la lista: Todas, Enviando, Completadas, Simulaciones, Canceladas y Fallidas. */
export const CAMPAIGN_CHIPS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "running", label: "Enviando" },
  { value: "completed", label: "Completadas" },
  { value: "dry-run", label: "Simulaciones" },
  { value: "cancelled", label: "Canceladas" },
  { value: "failed", label: "Fallidas" },
];

export const ITEM_STATUS: Record<string, { label: string; tone: CampaignTone }> = {
  sent: { label: "Enviado", tone: "success" },
  pending: { label: "Pendiente", tone: "info" },
  failed: { label: "Fallido", tone: "danger" },
  skipped: { label: "Omitido", tone: "neutral" },
};

/** Error de envío explicado en palabras (códigos comunes de Meta); si no se reconoce, el original. */
export function humanizeSendError(message: string | null | undefined): string {
  if (!message) return "";
  const m = message.toLowerCase();
  if (m.includes("131026") || m.includes("undeliverable") || m.includes("not a whatsapp") || m.includes("no tiene whatsapp"))
    return "El número no tiene WhatsApp o no se le pudo entregar.";
  if (m.includes("131047") || m.includes("re-engagement") || m.includes("24 hours"))
    return "Pasaron más de 24 horas desde su último mensaje: solo se le puede escribir con una plantilla.";
  if (m.includes("131049") || m.includes("ecosystem") || m.includes("healthy"))
    return "Meta no lo entregó para cuidar la experiencia del cliente (recibe muchos mensajes de marketing).";
  if (m.includes("131048") || m.includes("spam rate") || m.includes("rate limit") || m.includes("130429"))
    return "Meta limitó los envíos por un momento. Vuelve a intentarlo más tarde.";
  if (m.includes("132001") || (m.includes("template") && m.includes("not exist")))
    return "La plantilla no existe o no está aprobada en ese idioma.";
  if (m.includes("131021") || m.includes("same as") || m.includes("recipient cannot be sender"))
    return "No se puede enviar al mismo número del negocio.";
  if (m.includes("invalid") && m.includes("phone")) return "El número no es válido.";
  if (m.includes("opt") && m.includes("out")) return "El cliente pidió no recibir mensajes.";
  return message;
}

/** Texto de por qué el botón de enviar sigue deshabilitado. */
export function sendBlockedReason(c: { reviewedRecipients: boolean; reviewedMessage: boolean }): string | null {
  if (!c.reviewedRecipients && !c.reviewedMessage) return "Marca las dos casillas para poder enviar.";
  if (!c.reviewedRecipients) return "Falta confirmar que revisaste los destinatarios.";
  if (!c.reviewedMessage) return "Falta confirmar que revisaste el mensaje.";
  return null;
}
