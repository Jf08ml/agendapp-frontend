/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/phoneUtils.ts
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

export interface PhoneValidationResult {
  phone_e164: string | null;
  phone_country: CountryCode | null;
  phone_national: string | null;
  calling_code: string | null;
  isValid: boolean;
  error: string | null;
}

/**
 * Normaliza un número de teléfono a formato E.164
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = "CO"
): PhoneValidationResult {
  if (!phone?.trim()) {
    return {
      phone_e164: null,
      phone_country: null,
      phone_national: null,
      calling_code: null,
      isValid: false,
      error: "Teléfono requerido",
    };
  }

  try {
    let cleanPhone = phone.trim().replace(/[^\d+]/g, "");

    // 🇸🇻 VALIDACIÓN TEMPRANA para El Salvador (7-8 dígitos)
    if (defaultCountry === "SV") {
      const digitsOnly = cleanPhone.replace(/[^\d]/g, "");
      // Si tiene exactamente 7 u 8 dígitos (sin código de país)
      if (digitsOnly.length === 7 || digitsOnly.length === 8) {
        const phoneE164 = `+503${digitsOnly}`;
        console.log("[normalizePhoneNumber] Número SV de 7-8 dígitos aceptado:", phoneE164);
        return {
          phone_e164: phoneE164,
          phone_country: "SV",
          phone_national: digitsOnly,
          calling_code: "503",
          isValid: true,
          error: null,
        };
      }
      // Si tiene +503 seguido de 7-8 dígitos
      if (
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 11 &&
        digitsOnly.startsWith("503")
      ) {
        const nationalNumber = digitsOnly.slice(3);
        if (nationalNumber.length === 7 || nationalNumber.length === 8) {
          const phoneE164 = `+${digitsOnly}`;
          console.log("[normalizePhoneNumber] Número SV con código aceptado:", phoneE164);
          return {
            phone_e164: phoneE164,
            phone_country: "SV",
            phone_national: nationalNumber,
            calling_code: "503",
            isValid: true,
            error: null,
          };
        }
      }
    }

    // Si empieza con 00, reemplazar por +
    if (cleanPhone.startsWith("00")) {
      cleanPhone = "+" + cleanPhone.slice(2);
    }

    // Si no tiene + y no parece internacional, añadir país por defecto
    if (!cleanPhone.startsWith("+") && !looksLikeInternational(cleanPhone)) {
      const code = getCallingCode(defaultCountry);
      cleanPhone = `+${code}${cleanPhone}`;
    }

    const isValid = isValidPhoneNumber(cleanPhone, defaultCountry);

    if (!isValid) {
      return {
        phone_e164: null,
        phone_country: null,
        phone_national: null,
        calling_code: null,
        isValid: false,
        error: "Número de teléfono inválido. Verifica el prefijo y la longitud.",
      };
    }

    const phoneNumber = parsePhoneNumber(cleanPhone, defaultCountry);

    return {
      phone_e164: phoneNumber.format("E.164"),
      phone_country: phoneNumber.country || null,
      phone_national: phoneNumber.formatNational(),
      calling_code: phoneNumber.countryCallingCode,
      isValid: true,
      error: null,
    };
  } catch (error) {
    console.error("[normalizePhoneNumber] Error:", error, "Input:", phone);

    // 🇸🇻 FALLBACK para El Salvador
    if (defaultCountry === "SV") {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length === 7 || digitsOnly.length === 8) {
        const phoneE164 = `+503${digitsOnly}`;
        console.log("[normalizePhoneNumber] Usando fallback SV:", phoneE164);
        return {
          phone_e164: phoneE164,
          phone_country: "SV",
          phone_national: digitsOnly,
          calling_code: "503",
          isValid: true,
          error: null,
        };
      }
      if (
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 11 &&
        digitsOnly.startsWith("503")
      ) {
        const nationalNumber = digitsOnly.slice(3);
        const phoneE164 = `+${digitsOnly}`;
        console.log("[normalizePhoneNumber] Usando fallback SV con código:", phoneE164);
        return {
          phone_e164: phoneE164,
          phone_country: "SV",
          phone_national: nationalNumber,
          calling_code: "503",
          isValid: true,
          error: null,
        };
      }
    }

    return {
      phone_e164: null,
      phone_country: null,
      phone_national: null,
      calling_code: null,
      isValid: false,
      error: "Formato de teléfono inválido",
    };
  }
}

/**
 * Detecta si un número parece internacional
 */
function looksLikeInternational(phone: string): boolean {
  return phone.length > 11;
}

/**
 * Obtiene el código de llamada para cualquier país usando libphonenumber-js.
 * Fallback a "57" (Colombia) si el código no es válido.
 */
function getCallingCode(countryCode: CountryCode): string {
  try {
    return getCountryCallingCode(countryCode);
  } catch {
    return "57";
  }
}

/**
 * Verifica si un código de país es válido según libphonenumber-js (~250 países).
 */
export function isValidCountryCode(code: string): code is CountryCode {
  return (getCountries() as string[]).includes(code);
}

/**
 * Detecta país por locale del navegador o zona horaria.
 * Funciona con cualquier código de país soportado por libphonenumber-js.
 */
export function detectUserCountry(): CountryCode {
  try {
    // 1. Por locale del navegador
    const locale = navigator.language || (navigator as any).userLanguage;
    if (locale) {
      const countryFromLocale = locale.split("-")[1]?.toUpperCase();
      if (countryFromLocale && isValidCountryCode(countryFromLocale)) {
        return countryFromLocale;
      }
    }

    // 2. Por zona horaria (heurística)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryFromTimezone = getCountryFromTimezone(timezone);
    if (countryFromTimezone) {
      return countryFromTimezone;
    }

    return "CO"; // Fallback
  } catch (error) {
    console.warn("[detectUserCountry] Error:", error);
    return "CO";
  }
}

/**
 * Mapa de zonas horarias comunes a país (heurística para detectUserCountry).
 * No necesita ser exhaustivo; es solo un fallback cuando el locale falla.
 */
function getCountryFromTimezone(timezone: string): CountryCode | null {
  const timezoneMap: Record<string, CountryCode> = {
    "America/Bogota": "CO",
    "America/Mexico_City": "MX",
    "America/Cancun": "MX",
    "America/Chihuahua": "MX",
    "America/Tijuana": "MX",
    "America/Lima": "PE",
    "America/Guayaquil": "EC",
    "America/Caracas": "VE",
    "America/Panama": "PA",
    "America/Costa_Rica": "CR",
    "America/El_Salvador": "SV",
    "America/Santiago": "CL",
    "America/Punta_Arenas": "CL",
    "America/Argentina/Buenos_Aires": "AR",
    "America/Argentina/Mendoza": "AR",
    "America/Sao_Paulo": "BR",
    "America/Bahia": "BR",
    "America/Manaus": "BR",
    "America/New_York": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Los_Angeles": "US",
    "America/Anchorage": "US",
    "America/Toronto": "CA",
    "America/Edmonton": "CA",
    "America/Vancouver": "CA",
    "America/Montevideo": "UY",
    "Europe/Madrid": "ES",
    "Atlantic/Canary": "ES",
    "Europe/London": "GB",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
    "Europe/Rome": "IT",
    "Europe/Lisbon": "PT",
    "Asia/Tokyo": "JP",
    "Asia/Shanghai": "CN",
    "Asia/Kolkata": "IN",
    "Australia/Sydney": "AU",
  };

  return timezoneMap[timezone] || null;
}

/**
 * Extrae el país del E.164 si es posible
 */
export function extractCountryFromE164(phone_e164: string): CountryCode | null {
  try {
    if (!phone_e164?.startsWith("+")) return null;
    const phoneNumber = parsePhoneNumber(phone_e164);
    return phoneNumber.country || null;
  } catch {
    return null;
  }
}

/**
 * Formatea un E.164 en formato internacional legible para cualquier país
 * (+34619332673 → "+34 619 33 26 73"). Si no se puede parsear, devuelve el original.
 */
export function formatPhoneInternational(phone_e164: string): string {
  if (!phone_e164) return "";
  try {
    return parsePhoneNumber(phone_e164).formatInternational();
  } catch {
    return phone_e164;
  }
}
