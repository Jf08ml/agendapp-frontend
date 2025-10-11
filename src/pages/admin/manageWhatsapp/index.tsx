/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
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
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { BiCopy, BiInfoCircle, BiRefresh, BiX } from "react-icons/bi";
import { useWhatsappStatus } from "../../../hooks/useWhatsappStatus";
import type { WaCode } from "../../../utils/waRealtime";
import { computePrimaryCta } from "../../../utils/waUi";

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
// 2) Componente principal
// -----------------------------
const WhatsappOrgSession: React.FC = () => {
  // Organización y prefill del clientId
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );

  const initialClientId =
    (organization as any)?.clientIdWhatsapp || organization?._id || "";

  // Hook centralizado
  const {
    // estado
    code,
    reason,
    me,

    // clientId controlado
    clientId,
    setClientId,

    // QR
    qr,
    qrMeta,
    qrTtl,

    // loaders
    loadingPrimary,
    loadingRestart,
    loadingLogout,
    loadingSend,

    // helpers
    longConnecting,

    // acciones
    connect,
    restart,
    logout,
    sendTest,
  } = useWhatsappStatus(organization?._id, initialClientId);

  // Para la barra de progreso en "connecting"
  const connectingAges = React.useMemo(() => {
    // longConnecting ya te dice si pasaste de 20s;
    // aquí solo hacemos un contador simple para la UI (0..20s)
    // Nota: si quieres el contador exacto, podrías levantarlo dentro del hook.
    return 0; // mantenemos la UI existente sin cronómetro “real”; puedes retirarlo si prefieres
  }, [code]);

  // CTA dinámica
  const primaryCta = useMemo(
    () => computePrimaryCta(code, reason, qrTtl, longConnecting, connect),
    [code, reason, qrTtl, longConnecting, connect]
  );

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
                    Conectando…
                  </Text>
                </Box>
              )}
            </Box>

            {/* CTA primaria dinámica (si aplica) */}
            {primaryCta && (
              <Button
                loading={loadingPrimary}
                color={ui.color}
                onClick={primaryCta.onClick}
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
                  onClick={() => connect()}
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
              onClick={restart}
              loading={loadingRestart}
            >
              Reiniciar
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                const phone = prompt(
                  "Número E.164 (ej: 57300XXXXXXX):"
                )?.trim();
                if (phone) await sendTest(phone);
              }}
              loading={loadingSend}
            >
              Probar envío
            </Button>
            <Button
              color="red"
              onClick={logout}
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
          ¿Necesitas ayuda? Escríbenos o revisa la guía de instalación.{" "}
          <Anchor size="xs" href="#" onClick={(e) => e.preventDefault()}>
            Ver guía
          </Anchor>
        </Text>
      </Stack>
    </Paper>
  );
};

export default WhatsappOrgSession;
