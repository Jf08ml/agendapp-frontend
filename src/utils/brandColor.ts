import { darken, lighten, luminance } from "@mantine/core";

// Luminancia relativa de los fondos sobre los que se pinta el color de marca
// como texto/borde: blanco (tema claro) y dark-7 de Mantine (#1f1f1f, tema oscuro).
const LIGHT_BG_LUMINANCE = 1;
const DARK_BG_LUMINANCE = 0.0137;

// WCAG AA para texto normal
const MIN_CONTRAST = 4.5;

const contrastRatio = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * Variante del color de marca legible como texto (o borde) sobre el fondo del
 * tema. Los negocios con marca muy clara (amarillo, rosa pastel) en tema claro
 * — o muy oscura en tema oscuro — quedarían ilegibles con el color tal cual:
 * se oscurece/aclara de a poco hasta alcanzar contraste AA. Un color que ya es
 * legible se devuelve sin cambios, así que las marcas normales no se alteran.
 */
export function getReadableBrandColor(
  hex: string,
  scheme: "light" | "dark" = "light"
): string {
  const bg = scheme === "light" ? LIGHT_BG_LUMINANCE : DARK_BG_LUMINANCE;
  const adjust = scheme === "light" ? darken : lighten;

  let color = hex;
  for (let step = 1; step <= 20; step++) {
    if (contrastRatio(luminance(color), bg) >= MIN_CONTRAST) return color;
    color = adjust(hex, step * 0.05);
  }
  return color;
}
