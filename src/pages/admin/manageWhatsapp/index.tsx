/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  CheckIcon,
  CopyButton,
  Divider,
  Group,
  Kbd,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { QRCodeCanvas } from "qrcode.react";
import { io, Socket } from "socket.io-client";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import {
  connectWaSession,
  getWaStatus,
  restartWa,
  logoutWa,
  sendWa,
  WaCode,
} from "../../../services/waService";
import { BiCopy, BiInfoCircle, BiRefresh, BiX } from "react-icons/bi";

// -----------------------------
// 1) Mapeo UI por estado
// -----------------------------
const UI_STATUS: Record<
  WaCode,
  {
    title: string;
    color: "blue" | "teal" | "green" | "orange" | "red" | "gray";
    showQR?: boolean;
    desc?: string;
  }
> = {
  connecting: {
    title: "Conectando…",
    color: "blue",
    desc: "Creando o reanudando la sesión.",
  },
  waiting_qr: {
    title: "Escanea el QR",
    color: "teal",
    showQR: true,
    desc: "Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo.",
  },
  authenticated: {
    title: "Autenticado",
    color: "blue",
    desc: "Listando chats y finalizando inicio…",
  },
  ready: {
    title: "Conectado",
    color: "green",
    desc: "Sesión lista para enviar mensajes.",
  },
  disconnected: {
    title: "Desconectado",
    color: "orange",
    desc: "La sesión no está activa en este momento.",
  },
  auth_failure: {
    title: "Error de autenticación",
    color: "red",
    showQR: true,
    desc: "Tus credenciales caducaron o se invalidaron. Vuelve a escanear el QR.",
  },
  reconnecting: {
    title: "Reconectando…",
    color: "blue",
    desc: "Recuperando la sesión tras una caída.",
  },
  error: {
    title: "Error",
    color: "red",
    desc: "Ocurrió un problema. Intenta de nuevo.",
  },
};

// -----------------------------
// 2) Tipos auxiliares
// -----------------------------

type WsQrPayload = {
  qr: string;
  issuedAt: number;
  expiresAt: number;
  ttlMs: number;
  seq: number;
  replacesPrevious: boolean;
  qrId: string;
};

type ReadyAccount = { id?: string; name?: string } | null;

// -----------------------------
// 3) Componente principal
// -----------------------------

const WhatsappOrgSession: React.FC = () => {
  // Organización y prefill del clientId
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );

  const [clientId, setClientId] = useState<string>("");
  const [code, setCode] = useState<WaCode>("connecting");
  const [reason, setReason] = useState<string>("");
  const [me, setMe] = useState<ReadyAccount>(null);

  // QR y metadatos
  const [qr, setQr] = useState<string>("");
  const [qrMeta, setQrMeta] = useState<{
    expiresAt: number;
    seq: number;
    replacesPrevious: boolean;
  } | null>(null);
  const [qrTtl, setQrTtl] = useState<number>(0);

  // Cargas de acciones
  const [loadingPrimary, setLoadingPrimary] = useState(false);
  const [loadingRestart, setLoadingRestart] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);

  // Control de socket y temporizadores
  const socketRef = useRef<Socket | null>(null);
  const connectingSinceRef = useRef<number | null>(null);

  // Estado derivado para mostrar un "hint" cuando connecting dura demasiado
  const connectingAges = useMemo(() => {
    const started = connectingSinceRef.current;
    return started ? Math.round((Date.now() - started) / 1000) : 0;
  }, [code]);

  // Prefill del clientId al cambiar de organización
  useEffect(() => {
    if (!organization) return;
    const pre =
      (organization as any).clientIdWhatsapp || organization._id || "";
    setClientId(pre);
    // reset UI
    setCode("connecting");
    setReason("");
    setQr("");
    setQrMeta(null);
    setQrTtl(0);
    setMe(null);
    connectingSinceRef.current = Date.now();
  }, [organization?._id, (organization as any)?.clientIdWhatsapp]);

  // Precarga de estado del backend administrativo (idempotente)
  useEffect(() => {
    if (!organization?._id) return;
    (async () => {
      try {
        const s = await getWaStatus(organization._id!);
        if (s?.code) {
          setCode(s.code as WaCode);
          setReason(s.reason || "");
          if (s.code === "ready") {
            setQr("");
            setQrMeta(null);
            setQrTtl(0);
            if (s.me) setMe(s.me);
          }
        } else {
          setCode("disconnected");
          setReason("not_found");
        }
      } catch (e) {
        setCode("error");
        setReason("status_fetch_failed");
        console.error(e);
      }
    })();
  }, [organization?._id]);

  // Countdown del QR según expiresAt del backend (no confiamos en timers locales)
  useEffect(() => {
    if (!qrMeta) return;
    const compute = () =>
      Math.max(0, Math.floor((qrMeta.expiresAt - Date.now()) / 1000));
    setQrTtl(compute());
    const id = setInterval(() => setQrTtl(compute()), 1000);
    return () => clearInterval(id);
  }, [qrMeta?.expiresAt]);

  // -----------------------------
  // 3.1) Conectar sesión y abrir WS
  // -----------------------------
  const openSocketAndHandlers = (
    url: string,
    token: string,
    joinedClientId: string
  ) => {
    // Cerrar previo si existiera
    socketRef.current?.disconnect();
    socketRef.current = null;

    const socket = io(url, { transports: ["websocket"], auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Si el backend no auto-join con el token, haz join manual
      socket.emit("join", { clientId: joinedClientId });
    });

    socket.on(
      "status",
      (s: {
        code: WaCode;
        reason?: string;
        me?: { id?: string; name?: string };
      }) => {
        setCode(s.code);
        setReason(s.reason || "");
        if (s.me) setMe(s.me);
        if (s.code === "ready") {
          setQr("");
          setQrMeta(null);
          setQrTtl(0);
        }
        if (s.code === "connecting") connectingSinceRef.current = Date.now();
      }
    );

    socket.on("qr", (payload: WsQrPayload) => {
      setQr(payload.qr);
      setCode("waiting_qr");
      setReason("");
      setQrMeta({
        expiresAt: payload.expiresAt,
        seq: payload.seq,
        replacesPrevious: payload.replacesPrevious,
      });
    });

    socket.on("session_cleaned", () => {
      setCode("disconnected");
      setQr("");
      setQrMeta(null);
      setQrTtl(0);
      setMe(null);
    });

    socket.on("connect_error", (err) => {
      setCode("error");
      setReason(`socket_error:${err?.message ?? "unknown"}`);
    });

    // Renovar token en reintentos de reconexión
    socket.io.on("reconnect_attempt", async () => {
      try {
        const r2 = await connectWaSession(organization!._id!, joinedClientId);
        if (r2?.ws?.token) socket.auth = { token: r2.ws.token };
      } catch {
        /* ignore */
      }
    });
  };

  const connectSession = async (forceFresh = false) => {
    if (!organization?._id || !clientId) return;
    setLoadingPrimary(true);
    setQr("");
    setQrMeta(null);
    setQrTtl(0);
    setMe(null);
    try {
      // Si el usuario pide "empezar de cero", limpiamos primero
      if (forceFresh) {
        await logoutWa(organization._id!, clientId).catch(() => {});
      }
      const res = await connectWaSession(organization._id!, clientId);
      if (!res?.ws?.url || !res?.ws?.token) {
        setCode("error");
        setReason("no_ws_credentials");
        return;
      }
      setCode("connecting");
      connectingSinceRef.current = Date.now();
      openSocketAndHandlers(res.ws.url, res.ws.token, res.clientId || clientId);
    } catch (e: any) {
      setCode("error");
      setReason(e?.message || "connect_failed");
    } finally {
      setLoadingPrimary(false);
    }
  };

  // -----------------------------
  // 3.2) Acciones rápidas
  // -----------------------------
  const handleRestart = async () => {
    if (!organization?._id || !clientId) return;
    setLoadingRestart(true);
    try {
      await restartWa(organization._id!, clientId);
      await connectSession();
    } finally {
      setLoadingRestart(false);
    }
  };

  const handleLogout = async () => {
    if (!organization?._id || !clientId) return;
    setLoadingLogout(true);
    try {
      await logoutWa(organization._id!, clientId);
      setCode("disconnected");
      setQr("");
      setQrMeta(null);
      setQrTtl(0);
      setMe(null);
      socketRef.current?.disconnect();
      socketRef.current = null;
    } finally {
      setLoadingLogout(false);
    }
  };

  const handleSendTest = async () => {
    if (!organization?._id || !clientId) return;
    const phone = prompt("Número E.164 (ej: 57300XXXXXXX):")?.trim();
    if (!phone) return;
    setLoadingSend(true);
    try {
      await sendWa(organization._id!, {
        clientId,
        phone,
        message: "✅ Prueba desde el panel (ignora este mensaje).",
      });
      alert("Mensaje enviado (requiere estado READY). ");
    } catch (e: any) {
      alert(`Error enviando: ${e?.message || e}`);
    } finally {
      setLoadingSend(false);
    }
  };

  // -----------------------------
  // 3.3) CTA principal dinámico según estado
  // -----------------------------
  const primaryCta = useMemo(() => {
    // Reglas:
    // - disconnected/not_found/auth_failure → Mostrar "Conectar y mostrar QR"
    // - connecting > 20s → Mostrar "Forzar nueva sesión" (limpia y reconecta)
    // - waiting_qr → Mostrar "Regenerar QR"
    // - error → "Reintentar"
    // - ready → no CTA principal (las acciones están abajo)
    const longConnecting =
      code === "connecting" &&
      connectingSinceRef.current &&
      Date.now() - connectingSinceRef.current > 20_000;

    if (code === "ready") return null;

    if (code === "waiting_qr") {
      return {
        label: qrTtl === 0 ? "Regenerar QR" : "Mostrar QR (activo)",
        onClick: () => connectSession(false),
      } as const;
    }

    if (
      code === "disconnected" ||
      reason === "not_found" ||
      code === "auth_failure"
    ) {
      return {
        label: "Conectar y mostrar QR",
        onClick: () => connectSession(code === "auth_failure"),
      } as const;
    }

    if (code === "error") {
      return {
        label: "Reintentar",
        onClick: () => connectSession(false),
      } as const;
    }

    if (longConnecting) {
      return {
        label: "Forzar nueva sesión",
        onClick: () => connectSession(true),
      } as const;
    }

    return {
      label: "Conectar / Mostrar QR",
      onClick: () => connectSession(false),
    } as const;
  }, [code, reason, qrTtl, clientId]);

  const ui = UI_STATUS[code];

  return (
    <Paper shadow="md" radius="md" p="xl" withBorder>
      <Stack gap="md">
        {/* HEADER */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={3}>
              WhatsApp de{" "}
              <Text span c="blue">
                {organization?.name ?? "Organización"}
              </Text>
            </Title>
            <Text size="sm" c="dimmed">
              Administra la sesión vinculada a tu línea.
            </Text>
          </div>
          <Badge color={ui.color} size="lg" radius="sm">
            {ui.title}
          </Badge>
        </Group>

        {/* CLIENT ID */}
        <Group align="end">
          <TextInput
            label="ID de sesión (clientId)"
            description="Suele ser el ID de la organización; puedes personalizarlo."
            value={clientId}
            onChange={(e) => setClientId(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <CopyButton value={clientId} timeout={1500}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copiado" : "Copiar"}>
                <Button
                  variant="light"
                  onClick={copy}
                  leftSection={
                    copied ? <CheckIcon size={16} /> : <BiCopy size={16} />
                  }
                >
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </Tooltip>
            )}
          </CopyButton>
        </Group>

        {/* STATUS CARD */}
        <Card withBorder padding="md" radius="md">
          <Group align="flex-start" wrap="nowrap">
            <ThemeIcon color={ui.color} variant="light" radius="xl">
              <BiInfoCircle size={18} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text fw={600}>{ui.title}</Text>
              <Text size="sm" c="dimmed">
                {ui.desc}
              </Text>
              {reason && (
                <Text size="xs" c="dimmed" mt={6}>
                  Detalle técnico: <Kbd>{reason}</Kbd>
                </Text>
              )}
              {code === "ready" && me && (
                <Text size="xs" c="dimmed" mt={6}>
                  Cuenta: {me.name ?? "—"} {me.id ? `· ${me.id}` : ""}
                </Text>
              )}

              {code === "connecting" && (
                <Box mt="sm">
                  <Progress
                    value={Math.min(100, (connectingAges / 20) * 100)}
                    striped
                    animated
                  />
                  <Text size="xs" c="dimmed" mt={4}>
                    Conectando
                    {connectingAges > 0 ? `… (${connectingAges}s)` : "…"}
                  </Text>
                </Box>
              )}
            </Box>

            {/* CTA primaria dinámica (si aplica) */}
            {primaryCta && (
              <Button
                loading={loadingPrimary}
                color={ui.color}
                onClick={async () => {
                  setLoadingPrimary(true);
                  try {
                    await primaryCta.onClick();
                  } finally {
                    setLoadingPrimary(false);
                  }
                }}
              >
                {primaryCta.label}
              </Button>
            )}
          </Group>
        </Card>

        {/* BLOQUE QR */}
        {UI_STATUS[code].showQR && qr && (
          <Center>
            <Stack align="center" gap={6}>
              <QRCodeCanvas value={qr} size={240} includeMargin />
              <Text size="xs" c="gray">
                {qrMeta?.seq ? `QR #${qrMeta.seq} · ` : null}
                Expira en {qrTtl}s
                {qrMeta?.replacesPrevious ? " · reemplaza al anterior" : null}
              </Text>
              {qrTtl === 0 && (
                <Button
                  variant="light"
                  leftSection={<BiRefresh size={16} />}
                  onClick={() => connectSession(false)}
                >
                  Regenerar QR
                </Button>
              )}
            </Stack>
          </Center>
        )}

        {/* INTERMEDIOS SIN QR */}
        {code !== "ready" && !UI_STATUS[code].showQR && !qr && (
          <Center>
            <Loader />
          </Center>
        )}

        {/* ACCIONES cuando está READY */}
        {code === "ready" && (
          <Group justify="center" mt="sm">
            <Button
              variant="default"
              onClick={handleRestart}
              loading={loadingRestart}
            >
              Reiniciar
            </Button>
            <Button
              variant="default"
              onClick={handleSendTest}
              loading={loadingSend}
            >
              Probar envío
            </Button>
            <Button
              color="red"
              onClick={handleLogout}
              leftSection={<BiX size={16} />}
              loading={loadingLogout}
            >
              Cerrar sesión
            </Button>
          </Group>
        )}

        <Divider my="xs" />

        {/* AYUDA RÁPIDA / TROUBLESHOOTING */}
        <Stack gap={4}>
          <Text fw={600}>¿No aparece el QR o se queda en “Conectando…”?</Text>
          <Text size="sm">
            1. Pulsa <Kbd>Forzar nueva sesión</Kbd> para borrar credenciales
            caducadas y generar un QR nuevo.
          </Text>
          <Text size="sm">
            2. Si cambiaste de celular, simplemente vuelve a escanear el QR
            desde tu WhatsApp.
          </Text>
          <Text size="sm">
            3. Si persiste, revisa tu conexión a Internet y que el servidor de
            WhatsApp esté en línea.
          </Text>
          <Text size="xs" c="dimmed">
            Tip: puedes volver aquí en cualquier momento; la sesión permanecerá
            conectada mientras no cierres desde tu WhatsApp.
          </Text>
        </Stack>

        {/* FOOTER */}
        <Text size="xs" c="dimmed">
          Necesitas ayuda? Escríbenos o revisa la guía de instalación.{" "}
          <Anchor size="xs" href="#" onClick={(e) => e.preventDefault()}>
            Ver guía
          </Anchor>
        </Text>
      </Stack>
    </Paper>
  );
};

export default WhatsappOrgSession;
