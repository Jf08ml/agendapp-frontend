/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/waService.ts
import { AxiosResponse } from "axios";
import { apiOrganization } from "./axiosConfig";

export type WaCode =
  | "connecting"
  | "waiting_qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "reconnecting"
  | "error";

export interface WaConnectResponse {
  ok: boolean;
  clientId: string;
  ws: {
    url: string; // URL del socket.io del wa-backend (wss://...)
    token: string; // JWT efímero
    expiresIn: number; // seg.
  };
}

export interface WaStatus {
  code: WaCode;
  reason?: string;
  me?: { id?: string; name?: string };
  qrExpiresInMs?: number;
  readySince?: number;
}

/**
 * Inicia o reutiliza la sesión de WhatsApp para la organización
 * y retorna el token/URL para abrir el WS directo al wa-backend.
 *
 * Server: POST /organizations/:orgId/wa/connect  { clientId }
 */
export async function connectWaSession(
  orgId: string,
  clientId: string
): Promise<WaConnectResponse> {
  const { data }: AxiosResponse<{ data: WaConnectResponse }> =
    await apiOrganization.post(`/${orgId}/wa/connect`, { clientId });
  return data.data;
}

/**
 * Lee el estado actual de la sesión (opcional para precargar UI).
 *
 * Server: GET /organizations/:orgId/wa/status
 */
export async function getWaStatus(orgId: string): Promise<WaStatus | null> {
  try {
    const { data }: AxiosResponse<{ data: any }> = await apiOrganization.get(
      `/${orgId}/wa/status`
    );
    // Normaliza según tu respuesta actual del agenda-backend
    const s = data?.data?.waStatus ?? (data?.data?.code ? data.data : null);
    if (!s) return null;
    return {
      code: s.code as WaCode,
      reason: s.reason,
      me: s.me,
      qrExpiresInMs: s.qrExpiresInMs,
      readySince: s.lastReadyAt ?? s.readySince,
    };
  } catch {
    return null;
  }
}

/**
 * (Opcional) Acciones de control — requieren rutas en el agenda-backend:
 *   POST /organizations/:orgId/wa/restart  { clientId }
 *   POST /organizations/:orgId/wa/logout   { clientId }
 *   POST /organizations/:orgId/wa/send     { clientId, phone, message?, image? }
 */
export async function restartWa(orgId: string, clientId: string) {
  const { data }: AxiosResponse<{ data: any }> = await apiOrganization.post(
    `/${orgId}/wa/restart`,
    { clientId }
  );
  return data?.data;
}

export async function logoutWa(orgId: string, clientId: string) {
  const { data }: AxiosResponse<{ data: any }> = await apiOrganization.post(
    `/${orgId}/wa/logout`,
    { clientId }
  );
  return data?.data;
}

export async function sendWa(
  orgId: string,
  payload: { clientId: string; phone: string; message?: string; image?: string }
) {
  const { data }: AxiosResponse<{ data: any }> = await apiOrganization.post(
    `/${orgId}/wa/send`,
    payload
  );
  return data?.data;
}
