/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
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
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { QRCodeCanvas } from "qrcode.react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../app/store";
import {
  BiCopy,
  BiInfoCircle,
  BiRefresh,
  BiX,
  BiQrScan,
  BiMobile,
} from "react-icons/bi";
import { useWhatsappStatus } from "../../../hooks/useWhatsappStatus";
import type { WaCode } from "../../../utils/waRealtime";
import { updateOrganization } from "../../../services/organizationService";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";
import { notifications } from "@mantine/notifications";
// import { computePrimaryCta } from "../../../utils/waUi";

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
    title: "Esperando vinculación",
    color: "teal",
    showQR: true, // Nota: controlamos la visualización manualmente abajo según el modo
    desc: "Escanea el QR o ingresa el código en tu celular.",
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
    desc: "Tus credenciales caducaron. Vuelve a vincular.",
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
  const dispatch = useDispatch<AppDispatch>();

  const initialClientId =
    (organization as any)?.clientIdWhatsapp || organization?._id || "";

  // Estado del panel de Agente IA
  const [waPhone, setWaPhone] = useState<string>((organization as any)?.waPhone ?? "");
  const [waAgentEnabled, setWaAgentEnabled] = useState<boolean>((organization as any)?.waAgentEnabled ?? false);
  const [savingAgent, setSavingAgent] = useState(false);

  // Hook centralizado
  const {
    // estado
    code,
    reason,
    me,

    // clientId controlado
    clientId,
    setClientId,

    // QR & Pairing
    qr,
    qrMeta,
    qrTtl,
    pairingCode, // <--- Importante: viene del hook actualizado

    // loaders
    loadingPrimary,
    loadingRestart,
    loadingLogout,
    loadingSend,

    // helpers
    // longConnecting,

    // acciones
    connect,
    restart,
    logout,
    sendTest,
  } = useWhatsappStatus(organization?._id, initialClientId);

  // Estado local para UI de conexión
  const [connectMode, setConnectMode] = useState<"qr" | "pairing">("qr");
  const [pairingPhone, setPairingPhone] = useState("");

  const handleSaveAgentConfig = async () => {
    if (!organization?._id) return;
    setSavingAgent(true);
    try {
      await updateOrganization(organization._id, { waPhone: waPhone.trim() || null, waAgentEnabled });
      await dispatch(fetchOrganizationConfig());
      notifications.show({ color: "green", message: "Configuración del agente guardada." });
    } catch {
      notifications.show({ color: "red", message: "Error al guardar. Intenta de nuevo." });
    } finally {
      setSavingAgent(false);
    }
  };

  const ui = UI_STATUS[code];

  // CTA dinámica (principalmente para reconexiones automáticas)
  // const primaryCta = useMemo(
  //   () => computePrimaryCta(code, reason, qrTtl, longConnecting, connect),
  //   [code, reason, qrTtl, longConnecting, connect]
  // );

  // Handler manual para el botón de conectar
  const handleConnect = () => {
    if (connectMode === "pairing") {
      if (!pairingPhone || pairingPhone.length < 7) {
        alert("Por favor ingresa un número válido (ej: 57300...)");
        return;
      }
      // Forzamos nueva sesión enviando el teléfono
      connect({ forceFresh: true, pairingPhone });
    } else {
      // Modo QR normal
      connect({ forceFresh: true });
    }
  };

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
            description="Identificador interno para esta conexión."
            value={clientId}
            onChange={(e) => setClientId(e.currentTarget.value)}
            style={{ flex: 1 }}
            disabled={code === "ready" || code === "connecting"}
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
                  <Progress value={100} striped animated />
                  <Text size="xs" c="dimmed" mt={4}>
                    Conectando con WhatsApp...
                  </Text>
                </Box>
              )}
            </Box>
          </Group>
        </Card>

        <Divider />

        {/* ========================================================= */}
        {/* ZONA DE CONEXIÓN (Solo visible si NO estamos listos)      */}
        {/* ========================================================= */}
        {code !== "ready" && (
          <Box>
            <Text fw={600} mb="xs">
              Método de vinculación
            </Text>

            {/* Selector de Modo */}
            <SegmentedControl
              value={connectMode}
              onChange={(val: any) => setConnectMode(val)}
              data={[
                {
                  label: (
                    <Center>
                      <BiQrScan style={{ marginRight: 6 }} /> Código QR
                    </Center>
                  ),
                  value: "qr",
                },
                {
                  label: (
                    <Center>
                      <BiMobile style={{ marginRight: 6 }} /> Pairing Code
                    </Center>
                  ),
                  value: "pairing",
                },
              ]}
              fullWidth
              mb="md"
              disabled={code === "connecting"}
            />

            {/* --- CASO 1: MODO PAIRING --- */}
            {connectMode === "pairing" && (
              <Stack>
                {!pairingCode ? (
                  /* Paso 1: Pedir teléfono */
                  <>
                    <TextInput
                      label="Número de teléfono"
                      placeholder="573001234567"
                      description="Ingresa el número internacional sin '+' (Ej: 57...)"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.currentTarget.value)}
                      disabled={code === "connecting"}
                    />
                    <Button
                      onClick={handleConnect}
                      loading={loadingPrimary}
                      disabled={!pairingPhone || code === "connecting"}
                      fullWidth
                    >
                      Obtener Código de Vinculación
                    </Button>
                  </>
                ) : (
                  /* Paso 2: Mostrar Código */
                  <Paper withBorder p="lg" bg="gray.0" radius="md">
                    <Stack align="center" gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>
                        CÓDIGO DE VINCULACIÓN
                      </Text>
                      <Title
                        order={1}
                        style={{
                          letterSpacing: "0.2em",
                          fontFamily: "monospace",
                        }}
                      >
                        {pairingCode}
                      </Title>
                      <Text size="xs" c="dimmed" ta="center" maw={300}>
                        En tu celular ve a: <b>Dispositivos vinculados</b> {">"}{" "}
                        <b>Vincular dispositivo</b> {">"}{" "}
                        <b>Vincular con número de teléfono</b>.
                      </Text>
                      <CopyButton value={pairingCode}>
                        {({ copied, copy }) => (
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={copy}
                            color={copied ? "teal" : "blue"}
                            leftSection={
                              copied ? (
                                <CheckIcon size={14} />
                              ) : (
                                <BiCopy size={14} />
                              )
                            }
                          >
                            {copied ? "Copiado" : "Copiar Código"}
                          </Button>
                        )}
                      </CopyButton>
                      <Button
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={() => connect({ forceFresh: true })}
                        mt="xs"
                      >
                        Cancelar / Reintentar
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {/* --- CASO 2: MODO QR --- */}
            {connectMode === "qr" && (
              <Stack align="center">
                {!qr ? (
                  <Button
                    onClick={() => connect({ forceFresh: true })}
                    loading={loadingPrimary}
                    disabled={code === "connecting"}
                    fullWidth
                    variant="light"
                  >
                    Generar Código QR
                  </Button>
                ) : (
                  <Stack align="center" gap={6}>
                    <QRCodeCanvas value={qr} size={240} includeMargin />
                    <Text size="xs" c="gray">
                      {qrMeta?.seq ? `QR #${qrMeta.seq} · ` : null}
                      Expira en {qrTtl}s
                    </Text>
                    {qrTtl === 0 && (
                      <Button
                        variant="light"
                        leftSection={<BiRefresh size={16} />}
                        onClick={() => connect()}
                        size="xs"
                      >
                        Regenerar QR
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        )}

        {/* ACCIONES cuando está READY */}
        {code === "ready" && (
          <Group justify="center" mt="sm">
            <Button
              variant="default"
              onClick={restart}
              loading={loadingRestart}
            >
              Reiniciar Cliente
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

        {/* AGENTE IA */}
        <Box>
          <Title order={5} mb={4}>Agente IA de citas</Title>
          <Text size="sm" c="dimmed" mb="md">
            El agente lee las conversaciones del número de Baileys, detecta solicitudes de cita y confirma los detalles contigo por WhatsApp.
          </Text>
          <Stack gap="sm">
            <TextInput
              label="Número de WhatsApp del negocio (E.164)"
              description='Número que Baileys está leyendo. Ej: +573218104634'
              placeholder="+57300..."
              value={waPhone}
              onChange={(e) => setWaPhone(e.currentTarget.value)}
            />
            <Switch
              label="Activar agente IA"
              description="Cuando está activo, el agente analiza conversaciones y te notifica por WhatsApp para confirmar citas."
              checked={waAgentEnabled}
              onChange={(e) => setWaAgentEnabled(e.currentTarget.checked)}
            />
            <Group justify="flex-end">
              <Button onClick={handleSaveAgentConfig} loading={savingAgent} size="sm">
                Guardar configuración
              </Button>
            </Group>
          </Stack>
        </Box>

        <Divider my="xs" />

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