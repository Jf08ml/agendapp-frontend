/* eslint-disable no-useless-escape */
// utils/campaignValidations.ts

/**
 * Normaliza un número de teléfono al formato E.164 con '+'
 * Acepta números con código de país y números locales
 * Retorna null si el número es inválido
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // 1. Remover espacios, guiones, paréntesis y otros caracteres especiales
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  // 2. Si empieza con '+', mantenerlo
  const hasPlus = cleaned.startsWith("+");
  if (hasPlus) {
    cleaned = cleaned.slice(1);
  }

  // 3. Si empieza con '00', convertir a '+'
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  // 4. Validar que solo contenga dígitos
  if (!/^\d+$/.test(cleaned)) {
    return null; // ❌ Inválido
  }

  // 5. Validar longitud E.164 (10-15 dígitos sin el +)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null; // ❌ Inválido
  }

  // 6. Retornar con el símbolo '+' (formato E.164 completo)
  return `+${cleaned}`; // ✅ Ejemplo: "+573001234567"
}

/**
 * Deduplica un array de teléfonos
 */
export function deduplicatePhones(phones: string[]): {
  unique: string[];
  duplicates: string[];
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  const duplicates: string[] = [];

  for (const phone of phones) {
    if (seen.has(phone)) {
      duplicates.push(phone);
    } else {
      seen.add(phone);
      unique.push(phone);
    }
  }

  return { unique, duplicates };
}

/**
 * Valida una lista de teléfonos y retorna detalles de validación
 */
export function validatePhoneList(phones: string[]): {
  normalized: string[];
  invalid: string[];
  duplicates: string[];
} {
  const normalized: string[] = [];
  const invalid: string[] = [];

  for (const phone of phones) {
    const clean = normalizePhone(phone);

    if (!clean) {
      invalid.push(phone);
    } else {
      normalized.push(clean);
    }
  }

  const { unique, duplicates } = deduplicatePhones(normalized);

  return {
    normalized: unique,
    invalid,
    duplicates,
  };
}

/**
 * Parsea texto con múltiples teléfonos (separados por comas, saltos de línea, etc.)
 */
export function parsePhoneText(text: string): string[] {
  if (!text.trim()) return [];

  // Separar por comas, saltos de línea, punto y coma
  const phones = text
    .split(/[,;\n\r]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return phones;
}

/**
 * Formatea un número para mostrar (añade espacios o guiones para legibilidad)
 * Ejemplo: +573001234567 → +57 300 123 4567
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";

  // Asegurar que tiene el '+'
  const formatted = phone.startsWith("+") ? phone : `+${phone}`;

  // Si es un número colombiano (+57XXXXXXXXXX)
  if (formatted.startsWith("+57") && formatted.length === 13) {
    return `+57 ${formatted.slice(3, 6)} ${formatted.slice(6, 9)} ${formatted.slice(9)}`;
  }

  // Si es un número mexicano (+521XXXXXXXXXX)
  if (formatted.startsWith("+521") && formatted.length === 14) {
    return `+52 1 ${formatted.slice(4, 7)} ${formatted.slice(7, 10)} ${formatted.slice(10)}`;
  }

  // Si es un número mexicano sin el 1 (+52XXXXXXXXXX)
  if (formatted.startsWith("+52") && formatted.length === 13) {
    return `+52 ${formatted.slice(3, 6)} ${formatted.slice(6, 9)} ${formatted.slice(9)}`;
  }

  // Formato genérico: mostrar tal cual está
  return formatted;
}

/**
 * Mensajes de error para validaciones
 */
export const ERROR_MESSAGES = {
  EMPTY_MESSAGE: "El mensaje no puede estar vacío",
  NO_RECIPIENTS: "Debes seleccionar al menos un destinatario",
  MESSAGE_TOO_LONG: "El mensaje no puede exceder 1000 caracteres",
  INVALID_IMAGE_URL: "La URL de la imagen no es válida",
  SESSION_NOT_CONNECTED: "La sesión de WhatsApp no está conectada",
  ALL_PHONES_INVALID: "Todos los teléfonos proporcionados son inválidos",
  NO_CONSENT: (count: number) =>
    `${count} contacto${count > 1 ? "s" : ""} no ${
      count > 1 ? "tienen" : "tiene"
    } opt-in. ¿Deseas omitirlo${count > 1 ? "s" : ""}?`,
  EMPTY_TITLE: "El título de la campaña es obligatorio",
};

/**
 * Valida datos de campaña antes de enviar
 */
export function validateCampaignData(data: {
  title: string;
  message: string;
  recipients: Array<{ phone: string; name?: string }>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push(ERROR_MESSAGES.EMPTY_TITLE);
  }

  if (!data.message || data.message.trim().length === 0) {
    errors.push(ERROR_MESSAGES.EMPTY_MESSAGE);
  }

  if (data.message.length > 1000) {
    errors.push(ERROR_MESSAGES.MESSAGE_TOO_LONG);
  }

  if (!data.recipients || data.recipients.length === 0) {
    errors.push(ERROR_MESSAGES.NO_RECIPIENTS);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Renderiza un mensaje con placeholders
 */
export function renderMessagePreview(
  template: string,
  data: { name?: string }
): string {
  let rendered = template;

  if (data.name) {
    rendered = rendered.replace(/\{\{name\}\}/g, data.name);
  }

  return rendered;
}

/**
 * Obtiene el estado de una campaña con emoji
 */
export function getCampaignStatusLabel(
  status: string
): { label: string; color: string; emoji: string } {
  switch (status) {
    case "draft":
      return { label: "Borrador", color: "gray", emoji: "📝" };
    case "dry-run":
      return { label: "Simulación", color: "orange", emoji: "🧪" };
    case "running":
      return { label: "En progreso", color: "blue", emoji: "🔄" };
    case "completed":
      return { label: "Completada", color: "green", emoji: "✅" };
    case "failed":
      return { label: "Fallida", color: "red", emoji: "❌" };
    case "cancelled":
      return { label: "Cancelada", color: "gray", emoji: "⛔" };
    default:
      return { label: "Desconocido", color: "gray", emoji: "❓" };
  }
}

/**
 * Calcula el porcentaje de progreso de una campaña
 */
export function calculateProgress(stats: {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}): number {
  if (stats.total === 0) return 0;

  const processed = stats.sent + stats.failed + stats.skipped;
  return Math.round((processed / stats.total) * 100);
}
