import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  PinInput,
  Radio,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  BiCheckCircle,
  BiError,
  BiLinkExternal,
  BiPhone,
  BiX,
} from "react-icons/bi";
import { FaFacebook } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";
import {
  requestMetaVerification,
  verifyMetaCode,
  activateMetaModo,
  embeddedConnectMeta,
  disconnectMetaOrg,
  getMetaStatus,
} from "../../../services/organizationService";

// ── Constantes ───────────────────────────────────────────────────────────────

const FB_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_REDIRECT_ORIGIN = import.meta.env.VITE_META_REDIRECT_ORIGIN || window.location.origin;

const COUNTRY_CODES = [
  { value: "57", label: "🇨🇴 +57 Colombia" },
  { value: "1",  label: "🇺🇸 +1 EE.UU. / CA" },
  { value: "52", label: "🇲🇽 +52 México" },
  { value: "54", label: "🇦🇷 +54 Argentina" },
  { value: "56", label: "🇨🇱 +56 Chile" },
  { value: "51", label: "🇵🇪 +51 Perú" },
  { value: "58", label: "🇻🇪 +58 Venezuela" },
  { value: "593", label: "🇪🇨 +593 Ecuador" },
  { value: "502", label: "🇬🇹 +502 Guatemala" },
  { value: "34", label: "🇪🇸 +34 España" },
  { value: "55", label: "🇧🇷 +55 Brasil" },
];

// ── Tipos ────────────────────────────────────────────────────────────────────

type SmsStep = "phone" | "code" | "mode";
type FbStep  = "idle" | "mode";
type Mode    = "coexistence" | "cloud_only";

type MetaStatus = {
  connected: boolean;
  pending: boolean;
  phone?: string;
  phoneNumberId?: string;
  coexistence?: boolean;
  platformType?: string;
  verifiedName?: string;
  reason?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: object) => void;
      login: (
        cb: (res: { authResponse?: { code: string; waba_id?: string; phone_number_id?: string } }) => void,
        opts: object
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface Props {
  organizationId: string;
  organizationName?: string;
}

// ── Componente de selección de modo (compartido por ambos flujos) ─────────────

interface ModePickerProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  has2sv: "yes" | "no";
  setHas2sv: (v: "yes" | "no") => void;
  pin: string;
  setPin: (p: string) => void;
  generatedPin: string;
  activating: boolean;
  onActivate: () => void;
  onBack: () => void;
}

const ModePicker: React.FC<ModePickerProps> = ({
  mode, setMode, has2sv, setHas2sv, pin, setPin, generatedPin,
  activating, onActivate, onBack,
}) => (
  <Stack gap="md">
    <Alert color="teal" icon={<BiCheckCircle size={16} />}>
      <Text size="sm" fw={500}>¡Número verificado! Elige el modo de conexión.</Text>
    </Alert>

    <Radio.Group value={mode} onChange={(v) => setMode(v as Mode)}>
      <Stack gap="xs">
        <Radio
          value="coexistence"
          label={
            <Box>
              <Text size="sm" fw={500}>Coexistencia (recomendado)</Text>
              <Text size="xs" c="dimmed">
                El número sigue activo en WhatsApp Business App Y en la API de AgenditApp.
                Puedes atender clientes en la app y también enviar campañas y notificaciones automáticas.
              </Text>
            </Box>
          }
        />
        <Radio
          value="cloud_only"
          label={
            <Box>
              <Text size="sm" fw={500}>Solo Cloud API</Text>
              <Text size="xs" c="dimmed">
                El número migra completamente a la API. No podrás usarlo en la app de WhatsApp.
                Solo para negocios 100% automatizados.
              </Text>
            </Box>
          }
        />
      </Stack>
    </Radio.Group>

    {mode === "cloud_only" && (
      <Box p="sm" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
        <Text size="sm" fw={500} mb="xs">Verificación de 2 pasos de WhatsApp</Text>
        <Radio.Group value={has2sv} onChange={(v) => setHas2sv(v as "yes" | "no")}>
          <Group>
            <Radio value="no" label="No tengo PIN" />
            <Radio value="yes" label="Ya tengo PIN de 6 dígitos" />
          </Group>
        </Radio.Group>
        {has2sv === "yes" ? (
          <PinInput length={6} type="number" value={pin} onChange={setPin} mt="sm" placeholder="●" />
        ) : (
          <Alert color="yellow" icon={<BiError size={16} />} mt="sm">
            <Text size="sm">PIN que se asignará: <strong>{generatedPin}</strong></Text>
            <Text size="xs" c="dimmed" mt={4}>Guárdalo — lo necesitarás si cambias de modo en el futuro.</Text>
          </Alert>
        )}
      </Box>
    )}

    <Group>
      <Button variant="subtle" size="sm" onClick={onBack}>← Atrás</Button>
      <Button
        leftSection={<BiLinkExternal size={16} />}
        onClick={onActivate}
        loading={activating}
        disabled={mode === "cloud_only" && has2sv === "yes" && pin.length < 6}
      >
        Activar conexión
      </Button>
    </Group>
  </Stack>
);

// ── Panel principal ───────────────────────────────────────────────────────────

const MetaConnectionPanel: React.FC<Props> = ({ organizationId, organizationName }) => {
  const dispatch = useDispatch<AppDispatch>();
  const sdkReady = useRef(false);

  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connected, setConnected] = useState(false);

  // Estado compartido de modo
  const [mode, setMode]       = useState<Mode>("coexistence");
  const [has2sv, setHas2sv]   = useState<"yes" | "no">("no");
  const [pin, setPin]         = useState("");
  const [activating, setActivating] = useState(false);
  const [generatedPin]        = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Tab SMS ──
  const [smsStep, setSmsStep]   = useState<SmsStep>("phone");
  const [cc, setCc]             = useState("57");
  const [phone, setPhone]       = useState("");
  const [smsMethod, setSmsMethod] = useState<"SMS" | "VOICE">("SMS");
  const [sendingCode, setSendingCode] = useState(false);
  const [code, setCode]         = useState("");
  const [verifying, setVerifying] = useState(false);

  // ── Tab FB ──
  const [fbStep, setFbStep]     = useState<FbStep>("idle");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadStatus();
    loadFbSdk();
  }, [organizationId]);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const s = await getMetaStatus(organizationId);
      setStatus(s);
      if (s.connected) {
        setConnected(true);
      } else if (s.pending) {
        // phoneNumberId guardado pero no activado → mostrar selector de modo
        setSmsStep("mode");
        setFbStep("mode");
      }
    } catch {
      setStatus({ connected: false, pending: false });
    } finally {
      setLoadingStatus(false);
    }
  }

  function loadFbSdk() {
    if (document.getElementById("facebook-jssdk")) { sdkReady.current = true; return; }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: FB_APP_ID, autoLogAppEvents: true, xfbml: true, cookie: true, version: "v25.0" });
      sdkReady.current = true;
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }

  // ── Activar (compartido) ──────────────────────────────────────────────────

  async function handleActivate() {
    setActivating(true);
    try {
      const effectivePin = mode === "cloud_only" ? (has2sv === "yes" ? pin : generatedPin) : undefined;
      if (mode === "cloud_only" && has2sv === "yes" && pin.length < 6) {
        notifications.show({ color: "orange", message: "Ingresa tu PIN de 6 dígitos." });
        return;
      }
      await activateMetaModo(organizationId, mode, effectivePin);
      await dispatch(fetchOrganizationConfig());
      await loadStatus();
      notifications.show({
        color: "green",
        message: mode === "coexistence"
          ? "¡Coexistencia activada! Tu número sigue en la app y también en AgenditApp."
          : "¡Conexión Cloud API activada!",
      });
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al activar" });
    } finally {
      setActivating(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectMetaOrg(organizationId);
      await dispatch(fetchOrganizationConfig());
      setConnected(false);
      setSmsStep("phone");
      setFbStep("idle");
      setCode(""); setPhone(""); setPin("");
      setStatus({ connected: false, pending: false });
      notifications.show({ color: "teal", message: "Conexión Meta desvinculada." });
    } catch {
      notifications.show({ color: "red", message: "Error al desconectar." });
    } finally {
      setDisconnecting(false);
    }
  }

  // ── SMS handlers ─────────────────────────────────────────────────────────

  async function handleSendCode() {
    if (!phone.trim()) { notifications.show({ color: "orange", message: "Ingresa el número." }); return; }
    setSendingCode(true);
    try {
      await requestMetaVerification(organizationId, cc, phone.replace(/\D/g, ""), organizationName, smsMethod);
      setSmsStep("code");
      notifications.show({ color: "green", message: `Código enviado al +${cc}${phone.replace(/\D/g, "")}` });
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al enviar código" });
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length < 6) { notifications.show({ color: "orange", message: "Código incompleto." }); return; }
    setVerifying(true);
    try {
      await verifyMetaCode(organizationId, code);
      setSmsStep("mode");
      notifications.show({ color: "green", message: "¡Número verificado!" });
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Código incorrecto" });
    } finally {
      setVerifying(false);
    }
  }

  // ── FB Embedded Signup handler ───────────────────────────────────────────

  function handleFbConnect() {
    if (!window.FB) {
      notifications.show({ color: "red", message: "SDK de Facebook no cargado. Recarga la página." });
      return;
    }
    setConnecting(true);
    window.FB.login(
      (res) => {
        const fbCode = res.authResponse?.code;
        const wabaId = res.authResponse?.waba_id;
        const phoneNumberId = res.authResponse?.phone_number_id;
        if (!fbCode) {
          setConnecting(false);
          notifications.show({ color: "orange", message: "Conexión cancelada." });
          return;
        }
        (async () => {
          try {
            const redirectUri = META_REDIRECT_ORIGIN.replace(/\/$/, "") + "/";
            await embeddedConnectMeta(organizationId, fbCode, redirectUri, wabaId, phoneNumberId);
            setFbStep("mode");
            notifications.show({ color: "green", message: "Cuenta conectada. Elige el modo de activación." });
          } catch (err: unknown) {
            notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al conectar" });
          } finally {
            setConnecting(false);
          }
        })();
      },
      {
        config_id: import.meta.env.VITE_META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
      }
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <Box>
        <Title order={5} mb={4}>WhatsApp Business API (Meta)</Title>
        <Group><Loader size="xs" /><Text size="sm" c="dimmed">Verificando estado...</Text></Group>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" align="center" mb={4}>
        <Title order={5}>WhatsApp Business API (Meta)</Title>
        <Badge color={connected ? "green" : "gray"} size="sm">
          {connected ? "Conectado" : "No conectado"}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Conecta tu número de WhatsApp Business en modo coexistencia — sigue
        funcionando en la app oficial y también envía mensajes y campañas desde AgenditApp.
      </Text>

      {/* ── CONECTADO ── */}
      {connected && status?.connected && (
        <Stack gap="sm">
          <Alert color="green" icon={<BiCheckCircle size={16} />}>
            <Text size="sm" fw={500}>{status.phone}</Text>
            {status.verifiedName && <Text size="xs" c="dimmed">{status.verifiedName}</Text>}
            <Badge size="xs" color={status.coexistence ? "teal" : "blue"} mt={4}>
              {status.coexistence ? "Modo coexistencia" : "Solo Cloud API"}
            </Badge>
          </Alert>
          <Group justify="flex-end">
            <Button color="red" variant="subtle" size="sm" leftSection={<BiX size={16} />}
              onClick={handleDisconnect} loading={disconnecting}>
              Desconectar
            </Button>
          </Group>
        </Stack>
      )}

      {/* ── NO CONECTADO: dos tabs ── */}
      {!connected && (
        <Tabs defaultValue="sms">
          <Tabs.List mb="md">
            <Tabs.Tab value="sms" leftSection={<BiPhone size={14} />}>
              Código de verificación
            </Tabs.Tab>
            <Tabs.Tab value="fb" leftSection={<FaFacebook size={14} />}>
              Facebook Business
            </Tabs.Tab>
          </Tabs.List>

          {/* ── TAB SMS ── */}
          <Tabs.Panel value="sms">
            {smsStep === "phone" && (
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  Ingresa tu número y te enviaremos un código de verificación.
                  <br />No necesitas cuenta de Facebook.
                </Text>
                <Group align="flex-end" gap="xs">
                  <Select label="País" data={COUNTRY_CODES} value={cc}
                    onChange={(v) => setCc(v ?? "57")} w={200} searchable />
                  <TextInput label="Número (sin código de país)" placeholder="3001234567"
                    value={phone} onChange={(e) => setPhone(e.currentTarget.value)} style={{ flex: 1 }} />
                </Group>
                <Radio.Group label="Método" value={smsMethod}
                  onChange={(v) => setSmsMethod(v as "SMS" | "VOICE")}>
                  <Group mt={4}>
                    <Radio value="SMS" label="SMS" />
                    <Radio value="VOICE" label="Llamada de voz" />
                  </Group>
                </Radio.Group>
                <Button leftSection={<BiPhone size={16} />} onClick={handleSendCode}
                  loading={sendingCode} variant="light">
                  Enviar código de verificación
                </Button>
              </Stack>
            )}

            {smsStep === "code" && (
              <Stack gap="sm">
                <Alert color="blue" icon={<BiPhone size={16} />}>
                  <Text size="sm">
                    Código enviado al <strong>+{cc}{phone.replace(/\D/g, "")}</strong>
                    {" "}vía {smsMethod === "SMS" ? "SMS" : "llamada de voz"}.
                  </Text>
                </Alert>
                <Text size="sm" fw={500}>Ingresa el código de 6 dígitos</Text>
                <PinInput length={6} type="number" value={code} onChange={setCode} size="md" />
                <Group>
                  <Button variant="subtle" size="sm" onClick={() => setSmsStep("phone")}>← Cambiar número</Button>
                  <Button onClick={handleVerifyCode} loading={verifying} disabled={code.length < 6}>Verificar</Button>
                </Group>
                <Text size="xs" c="dimmed">El código expira en 10 minutos.</Text>
              </Stack>
            )}

            {smsStep === "mode" && (
              <ModePicker
                mode={mode} setMode={setMode}
                has2sv={has2sv} setHas2sv={setHas2sv}
                pin={pin} setPin={setPin}
                generatedPin={generatedPin}
                activating={activating}
                onActivate={handleActivate}
                onBack={() => setSmsStep("phone")}
              />
            )}
          </Tabs.Panel>

          {/* ── TAB FACEBOOK ── */}
          <Tabs.Panel value="fb">
            {fbStep === "idle" && (
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  Conecta tu cuenta de WhatsApp Business mediante Facebook.
                  El número se vincula a tu propio WABA y tú gestionas tu facturación con Meta directamente.
                </Text>
                <Button
                  leftSection={<FaFacebook size={16} />}
                  onClick={handleFbConnect}
                  loading={connecting}
                  variant="light"
                  color="blue"
                >
                  Conectar con Facebook
                </Button>
                <Text size="xs" c="dimmed">
                  Se abrirá un popup de Facebook para seleccionar tu número de WhatsApp Business.
                </Text>
              </Stack>
            )}

            {fbStep === "mode" && (
              <ModePicker
                mode={mode} setMode={setMode}
                has2sv={has2sv} setHas2sv={setHas2sv}
                pin={pin} setPin={setPin}
                generatedPin={generatedPin}
                activating={activating}
                onActivate={handleActivate}
                onBack={() => setFbStep("idle")}
              />
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      <Divider mt="md" />
    </Box>
  );
};

export default MetaConnectionPanel;
