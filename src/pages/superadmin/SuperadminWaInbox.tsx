// pages/superadmin/SuperadminWaInbox.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Box,
  ScrollArea,
  Badge,
  Loader,
  Textarea,
  Button,
  Divider,
  Paper,
  Switch,
  SegmentedControl,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp, IconCheck, IconChecks, IconAlertTriangle } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import SuperadminNav from "./SuperadminNav";
import {
  getConversations,
  getConversationMessages,
  markConversationRead,
  replyToConversation,
  getPlatformSettings,
  updatePlatformSettings,
  getLines,
  type PlatformWaLine,
  type PlatformConversation,
  type PlatformWaMessage,
  type PlatformSettings,
} from "../../services/platformInboxService";

dayjs.locale("es");

const POLL_MS = 15000;

const SOURCE_LABEL: Record<PlatformWaMessage["source"], string> = {
  inbound: "Recibido",
  retargeting: "Plantilla",
  ai_agent: "Bot IA",
  manual: "Manual",
  alert: "Alerta",
  oficina: "Oficina IA",
};

const SOURCE_COLOR: Record<PlatformWaMessage["source"], string> = {
  inbound: "gray",
  retargeting: "orange",
  ai_agent: "grape",
  manual: "blue",
  alert: "red",
  oficina: "teal",
};

function conversationLabel(c: PlatformConversation) {
  return c.organization?.name || `+${c.phone}`;
}

// Ticks estilo WhatsApp para mensajes salientes: 1 palomita gris (enviado),
// 2 grises (entregado), 2 azules (leído por el destinatario).
function StatusTicks({ status }: { status: PlatformWaMessage["status"] }) {
  if (!status) return null;
  if (status === "failed") {
    return <IconAlertTriangle size={14} color="var(--mantine-color-red-6)" />;
  }
  if (status === "read") {
    return <IconChecks size={14} color="var(--mantine-color-blue-5)" />;
  }
  if (status === "delivered") {
    return <IconChecks size={14} color="var(--mantine-color-gray-6)" />;
  }
  return <IconCheck size={14} color="var(--mantine-color-gray-6)" />;
}

export default function SuperadminWaInbox() {
  const [conversations, setConversations] = useState<PlatformConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlatformWaMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [savingKey, setSavingKey] = useState<keyof PlatformSettings | null>(null);
  const [line, setLine] = useState<PlatformWaLine>("platform");
  const [oficinaConfigured, setOficinaConfigured] = useState(false);

  useEffect(() => {
    getLines()
      .then((lines) => setOficinaConfigured(lines.some((l) => l.id === "oficina" && l.configured)))
      .catch((err) => console.error("Error cargando los números de WhatsApp:", err));
  }, []);

  const handleChangeLine = (value: string) => {
    setLine(value as PlatformWaLine);
    setSelectedPhone(null);
    setMessages([]);
    setConversations([]);
    setLoadingList(true);
  };

  useEffect(() => {
    getPlatformSettings()
      .then(setSettings)
      .catch((err) => {
        console.error("Error cargando la configuración de envíos:", err);
        notifications.show({
          color: "red",
          title: "No se pudo cargar la configuración",
          message: "Los interruptores de envíos automáticos no están disponibles.",
        });
      });
  }, []);

  const handleToggleSetting = async (key: keyof PlatformSettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSavingKey(key);
    try {
      setSettings(await updatePlatformSettings({ [key]: value }));
    } catch (err) {
      console.error("Error guardando la configuración de envíos:", err);
      setSettings(previous);
      notifications.show({ color: "red", title: "No se pudo guardar", message: "Intenta de nuevo." });
    } finally {
      setSavingKey(null);
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations(line);
      setConversations(data);
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
    } finally {
      setLoadingList(false);
    }
  }, [line]);

  const loadThread = useCallback(async (phone: string) => {
    setLoadingThread(true);
    try {
      const data = await getConversationMessages(phone, line);
      setMessages(data);
      // El hilo está abierto — cualquier mensaje entrante (incluido uno que
      // haya llegado justo en este poll) se da por leído de una vez.
      setConversations((prev) => prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c)));
      markConversationRead(phone, line).catch((err) => console.error("Error marcando como leído:", err));
    } catch (err) {
      console.error("Error cargando mensajes:", err);
    } finally {
      setLoadingThread(false);
    }
  }, [line]);

  useEffect(() => {
    void loadConversations();
    const interval = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedPhone) return;
    void loadThread(selectedPhone);
    const interval = setInterval(() => loadThread(selectedPhone), POLL_MS);
    return () => clearInterval(interval);
  }, [selectedPhone, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSelect = (phone: string) => {
    // loadThread (disparado por el efecto de selectedPhone) ya marca como leído.
    setSelectedPhone(phone);
  };

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone) || null;

  const handleSend = async () => {
    if (!selectedPhone || !draft.trim() || sending) return;
    setSending(true);
    try {
      await replyToConversation(selectedPhone, draft.trim(), line);
      setDraft("");
      await loadThread(selectedPhone);
      await loadConversations();
    } catch (err) {
      console.error("Error enviando respuesta:", err);
      notifications.show({
        color: "red",
        title: "No se pudo enviar",
        message: "Revisa que la ventana de 24h siga abierta o intenta de nuevo.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <SuperadminNav />

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="xs">
              <IconBrandWhatsapp size={22} />
              <div>
                <Title order={2}>WhatsApp — Retargeting y soporte</Title>
                <Text c="dimmed" size="sm">
                  {line === "platform"
                    ? "Conversaciones del número oficial de AgenditApp (recordatorios de activación + respuestas de dueños de organización)"
                    : "Número de soporte y ventas: contactos, soporte y mensajes de AgenditApp Oficina IA. Incluye lo que escribes desde el teléfono. Aquí no responde ningún bot."}
                </Text>
              </div>
            </Group>
            {oficinaConfigured && (
              <SegmentedControl
                value={line}
                onChange={handleChangeLine}
                data={[
                  { value: "platform", label: "Número oficial" },
                  { value: "oficina", label: "Soporte y ventas" },
                ]}
              />
            )}
          </Group>
        </Card>

        {line === "platform" && (
        <Card withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm">
            Envíos automáticos desde el número de AgenditApp
          </Text>
          <Stack gap="sm">
            <Switch
              label="Retargeting de activación"
              description="Cada día a las 11:00 a.m.: activa_tu_cuenta, agenda_tu_primera_cita y conecta_tu_whatsapp. No incluye el aviso de trial por vencer."
              checked={settings?.retargetingEnabled ?? false}
              disabled={!settings || savingKey === "retargetingEnabled"}
              onChange={(e) => void handleToggleSetting("retargetingEnabled", e.currentTarget.checked)}
            />
            <Switch
              label="Aviso de prueba por vencer"
              description="trial_por_vencer, 3 días y 1 día antes del fin de la prueba. Apágalo cuando AgenditApp Oficina IA envíe estos mensajes con aprobación humana."
              checked={settings?.trialNudgeEnabled ?? true}
              disabled={!settings || savingKey === "trialNudgeEnabled"}
              onChange={(e) => void handleToggleSetting("trialNudgeEnabled", e.currentTarget.checked)}
            />
            <Switch
              label="Aviso de WhatsApp desconectado por WhatsApp"
              description="Mensaje de texto libre cuando la sesión de una organización se cae. Apagado, la organización igual recibe el aviso por notificación push y dentro de la app."
              checked={settings?.waDisconnectWhatsappAlertEnabled ?? false}
              disabled={!settings || savingKey === "waDisconnectWhatsappAlertEnabled"}
              onChange={(e) => void handleToggleSetting("waDisconnectWhatsappAlertEnabled", e.currentTarget.checked)}
            />
          </Stack>
        </Card>
        )}

        <Card withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
          <Group gap={0} align="stretch" wrap="nowrap" style={{ height: 620 }}>
            {/* Lista de conversaciones */}
            <Box
              w={300}
              style={{
                flexShrink: 0,
                borderRight: "1px solid var(--mantine-color-default-border)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Group justify="space-between" p="sm">
                <Text fw={600} size="sm">
                  Conversaciones
                </Text>
                {loadingList && <Loader size="xs" />}
              </Group>
              <Divider />
              <ScrollArea style={{ flex: 1 }}>
                {conversations.map((c) => (
                  <Box
                    key={c.phone}
                    p="sm"
                    onClick={() => handleSelect(c.phone)}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        c.phone === selectedPhone ? "var(--mantine-color-blue-light)" : "transparent",
                      borderBottom: "1px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Text fw={600} size="sm" truncate style={{ maxWidth: 170 }}>
                        {conversationLabel(c)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {dayjs(c.lastMessageAt).format("DD/MM HH:mm")}
                      </Text>
                    </Group>
                    <Group justify="space-between" wrap="nowrap" gap={4} mt={2}>
                      <Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>
                        {c.lastDirection === "outbound" ? "Tú: " : ""}
                        {c.lastMessage}
                      </Text>
                      {c.unreadCount > 0 && (
                        <Badge size="xs" circle color="red">
                          {c.unreadCount}
                        </Badge>
                      )}
                    </Group>
                  </Box>
                ))}
                {!loadingList && conversations.length === 0 && (
                  <Text c="dimmed" size="sm" ta="center" p="md">
                    Sin conversaciones todavía.
                  </Text>
                )}
              </ScrollArea>
            </Box>

            {/* Hilo de la conversación */}
            <Box style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {!selectedConversation && (
                <Group justify="center" align="center" style={{ flex: 1 }}>
                  <Text c="dimmed" size="sm">
                    Selecciona una conversación
                  </Text>
                </Group>
              )}

              {selectedConversation && (
                <>
                  <Group justify="space-between" p="sm">
                    <div>
                      <Text fw={600} size="sm">
                        {conversationLabel(selectedConversation)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        +{selectedConversation.phone}
                        {selectedConversation.organization?.slug ? ` · ${selectedConversation.organization.slug}` : ""}
                      </Text>
                    </div>
                    {loadingThread && <Loader size="xs" />}
                  </Group>
                  <Divider />
                  <ScrollArea style={{ flex: 1 }} p="sm">
                    <Stack gap="xs">
                      {messages.map((m) => (
                        <Box
                          key={m._id}
                          style={{
                            alignSelf: m.direction === "outbound" ? "flex-end" : "flex-start",
                            maxWidth: "75%",
                          }}
                        >
                          <Paper
                            withBorder
                            p="xs"
                            radius="md"
                            bg={m.direction === "outbound" ? "blue.0" : "gray.0"}
                          >
                            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                              {m.body}
                            </Text>
                          </Paper>
                          <Group gap={4} mt={2} justify={m.direction === "outbound" ? "flex-end" : "flex-start"}>
                            <Badge size="xs" variant="light" color={SOURCE_COLOR[m.source]}>
                              {SOURCE_LABEL[m.source]}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {dayjs(m.createdAt).format("DD/MM HH:mm")}
                            </Text>
                            {m.direction === "outbound" && <StatusTicks status={m.status} />}
                          </Group>
                        </Box>
                      ))}
                      {messages.length === 0 && !loadingThread && (
                        <Text c="dimmed" size="sm" ta="center" mt="md">
                          Sin mensajes en este hilo.
                        </Text>
                      )}
                      <div ref={bottomRef} />
                    </Stack>
                  </ScrollArea>
                  <Divider />
                  <Box p="sm">
                    {!selectedConversation.withinReplyWindow && (
                      <Text size="xs" c="orange.7" mb={4}>
                        Ventana de 24h cerrada — WhatsApp no permite texto libre hasta que{" "}
                        {selectedConversation.organization?.ownerName || "el dueño"} vuelva a escribir.
                      </Text>
                    )}
                    <Group gap="xs" align="flex-end">
                      <Textarea
                        style={{ flex: 1 }}
                        placeholder="Escribe una respuesta..."
                        value={draft}
                        onChange={(e) => setDraft(e.currentTarget.value)}
                        disabled={!selectedConversation.withinReplyWindow || sending}
                        autosize
                        minRows={1}
                        maxRows={4}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                      />
                      <Button
                        onClick={() => void handleSend()}
                        disabled={!selectedConversation.withinReplyWindow || !draft.trim()}
                        loading={sending}
                      >
                        Enviar
                      </Button>
                    </Group>
                  </Box>
                </>
              )}
            </Box>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
