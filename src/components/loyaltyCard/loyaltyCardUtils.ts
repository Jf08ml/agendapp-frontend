// Utilidades de la tarjeta virtual de fidelidad (colores, plantillas, niveles).
import type React from "react";
import type { LoyaltyCardTemplate, LoyaltyTier } from "../../services/loyaltyCardService";

// ── Colores ───────────────────────────────────────────────────────────────
export const FALLBACK_COLOR = "#7048e8";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mezcla `hex` con blanco (amount > 0) o negro (amount < 0). amount en [-1, 1]. */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex) ?? parseHex(FALLBACK_COLOR)!;
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  const out = rgb.map((c) => Math.round(c + (target - c) * a));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Rota el tono del color (para el degradado de la plantilla "gradient"). */
function rotateHue(hex: string, degrees: number): string {
  const rgb = parseHex(hex) ?? parseHex(FALLBACK_COLOR)!;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// ── Plantillas ────────────────────────────────────────────────────────────
export const CARD_TEMPLATES: { value: LoyaltyCardTemplate; label: string; defaultText: "light" | "dark" }[] = [
  { value: "classic", label: "Clásica", defaultText: "light" },
  { value: "gradient", label: "Degradado", defaultText: "light" },
  { value: "dark", label: "Premium oscura", defaultText: "light" },
  { value: "pastel", label: "Pastel", defaultText: "dark" },
  { value: "minimal", label: "Minimalista", defaultText: "dark" },
  { value: "image", label: "Con imagen", defaultText: "light" },
];

export function cardBackground(template: LoyaltyCardTemplate, color: string, imageUrl?: string | null): React.CSSProperties {
  switch (template) {
    case "gradient":
      return { background: `linear-gradient(135deg, ${color} 0%, ${rotateHue(color, 45)} 100%)` };
    case "dark":
      return { background: `linear-gradient(145deg, #1a1b1e 0%, #2c2e33 60%, ${shade(color, -0.55)} 100%)` };
    case "pastel":
      return { background: `linear-gradient(135deg, ${shade(color, 0.82)} 0%, ${shade(color, 0.65)} 100%)` };
    case "minimal":
      return { background: "#ffffff", border: `1.5px solid ${shade(color, 0.6)}` };
    case "image":
      if (imageUrl) {
        return {
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%), url("${imageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        };
      }
      return { background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -0.35)} 100%)` };
    case "classic":
    default:
      return { background: `linear-gradient(135deg, ${color} 0%, ${shade(color, -0.35)} 100%)` };
  }
}

/** Niveles ordenados; soporta la config legacy de un solo nivel. */
export function normalizeTiers(tiers?: LoyaltyTier[], legacyCount?: number, legacyReward?: string): LoyaltyTier[] {
  if (tiers && tiers.length > 0) return [...tiers].filter((t) => t.threshold > 0).sort((a, b) => a.threshold - b.threshold);
  if (legacyCount && legacyCount > 0) return [{ threshold: legacyCount, reward: legacyReward || "" }];
  return [];
}

