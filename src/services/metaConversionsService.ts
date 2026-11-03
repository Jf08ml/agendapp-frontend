const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

// El CompleteRegistration ya no sale de aquí: lo envía el backend al crear la
// cuenta (ver registrationMetaEvent en utils/metaPixel.ts).

export interface ContactCapiPayload {
  event_id: string;
  event_source_url: string;
  fbp?: string;
  fbc?: string;
}

/**
 * Envía el evento estándar Contact (content_name "flotante_app") al mismo
 * endpoint interno de Conversions API, parametrizando event_name — el click
 * navega a WhatsApp, por eso también usa keepalive: true.
 */
export async function sendContactCapi(payload: ContactCapiPayload): Promise<void> {
  await fetch(`${API_BASE_URL}/meta-capi/complete-registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      ...payload,
      event_name: "Contact",
      content_name: "flotante_app",
    }),
  });
}
