/* eslint-disable react-hooks/exhaustive-deps */
// src/hooks/useWhatsappStatus.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  ensureWaSocket,
  openWaSocket,
  type WaCode,
  type WsQrPayload,
  type ReadyAccount,
  type WaSocketHandle,
  type WaStatusPayload,
  type WsPairingPayload,
} from "../utils/waRealtime";
import {
  getWaStatus,
  restartWa,
  logoutWa,
  sendWa,
  connectWaSession,
} from "../services/waService";

type QrMeta = { expiresAt: number; seq: number; replacesPrevious: boolean };

export function useWhatsappStatus(
  organizationId?: string,
  initialClientId?: string
) {
  const [clientId, setClientId] = useState<string>(initialClientId || "");
  const [code, setCode] = useState<WaCode>("connecting");
  const [reason, setReason] = useState<string>("");
  const [me, setMe] = useState<ReadyAccount>(null);

  const [qr, setQr] = useState<string>("");
  const [qrMeta, setQrMeta] = useState<QrMeta | null>(null);
  const [qrTtl, setQrTtl] = useState<number>(0);

  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const [loadingPrimary, setLoadingPrimary] = useState(false);
  const [loadingRestart, setLoadingRestart] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const handleRef = useRef<WaSocketHandle | null>(null);
  const connectingSinceRef = useRef<number | null>(null);

  // TTL del QR (basado en expiresAt enviado por backend)
  useEffect(() => {
    if (!qrMeta) return;
    const compute = () =>
      Math.max(0, Math.floor((qrMeta.expiresAt - Date.now()) / 1000));
    setQrTtl(compute());
    const id = setInterval(() => setQrTtl(compute()), 1000);
    return () => clearInterval(id);
  }, [qrMeta?.expiresAt]);

  // Precarga del estado por REST
  // Precarga del estado por REST
  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      try {
        const s = await getWaStatus(organizationId);
        if (s?.waStatus?.code || s?.code) {
          // Ajuste dependiendo de cómo devuelva tu endpoint getStatus (waStatus anidado o plano)
          const finalCode = s.waStatus?.code || s.code;
          const finalReason = s.waStatus?.reason || s.reason;
          const finalMe = s.waStatus?.me || s.me;

          setCode(finalCode as WaCode);
          setReason(finalReason || "");
          if (finalCode === "ready") {
            setQr("");
            setQrMeta(null);
            setPairingCode(null); // Limpiar pairing
            if (finalMe) setMe(finalMe);
          }
        } else {
          setCode("disconnected");
          setReason("not_found");
        }
      } catch {
        setCode("error");
        setReason("status_fetch_failed");
      }
    })();
  }, [organizationId]);

  const attachHandlers = useCallback(
    (): Parameters<typeof openWaSocket>[3] => ({
      onConnect: (s) => {
        socketRef.current = s;
      },
      onStatus: (s: WaStatusPayload) => {
        setCode(s.code);
        setReason(s.reason || "");
        if (s.me) setMe(s.me);
        if (s.code === "ready") {
          setQr("");
          setQrMeta(null);
          setQrTtl(0);
        }
        if (s.code === "connecting") connectingSinceRef.current = Date.now();
      },
      onQr: (payload: WsQrPayload) => {
        setQr(payload.qr);
        setPairingCode(null);
        setCode("waiting_qr");
        setReason("");
        setQrMeta({
          expiresAt: payload.expiresAt,
          seq: payload.seq,
          replacesPrevious: payload.replacesPrevious,
        });
      },
      onPairingCode: (payload: WsPairingPayload) => {
        setPairingCode(payload.code);
        // Limpiamos QR si llega pairing code
        setQr("");
        setQrMeta(null);
      },
      onPairingError: (err) => {
        setReason(`pairing_error: ${err?.error || err}`);
        // Opcional: setCode("error") si quieres bloquear la UI
      },
      onSessionCleaned: () => {
        setCode("disconnected");
        setQr("");
        setQrMeta(null);
        setQrTtl(0);
        setMe(null);
      },
      onConnectError: (err) => {
        setCode("error");
        setReason(`socket_error:${err?.message ?? "unknown"}`);
      },
      refreshToken: async () => {
        if (!organizationId) throw new Error("no_org_for_refresh");
        const r2 = await connectWaSession(organizationId, clientId);
        if (!r2?.ws?.token) throw new Error("no_ws_token_refresh");
        return r2.ws.token as string;
      },
    }),
    [clientId, organizationId]
  );

  const connect = useCallback(
    async (opts?: { forceFresh?: boolean; pairingPhone?: string }) => {
      if (!organizationId || !clientId) return;
      setLoadingPrimary(true);
      setQr("");
      setQrMeta(null);
      setPairingCode(null)
      setQrTtl(0);
      setMe(null);
      try {
        if (opts?.forceFresh) {
          await logoutWa(organizationId, clientId).catch(() => {});
        }
        const { handle, effectiveClientId } = await ensureWaSocket(
          organizationId,
          clientId,
          attachHandlers(),
          opts?.pairingPhone
        );
        handleRef.current?.disconnect();
        handleRef.current = handle;
        setCode("connecting");
        connectingSinceRef.current = Date.now();
        if (effectiveClientId !== clientId) setClientId(effectiveClientId);
      } catch (e: any) {
        setCode("error");
        setReason(e?.message || "connect_failed");
      } finally {
        setLoadingPrimary(false);
      }
    },
    [organizationId, clientId, attachHandlers]
  );

  const restart = useCallback(async () => {
    if (!organizationId || !clientId) return;
    setLoadingRestart(true);
    try {
      await restartWa(organizationId, clientId);
      await connect();
    } finally {
      setLoadingRestart(false);
    }
  }, [organizationId, clientId, connect]);

  const logout = useCallback(async () => {
    if (!organizationId || !clientId) return;
    setLoadingLogout(true);
    try {
      await logoutWa(organizationId, clientId);
      setCode("disconnected");
      setQr("");
      setQrMeta(null);
      setPairingCode(null);
      setQrTtl(0);
      setMe(null);
      handleRef.current?.disconnect();
      handleRef.current = null;
      socketRef.current = null;
    } finally {
      setLoadingLogout(false);
    }
  }, [organizationId, clientId]);

  const sendTest = useCallback(
    async (
      phoneE164: string,
      message = "✅ Prueba desde el panel (ignora este mensaje)."
    ) => {
      if (!organizationId || !clientId) return;
      setLoadingSend(true);
      try {
        await sendWa(organizationId, { clientId, phone: phoneE164, message });
      } finally {
        setLoadingSend(false);
      }
    },
    [organizationId, clientId]
  );

  const recheck = useCallback(async () => {
    if (!organizationId) return;
    const s = await getWaStatus(organizationId);
    setCode((s?.code as WaCode) || "error");
    setReason(s?.reason || "");
    if (s?.me) setMe(s.me);
  }, [organizationId]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      handleRef.current?.disconnect();
      handleRef.current = null;
      socketRef.current = null;
    };
  }, []);

  const longConnecting = useMemo(() => {
    return (
      code === "connecting" &&
      connectingSinceRef.current &&
      Date.now() - connectingSinceRef.current > 20_000
    );
  }, [code]);

  return {
    // estado
    code,
    reason,
    me,
    clientId,
    setClientId,

    // QR
    qr,
    qrMeta,
    qrTtl,
    pairingCode,

    // loaders
    loadingPrimary,
    loadingRestart,
    loadingLogout,
    loadingSend,

    // helpers UI
    longConnecting,

    // acciones
    connect,
    restart,
    logout,
    sendTest,
    recheck,
  };
}
