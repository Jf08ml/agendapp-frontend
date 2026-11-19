import { apiRegistration } from "./registrationService";

// Recuperar el acceso al panel del dueño (backend: /api/account-access).
// Público: sin token ni tenant, funciona desde app.agenditapp.com y desde el
// login de cualquier negocio.

export type AccessChannel = "email" | "whatsapp";

export interface AccessChannelOption {
  channel: AccessChannel;
  masked: string;
  available: boolean;
  reason?: "bounced";
}

export interface AccessAccount {
  organizationId: string;
  businessName: string;
  channels: AccessChannelOption[];
}

export interface SendCodeResult {
  challengeId: string;
  channel: AccessChannel;
  masked: string;
  expiresInMinutes: number;
}

export interface VerifyResult {
  completionToken: string;
  businessName: string;
  email: string;
}

export interface CompleteResult {
  exchangeCode: string;
  slug: string | null;
  domain: string | null;
  passwordChanged: boolean;
}

/**
 * Con `organizationId` (página de un negocio) la búsqueda se limita a ese
 * negocio y no lleva captcha; sin él (app.agenditapp.com) busca en todos.
 */
export async function lookupAccounts(
  identifier: string,
  opts: { organizationId?: string; turnstileToken?: string } = {}
): Promise<AccessAccount[]> {
  const res = await apiRegistration.post("/account-access/lookup", { identifier, ...opts });
  return res.data.data?.accounts ?? [];
}

export async function sendAccessCode(params: {
  identifier: string;
  organizationId: string;
  channel: AccessChannel;
}): Promise<SendCodeResult> {
  const res = await apiRegistration.post("/account-access/send-code", params);
  return res.data.data;
}

export async function verifyAccessCode(params: {
  challengeId: string;
  code?: string;
  token?: string;
}): Promise<VerifyResult> {
  const res = await apiRegistration.post("/account-access/verify", params);
  return res.data.data;
}

export async function completeAccess(params: {
  challengeId: string;
  completionToken: string;
  newPassword?: string;
}): Promise<CompleteResult> {
  const res = await apiRegistration.post("/account-access/complete", params);
  return res.data.data;
}

/** Mensaje del backend (sendResponse → message) o uno genérico. */
export function accessErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string } } };
  const msg = e?.response?.data?.message;
  if (msg) return msg;
  if (!e?.response) return "No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.";
  return "Tuvimos un problema. Inténtalo de nuevo en un momento.";
}
