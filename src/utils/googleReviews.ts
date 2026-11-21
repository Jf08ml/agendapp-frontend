// Enlaces del perfil de Google del negocio (Mi negocio → Ubicación).
// Sin imports a propósito: se prueba con `node --test` (ver tests/).

/** Place ID de Google: letras, números, "_" y "-" (mismo criterio que el backend). */
export function isValidPlaceId(placeId: string | null | undefined): boolean {
  return typeof placeId === "string" && /^[A-Za-z0-9_-]{10,300}$/.test(placeId.trim());
}

/** Abre directamente el formulario para dejar una reseña del negocio. */
export function googleReviewUrl(placeId: string | null | undefined): string | null {
  if (!isValidPlaceId(placeId)) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId!.trim())}`;
}

/** Ficha del negocio en Google Maps. */
export function googleMapsPlaceUrl(placeId: string | null | undefined): string | null {
  if (!isValidPlaceId(placeId)) return null;
  return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId!.trim())}`;
}
