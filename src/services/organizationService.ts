import { apiGeneral, apiOrganization } from "./axiosConfig";
import { AxiosResponse } from "axios";
export interface Role {
  name: string;
  permissions: string[];
}

export type ReservationPolicy = "manual" | "auto_if_available";

export interface OpeningHours {
  start?: string;
  end?: string;
  businessDays?: number[]; // 0..6
  breaks?: { day: number; start: string; end: string; note?: string }[];
  stepMinutes?: number;
}

export type BrandingFont =
  | "inter"
  | "plus-jakarta-sans"
  | "nunito"
  | "dm-sans"
  | "outfit"
  | "manrope";

export interface Branding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  pwaName?: string;
  pwaShortName?: string;
  pwaDescription?: string;
  pwaIcon?: string;
  footerTextColor?: string;
  manifest?: object;
  fontFamily?: BrandingFont;
}

export interface ReminderSettings {
  enabled?: boolean;
  hoursBefore?: number;
  sendTimeStart?: string;
  sendTimeEnd?: string;
  secondReminder?: {
    enabled: boolean;
    hoursBefore: number;
  };
}

export interface CancellationPolicy {
  minHoursBeforeAppointment?: number; // 0 = sin restricción
  preventCancellingConfirmed?: boolean;
}

export interface PaymentMethod {
  type: "nequi" | "bancolombia" | "daviplata" | "mercado_pago" | "pix" | "yape" | "sinpe" | "transferencia_bancaria" | "efectivo" | "otros";
  accountName?: string;
  accountNumber?: string;
  phoneNumber?: string;
  qrCodeUrl?: string;
  notes?: string;
}

export interface DaySchedule {
  day: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  isOpen?: boolean;
  isAvailable?: boolean;
  start: string;
  end: string;
  breaks?: { start: string; end: string; note?: string }[];
}

export interface WeeklySchedule {
  enabled: boolean;
  schedule: DaySchedule[];
  stepMinutes?: number;
}

export interface ClientFieldConfig {
  key: 'name' | 'phone' | 'email' | 'birthDate' | 'documentId' | 'notes';
  enabled: boolean;
  required: boolean;
  label?: string;
}

export interface ClientFormConfig {
  identifierField: 'phone' | 'email' | 'documentId';
  fields: ClientFieldConfig[];
}

export const DEFAULT_CLIENT_FORM_CONFIG: ClientFormConfig = {
  identifierField: 'phone',
  fields: [
    { key: 'name',       enabled: true,  required: true },
    { key: 'phone',      enabled: true,  required: true },
    { key: 'email',      enabled: true,  required: false },
    { key: 'birthDate',  enabled: true,  required: false },
    { key: 'documentId', enabled: false, required: false },
    { key: 'notes',      enabled: false, required: false },
  ],
};

export interface Organization {
  _id?: string;
  slug?: string;
  name: string;
  email: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  password?: string;
  phoneNumber: string;
  default_country?: string; // 🌍 País por defecto (ISO2: CO, MX, PE, etc.)
  timezone?: string; // 🕐 Zona horaria (IANA: America/Bogota, America/Mexico_City, etc.)
  facebookUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  role: Role | string;
  isActive?: boolean;
  referredCount?: number;
  referredReward?: string;
  serviceCount?: number;
  serviceReward?: string;
  serviceTiers?: { threshold: number; reward: string }[];
  referralTiers?: { threshold: number; reward: string }[];
  openingHours?: OpeningHours;
  weeklySchedule?: WeeklySchedule;
  clientIdWhatsapp?: string | null;
  branding?: Branding;
  domains?: string[];
  reservationPolicy?: ReservationPolicy;
  showLoyaltyProgram?: boolean;
  enableOnlineBooking?: boolean;
  enableClassBooking?: boolean;
  setupCompleted?: boolean;
  onboardingMilestones?: {
    setupCompletedAt?: string | null;
    seededDemoAt?: string | null;
    firstAppointmentAt?: string | null;
    whatsappConnectedAt?: string | null;
    firstAutoMessageAt?: string | null;
  };
  blockHolidaysForReservations?: boolean;
  allowedHolidayDates?: string[];
  paymentMethods?: PaymentMethod[];
  requireReservationDeposit?: boolean;
  reservationDepositPercentage?: number;
  // Tienda pública de productos (flags públicos expuestos en organization-config)
  storeEnabled?: boolean;
  storeCodEnabled?: boolean;
  // Depósito para inscripción a clases (config propia, independiente de reservas).
  requireClassDeposit?: boolean;
  classDepositPercentage?: number;
  // Medio preferido para el abono cuando hay AMBOS disponibles (MP + transferencia).
  depositPreferredMethod?: "mercadopago" | "receipt";
  // Cobro de depósito vía Mercado Pago. El endpoint público solo expone `connected`.
  mpCollect?: { connected?: boolean };
  welcomeTitle?: string;
  welcomeDescription?: string;
  homeLayout?: "modern" | "minimal" | "cards" | "landing";
  reminderSettings?: ReminderSettings;
  autoMarkAttended?: boolean;
  cancellationPolicy?: CancellationPolicy;
  termsAndConditions?: {
    enabled?: boolean;
    text?: string;
  };
  currency?: string;
  timeFormat?: '12h' | '24h';
  aiAssistantName?: string;
  clientFormConfig?: ClientFormConfig;
  // Sistema de membresías
  currentMembershipId?: string;
  membershipStatus?: "active" | "trial" | "past_due" | "suspended" | "cancelled" | "none";
  hasAccessBlocked?: boolean;
  // Agente WhatsApp (Baileys)
  waPhone?: string | null;
  waAgentEnabled?: boolean;
  // Agente IA de reservas para clientes (número Meta)
  waBookingAgentEnabled?: boolean;
  // Conexión híbrida WA
  hideBaileysUI?: boolean;
  waConnectionType?: 'baileys' | 'meta' | null;
  metaPhoneNumberId?: string | null;
  metaPhone?: string | null;
  metaCoexistenceEnabled?: boolean;
  // Límites del plan activo
  planLimits?: {
    maxEmployees?: number | null;
    maxServices?: number | null;
    maxAppointmentsPerMonth?: number | null;
    maxStorageGB?: number;
    customBranding?: boolean;
    whatsappIntegration?: boolean;
    analyticsAdvanced?: boolean;
    prioritySupport?: boolean;
    autoReminders?: boolean;
    autoConfirmations?: boolean;
    servicePackages?: boolean;
    campaignsWhatsapp?: boolean;
    classesModule?: boolean;
    loyaltyProgram?: boolean;
    professionalLanding?: boolean;
    brandingVisible?: boolean;
    maxRemindersPerAppointment?: number;
  } | null;
}

// Crear una nueva organización
export const createOrganization = async (
  organizationData: Organization
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.post("/", organizationData);
    return response.data.data;
  } catch (error) {
    console.error("Error al crear la organización:", error);
    return null;
  }
};

// Obtener todas las organizaciones
export const getOrganizations = async (): Promise<Organization[] | null> => {
  try {
    const response: AxiosResponse<{ data: Organization[] }> =
      await apiOrganization.get("/");
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener las organizaciones:", error);
    return null;
  }
};

// Obtener una organización por ID
export const getOrganizationById = async (
  organizationId: string
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.get(`/${organizationId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error al obtener la organización:", error);
    return null;
  }
};

// Sembrar datos de ejemplo (onboarding "Explorar primero"): crea servicios y
// profesionales demo, activa el horario por defecto y marca setupCompleted.
export const seedDemoData = async (
  organizationId: string
): Promise<{ seeded: boolean }> => {
  const response: AxiosResponse<{ data: { seeded: boolean } }> =
    await apiOrganization.post(`/${organizationId}/seed-demo`);
  return response.data.data;
};

// Al conectar WhatsApp por primera vez: envía al propio número del negocio el
// recordatorio de ejemplo (el "aha"). Idempotente en el backend (salvo force).
// `phone` = número conectado (de `me`); `force` reenvía aunque ya se haya mandado.
export const sendWhatsappWelcomeTest = async (
  organizationId: string,
  phone?: string,
  force?: boolean
): Promise<{ sent: boolean; alreadySent?: boolean; reason?: string }> => {
  const response: AxiosResponse<{ data: { sent: boolean; alreadySent?: boolean; reason?: string } }> =
    await apiOrganization.post(`/${organizationId}/wa/welcome-test`, { phone, force });
  return response.data.data;
};

// Actualizar una organización
export const updateOrganization = async (
  organizationId: string,
  updatedData: Partial<Organization>
): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<{ data: Organization }> =
      await apiOrganization.put(`/${organizationId}`, updatedData);
    return response.data.data;
  } catch (error) {
    console.error("Error al actualizar la organización:", error);
    return null;
  }
};

// Eliminar una organización
export const deleteOrganization = async (
  organizationId: string
): Promise<void> => {
  try {
    await apiOrganization.delete(`/${organizationId}`);
  } catch (error) {
    console.error("Error al eliminar la organización:", error);
  }
};

// ── Meta API connection (WABA único de AgenditApp — flujo de 3 pasos) ────────

/** Paso 1: solicita código SMS/Voz para verificar el número */
export const requestMetaVerification = async (
  organizationId: string,
  cc: string,
  phone: string,
  verifiedName?: string,
  method: "SMS" | "VOICE" = "SMS"
): Promise<{ phoneNumberId: string; phone: string }> => {
  const response = await apiOrganization.post(`/${organizationId}/meta-request-verification`, {
    cc,
    phone,
    verifiedName,
    method,
  });
  return response.data.data;
};

/** Paso 2: verifica el código recibido */
export const verifyMetaCode = async (
  organizationId: string,
  code: string
): Promise<{ verified: boolean; phone: string }> => {
  const response = await apiOrganization.post(`/${organizationId}/meta-verify-code`, { code });
  return response.data.data;
};

/** Flujo B — Embedded Signup: intercambia code de FB, guarda WABA+phone (sin activar) */
export const embeddedConnectMeta = async (
  organizationId: string,
  code: string,
  redirectUri: string,
  wabaId?: string,
  phoneNumberId?: string
): Promise<{ wabaId: string; phoneNumberId: string; phone: string; verifiedName: string }> => {
  const response = await apiOrganization.post(`/${organizationId}/meta-embedded-connect`, {
    code, redirectUri, wabaId, phoneNumberId,
  });
  return response.data.data;
};

/** Paso 3: activa el modo de conexión elegido */
export const activateMetaModo = async (
  organizationId: string,
  mode: "coexistence" | "cloud_only",
  pin?: string
): Promise<{ phone: string; coexistence: boolean }> => {
  const response = await apiOrganization.post(`/${organizationId}/meta-activate`, { mode, pin });
  return response.data.data;
};

export const disconnectMetaOrg = async (organizationId: string): Promise<void> => {
  await apiOrganization.delete(`/${organizationId}/meta-disconnect`);
};

export const getMetaStatus = async (
  organizationId: string
): Promise<{
  connected: boolean;
  pending: boolean;
  phone?: string;
  phoneNumberId?: string;
  coexistence?: boolean;
  platformType?: string;
  verifiedName?: string;
  reason?: string;
}> => {
  const response = await apiOrganization.get(`/${organizationId}/meta-status`);
  return response.data.data;
};

// ── Meta Templates ───────────────────────────────────────────────────────────

export const listMetaTemplates = async (organizationId: string) => {
  const response = await apiOrganization.get(`/${organizationId}/meta-templates`);
  return response.data.data;
};

export const createMetaTemplate = async (organizationId: string, template: object) => {
  const response = await apiOrganization.post(`/${organizationId}/meta-templates`, template);
  return response.data.data;
};

export const updateMetaTemplate = async (organizationId: string, templateId: string, components: object[]) => {
  const response = await apiOrganization.patch(`/${organizationId}/meta-templates/${templateId}`, { components });
  return response.data.data;
};

export const deleteMetaTemplate = async (organizationId: string, templateName: string) => {
  await apiOrganization.delete(`/${organizationId}/meta-templates/${templateName}`);
};

export const syncMetaTemplates = async (organizationId: string) => {
  const response = await apiOrganization.post(`/${organizationId}/meta-templates/sync`);
  return response.data.data;
};

// Obtener organización según el dominio actual (branding automático)
export const getOrganizationConfig = async (): Promise<Organization | null> => {
  try {
    const response: AxiosResponse<Organization> = await apiGeneral.get(
      "/organization-config"
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener la organización por dominio:", error);
    return null;
  }
};
