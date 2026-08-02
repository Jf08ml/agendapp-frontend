// Matemática de progreso de fidelidad (niveles/legacy), extraída de la misma
// lógica ya probada en pages/loyalty/LoyaltyPlan.tsx, para no duplicarla
// entre esa página pública y el resumen compacto del admin.

export interface LoyaltyTier {
  threshold: number;
  reward: string;
}

export interface LoyaltyProgress {
  configured: boolean; // false = no hay niveles ni umbral legacy configurado
  tiers: LoyaltyTier[]; // normalizado ascendente; [] cuando !configured
  count: number;
  maxThreshold: number; // 0 cuando !configured
  progressPct: number; // 0-100
  nextTier: LoyaltyTier | null;
  remaining: number; // 0 cuando no hay nextTier
  allCompleted: boolean;
}

export function getLoyaltyProgress(
  count: number,
  tiers?: LoyaltyTier[],
  legacyThreshold?: number,
  legacyReward?: string
): LoyaltyProgress {
  const normalized: LoyaltyTier[] =
    tiers && tiers.length > 0
      ? [...tiers].sort((a, b) => a.threshold - b.threshold)
      : legacyThreshold && legacyThreshold > 0
        ? [{ threshold: legacyThreshold, reward: legacyReward || "" }]
        : [];

  if (normalized.length === 0) {
    return {
      configured: false,
      tiers: [],
      count,
      maxThreshold: 0,
      progressPct: 0,
      nextTier: null,
      remaining: 0,
      allCompleted: false,
    };
  }

  const maxThreshold = normalized[normalized.length - 1].threshold;
  const nextTier = normalized.find((t) => count < t.threshold) ?? null;
  const progressPct = maxThreshold > 0 ? Math.min(100, (count / maxThreshold) * 100) : 0;
  const remaining = nextTier ? Math.max(nextTier.threshold - count, 0) : 0;

  return {
    configured: true,
    tiers: normalized,
    count,
    maxThreshold,
    progressPct,
    nextTier,
    remaining,
    allCompleted: !nextTier,
  };
}
