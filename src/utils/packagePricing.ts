// Precio por sesión de los paquetes con niveles (design system, PaquetesPublico
// · Fase 2): cuánto sale cada sesión y cuánto ahorra el nivel más conveniente
// frente al más caro por sesión. Solo frontend. Módulo puro para `node --test`.

export interface TierLike {
  price: number;
  sessionsIncluded?: number;
  courtesySessions?: number;
}

/** Sesiones del nivel (incluidas + cortesía). */
export const tierSessions = (t: TierLike) => (t.sessionsIncluded || 0) + (t.courtesySessions || 0);

/** Precio por sesión del nivel, o null si no tiene sesiones. */
export function perSession(t: TierLike): number | null {
  const n = tierSessions(t);
  return n > 0 ? t.price / n : null;
}

/**
 * Resumen del paquete: precio por sesión más bajo y «ahorra hasta N %»
 * (0 si hay un solo nivel o todos salen igual).
 */
export function packageSavings(tiers: TierLike[] | undefined): { minPerSession: number | null; upTo: number } {
  const values = (tiers || []).map(perSession).filter((v): v is number => v !== null && v > 0);
  if (values.length === 0) return { minPerSession: null, upTo: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { minPerSession: min, upTo: max > 0 ? Math.round((1 - min / max) * 100) : 0 };
}
