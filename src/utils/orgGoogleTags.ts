declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

let registeredGaId: string | null = null;
let registeredAdsId: string | null = null;

/**
 * Registra los tags de Google (GA4 + Ads) propios de la organización en el
 * gtag.js ya cargado globalmente (index.html, tag de AgenditApp). gtag.js
 * soporta múltiples destinos con solo llamar 'config' varias veces — no hace
 * falta cargar un script nuevo por organización.
 * Idempotente por ID: evita re-registrar el mismo destino en cada render.
 */
export function registerOrgGoogleTags(analyticsConfig?: {
  gaMeasurementId?: string;
  googleAdsId?: string;
}): void {
  if (!window.gtag) return;
  const gaId = analyticsConfig?.gaMeasurementId?.trim();
  const adsId = analyticsConfig?.googleAdsId?.trim();

  if (gaId && gaId !== registeredGaId) {
    // send_page_view: false — el page_view se manda a mano (ver AppWithBranding)
    // para que llegue con page_title/page_path reales y solo una vez por carga.
    window.gtag("config", gaId, { send_page_view: false });
    registeredGaId = gaId;
  }
  if (adsId && adsId !== registeredAdsId) {
    window.gtag("config", adsId);
    registeredAdsId = adsId;
  }
}

/**
 * Dispara el evento de conversión de Google Ads de la organización al
 * completarse una reserva desde el navegador (wizard manual, chat IA web, o
 * pantalla de retorno de pago con depósito). No cubre reservas creadas por el
 * agente de WhatsApp: ocurren server-side, sin navegador de por medio.
 */
export function trackReservationConversion(analyticsConfig?: {
  googleAdsId?: string;
  googleAdsConversionLabel?: string;
}): void {
  if (!window.gtag) return;
  const adsId = analyticsConfig?.googleAdsId?.trim();
  const label = analyticsConfig?.googleAdsConversionLabel?.trim();
  if (!adsId || !label) return;
  window.gtag("event", "conversion", { send_to: `${adsId}/${label}` });
}
