/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Group,
  Loader,
  Button,
  TextInput,
  Notification,
  Alert,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import io, { Socket } from "socket.io-client";
import axiosBase from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../app/store";
import { updateOrganization } from "../../../services/organizationService";
import { updateOrganizationState } from "../../../features/organization/sliceOrganization";
import { FaCheck } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";
import { BiInfoCircle } from "react-icons/bi";

// ===================== CONFIG =====================
const BASE_URL = (import.meta as any).env.VITE_API_URL_WHATSAPP as string;
const API_KEY = (import.meta as any).env.VITE_API_KEY as string;

// Axios con x-api-key por defecto
const api = axiosBase.create({
  baseURL: BASE_URL?.replace(/\/$/, "") ?? "",
  headers: { "x-api-key": API_KEY },
});
// ===================================================

// ---- Mapeo de estados normalizados (code -> UI) ----
type Code =
  | "connecting"
  | "waiting_qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "reconnecting"
  | "error";

const UI_STATUS: Record<
  Code,
  {
    title: string;
    color: "blue" | "teal" | "green" | "orange" | "red" | "gray";
    description?: string;
    showQR?: boolean;
    canSend?: boolean;
    showReconnect?: boolean;
    showRestart?: boolean;
  }
> = {
  connecting: {
    title: "Conectando…",
    color: "blue",
    description: "Estableciendo sesión.",
  },
  waiting_qr: {
    title: "Sesión sin autenticación",
    color: "teal",
    description: "Escanea el QR para vincular.",
    showQR: true,
    showReconnect: true,
  },
  authenticated: {
    title: "Autenticado",
    color: "blue",
    description: "Finalizando inicio…",
  },
  ready: {
    title: "Conectado",
    color: "green",
    description: "Todo listo para enviar.",
    canSend: true,
    showRestart: true,
  },
  disconnected: {
    title: "Sesión desconectada",
    color: "orange",
    description: "Se perdió la conexión. Puedes reconectar.",
    showReconnect: true,
    showRestart: true,
  },
  auth_failure: {
    title: "Error de autenticación",
    color: "red",
    description: "Vuelve a escanear el QR.",
    showQR: true,
    showReconnect: true,
  },
  reconnecting: {
    title: "Reconectando…",
    color: "blue",
    description: "Intentando recuperar la sesión.",
  },
  error: {
    title: "Error",
    color: "red",
    description: "Algo salió mal. Intenta de nuevo.",
    showReconnect: true,
    showRestart: true,
  },
};

const WhatsappOrgSession: React.FC = () => {
  const dispatch = useDispatch();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Formulario de envío
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Estado de la sesión
  const [clientId, setClientId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Ciclo para forzar reconexión
  const [sessionCycleKey, setSessionCycleKey] = useState<number>(0);

  // TTL del QR (cuenta regresiva)
  const [qrTtl, setQrTtl] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);
  const connected = code === "ready";

  // Detecta cambios en la organización y define clientId base
  useEffect(() => {
    if (!organization) return;
    const id = (organization as any).clientIdWhatsapp || organization._id || "";
    setClientId(id);
    setCode("");
    setReason("");
    setQr("");
    setError("");
    setSessionCycleKey((prev) => prev + 1); // nuevo ciclo
  }, [organization?.clientIdWhatsapp, organization?._id]);

  // Socket.IO (autenticado con apiKey) + creación/reuso de sesión
  useEffect(() => {
    if (!clientId || !BASE_URL || !API_KEY) return;

    setCode("connecting");
    setReason("");
    setQr("");
    setError("");

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket: Socket = io(BASE_URL, {
      transports: ["websocket"],
      auth: { apiKey: API_KEY },
    });
    socketRef.current = socket;

    // Crea/reusa sesión en backend
    api.post(`/api/session`, { clientId }).catch(() => {
      setError("Error conectando con la API de WhatsApp");
    });

    socket.on("connect", () => {
      socket.emit("join", { clientId });
    });

    socket.on("qr", (data: { qr: string }) => {
      setQr(data.qr);
      setCode("waiting_qr");
      setReason("");
    });

    socket.on("status", (data: { code: Code; reason?: string }) => {
      setCode(data.code);
      setReason(data.reason || "");
      if (data.code === "ready") setQr("");
      if (data.code === "auth_failure") {
        setError("Error de autenticación, intenta de nuevo");
        limpiarClientIdEnOrganizacion(
          "Error de autenticación. Vuelve a escanear el QR para conectar."
        );
      }
      if (data.code === "disconnected") {
        setError("Sesión desconectada o expirada.");
        limpiarClientIdEnOrganizacion(
          "Tu sesión de WhatsApp ha expirado o se cerró desde el teléfono."
        );
      }
    });

    socket.on("connect_error", (err) => {
      setError(`Error de socket: ${err.message}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [clientId, sessionCycleKey, BASE_URL, API_KEY]);

  // Sincronizar estado al montar/cambiar clientId (por si el socket tarda)
  useEffect(() => {
    if (!clientId) return;
    api
      .get(`/api/status/${clientId}`)
      .then(({ data }) => {
        if (data?.code) {
          setCode(data.code);
          setReason(data.reason || "");
          if (data.code === "ready") setQr("");
        }
      })
      .catch(() => {});
  }, [clientId]);

  // Guarda clientId en la organización cuando está "ready"
  useEffect(() => {
    const guardarClientId = async () => {
      if (
        code === "ready" &&
        organization &&
        (organization as any).clientIdWhatsapp !== clientId &&
        clientId
      ) {
        try {
          const updated = await updateOrganization(organization._id!, {
            clientIdWhatsapp: clientId,
          });
          dispatch(updateOrganizationState(updated!));
          showNotification({
            color: "green",
            icon: <FaCheck size={18} />,
            title: "¡Sesión conectada!",
            message:
              "La sesión de WhatsApp ha sido autenticada y guardada para esta organización.",
          });
        } catch (err: any) {
          showNotification({
            color: "red",
            icon: <IoAlertCircleOutline size={18} />,
            title: "Error al actualizar la organización",
            message: err?.message || "No se pudo guardar el clientIdWhatsapp.",
          });
        }
      }
    };
    guardarClientId();
  }, [code, clientId, organization, dispatch]);

  // TTL del QR: 60s cada vez que llega QR o el code pasa a waiting_qr
  useEffect(() => {
    if (qr || code === "waiting_qr") setQrTtl(60);
  }, [qr, code]);

  useEffect(() => {
    if (!qrTtl) return;
    const t = setInterval(() => setQrTtl((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [qrTtl]);

  // Limpia el clientIdWhatsapp en DB cuando expira/desconecta/autenticación falla
  const limpiarClientIdEnOrganizacion = async (razon: string) => {
    if (!organization || !(organization as any).clientIdWhatsapp) return;
    try {
      const updated = await updateOrganization(organization._id!, {
        clientIdWhatsapp: null,
      });
      dispatch(updateOrganizationState(updated!));
      // Forzar ciclo para volver a usar el _id y mostrar QR
      setSessionCycleKey((prev) => prev + 1);
      showNotification({
        color: "orange",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Sesión cerrada",
        message: razon,
      });
    } catch (err: any) {
      showNotification({
        color: "red",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Error al actualizar la organización",
        message: err?.message || "No se pudo limpiar el clientIdWhatsapp.",
      });
    }
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!phone || !message) {
      showNotification({
        color: "red",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Faltan datos",
        message: "Debes ingresar el número y el mensaje",
      });
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/api/send`, {
        clientId,
        phone,
        message,
      });
      showNotification({
        color: "green",
        icon: <FaCheck size={18} />,
        title: "Mensaje enviado",
        message: `ID: ${res.data?.id || "ok"} (intento ${res.data?.attempt || 1})`,
      });
      setMessage("");
    } catch (err: any) {
      showNotification({
        color: "red",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Error al enviar",
        message: err?.response?.data?.error || err.message,
      });
    } finally {
      setSending(false);
    }
  };

  // Reconectar (fuerza nuevo ciclo)
  const handleReconnect = () => {
    setSessionCycleKey((prev) => prev + 1);
  };

  // Reiniciar sesión (suave, sin perder login)
  const handleRestart = async () => {
    if (!clientId) return;
    try {
      await api.post(`/api/restart`, { clientId });
      showNotification({
        color: "blue",
        title: "Reinicio solicitado",
        message: "Intentando recuperar la sesión…",
      });
      setSessionCycleKey((p) => p + 1);
    } catch (err: any) {
      showNotification({
        color: "red",
        title: "No se pudo reiniciar",
        message: err?.response?.data?.error || err.message,
      });
    }
  };

  // Logout manual (borra credenciales: requerirá QR)
  const handleLogoutManual = async () => {
    if (!clientId) return;
    try {
      await api.post(`/api/logout`, { clientId });
      limpiarClientIdEnOrganizacion("Sesión cerrada manualmente.");
    } catch (err: any) {
      showNotification({
        color: "red",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Error cerrando sesión",
        message: err?.message || "No se pudo cerrar la sesión correctamente.",
      });
    }
  };

  if (!organization) {
    return (
      <Container size="xs" mt={40}>
        <Paper shadow="md" radius="md" p="xl" withBorder>
          <Stack gap="md" align="center">
            <Title order={3}>No hay organización seleccionada</Title>
            <Text size="sm" c="gray">
              Debes cargar una organización para conectar WhatsApp.
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const ui = UI_STATUS[(code as Code) || "connecting"];

  return (
    <Container size="xs" mt={40}>
      <Paper shadow="md" radius="md" p="xl" withBorder>
        <Stack gap="md" align="center">
          <Title order={3}>
            WhatsApp para la organización{" "}
            <Text span c="blue">
              {organization.name}
            </Text>
          </Title>

          <Alert
            icon={<BiInfoCircle size={18} />}
            color={ui.color}
            title={ui.title}
            mb="md"
          >
            <Text size="sm">{ui.description}</Text>
            {reason && (
              <Text size="xs" c="dimmed" mt={6}>
                Detalle: {reason}
              </Text>
            )}
            <Text size="sm" c="dimmed" mt={8}>
              <b>¡Debes mantener la sesión conectada!</b> Si la cierras o
              expira, deja de funcionar el envío automático.
            </Text>
          </Alert>

          {/* Estado visible */}
          <Text size="sm" c={code === "ready" ? "green" : "gray"}>
            Estado: {ui.title}
          </Text>

          {/* QR cuando corresponde */}
          {ui.showQR && qr && (
            <>
              <Alert
                color="teal"
                title="Escanea este código QR con tu WhatsApp"
                mb="md"
                style={{ maxWidth: 400, width: "100%" }}
              >
                <Text size="sm">
                  <b>1. Abre WhatsApp</b> en tu teléfono.
                  <br />
                  <b>
                    2. Ve a <u>Menú</u> <span style={{ fontWeight: 700 }}>⋮</span> {">"}{" "}
                    <u>Dispositivos vinculados</u> (Android) o{" "}
                    <u>Configuración {">"} Dispositivos vinculados</u> (iPhone).
                  </b>
                  <br />
                  <b>
                    3. Pulsa <u>Vincular un dispositivo</u> y escanea el QR de esta pantalla.
                  </b>
                </Text>
                <Text size="xs" c="dimmed" mt={8}>
                  <b>Importante:</b> Mantén tu teléfono con conexión a internet
                  para no perder la sesión.
                </Text>
              </Alert>
              <Stack align="center" gap={0}>
                <QRCodeCanvas value={qr} size={220} style={{ margin: "auto" }} />
                <Text size="xs" c="gray" mt={4}>
                  El código expira en {qrTtl}s
                </Text>
                <Button
                  mt="xs"
                  variant="light"
                  onClick={() => api.post(`/api/session`, { clientId })}
                >
                  Regenerar QR
                </Button>
              </Stack>
            </>
          )}

          {/* Espera mientras no hay QR ni ready */}
          {!ui.showQR && !qr && code !== "ready" && <Loader size="md" />}

          {/* Formulario de envío cuando está listo */}
          {ui.canSend && (
            <Paper shadow="xs" radius="md" p="md" withBorder mt="md" style={{ width: "100%" }}>
              <Stack gap="sm">
                <TextInput
                  label="Número de teléfono (incluye país, ej: 57300xxxxxxx)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <TextInput
                  label="Mensaje"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && message) handleSendMessage();
                  }}
                />
                <Button
                  fullWidth
                  color="blue"
                  onClick={handleSendMessage}
                  loading={sending}
                  disabled={!phone || !message}
                >
                  Enviar mensaje
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Acciones contextuales */}
          {ui.showRestart && (
            <Button fullWidth color="yellow" variant="outline" mt="md" onClick={handleRestart}>
              Reiniciar sesión (suave)
            </Button>
          )}

          {ui.showReconnect && (
            <Button fullWidth color="gray" variant="outline" mt="md" onClick={handleReconnect}>
              Reconectar
            </Button>
          )}

          {connected && (
            <Button fullWidth color="red" variant="outline" mt="md" onClick={handleLogoutManual}>
              Cerrar sesión manualmente
            </Button>
          )}

          {error && (
            <Notification color="red" mt="sm">
              {error}
            </Notification>
          )}
        </Stack>

        <Group gap="xs" mt="sm" justify="center">
          <Text fw={500}>ID sesión:</Text>
          <Text c="blue">{clientId}</Text>
        </Group>
      </Paper>
    </Container>
  );
};

export default WhatsappOrgSession;
