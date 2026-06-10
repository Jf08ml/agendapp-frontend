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
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  BiCheckCircle,
  BiError,
  BiLinkExternal,
  BiX,
} from "react-icons/bi";
import { FaFacebook } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";
import {
  activateMetaModo,
  embeddedConnectMeta,
  disconnectMetaOrg,
  getMetaStatus,
} from "../../../services/organizationService";

// ── Constantes ───────────────────────────────────────────────────────────────

const FB_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_REDIRECT_ORIGIN = import.meta.env.VITE_META_REDIRECT_ORIGIN || window.location.origin;

// ── Tipos ────────────────────────────────────────────────────────────────────

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

const MetaConnectionPanel: React.FC<Props> = ({ organizationId }) => {
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

  // ── Tab FB ──
  const [fbStep, setFbStep]     = useState<FbStep>("idle");
  const [connecting, setConnecting] = useState(false);

  // Datos capturados via postMessage del popup de Embedded Signup
  // (waba_id / phone_number_id no siempre vienen en el authResponse de FB.login,
  // sobre todo al reconectar un número que ya tenía permisos otorgados)
  const embeddedDataRef = useRef<{ wabaId?: string; phoneNumberId?: string; error?: string }>({});

  useEffect(() => {
    loadStatus();
    loadFbSdk();
  }, [organizationId]);

  useEffect(() => {
    function handleEmbeddedSignupMessage(event: MessageEvent) {
      if (!event.origin.endsWith("facebook.com")) return;
      let data: {
        type?: string;
        event?: string;
        data?: { waba_id?: string; phone_number_id?: string; error_message?: string; current_step?: string };
      };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

      console.log("[MetaConnect] WA_EMBEDDED_SIGNUP message:", data);

      if (
        data.event === "FINISH" ||
        data.event === "FINISH_ONLY_WABA" ||
        data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        embeddedDataRef.current = {
          wabaId: data.data?.waba_id,
          phoneNumberId: data.data?.phone_number_id,
        };
      } else if (data.event === "ERROR") {
        embeddedDataRef.current = {
          ...embeddedDataRef.current,
          error: data.data?.error_message || `Error en el paso "${data.data?.current_step}"`,
        };
      } else if (data.event === "CANCEL") {
        embeddedDataRef.current = {
          ...embeddedDataRef.current,
          error: `Cancelado en el paso "${data.data?.current_step}"`,
        };
      }
    }
    window.addEventListener("message", handleEmbeddedSignupMessage);
    return () => window.removeEventListener("message", handleEmbeddedSignupMessage);
  }, []);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const s = await getMetaStatus(organizationId);
      setStatus(s);
      if (s.connected) {
        setConnected(true);
      } else if (s.pending) {
        // phoneNumberId guardado pero no activado → mostrar selector de modo
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : "Error al activar");
      notifications.show({ color: "red", message: msg });
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
      setFbStep("idle");
      setPin("");
      setStatus({ connected: false, pending: false });
      notifications.show({ color: "teal", message: "Conexión Meta desvinculada." });
    } catch {
      notifications.show({ color: "red", message: "Error al desconectar." });
    } finally {
      setDisconnecting(false);
    }
  }

  // ── FB Embedded Signup handler ───────────────────────────────────────────

  function handleFbConnect() {
    if (!window.FB) {
      notifications.show({ color: "red", message: "SDK de Facebook no cargado. Recarga la página." });
      return;
    }
    setConnecting(true);
    embeddedDataRef.current = {};
    window.FB.login(
      (res) => {
        console.log("[MetaConnect] FB.login response:", res);
        const fbCode = res.authResponse?.code;
        const wabaId = res.authResponse?.waba_id || embeddedDataRef.current.wabaId;
        const phoneNumberId = res.authResponse?.phone_number_id || embeddedDataRef.current.phoneNumberId;
        if (!fbCode) {
          setConnecting(false);
          notifications.show({
            color: "orange",
            message: embeddedDataRef.current.error || "Conexión cancelada.",
          });
          return;
        }
        (async () => {
          try {
            const redirectUri = META_REDIRECT_ORIGIN.replace(/\/$/, "") + "/";
            await embeddedConnectMeta(organizationId, fbCode, redirectUri, wabaId, phoneNumberId);
            setFbStep("mode");
            notifications.show({ color: "green", message: "Cuenta conectada. Elige el modo de activación." });
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              ?? (err instanceof Error ? err.message : "Error al conectar");
            notifications.show({ color: "red", message: msg });
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
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
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

      {/* ── NO CONECTADO: solo Facebook (único flujo que soporta coexistencia) ── */}
      {!connected && (
        <Stack gap="sm">
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
        </Stack>
      )}

      <Divider mt="md" />
    </Box>
  );
};

export default MetaConnectionPanel;
