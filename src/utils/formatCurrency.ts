const DEFAULT_LOCALE_BY_CURRENCY: Record<string, string> = {
  COP: "es-CO",
  MXN: "es-MX",
  USD: "en-US",
  EUR: "es-ES",
  CLP: "es-CL",
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
