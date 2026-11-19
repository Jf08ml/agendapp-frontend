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
  // La primera versión de la plantilla `cuenta_creada` tenía "{{1}}" literal en
  // la URL base del botón, así que esos WhatsApp llegaron como
  // /ingresar/%7B%7B1%7D%7D<slug>. Se quita ese prefijo para que sigan sirviendo.
  const cleaned = String(rawSlug ?? "").replace(/^(?:\{\{1\}\}|%7B%7B1%7D%7D)+/i, "");
  const slug = normalizeSlug(cleaned);
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

/**
 * Recuperar el acceso sin contraseña. Se abre en el mismo dominio donde está
 * la persona: en el de un negocio la búsqueda se limita a ese negocio; en
 * app.agenditapp.com busca en todos (con captcha).
 */
export const RECOVER_ACCESS_PATH = "/recuperar-acceso";

/**
 * A dónde ir tras recuperar el acceso: /exchange con el código de un uso.
 * - En local o en la página del negocio (scoped): el mismo origen.
 * - En app.agenditapp.com: el subdominio del negocio, o su dominio propio.
 * null si no hay a dónde ir.
 */
export function recoveryExchangeUrl(params: {
  hostname: string;
  scoped: boolean;
  exchangeCode: string;
  slug?: string | null;
  domain?: string | null;
}): string | null {
  const { hostname, scoped, exchangeCode, slug, domain } = params;
  const code = encodeURIComponent(exchangeCode);
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `/exchange?code=${code}${slug ? `&slug=${slug}` : ""}`;
  }
  if (scoped) return `/exchange?code=${code}`;
  if (slug) return `https://${slug}.${MAIN_DOMAIN}/exchange?code=${code}`;
  if (domain) return `https://${domain}/exchange?code=${code}`;
  return null;
}
