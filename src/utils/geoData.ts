/**
 * geoData.ts — Listas completas de países, zonas horarias y monedas.
 *
 * Fuentes:
 *  - Países y códigos telefónicos: libphonenumber-js (~250 países)
 *  - Nombres de países/monedas:    Intl.DisplayNames (nativo del navegador, en español)
 *  - Zonas horarias:               Intl.supportedValuesOf('timeZone') (~600 zonas IANA)
 *  - Monedas:                      Intl.supportedValuesOf('currency') (~300 ISO 4217)
 *
 * Todas las listas están memoizadas (se calculan una sola vez).
 */

import {
  getCountries,
  getCountryCallingCode as libGetCallingCode,
  type CountryCode,
} from "libphonenumber-js";

// ─── Flag emoji ───────────────────────────────────────────────────────────────
/**
 * Genera el emoji de bandera a partir de un código ISO-3166-1 alpha-2.
 * Funciona sumando los desplazamientos de los Regional Indicator Symbols.
 */
export const isoToFlag = (isoCode: string): string => {
  try {
    return Array.from(isoCode.toUpperCase())
      .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
      .join("");
  } catch {
    return "🌍";
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CountrySelectOption {
  value: string;
  label: string; // "🇨🇴 Colombia"
  name: string;
  flag: string;
  callingCode: string; // "+57"
}

export interface TimezoneSelectOption {
  value: string; // IANA, e.g. "America/Bogota"
  label: string; // "America/Bogota (GMT-5)"
  offset: string; // "GMT-5"
}

export interface CurrencySelectOption {
  value: string; // ISO 4217, e.g. "COP"
  label: string; // "COP - Peso colombiano"
  name: string;
}

// ─── Intl helpers (created once at module level) ─────────────────────────────
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const currencyDisplay = new Intl.DisplayNames(["es"], { type: "currency" });

// ─── Countries ────────────────────────────────────────────────────────────────
let _countries: CountrySelectOption[] | null = null;

/**
 * Devuelve todos los países soportados por libphonenumber-js (~250),
 * con nombre en español, bandera y código telefónico.
 * Ordenados alfabéticamente en español.
 */
export const getAllCountries = (): CountrySelectOption[] => {
  if (_countries) return _countries;

  _countries = getCountries()
    .map((code) => {
      const name = (() => {
        try {
          return regionNames.of(code) ?? code;
        } catch {
          return code;
        }
      })();
      const callingCode = (() => {
        try {
          return `+${libGetCallingCode(code as CountryCode)}`;
        } catch {
          return "";
        }
      })();
      const flag = isoToFlag(code);
      return {
        value: code as string,
        label: `${flag} ${name}`,
        name,
        flag,
        callingCode,
      };
    })
    // Filtrar los que Intl.DisplayNames no pudo resolver (devuelve el código mismo)
    .filter((c) => c.name !== c.value)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return _countries;
};

/**
 * Busca la información de un país por código ISO2.
 */
export const getCountryData = (code: string): CountrySelectOption | undefined =>
  getAllCountries().find((c) => c.value === code.toUpperCase());

// ─── Timezones ────────────────────────────────────────────────────────────────
let _timezones: TimezoneSelectOption[] | null = null;

const resolveOffset = (tz: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
  } catch {
    return "UTC";
  }
};

/** Fallback mínimo para navegadores sin Intl.supportedValuesOf */
const TIMEZONE_FALLBACK: TimezoneSelectOption[] = [
  { value: "America/Bogota", label: "America/Bogota", offset: "GMT-5" },
  { value: "America/Mexico_City", label: "America/Mexico City", offset: "GMT-6" },
  { value: "America/Lima", label: "America/Lima", offset: "GMT-5" },
  { value: "America/New_York", label: "America/New York", offset: "GMT-5" },
  { value: "America/Chicago", label: "America/Chicago", offset: "GMT-6" },
  { value: "America/Los_Angeles", label: "America/Los Angeles", offset: "GMT-8" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo", offset: "GMT-3" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Argentina/Buenos Aires", offset: "GMT-3" },
  { value: "America/Santiago", label: "America/Santiago", offset: "GMT-3" },
  { value: "America/Caracas", label: "America/Caracas", offset: "GMT-4" },
  { value: "America/Panama", label: "America/Panama", offset: "GMT-5" },
  { value: "America/Costa_Rica", label: "America/Costa Rica", offset: "GMT-6" },
  { value: "America/El_Salvador", label: "America/El Salvador", offset: "GMT-6" },
  { value: "America/Montevideo", label: "America/Montevideo", offset: "GMT-3" },
  { value: "America/Toronto", label: "America/Toronto", offset: "GMT-5" },
  { value: "America/Vancouver", label: "America/Vancouver", offset: "GMT-8" },
  { value: "Europe/Madrid", label: "Europe/Madrid", offset: "GMT+1" },
  { value: "Europe/London", label: "Europe/London", offset: "GMT+0" },
  { value: "Europe/Paris", label: "Europe/Paris", offset: "GMT+1" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo", offset: "GMT+9" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai", offset: "GMT+8" },
  { value: "Australia/Sydney", label: "Australia/Sydney", offset: "GMT+11" },
];

/**
 * Devuelve todas las zonas horarias IANA (~600) con su offset UTC actual.
 * Usa Intl.supportedValuesOf si está disponible; de lo contrario, fallback básico.
 */
export const getAllTimezones = (): TimezoneSelectOption[] => {
  if (_timezones) return _timezones;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zones = (Intl as any).supportedValuesOf("timeZone") as string[];
    _timezones = zones.map((tz) => {
      const offset = resolveOffset(tz);
      return {
        value: tz,
        label: `${tz.replace(/_/g, " ")} (${offset})`,
        offset,
      };
    });
  } catch {
    _timezones = TIMEZONE_FALLBACK;
  }

  return _timezones;
};

// ─── Currencies ───────────────────────────────────────────────────────────────
let _currencies: CurrencySelectOption[] | null = null;

/** Fallback mínimo para navegadores sin Intl.supportedValuesOf */
const CURRENCY_FALLBACK: CurrencySelectOption[] = [
  { value: "ARS", label: "ARS - Peso argentino", name: "Peso argentino" },
  { value: "BRL", label: "BRL - Real brasileño", name: "Real brasileño" },
  { value: "CAD", label: "CAD - Dólar canadiense", name: "Dólar canadiense" },
  { value: "CLP", label: "CLP - Peso chileno", name: "Peso chileno" },
  { value: "COP", label: "COP - Peso colombiano", name: "Peso colombiano" },
  { value: "CRC", label: "CRC - Colón costarricense", name: "Colón costarricense" },
  { value: "EUR", label: "EUR - Euro", name: "Euro" },
  { value: "GBP", label: "GBP - Libra esterlina", name: "Libra esterlina" },
  { value: "MXN", label: "MXN - Peso mexicano", name: "Peso mexicano" },
  { value: "PAB", label: "PAB - Balboa panameño", name: "Balboa panameño" },
  { value: "PEN", label: "PEN - Sol peruano", name: "Sol peruano" },
  { value: "USD", label: "USD - Dólar americano", name: "Dólar americano" },
  { value: "UYU", label: "UYU - Peso uruguayo", name: "Peso uruguayo" },
  { value: "VES", label: "VES - Bolívar venezolano", name: "Bolívar venezolano" },
];

/**
 * Devuelve todas las monedas ISO 4217 (~300) con nombre en español.
 * Usa Intl.supportedValuesOf si está disponible; de lo contrario, fallback básico.
 */
export const getAllCurrencies = (): CurrencySelectOption[] => {
  if (_currencies) return _currencies;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const codes = (Intl as any).supportedValuesOf("currency") as string[];
    _currencies = codes
      .map((code) => {
        const name = (() => {
          try {
            return currencyDisplay.of(code) ?? code;
          } catch {
            return code;
          }
        })();
        return { value: code, label: `${code} - ${name}`, name };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  } catch {
    _currencies = CURRENCY_FALLBACK;
  }

  return _currencies;
};
