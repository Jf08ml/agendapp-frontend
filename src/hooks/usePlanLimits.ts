// hooks/usePlanLimits.ts
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { getMyPlanInfo, type MyPlanInfo } from "../services/membershipService";

type PlanFeature =
  | "whatsappIntegration"
  | "autoReminders"
  | "autoConfirmations"
  | "servicePackages"
  | "campaignsWhatsapp"
  | "classesModule"
  | "loyaltyProgram"
  | "professionalLanding"
  | "customBranding"
  | "analyticsAdvanced";

const UPGRADE_MESSAGES: Record<string, string> = {
  campaignsWhatsapp: "Disponible en Plan Marca/Pro",
  classesModule: "Disponible en Plan Marca/Pro",
  servicePackages: "Disponible en Plan Marca/Pro",
  professionalLanding: "Disponible en Plan Marca/Pro",
  whatsappIntegration: "Disponible en Plan Esencial o superior",
  autoReminders: "Disponible en Plan Esencial o superior",
  autoConfirmations: "Disponible en Plan Esencial o superior",
  loyaltyProgram: "Disponible en Plan Starter o superior",
  maxEmployees: "Profesionales ilimitados desde Plan Starter",
  maxServices: "Servicios ilimitados desde Plan Starter",
};

export function usePlanLimits() {
  const [planInfo, setPlanInfo] = useState<MyPlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // planLimits ya viene en el objeto de organización desde fetchOrganizationConfig
  const planLimits = useSelector(
    (s: RootState) => (s.organization.organization as any)?.planLimits
  );
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    getMyPlanInfo()
      .then((info) => setPlanInfo(info))
      .catch(() => setPlanInfo(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const limits = planInfo?.membership?.plan?.limits ?? planLimits ?? null;
  const usage = planInfo?.usage ?? null;

  const canUse = (feature: PlanFeature): boolean => {
    if (!limits) return true; // si no hay info, no bloqueamos
    return (limits as any)[feature] !== false;
  };

  const isAtLimit = (resource: "employees" | "services" | "appointmentsThisMonth"): boolean => {
    if (!usage) return false;
    const { current, max } = usage[resource];
    if (max === null || max === undefined) return false;
    return current >= max;
  };

  const upgradeMessage = (feature: string): string => {
    return UPGRADE_MESSAGES[feature] ?? "Disponible en un plan superior";
  };

  const planSlug = planInfo?.membership?.plan?.slug ?? null;
  const isFreePlan = planSlug === "plan-gratuito";
  const isTrialPlan = planInfo?.membership?.status === "trial";

  return {
    planInfo,
    limits,
    usage,
    loading,
    canUse,
    isAtLimit,
    upgradeMessage,
    isFreePlan,
    isTrialPlan,
    planSlug,
  };
}
