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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import SuperadminNav from "./SuperadminNav";
import {
  getConversations,
  getConversationMessages,
  markConversationRead,
  replyToConversation,
  type PlatformConversation,
  type PlatformWaMessage,
} from "../../services/platformInboxService";

dayjs.locale("es");

const POLL_MS = 15000;

const SOURCE_LABEL: Record<PlatformWaMessage["source"], string> = {
  inbound: "Recibido",
  retargeting: "Plantilla",
  ai_agent: "Bot IA",
  manual: "Manual",
};

const SOURCE_COLOR: Record<PlatformWaMessage["source"], string> = {
  inbound: "gray",
  retargeting: "orange",
  ai_agent: "grape",
  manual: "blue",
};

function conversationLabel(c: PlatformConversation) {
  return c.organization?.name || `+${c.phone}`;
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

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (phone: string) => {
    setLoadingThread(true);
    try {
      const data = await getConversationMessages(phone);
      setMessages(data);
    } catch (err) {
      console.error("Error cargando mensajes:", err);
    } finally {
      setLoadingThread(false);
    }
  }, []);

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
    setSelectedPhone(phone);
    const convo = conversations.find((c) => c.phone === phone);
    if (convo && convo.unreadCount > 0) {
      setConversations((prev) => prev.map((c) => (c.phone === phone ? { ...c, unreadCount: 0 } : c)));
      markConversationRead(phone).catch((err) => console.error("Error marcando como leído:", err));
    }
  };

  const selectedConversation = conversations.find((c) => c.phone === selectedPhone) || null;

  const handleSend = async () => {
    if (!selectedPhone || !draft.trim() || sending) return;
    setSending(true);
    try {
      await replyToConversation(selectedPhone, draft.trim());
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
          <Group gap="xs">
            <IconBrandWhatsapp size={22} />
            <div>
              <Title order={2}>WhatsApp — Retargeting y soporte</Title>
              <Text c="dimmed" size="sm">
                Conversaciones del número oficial de AgenditApp (recordatorios de activación + respuestas de dueños de organización)
              </Text>
            </div>
          </Group>
        </Card>

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
