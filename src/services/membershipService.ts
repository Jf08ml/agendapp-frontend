/* eslint-disable @typescript-eslint/no-explicit-any */
// services/membershipService.ts
import { apiGeneral } from "./axiosConfig";

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  price: number;
  billingCycle: "monthly" | "yearly" | "lifetime";
  characteristics: string[];
  domainType: "subdomain" | "custom_domain";
  limits: {
    maxEmployees: number | null;
    maxServices: number | null;
    maxAppointmentsPerMonth: number | null;
    maxStorageGB: number | null;
    customBranding: boolean;
    whatsappIntegration: boolean;
    analyticsAdvanced: boolean;
    prioritySupport: boolean;
  };
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  _id: string;
  organizationId: string;
  planId: Plan;
  status:
    | "active"
    | "trial"
    | "pending"
    | "grace_period"
    | "suspended"
    | "cancelled"
    | "expired";
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  notifications: {
    threeDaysSent: boolean;
    oneDaySent: boolean;
    expirationSent: boolean;
    gracePeriodDay1Sent: boolean;
    gracePeriodDay2Sent: boolean;
  };
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  nextPaymentDue: string;
  autoRenew: boolean;
  adminNotes: string;
  suspendedAt: string | null;
  suspensionReason: string;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipStatus {
  hasActiveMembership: boolean;
  membership?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    daysUntilExpiration: number;
    nextPaymentDue: string;
    lastPaymentDate: string | null;
    lastPaymentAmount: number;
  };
  ui?: {
    statusColor: string;
    statusMessage: string;
    showRenewalButton: boolean;
    showUpgradeButton: boolean;
  };
}

// Obtener membresía activa de una organización
export const getCurrentMembership = async (
  organizationId: string
): Promise<Membership | null> => {
  try {
    const response = await apiGeneral.get(
      `/memberships/${organizationId}/current`
    );
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Obtener estado de membresía con información de UI
export const getMembershipStatus = async (
  organizationId: string
): Promise<MembershipStatus> => {
  try {
    const membership = await getCurrentMembership(organizationId);

    if (!membership) {
      return {
        hasActiveMembership: false,
      };
    }

    // Calcular días hasta vencimiento
    const now = new Date();
    const endDate = new Date(membership.currentPeriodEnd);
    const diffTime = endDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Determinar estado visual
    let statusColor = "green";
    let statusMessage = "Tu membresía está activa";

    if (membership.status === "suspended") {
      statusColor = "red";
      statusMessage = "Tu membresía está suspendida. Renueva para reactivar.";
    } else if (membership.status === "grace_period") {
      statusColor = "orange";
      statusMessage = `Período de gracia. Renueva hoy para evitar suspensión.`;
    } else if (daysUntilExpiration <= 3 && daysUntilExpiration > 0) {
      statusColor = "yellow";
      statusMessage = `Tu membresía vence en ${daysUntilExpiration} días`;
    } else if (daysUntilExpiration <= 0) {
      statusColor = "red";
      statusMessage = "Tu membresía ha vencido";
    }

    return {
      hasActiveMembership: true,
      membership: {
        plan: membership.planId.displayName,
        status: membership.status,
        currentPeriodEnd: membership.currentPeriodEnd,
        daysUntilExpiration,
        nextPaymentDue: membership.nextPaymentDue,
        lastPaymentDate: membership.lastPaymentDate,
        lastPaymentAmount: membership.lastPaymentAmount,
      },
      ui: {
        statusColor,
        statusMessage,
        showRenewalButton:
          daysUntilExpiration <= 7 || membership.status !== "active",
        showUpgradeButton: membership.planId.slug === "plan-esencial",
      },
    };
  } catch (error) {
    console.error("Error obteniendo estado de membresía:", error);
    return {
      hasActiveMembership: false,
    };
  }
};

// Verificar si tiene acceso activo
export const checkAccess = async (
  organizationId: string
): Promise<boolean> => {
  try {
    const response = await apiGeneral.get(
      `/memberships/check-access/${organizationId}`
    );
    return response.data.data.hasAccess;
  } catch (error) {
    console.error("Error al verificar acceso de membresía:", error);
    return false;
  }
};

// Renovar membresía (registrar pago manual)
export const renewMembership = async (
  membershipId: string,
  paymentAmount: number
) => {
  const response = await apiGeneral.post(
    `/memberships/${membershipId}/renew`,
    {
      paymentAmount,
    }
  );
  return response.data.data;
};

// Cambiar plan
export const changePlan = async (membershipId: string, planId: string) => {
  const response = await apiGeneral.put(`/memberships/${membershipId}/plan`, {
    planId,
  });
  return response.data.data;
};

// === ENDPOINTS DE SUPERADMIN ===

// Obtener todas las membresías
export const getAllMemberships = async (filters?: {
  status?: string;
  planId?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.planId) params.append("planId", filters.planId);

  const response = await apiGeneral.get(
    `/memberships?${params.toString()}`
  );
  return response.data.data;
};

// Crear membresía (superadmin)
export const createMembership = async (data: {
  organizationId: string;
  planId: string;
  startDate?: string;
  trialDays?: number;
}) => {
  const response = await apiGeneral.post("/memberships", data);
  return response.data.data;
};

// Suspender membresía (superadmin)
export const suspendMembership = async (
  membershipId: string,
  reason?: string
) => {
  const response = await apiGeneral.post(
    `/memberships/${membershipId}/suspend`,
    { reason }
  );
  return response.data.data;
};

// Reactivar membresía (superadmin)
export const reactivateMembership = async (
  membershipId: string,
  newPeriodEnd?: string
) => {
  const response = await apiGeneral.post(
    `/memberships/${membershipId}/reactivate`,
    { newPeriodEnd }
  );
  return response.data.data;
};

// Obtener todos los planes
export const getAllPlans = async (): Promise<Plan[]> => {
  const response = await apiGeneral.get("/plans");
  return response.data.data;
};

// Notificaciones de membresía
export const getAdminNotifications = async (organizationId: string) => {
  const response = await apiGeneral.get(
    `/notifications/admin/${organizationId}`
  );
  return response.data.data;
};

export const getMembershipNotifications = async (organizationId: string) => {
  const response = await apiGeneral.get(
    `/notifications/membership/${organizationId}`
  );
  return response.data.data;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await apiGeneral.put(
    `/notifications/mark-as-read/${notificationId}`
  );
  return response.data.data;
};
