// Enlaces y mensajes para entrar al panel de un negocio.
//
// La raíz del subdominio ({slug}.agenditapp.com) es la página pública de
// reservas de los clientes, no el panel: el acceso del dueño es /login-admin.
// Sin imports a propósito: se prueba con `node --test` (ver tests/).

const MAIN_DOMAIN = "agenditapp.com";

export const AGENDITAPP_SUPPORT_WA_URL = "https://wa.me/573506674686";

// Mismo formato que acepta extractTenantFromHost para un subdominio de tenant.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Normaliza y valida un slug; null si no es un subdominio válido. */
export function normalizeSlug(raw: string | null | undefined): string | null {
  const slug = String(raw ?? "").trim().toLowerCase();
  if (!slug || slug === "www" || slug === "app") return null;
  return SLUG_RE.test(slug) ? slug : null;
}

/** https://{slug}.agenditapp.com/login-admin */
export function panelLoginUrl(slug: string): string {
  return `https://${slug}.${MAIN_DOMAIN}/login-admin`;
}

/**
 * Destino de /ingresar/:slug (el botón "Ir a mi panel" del WhatsApp de
 * bienvenida apunta a https://app.agenditapp.com/ingresar/{slug}).
 * En local mantiene el tenant con ?slug=. null si el slug no es válido.
 */
export function ingresarTarget(rawSlug: string | null | undefined, hostname: string): string | null {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `/login-admin?slug=${slug}`;
  }
  return panelLoginUrl(slug);
}

/**
 * Mensaje para un login que falló por algo distinto a credenciales malas
 * (esas devuelven 401 y se muestran aparte).
 */
export function loginFailureMessage(status: number | undefined): string {
  if (status === 429) {
    return "Hiciste demasiados intentos. Espera 15 minutos y vuelve a intentarlo.";
  }
  if (!status) {
    return "No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.";
  }
  return "Tuvimos un problema al iniciar sesión. Inténtalo de nuevo en un momento.";
}
