// Mapeo de códigos de país ISO2 a información del país
export const COUNTRY_INFO: Record<string, { name: string; flag: string; code: string }> = {
  CO: { name: "Colombia", flag: "🇨🇴", code: "+57" },
  MX: { name: "México", flag: "🇲🇽", code: "+52" },
  PE: { name: "Perú", flag: "🇵🇪", code: "+51" },
  EC: { name: "Ecuador", flag: "🇪🇨", code: "+593" },
  VE: { name: "Venezuela", flag: "🇻🇪", code: "+58" },
  PA: { name: "Panamá", flag: "🇵🇦", code: "+507" },
  CR: { name: "Costa Rica", flag: "🇨🇷", code: "+506" },
  CL: { name: "Chile", flag: "🇨🇱", code: "+56" },
  AR: { name: "Argentina", flag: "🇦🇷", code: "+54" },
  BR: { name: "Brasil", flag: "🇧🇷", code: "+55" },
  US: { name: "Estados Unidos", flag: "🇺🇸", code: "+1" },
  CA: { name: "Canadá", flag: "🇨🇦", code: "+1" },
  SV: { name: "El Salvador", flag: "🇸🇻", code: "+503" },
  ES: { name: "España", flag: "🇪🇸", code: "+34" },
};

export const getCountryInfo = (countryCode?: string | null) => {
  if (!countryCode) return null;
  return COUNTRY_INFO[countryCode.toUpperCase()] || null;
};

export const getCountryFlag = (countryCode?: string | null) => {
  const info = getCountryInfo(countryCode);
  return info?.flag || "🌍";
};

export const getCountryName = (countryCode?: string | null) => {
  const info = getCountryInfo(countryCode);
  return info?.name || "Desconocido";
};
