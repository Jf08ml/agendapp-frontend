/* eslint-disable @typescript-eslint/no-explicit-any */
// types/campaign.ts

export interface CampaignRecipient {
  phone: string;
  name?: string;
}

export interface CampaignItemDetail {
  phone: string;
  name?: string;
  message?: string;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt?: string;
  errorMessage?: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
}

export type CampaignStatus =
  | "draft"
  | "dry-run"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Campaign {
  cancelReason: any;
  _id: string;
  organizationId: string;
  createdBy?: string;
  title: string;
  message: string;
  image?: string;
  bulkId?: string;
  status: CampaignStatus;
  isDryRun: boolean;
  stats: CampaignStats;
  items?: CampaignItemDetail[];
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  title: string;
  message: string;
  recipients: CampaignRecipient[];
  image?: string;
  dryRun?: boolean;
}

export interface PhoneValidation {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  withConsent: number;
  withoutConsent: number;
  normalized: string[];
  invalidNumbers: string[];
  duplicateNumbers: string[];
  consentStatus: Array<{
    phone: string;
    hasConsent: boolean;
  }>;
}

export interface CampaignListResponse {
  ok: boolean;
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CampaignDetailResponse {
  ok: boolean;
  campaign: Campaign;
}

export interface AudienceSuggestion {
  id: string;
  name: string;
  phone: string;
}

export interface AudienceSuggestionsResponse {
  ok: boolean;
  clients: AudienceSuggestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

// Estados del wizard
export interface CampaignWizardState {
  step: 1 | 2 | 3;
  // Paso 1: Audiencia
  recipients: CampaignRecipient[];
  selectedClientIds: string[];
  rawPhones: string;
  // Paso 2: Mensaje
  title: string;
  message: string;
  image?: string;
  // Paso 3: Confirmación
  validation?: PhoneValidation;
  isDryRun: boolean;
  confirmations: {
    reviewedRecipients: boolean;
    reviewedMessage: boolean;
  };
}

// Métricas en tiempo real
export interface CampaignMetrics extends CampaignStats {
  progressPercentage: number;
  estimatedTimeRemaining?: number;
}
