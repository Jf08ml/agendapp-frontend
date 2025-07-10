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
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../app/store";
import { updateOrganization } from "../../../services/organizationService";
import { updateOrganizationState } from "../../../features/organization/sliceOrganization";
import { FaCheck } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";
import { BiInfoCircle } from "react-icons/bi";

const BACKEND_URL = import.meta.env.VITE_API_URL_WHATSAPP;

const WhatsappOrgSession: React.FC = () => {
  const dispatch = useDispatch();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Para el formulario de envío de mensajes
  const [phone, setPhone] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  // Estados de WhatsApp session
  const [clientId, setClientId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  // CLAVE: Forzar ciclo de reconexión tras cierre de sesión o expiración
  const [sessionCycleKey, setSessionCycleKey] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);

  // Detecta cambios en la organización, limpia estados y determina el clientId a usar
  useEffect(() => {
    if (organization) {
      // Si no hay clientIdWhatsapp, usamos el _id
      const id = organization.clientIdWhatsapp || organization._id || "";
      setClientId(id);
      setStatus("");
      setQr("");
      setError("");
      setSessionCycleKey((prev) => prev + 1); // Fuerza un nuevo ciclo de conexión
    }
  }, [organization?.clientIdWhatsapp, organization?._id]);

  // WebSocket de sesión WhatsApp (reinicia cuando cambia clientId o ciclo)
  useEffect(() => {
    if (!clientId) return;

    setStatus("Conectando...");
    setQr("");
    setError("");

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket: Socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    axios.post(`${BACKEND_URL}/api/session`, { clientId }).catch(() => {
      setError("Error conectando con la API de WhatsApp");
    });

    socket.on("connect", () => {
      socket.emit("join", { clientId });
    });

    socket.on("qr", (data: { qr: string }) => setQr(data.qr));
    socket.on("status", (data: { status: string }) => {
      setStatus(data.status);

      if (data.status === "ready") setQr("");
      if (data.status === "auth_failure") {
        setError("Error de autenticación, intenta de nuevo");
        limpiarClientIdEnOrganizacion(
          "Error de autenticación. Vuelve a escanear el QR para conectar."
        );
      }
      if (data.status === "disconnected") {
        setError("Sesión desconectada o expirada.");
        limpiarClientIdEnOrganizacion(
          "Tu sesión de WhatsApp ha expirado o se cerró desde el teléfono."
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [clientId, sessionCycleKey, BACKEND_URL]);

  // Cuando la sesión está lista ("ready"), guarda el clientId en la organización si no estaba guardado
  useEffect(() => {
    const guardarClientId = async () => {
      if (
        status === "ready" &&
        organization &&
        organization.clientIdWhatsapp !== clientId &&
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
  }, [status, clientId, organization, dispatch]);

  // Limpiar clientIdWhatsapp de la organización cuando la sesión expira/se cierra
  const limpiarClientIdEnOrganizacion = async (razon: string) => {
    if (!organization || !organization.clientIdWhatsapp) return;
    try {
      const updated = await updateOrganization(organization._id!, {
        clientIdWhatsapp: null,
      });
      dispatch(updateOrganizationState(updated!));
      // CLAVE: Forzar el ciclo para reiniciar con el _id y mostrar QR automáticamente
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
      const res = await axios.post(`${BACKEND_URL}/api/send`, {
        clientId,
        phone,
        message,
      });
      showNotification({
        color: "green",
        icon: <FaCheck size={18} />,
        title: "Mensaje enviado",
        message: `ID: ${res.data.id || "ok"}`,
      });
      setMessage("");
    } catch (err: any) {
      showNotification({
        color: "red",
        icon: <IoAlertCircleOutline size={18} />,
        title: "Error al enviar",
        message: err.response?.data?.error || err.message,
      });
    } finally {
      setSending(false);
    }
  };

  // Reconectar manualmente (opcional)
  const handleReconnect = () => {
    setSessionCycleKey((prev) => prev + 1);
  };

  // Cerrar sesión manualmente
  const handleLogoutManual = async () => {
    if (!clientId) return;
    try {
      await axios.post(`${BACKEND_URL}/api/logout`, { clientId });
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

          {/* Mensaje informativo para el usuario */}
          <Alert
            icon={<BiInfoCircle size={18} />}
            color="blue"
            title="¿Para qué se usa esta cuenta de WhatsApp?"
            mb="md"
          >
            Esta cuenta de WhatsApp será usada para enviar{" "}
            <b>mensajes, recordatorios y notificaciones a tus clientes</b> en
            nombre de <b>{organization.name}</b>.
            <br />
            <Text size="sm" c="dimmed" mt={4}>
              <b>¡Debes mantener la sesión conectada!</b> Si la cierras o
              expira, deja de funcionar el envío automático.
            </Text>
          </Alert>

          <Group gap="xs" justify="center">
            <Text fw={500}>ID sesión:</Text>
            <Text c="blue">{clientId}</Text>
          </Group>
          <Text size="sm" c={status === "ready" ? "green" : "gray"}>
            Status: {status}
          </Text>
          {qr && (
            <Stack align="center" gap={0}>
              <QRCodeCanvas value={qr} size={220} style={{ margin: "auto" }} />
              <Text size="xs" c="gray" mt={4}>
                Escanea rápido antes de que expire
              </Text>
            </Stack>
          )}
          {!qr && status !== "ready" && <Loader size="md" />}
          {/* --- Formulario para enviar mensajes --- */}
          {status === "ready" && (
            <Paper
              shadow="xs"
              radius="md"
              p="md"
              withBorder
              mt="md"
              style={{ width: "100%" }}
            >
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

          {/* Botón para cerrar sesión manualmente */}
          {status === "ready" && (
            <Button
              fullWidth
              color="red"
              variant="outline"
              mt="md"
              onClick={handleLogoutManual}
            >
              Cerrar sesión manualmente
            </Button>
          )}

          {/* Botón para reconectar (opcional, si quieres permitirlo) */}
          <Button
            fullWidth
            color="gray"
            variant="outline"
            mt="md"
            onClick={handleReconnect}
          >
            Reconectar
          </Button>
          {error && (
            <Notification color="red" mt="sm">
              {error}
            </Notification>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default WhatsappOrgSession;
