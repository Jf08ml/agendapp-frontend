/**
 * countryHelper.ts — Helpers de país para componentes de UI.
 * Soporta todos los países disponibles en libphonenumber-js (~250).
 */
import { getAllCountries, isoToFlag } from "./geoData";

export const getCountryInfo = (
  countryCode?: string | null
): { name: string; flag: string; code: string } | null => {
  if (!countryCode) return null;
  const data = getAllCountries().find(
    (c) => c.value === countryCode.toUpperCase()
  );
  if (!data) return null;
  return { name: data.name, flag: data.flag, code: data.callingCode };
};

export const getCountryFlag = (countryCode?: string | null): string => {
  if (!countryCode) return "🌍";
  return isoToFlag(countryCode.toUpperCase());
};

export const getCountryName = (countryCode?: string | null): string => {
  if (!countryCode) return "Desconocido";
  const data = getAllCountries().find(
    (c) => c.value === countryCode.toUpperCase()
  );
  return data?.name ?? countryCode;
};
