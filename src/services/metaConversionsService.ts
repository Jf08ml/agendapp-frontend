const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

export interface CompleteRegistrationCapiPayload {
  event_id: string;
  event_source_url: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  phone?: string;
}

/**
 * Envía el evento CompleteRegistration al endpoint interno de Conversions API.
 * Usa fetch (no axios) para poder pasar keepalive: true — la petición debe
 * sobrevivir aunque el navegador ya esté redirigiendo a otra página.
 */
export async function sendCompleteRegistrationCapi(
  payload: CompleteRegistrationCapiPayload
): Promise<void> {
  await fetch(`${API_BASE_URL}/meta-capi/complete-registration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify(payload),
  });
}

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
