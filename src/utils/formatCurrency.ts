/**
 * Mapeo de monedas conocidas a su locale regional más adecuado.
 * Para monedas no listadas se usa el locale del navegador como fallback.
 */
const LOCALE_BY_CURRENCY: Record<string, string> = {
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
  UYU: "es-UY",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
  AUD: "en-AU",
  CHF: "de-CH",
  INR: "hi-IN",
  MYR: "ms-MY",
  PHP: "fil-PH",
  SGD: "en-SG",
  ZAR: "en-ZA",
  KRW: "ko-KR",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  NZD: "en-NZ",
  HKD: "zh-HK",
  TWD: "zh-TW",
  THB: "th-TH",
  IDR: "id-ID",
  TRY: "tr-TR",
  RUB: "ru-RU",
  PLN: "pl-PL",
  CZK: "cs-CZ",
  HUF: "hu-HU",
  ILS: "he-IL",
  SAR: "ar-SA",
  AED: "ar-AE",
  EGP: "ar-EG",
  NGN: "en-NG",
  KES: "en-KE",
  GHS: "en-GH",
};

const getBrowserLocale = () =>
  typeof navigator !== "undefined" ? navigator.language : "en-US";

export const formatCurrency = (
  value: number,
  currency: string = "COP",
  locale?: string
) => {
  const loc = locale ?? LOCALE_BY_CURRENCY[currency] ?? getBrowserLocale();
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
