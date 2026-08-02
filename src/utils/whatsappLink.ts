// Construye un link de WhatsApp (wa.me/...) con un mensaje prellenado opcional,
// respetando si la URL configurada por la organización ya trae query string.
export function buildWhatsappQuoteLink(
  whatsappUrl: string,
  message?: string | null
): string {
  if (!message) return whatsappUrl;
  const separator = whatsappUrl.includes("?") ? "&" : "?";
  return `${whatsappUrl}${separator}text=${encodeURIComponent(message)}`;
}
