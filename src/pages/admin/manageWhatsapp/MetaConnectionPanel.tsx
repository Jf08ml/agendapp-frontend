import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BiCheckCircle, BiError, BiLinkExternal, BiRefresh, BiX } from "react-icons/bi";
import { connectMetaOrg, disconnectMetaOrg, getMetaStatus, registerMetaPhone } from "../../../services/organizationService";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../app/store";
import { fetchOrganizationConfig } from "../../../features/organization/sliceOrganization";

const FB_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_REDIRECT_ORIGIN = import.meta.env.VITE_META_REDIRECT_ORIGIN || window.location.origin;

interface Props {
  organizationId: string;
}

type MetaStatus = {
  connected: boolean;
  phone?: string;
  wabaId?: string;
  reason?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (opts: object) => void;
      login: (cb: (res: { authResponse?: { code: string; waba_id?: string; phone_number_id?: string } }) => void, opts: object) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const MetaConnectionPanel: React.FC<Props> = ({ organizationId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const sdkReady = useRef(false);

  useEffect(() => {
    loadStatus();
    loadFbSdk();
  }, [organizationId]);

  async function loadStatus() {
    setLoading(true);
    try {
      const s = await getMetaStatus(organizationId);
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  function loadFbSdk() {
    if (document.getElementById("facebook-jssdk")) { sdkReady.current = true; return; }
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: FB_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        cookie: true,
        version: "v25.0",
      });
      sdkReady.current = true;
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }

  function handleConnect() {
    if (!window.FB) {
      notifications.show({ color: "red", message: "SDK de Facebook no cargado. Recarga la página." });
      return;
    }
    setConnecting(true);
    window.FB.login(
      (res) => {
        const code = res.authResponse?.code;
        const wabaId = res.authResponse?.waba_id;
        const phoneNumberId = res.authResponse?.phone_number_id;
        console.log("[MetaConnect] authResponse:", res.authResponse);
        if (!code) {
          setConnecting(false);
          notifications.show({ color: "orange", message: "Conexión cancelada." });
          return;
        }
        (async () => {
          try {
            const redirectUri = META_REDIRECT_ORIGIN.replace(/\/$/, "") + "/";
            await connectMetaOrg(organizationId, code, redirectUri, wabaId, phoneNumberId);
            await dispatch(fetchOrganizationConfig());
            await loadStatus();
            notifications.show({ color: "green", message: "¡Número de WhatsApp Business conectado!" });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al conectar";
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
      }
    );
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      await registerMetaPhone(organizationId);
      notifications.show({ color: "green", message: "Número registrado en la Cloud API. Ya puedes enviar mensajes." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el número";
      notifications.show({ color: "red", message: msg });
    } finally {
      setRegistering(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectMetaOrg(organizationId);
      await dispatch(fetchOrganizationConfig());
      await loadStatus();
      notifications.show({ color: "teal", message: "Conexión Meta desvinculada." });
    } catch {
      notifications.show({ color: "red", message: "Error al desconectar." });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Box>
      <Group justify="space-between" align="center" mb={4}>
        <Title order={5}>WhatsApp Business API (Meta)</Title>
        {loading ? (
          <Loader size="xs" />
        ) : (
          <Badge color={status?.connected ? "green" : "gray"} size="sm">
            {status?.connected ? "Conectado" : "No conectado"}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Conecta tu número de WhatsApp Business con coexistencia — sigue funcionando en la app y también en la API oficial de Meta.
      </Text>

      {status?.connected ? (
        <Stack gap="sm">
          <Alert color="green" icon={<BiCheckCircle size={16} />}>
            <Text size="sm" fw={500}>{status.phone}</Text>
            <Text size="xs" c="dimmed">WABA ID: {status.wabaId}</Text>
          </Alert>
          <Group justify="flex-end">
            <Button
              color="blue"
              variant="subtle"
              size="sm"
              leftSection={<BiRefresh size={16} />}
              onClick={handleRegister}
              loading={registering}
            >
              Registrar número
            </Button>
            <Button
              color="red"
              variant="subtle"
              size="sm"
              leftSection={<BiX size={16} />}
              onClick={handleDisconnect}
              loading={disconnecting}
            >
              Desconectar
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="sm">
          {status?.reason === "token_invalid" && (
            <Alert color="orange" icon={<BiError size={16} />}>
              El token de acceso expiró. Vuelve a conectar.
            </Alert>
          )}
          <Button
            leftSection={<BiLinkExternal size={16} />}
            onClick={handleConnect}
            loading={connecting}
            variant="light"
          >
            Conectar con Facebook
          </Button>
          <Text size="xs" c="dimmed">
            Se abrirá un popup de Facebook para seleccionar tu cuenta de WhatsApp Business.
          </Text>
        </Stack>
      )}
      <Divider mt="md" />
    </Box>
  );
};

export default MetaConnectionPanel;
