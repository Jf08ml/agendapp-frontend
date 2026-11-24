// Plantillas de la página de inicio (design system, AjustesWeb y
// ConfiguracionInicial · Fase 2): tres tarjetas en lugar de cinco diseños.
//   Esencial → minimal (todos los planes; modern, minimal y cards ya se ven igual)
//   Estudio  → landing (Pro)
//   Academia → academy (Pro)
// Módulo puro para `node --test`.

export type HomeLayout = "modern" | "minimal" | "cards" | "landing" | "academy";
export type HomeTemplate = "essential" | "studio" | "academy";

export interface TemplateInfo {
  id: HomeTemplate;
  label: string;
  description: string;
  pro: boolean;
}

export const HOME_TEMPLATES: TemplateInfo[] = [
  { id: "essential", label: "Esencial", description: "Tu logo, tus servicios, horario y ubicación. Clara y rápida.", pro: false },
  { id: "studio", label: "Estudio", description: "La más completa: portada a todo color, servicios destacados, equipo y opiniones.", pro: true },
  { id: "academy", label: "Academia", description: "Para clases y programas: próximas clases e inscripción a la vista.", pro: true },
];

/** Plantilla que corresponde al diseño guardado. */
export function templateOf(layout: string | null | undefined): HomeTemplate {
  if (layout === "landing") return "studio";
  if (layout === "academy") return "academy";
  return "essential";
}

/**
 * Diseño a guardar al elegir una plantilla. Esencial conserva modern/minimal/
 * cards si ya estaba en uno de ellos (se ven igual), para no cambiar datos sin
 * motivo.
 */
export function layoutFor(template: HomeTemplate, current?: string | null): HomeLayout {
  if (template === "studio") return "landing";
  if (template === "academy") return "academy";
  return current === "modern" || current === "minimal" || current === "cards" ? current : "minimal";
}

/** ¿El plan permite esta plantilla? (Estudio y Academia: `professionalLanding`). */
export function templateAllowed(template: HomeTemplate, professionalLanding: boolean | undefined): boolean {
  return !HOME_TEMPLATES.find((t) => t.id === template)?.pro || professionalLanding !== false;
}

// ── Temporada: cuenta regresiva ─────────────────────────────────────────────

/**
 * Días hasta el inicio de la temporada navideña (1 de diciembre) o hasta su
 * fin (6 de enero), según el día de `now` (en la zona del negocio ya resuelta
 * en `month`/`day`/`year`).
 */
export function christmasCountdown(year: number, month: number, day: number): { active: boolean; days: number; text: string } {
  const today = Date.UTC(year, month - 1, day);
  const DAY = 86400000;
  const inSeason = month === 12 || (month === 1 && day <= 6);
  if (inSeason) {
    const endYear = month === 12 ? year + 1 : year;
    const days = Math.round((Date.UTC(endYear, 0, 6) - today) / DAY);
    return {
      active: true,
      days,
      text: days === 0 ? "Hoy es el último día de la temporada." : `Se ve en tu web ${days === 1 ? "1 día más" : `${days} días más`} (hasta el 6 de enero).`,
    };
  }
  const days = Math.round((Date.UTC(year, 11, 1) - today) / DAY);
  return {
    active: false,
    days,
    text: days === 1 ? "Empieza mañana (1 de diciembre)." : `Empieza en ${days} días (1 de diciembre).`,
  };
}
