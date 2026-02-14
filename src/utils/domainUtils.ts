const MAIN_DOMAIN = "agenditapp.com";
const SIGNUP_SUBDOMAIN = "app";

export type DomainType = "signup" | "tenant" | "custom" | "landing";

export interface DomainInfo {
  type: DomainType;
  slug?: string;
}

/**
 * Detecta el tipo de dominio basándose en el hostname.
 *
 * - app.agenditapp.com → signup (no cargar branding)
 * - {slug}.agenditapp.com → tenant (cargar org por slug)
 * - agenditapp.com / www → landing (redirigir a app)
 * - localhost → tenant (dev mode, usar ?slug= o X-Dev-Tenant-Slug)
 * - Otro dominio → custom (dominio personalizado, flujo existente)
 */
export function extractTenantFromHost(
  hostname: string = window.location.hostname
): DomainInfo {
  const normalized = hostname.toLowerCase().trim();

  // Localhost → dev mode
  if (normalized === "localhost" || normalized === "127.0.0.1") {
    return { type: "tenant" };
  }

  // app.agenditapp.com → signup domain
  if (normalized === `${SIGNUP_SUBDOMAIN}.${MAIN_DOMAIN}`) {
    return { type: "signup" };
  }

  // agenditapp.com o www.agenditapp.com → landing
  if (normalized === MAIN_DOMAIN || normalized === `www.${MAIN_DOMAIN}`) {
    return { type: "landing" };
  }

  // {slug}.agenditapp.com → tenant subdomain
  if (normalized.endsWith(`.${MAIN_DOMAIN}`)) {
    const slug = normalized.slice(0, -(MAIN_DOMAIN.length + 1));
    if (slug && slug !== "www" && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
      return { type: "tenant", slug };
    }
  }

  // Cualquier otro dominio → custom domain
  return { type: "custom" };
}

/**
 * Genera la URL de redirect post-signup.
 * En producción: https://{slug}.agenditapp.com/exchange?code={code}
 * En dev: http://localhost:{port}/exchange?code={code}&slug={slug}
 */
export function getPostSignupRedirectUrl(
  slug: string,
  exchangeCode: string
): string {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    const port = window.location.port || "3000";
    return `http://localhost:${port}/exchange?code=${exchangeCode}&slug=${slug}`;
  }

  return `https://${slug}.${MAIN_DOMAIN}/exchange?code=${exchangeCode}`;
}
