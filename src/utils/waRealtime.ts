/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/waRealtime.ts
import { io, Socket } from "socket.io-client";
import { connectWaSession } from "../services/waService";

export type WaCode =
  | "connecting"
  | "waiting_qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "reconnecting"
  | "error";

export type ReadyAccount = { id?: string; name?: string } | null;

export type WsQrPayload = {
  qr: string;
  issuedAt: number;
  expiresAt: number;
  ttlMs: number;
  seq: number;
  replacesPrevious: boolean;
  qrId: string;
};

export type WsPairingPayload = {
  code: string;
  raw: string;
  phone: string;
};

export type WaStatusPayload = {
  code: WaCode;
  reason?: string;
  me?: { id?: string; name?: string };
};

export type WaWsHandlers = {
  onConnect?: (socket: Socket) => void;
  onStatus?: (s: WaStatusPayload) => void;
  onQr?: (payload: WsQrPayload) => void;

  onPairingCode?: (payload: WsPairingPayload) => void;
  onPairingError?: (error: any) => void;

  onSessionCleaned?: () => void;
  onConnectError?: (err: Error) => void;
  /**
   * Permite actualizar el token en un reintento de reconexión.
   * Debe devolver el nuevo token (string) o lanzar si no hay.
   */
  refreshToken?: () => Promise<string>;
};

export type WaSocketHandle = {
  socket: Socket;
  disconnect: () => void;
};

/**
 * Abre un socket ya teniendo ws.url y ws.token, hace join por clientId y engancha handlers.
 */
export function openWaSocket(
  wsUrl: string,
  token: string,
  clientId: string,
  handlers: WaWsHandlers
): WaSocketHandle {
  const socket = io(wsUrl, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    socket.emit("join", { clientId });
    handlers.onConnect?.(socket);
  });

  socket.on("status", (s: WaStatusPayload) => handlers.onStatus?.(s));
  socket.on("qr", (payload: WsQrPayload) => handlers.onQr?.(payload));

  socket.on("pairing_code", (payload: WsPairingPayload) =>
    handlers.onPairingCode?.(payload)
  );
  socket.on("pairing_error", (err: any) => handlers.onPairingError?.(err));

  socket.on("session_cleaned", () => handlers.onSessionCleaned?.());

  socket.on("connect_error", (err: any) => {
    const e =
      err instanceof Error ? err : new Error(String(err?.message ?? err));
    handlers.onConnectError?.(e);
  });

  // Renovar token si el socket intenta reconectar
  socket.io.on("reconnect_attempt", async () => {
    if (!handlers.refreshToken) return;
    try {
      const newToken = await handlers.refreshToken();
      (socket as any).auth = { token: newToken };
    } catch {
      // Si falla la renovación, dejamos al socket seguir su ciclo
    }
  });

  const disconnect = () => {
    socket.off("status");
    socket.off("qr");
    socket.off("pairing_code");
    socket.off("pairing_error");
    socket.off("session_cleaned");
    socket.off("connect_error");
    socket.disconnect();
  };

  return { socket, disconnect };
}

/**
 * Flujo de conveniencia: llama a connectWaSession(orgId, clientId) y abre el socket con handlers.
 * Devuelve el handle y el clientId efectivo (por si backend lo normaliza).
 */
export async function ensureWaSocket(
  organizationId: string,
  clientId: string,
  handlers: WaWsHandlers,
  pairingPhone?: string
): Promise<{ handle: WaSocketHandle; effectiveClientId: string }> {
  
  const resp = await connectWaSession(organizationId, clientId, pairingPhone);

  const wsUrl = resp?.ws?.url;
  const wsToken = resp?.ws?.token;
  const effectiveClientId = resp?.clientId || clientId;

  if (!wsUrl || !wsToken) {
    throw new Error("no_ws_credentials");
  }

  const handle = openWaSocket(wsUrl, wsToken, effectiveClientId, {
    ...handlers,
    // si hay refreshToken definido, lo usamos; si no, proveemos uno por defecto
    refreshToken:
      handlers.refreshToken ??
      (async () => {
        const r2 = await connectWaSession(organizationId, effectiveClientId);
        if (!r2?.ws?.token) throw new Error("no_ws_token_refresh");
        return r2.ws.token as string;
      }),
  });

  return { handle, effectiveClientId };
}
