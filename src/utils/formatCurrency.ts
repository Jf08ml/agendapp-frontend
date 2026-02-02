const DEFAULT_LOCALE_BY_CURRENCY: Record<string, string> = {
  COP: "es-CO",
  MXN: "es-MX",
  USD: "en-US",
  EUR: "es-ES",
  CLP: "es-CL",
  CRC: "es-CR",
  ARS: "es-AR",
  BRL: "pt-BR",
  PEN: "es-PE",
  VES: "es-VE",
  PAB: "es-PA",
  CAD: "en-CA",
};

export const formatCurrency = (
  value: number,
  currency: string = "COP",
  locale?: string
) => {
  const loc = locale || DEFAULT_LOCALE_BY_CURRENCY[currency] || "es-CO";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
