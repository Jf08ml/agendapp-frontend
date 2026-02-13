/**
 * Mapeo de países a sus zonas horarias válidas (IANA timezone)
 * Fuente: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 * 
 * Un país puede tener múltiples zonas horarias (ej: México, Canadá, USA)
 */

export type CountryCode = "CO" | "MX" | "PE" | "EC" | "VE" | "PA" | "CL" | "AR" | "BR" | "US" | "CA" | "ES" | "SV" | "CR" | "UY";

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string; // Para referencia del usuario
}

export const TIMEZONES_BY_COUNTRY: Record<CountryCode, TimezoneOption[]> = {
  CO: [
    { value: "America/Bogota", label: "🇨🇴 Colombia (Bogotá, Medellín, Cali)", offset: "UTC-5" },
  ],

  MX: [
    { value: "America/Mexico_City", label: "🇲🇽 México Centro (CDMX, Puebla, Veracruz)", offset: "UTC-6" },
    { value: "America/Cancun", label: "🇲🇽 México Caribe (Cancún, Quintana Roo)", offset: "UTC-5" },
    { value: "America/Chihuahua", label: "🇲🇽 México Noroeste (Chihuahua, Durango)", offset: "UTC-7" },
    { value: "America/Tijuana", label: "🇲🇽 México Pacífico (Baja California)", offset: "UTC-8" },
  ],

  PE: [
    { value: "America/Lima", label: "🇵🇪 Perú (Lima, Arequipa, Cusco)", offset: "UTC-5" },
  ],

  EC: [
    { value: "America/Guayaquil", label: "🇪🇨 Ecuador (Quito, Guayaquil)", offset: "UTC-5" },
  ],

  VE: [
    { value: "America/Caracas", label: "🇻🇪 Venezuela (Caracas, Valencia)", offset: "UTC-4" },
  ],

  PA: [
    { value: "America/Panama", label: "🇵🇦 Panamá (Panamá City, Colón)", offset: "UTC-5" },
  ],

  CL: [
    { value: "America/Santiago", label: "🇨🇱 Chile (Santiago, Valparaíso)", offset: "UTC-3" },
    { value: "America/Punta_Arenas", label: "🇨🇱 Chile Austral (Magallanes)", offset: "UTC-3" },
  ],

  AR: [
    { value: "America/Argentina/Buenos_Aires", label: "🇦🇷 Argentina (Buenos Aires, La Plata)", offset: "UTC-3" },
    { value: "America/Argentina/Mendoza", label: "🇦🇷 Argentina Occidental (Mendoza, San Juan)", offset: "UTC-3" },
  ],

  BR: [
    { value: "America/Sao_Paulo", label: "🇧🇷 Brasil (São Paulo, Río de Janeiro)", offset: "UTC-3" },
    { value: "America/Bahia", label: "🇧🇷 Brasil Bahía (Salvador, Recife)", offset: "UTC-3" },
    { value: "America/Manaus", label: "🇧🇷 Brasil Amazonas (Manaus)", offset: "UTC-4" },
  ],

  US: [
    { value: "America/New_York", label: "🇺🇸 USA Este (Nueva York, Boston, Miami)", offset: "UTC-5" },
    { value: "America/Chicago", label: "🇺🇸 USA Central (Chicago, Dallas, Houston)", offset: "UTC-6" },
    { value: "America/Denver", label: "🇺🇸 USA Montaña (Denver, Phoenix)", offset: "UTC-7" },
    { value: "America/Los_Angeles", label: "🇺🇸 USA Pacífico (Los Ángeles, Seattle)", offset: "UTC-8" },
    { value: "America/Anchorage", label: "🇺🇸 USA Alaska (Anchorage)", offset: "UTC-9" },
  ],

  CA: [
    { value: "America/Toronto", label: "🇨🇦 Canadá Este (Toronto, Montreal, Ottawa)", offset: "UTC-5" },
    { value: "America/Edmonton", label: "🇨🇦 Canadá Centro (Calgary, Edmonton)", offset: "UTC-7" },
    { value: "America/Vancouver", label: "🇨🇦 Canadá Pacífico (Vancouver, Victoria)", offset: "UTC-8" },
  ],

  ES: [
    { value: "Europe/Madrid", label: "🇪🇸 España Peninsular (Madrid, Barcelona, Valencia)", offset: "UTC+1" },
    { value: "Atlantic/Canary", label: "🇪🇸 España Canarias (Las Palmas, Tenerife)", offset: "UTC+0" },
  ],

  SV: [
    { value: "America/El_Salvador", label: "🇸🇻 El Salvador (San Salvador)", offset: "UTC-6" },
  ],

  CR: [
    { value: "America/Costa_Rica", label: "🇨🇷 Costa Rica (San José, Alajuela)", offset: "UTC-6" },
  ],

  UY: [
    { value: "America/Montevideo", label: "🇺🇾 Uruguay (Montevideo)", offset: "UTC-3" },
  ],
};

/**
 * Retorna el timezoneOffset estimado basado en IANA timezone
 * Nota: Los offsets pueden variar en períodos DST
 */
export function getTimezoneOffset(timezone: string): string {
  // Búsqueda en todos los países
  for (const country of Object.values(TIMEZONES_BY_COUNTRY)) {
    const tz = country.find(t => t.value === timezone);
    if (tz) return tz.offset;
  }
  return "UTC±0";
}

/**
 * Obtiene todas las zonas horarias disponibles (para casos donde no se selecciona país)
 */
export function getAllTimezones(): TimezoneOption[] {
  const all: TimezoneOption[] = [];
  for (const country of Object.values(TIMEZONES_BY_COUNTRY)) {
    all.push(...country);
  }
  // Remover duplicados
  const seen = new Set<string>();
  return all.filter(tz => {
    if (seen.has(tz.value)) return false;
    seen.add(tz.value);
    return true;
  });
}
