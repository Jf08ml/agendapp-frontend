/**
 * signupRegion.ts — Configuración regional de una organización nueva
 * (default_country, timezone, currency) derivada en el registro.
 *
 * Señales, en orden de confianza:
 *  1. País del teléfono que el usuario eligió en el registro (explícito).
 *  2. Zona horaria del navegador (Intl): se usa solo si pertenece a ese país;
 *     así un colombiano que se registra desde Madrid con su número +57 queda en
 *     Bogotá, y un negocio en México Pacífico queda en Tijuana y no en CDMX.
 *  3. Si el país no está en el catálogo: zona del navegador + USD.
 */

interface RegionInfo {
  currency: string;
  /** La primera es la zona por defecto del país */
  timezones: string[];
  /** Prefijo IANA que identifica zonas del país (países con muchas zonas) */
  tzPrefix?: string[];
}

const REGIONS: Record<string, RegionInfo> = {
  CO: { currency: "COP", timezones: ["America/Bogota"] },
  MX: {
    currency: "MXN",
    timezones: [
      "America/Mexico_City", "America/Cancun", "America/Merida", "America/Monterrey",
      "America/Chihuahua", "America/Ciudad_Juarez", "America/Mazatlan", "America/Hermosillo",
      "America/Tijuana", "America/Matamoros", "America/Bahia_Banderas",
    ],
  },
  PE: { currency: "PEN", timezones: ["America/Lima"] },
  EC: { currency: "USD", timezones: ["America/Guayaquil", "Pacific/Galapagos"] },
  VE: { currency: "VES", timezones: ["America/Caracas"] },
  PA: { currency: "USD", timezones: ["America/Panama"] },
  CR: { currency: "CRC", timezones: ["America/Costa_Rica"] },
  SV: { currency: "USD", timezones: ["America/El_Salvador"] },
  GT: { currency: "GTQ", timezones: ["America/Guatemala"] },
  HN: { currency: "HNL", timezones: ["America/Tegucigalpa"] },
  NI: { currency: "NIO", timezones: ["America/Managua"] },
  DO: { currency: "DOP", timezones: ["America/Santo_Domingo"] },
  PR: { currency: "USD", timezones: ["America/Puerto_Rico"] },
  CU: { currency: "CUP", timezones: ["America/Havana"] },
  BO: { currency: "BOB", timezones: ["America/La_Paz"] },
  PY: { currency: "PYG", timezones: ["America/Asuncion"] },
  UY: { currency: "UYU", timezones: ["America/Montevideo"] },
  CL: { currency: "CLP", timezones: ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"] },
  AR: { currency: "ARS", timezones: ["America/Argentina/Buenos_Aires"], tzPrefix: ["America/Argentina/"] },
  BR: {
    currency: "BRL",
    timezones: [
      "America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem",
      "America/Manaus", "America/Cuiaba", "America/Campo_Grande", "America/Porto_Velho",
      "America/Boa_Vista", "America/Rio_Branco", "America/Maceio", "America/Araguaina", "America/Noronha",
    ],
  },
  US: {
    currency: "USD",
    timezones: [
      "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
      "America/Los_Angeles", "America/Anchorage", "America/Detroit", "America/Boise",
      "Pacific/Honolulu",
    ],
    tzPrefix: ["America/Indiana/", "America/Kentucky/", "America/North_Dakota/"],
  },
  CA: {
    currency: "CAD",
    timezones: [
      "America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg",
      "America/Halifax", "America/St_Johns", "America/Regina",
    ],
  },
  ES: { currency: "EUR", timezones: ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"] },
  PT: { currency: "EUR", timezones: ["Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores"] },
  FR: { currency: "EUR", timezones: ["Europe/Paris"] },
  IT: { currency: "EUR", timezones: ["Europe/Rome"] },
  DE: { currency: "EUR", timezones: ["Europe/Berlin"] },
  NL: { currency: "EUR", timezones: ["Europe/Amsterdam"] },
  BE: { currency: "EUR", timezones: ["Europe/Brussels"] },
  IE: { currency: "EUR", timezones: ["Europe/Dublin"] },
  CH: { currency: "CHF", timezones: ["Europe/Zurich"] },
  GB: { currency: "GBP", timezones: ["Europe/London"] },
};

export interface SignupRegion {
  default_country: string;
  timezone: string;
  currency: string;
}

const FALLBACK_COUNTRY = "CO";

export function getBrowserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function tzBelongsTo(region: RegionInfo, tz: string): boolean {
  return region.timezones.includes(tz) || !!region.tzPrefix?.some((p) => tz.startsWith(p));
}

/** País según la zona horaria del navegador (null si no está en el catálogo). */
export function countryFromBrowserTimezone(): string | null {
  const tz = getBrowserTimezone();
  if (!tz) return null;
  for (const [country, region] of Object.entries(REGIONS)) {
    if (tzBelongsTo(region, tz)) return country;
  }
  return null;
}

/** País inicial del selector de teléfono en el registro. */
export function detectSignupCountry(): string {
  return countryFromBrowserTimezone() ?? FALLBACK_COUNTRY;
}

/** Configuración regional para un país (normalmente el del teléfono). */
export function resolveSignupRegion(country: string | null | undefined): SignupRegion {
  const code = (country || detectSignupCountry()).toUpperCase();
  const browserTz = getBrowserTimezone();
  const region = REGIONS[code];

  if (!region) {
    return { default_country: code, timezone: browserTz || "America/Bogota", currency: "USD" };
  }
  const timezone = browserTz && tzBelongsTo(region, browserTz) ? browserTz : region.timezones[0];
  return { default_country: code, timezone, currency: region.currency };
}
