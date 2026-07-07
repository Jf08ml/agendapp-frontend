import { sendCompleteRegistrationCapi } from "../services/metaConversionsService";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      push?: unknown;
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let pixelLoaded = false;
let registroIniciadoFired = false;

/**
 * Carga el Pixel base de Meta (fbq) e inicializa PageView.
 * Se carga solo en el flujo de registro (no en los paneles de tenant), por
 * eso vive detrás de una función explícita en vez de estar en index.html.
 */
export function loadMetaPixel(): void {
  if (pixelLoaded || !PIXEL_ID) return;
  pixelLoaded = true;

  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq?.("init", PIXEL_ID);
  window.fbq?.("track", "PageView");
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// _fbp/_fbc deben leerse de la cookie a nivel .agenditapp.com (fijada por la
// landing). Si no están disponibles ahí (p.ej. bloqueadas o primera visita
// directa a /signup), se usa como respaldo el query param que la landing
// reenvía al navegar (?fbp=&fbc=).
function getFbpFbc(): { fbp?: string; fbc?: string } {
  const params = new URLSearchParams(window.location.search);
  const fbp = getCookie("_fbp") || params.get("fbp") || undefined;
  const fbc = getCookie("_fbc") || params.get("fbc") || undefined;
  return { fbp, fbc };
}

/** Evento 2 — "Registro Iniciado" (solo Pixel). Una vez por carga de página. */
export function trackRegistroIniciado(): void {
  if (registroIniciadoFired || !PIXEL_ID) return;
  registroIniciadoFired = true;
  window.fbq?.("trackCustom", "RegistroIniciado", { content_name: "registro_iniciado" });
}

/**
 * Evento 3 — "Registro Completado" (Pixel + CAPI, evento estándar
 * CompleteRegistration). Llamar SOLO cuando el backend confirmó la creación
 * de la cuenta, nunca en el click de submit.
 */
export async function trackRegistroCompletado(data: { email?: string; phone?: string }): Promise<void> {
  if (!PIXEL_ID) return;

  const eventId = crypto.randomUUID();

  window.fbq?.("track", "CompleteRegistration", { status: true }, { eventID: eventId });

  const { fbp, fbc } = getFbpFbc();

  try {
    await sendCompleteRegistrationCapi({
      event_id: eventId,
      event_source_url: window.location.href,
      fbp,
      fbc,
      email: data.email,
      phone: data.phone,
    });
  } catch {
    // Best-effort: el tracking nunca debe bloquear ni afectar el flujo de registro.
  }
}
