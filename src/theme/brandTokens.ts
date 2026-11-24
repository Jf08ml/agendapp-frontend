// Marca por negocio → tokens (design system, capítulo «Marca por negocio»).
//
// Módulo puro (sin React ni Mantine) para poder probarlo con `node --test`.
// Ningún componente debe leer `organization.branding.primaryColor`: todos usan
// var(--brand), var(--on-brand), var(--brand-text), var(--brand-soft) y
// var(--brand-accent), que AppWithBranding expone con cssVariablesResolver.

/** Azul AgenditApp: respaldo cuando el negocio no tiene color o su plan no
 *  incluye marca personalizada. */
export const DEFAULT_BRAND = "#1c3461";

// Superficies e ink de tokens.json (claro / oscuro).
const SURFACE = { light: "#ffffff", dark: "#0c0d10" } as const;
const SURFACE_HOVER = { light: "#f1f3f5", dark: "#1b1e23" } as const;
const INK = { light: "#1a1b1e", dark: "#f1f3f5" } as const;

/** WCAG AA para texto normal. */
const MIN_CONTRAST = 4.5;

type Scheme = "light" | "dark";
type Rgb = [number, number, number];

export type BrandScale = [string, string, string, string, string, string, string, string, string, string];

export interface BrandTokens {
  brand: string;
  "on-brand": string;
  "brand-text": string;
  "brand-soft": string;
  "brand-accent": string;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value.trim());
}

function parseHex(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mezcla `amount` (0–1) de `color` sobre `base`. */
export function mix(color: string, base: string, amount: number): string {
  const a = parseHex(color);
  const b = parseHex(base);
  return toHex([0, 1, 2].map((i) => b[i] + (a[i] - b[i]) * amount) as Rgb);
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Gris puro o casi (negro de Galaxia Glamour, grises): sin tono que suavizar. */
function isNeutral(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 24;
}

/**
 * La marca como texto o borde legible sobre `surface`: se oscurece (claro) o
 * aclara (oscuro) en pasos de 5 % hasta 4.5:1. Un color ya legible no cambia.
 */
export function readableBrandText(hex: string, scheme: Scheme): string {
  const surface = SURFACE[scheme];
  const target = scheme === "light" ? "#000000" : "#ffffff";
  let color = toHex(parseHex(hex));
  for (let step = 1; step <= 20 && contrast(color, surface) < MIN_CONTRAST; step++) {
    color = mix(target, hex, step * 0.05);
  }
  return color;
}

/** Texto sobre el relleno de marca: blanco o ink, el que contraste más. */
export function onBrandColor(brand: string, scheme: Scheme = "light"): string {
  const dark = scheme === "light" ? INK.light : SURFACE.dark;
  return contrast(brand, "#ffffff") >= contrast(brand, dark) ? "#ffffff" : dark;
}

/** Texto legible sobre un color cualquiera (p. ej. el de un profesional): si
 *  no es un hex (una variable CSS), blanco como antes. */
export function textOn(background: string | null | undefined): string {
  return isHexColor(background) ? onBrandColor(background) : "#ffffff";
}

/**
 * Escala de 10 tonos para Mantine (0 = más claro, 9 = más oscuro) con la marca
 * exacta en el índice 6 (`primaryShade`), así el botón `filled` usa el color
 * tal cual y el hover (índice 7) lo oscurece un poco.
 */
export function generateBrandScale(hex: string): BrandScale {
  const base = toHex(parseHex(hex));
  const tints = [0.1, 0.2, 0.34, 0.5, 0.66, 0.83];
  const shades = [0.12, 0.24, 0.36];
  return [
    ...tints.map((t) => mix(base, "#ffffff", t)),
    base,
    ...shades.map((s) => mix("#000000", base, s)),
  ] as BrandScale;
}

/** Color de marca efectivo: el del negocio si es un hex válido y su plan lo permite. */
export function resolveBrandColor(primaryColor: unknown, customBrandingAllowed = true): string {
  if (!customBrandingAllowed || !isHexColor(primaryColor)) return DEFAULT_BRAND;
  return toHex(parseHex(primaryColor));
}

/** Tokens de marca para un esquema de color. */
export function buildBrandTokens(primary: string, secondary: string | null | undefined, scheme: Scheme): BrandTokens {
  const surface = SURFACE[scheme];
  const neutral = isNeutral(primary);

  // En oscuro la marca se aclara hasta leerse sobre el fondo; una marca negra
  // o gris se invierte a ink para que el botón no desaparezca.
  const brand =
    scheme === "light"
      ? primary
      : neutral && luminance(primary) < 0.2
        ? INK.dark
        : contrast(primary, surface) >= 3
          ? primary
          : readableBrandText(primary, "dark");

  const brandText = scheme === "light" ? readableBrandText(primary, "light") : readableBrandText(brand, "dark");
  const brandSoft = neutral ? SURFACE_HOVER[scheme] : mix(brand, surface, scheme === "light" ? 0.1 : 0.15);
  const accent = isHexColor(secondary) ? toHex(parseHex(secondary)) : brand;

  return {
    brand,
    "on-brand": onBrandColor(brand, scheme),
    "brand-text": brandText,
    "brand-soft": brandSoft,
    "brand-accent": accent,
  };
}

/** Las mismas claves como variables CSS (`--brand`, `--on-brand`…). */
export function brandCssVariables(tokens: BrandTokens): Record<string, string> {
  return Object.fromEntries(Object.entries(tokens).map(([k, v]) => [`--${k}`, v]));
}
