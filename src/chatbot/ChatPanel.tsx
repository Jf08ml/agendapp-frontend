import { useEffect, useRef, useState, KeyboardEvent } from "react";
import {
  Box,
  Text,
  Textarea,
  ActionIcon,
  ScrollArea,
  Loader,
  Stack,
  Paper,
  Flex,
  ThemeIcon,
  Badge,
  Tooltip,
  Group,
  Button,
  Modal,
  SegmentedControl,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconSend,
  IconRobot,
  IconFlask,
  IconMessagePlus,
  IconX,
  IconNotes,
  IconCheck,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import { useChatbot } from "./useChatbot";
import { sendFeedback, FeedbackType } from "./chatbotService";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

interface ChatPanelProps {
  onClose: () => void;
  onInvalidate?: (invalidates: string[]) => void;
  autoStart?: boolean;
  onAutoStartDone?: () => void;
}

const QUICK_ACTIONS = [
  "¿Cuántas citas hay hoy?",
  "¿Cuánto facturé este mes?",
  "Agregar un nuevo servicio",
];

export default function ChatPanel({ onClose, onInvalidate, autoStart, onAutoStartDone }: ChatPanelProps) {
  const org = useSelector((s: RootState) => s.organization.organization);
  const color = org?.branding?.primaryColor || "#1C3461";
  const agentName = org?.aiAssistantName || "Roxi";

  const { messages, loading, error, send, reset, sessionId } = useChatbot({ onInvalidate, autoStart, onAutoStartDone, agentName });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Feedback ──────────────────────────────────────────────
  const [feedbackOpen, { open: openFeedback, close: closeFeedback }] = useDisclosure(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("sugerencia");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setFeedbackLoading(true);
    try {
      await sendFeedback({ type: feedbackType, message: feedbackMessage, sessionId });
      setFeedbackSent(true);
      setFeedbackMessage("");
    } catch {
      // error silencioso — el feedback no es crítico
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleCloseFeedback = () => {
    closeFeedback();
    // resetear el estado después de la animación de cierre
    setTimeout(() => { setFeedbackSent(false); setFeedbackMessage(""); }, 300);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    send(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showSuggestions = messages.length <= 1 && !loading && !autoStart;

  return (
    <Flex direction="column" h="100%" style={{ background: "var(--mantine-color-gray-0)" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <Box bg={color} px="lg" py="sm" style={{ flexShrink: 0 }}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap="sm">
            <ThemeIcon
              size={40} radius="xl"
              style={{ background: "rgba(255,255,255,0.18)", flexShrink: 0 }}
            >
              <IconRobot size={22} color="white" />
            </ThemeIcon>
            <Box>
              <Flex align="center" gap={6}>
                <Text fw={700} c="white" size="md" lh={1.2}>{agentName}</Text>
                <Badge size="xs" color="yellow" variant="light"
                  style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Beta
                </Badge>
              </Flex>
              <Text c="white" size="xs" style={{ opacity: 0.7, lineHeight: 1.3 }}>
                Asistente de administración
              </Text>
            </Box>
          </Flex>

          <Flex gap={4} align="center">
            <Tooltip label="Nueva conversación" withArrow position="bottom">
              <ActionIcon
                variant="subtle" color="white"
                onClick={reset}
                disabled={messages.length <= 1 || loading}
                aria-label="Nueva conversación"
              >
                <IconMessagePlus size={20} />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              variant="subtle" color="white"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <IconX size={20} />
            </ActionIcon>
          </Flex>
        </Flex>
      </Box>

      {/* ── Aviso beta + botón de feedback ──────────────────────── */}
      <Flex
        align="center" justify="space-between" gap={6} px="md" py={5}
        bg="yellow.0"
        style={{ flexShrink: 0, borderBottom: "1px solid var(--mantine-color-yellow-2)" }}
      >
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          <IconFlask size={12} color="var(--mantine-color-yellow-7)" style={{ flexShrink: 0 }} />
          <Text size="xs" c="yellow.8" lh={1.3} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Función en fase beta · Tu retroalimentación es bienvenida
          </Text>
        </Flex>
        <Tooltip label="Enviar feedback o reporte" withArrow position="bottom">
          <Button
            size="compact-xs"
            variant="light"
            color="yellow"
            leftSection={<IconNotes size={11} />}
            onClick={openFeedback}
            style={{ flexShrink: 0, fontWeight: 600, fontSize: rem(10) }}
          >
            Feedback
          </Button>
        </Tooltip>
      </Flex>

      {/* ── Modal de feedback ───────────────────────────────────── */}
      <Modal
        opened={feedbackOpen}
        onClose={handleCloseFeedback}
        title={
          <Flex align="center" gap="xs">
            <IconNotes size={18} />
            <Text fw={600} size="sm">Enviar feedback sobre {agentName}</Text>
          </Flex>
        }
        centered
        size="sm"
        radius="md"
      >
        {feedbackSent ? (
          <Stack align="center" py="lg" gap="sm">
            <ThemeIcon size={52} radius="xl" color="green" variant="light">
              <IconCheck size={28} />
            </ThemeIcon>
            <Text fw={600} ta="center">¡Gracias por tu feedback!</Text>
            <Text size="sm" c="dimmed" ta="center">
              Tu mensaje nos ayuda a mejorar {agentName} y la plataforma.
            </Text>
            <Button mt="xs" onClick={handleCloseFeedback}>
              Cerrar
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <Box>
              <Text size="xs" c="dimmed" mb={6}>Tipo de feedback</Text>
              <SegmentedControl
                value={feedbackType}
                onChange={(v) => setFeedbackType(v as FeedbackType)}
                fullWidth
                size="xs"
                data={[
                  { label: "🐛  Bug", value: "bug" },
                  { label: "💡  Sugerencia", value: "sugerencia" },
                  { label: "💬  Comentario", value: "comentario" },
                ]}
              />
            </Box>

            <Textarea
              label="Mensaje"
              placeholder={
                feedbackType === "bug"
                  ? "Describe qué ocurrió y cómo reproducirlo..."
                  : feedbackType === "sugerencia"
                  ? "¿Qué mejoraría tu experiencia con el asistente?"
                  : "Cuéntanos lo que piensas..."
              }
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.currentTarget.value)}
              minRows={3}
              maxRows={6}
              autosize
              required
              maxLength={2000}
            />
            <Text size="xs" c="dimmed" ta="right" mt={-10}>
              {feedbackMessage.length}/2000
            </Text>

            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" color="gray" onClick={handleCloseFeedback}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitFeedback}
                loading={feedbackLoading}
                disabled={!feedbackMessage.trim()}
                leftSection={<IconSend size={14} />}
              >
                Enviar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ── Mensajes ────────────────────────────────────────────── */}
      <ScrollArea flex={1} py="xl">
        <Box maw={720} mx="auto" px="md">
          <Stack gap="lg">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                /* Mensaje del usuario */
                <Flex key={i} justify="flex-end">
                  <Paper
                    px="md" py="sm"
                    maw="75%"
                    style={{
                      background: color,
                      borderRadius: rem(18),
                      borderBottomRightRadius: rem(4),
                      wordBreak: "break-word",
                    }}
                  >
                    <Text size="sm" c="white" style={{ whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </Text>
                  </Paper>
                </Flex>
              ) : (
                /* Mensaje del agente */
                <Flex key={i} align="flex-start" gap="sm">
                  <ThemeIcon
                    size={34} radius="xl"
                    style={{ background: color, flexShrink: 0, marginTop: 2 }}
                  >
                    <IconRobot size={18} color="white" />
                  </ThemeIcon>
                  <Paper
                    px="md" py="sm"
                    maw="80%"
                    shadow="xs"
                    style={{
                      background: "white",
                      borderRadius: rem(18),
                      borderBottomLeftRadius: rem(4),
                      wordBreak: "break-word",
                    }}
                  >
                    <Text size="sm" c="dark.7" component="div">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: "2px 0" }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                          ul: ({ children }) => <ul style={{ paddingLeft: "1.2rem", margin: "4px 0" }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ paddingLeft: "1.2rem", margin: "4px 0" }}>{children}</ol>,
                          li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </Text>
                  </Paper>
                </Flex>
              )
            )}

            {/* Typing indicator */}
            {loading && (
              <Flex align="flex-start" gap="sm">
                <ThemeIcon
                  size={34} radius="xl"
                  style={{ background: color, flexShrink: 0, marginTop: 2 }}
                >
                  <IconRobot size={18} color="white" />
                </ThemeIcon>
                <Paper
                  px="md" py="sm" shadow="xs"
                  style={{
                    background: "white",
                    borderRadius: rem(18),
                    borderBottomLeftRadius: rem(4),
                  }}
                >
                  <Loader size="xs" color={color} type="dots" />
                </Paper>
              </Flex>
            )}

            {error && (
              <Flex justify="center">
                <Text size="xs" c="red.5">{error}</Text>
              </Flex>
            )}

            {/* Sugerencias rápidas — solo al inicio */}
            {showSuggestions && (
              <Box mt="md">
                <Text ta="center" size="sm" c="dimmed" mb="sm">
                  ¿En qué puedo ayudarte hoy?
                </Text>
                <Group justify="center" gap="sm">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action}
                      variant="light"
                      size="xs"
                      radius="xl"
                      color="gray"
                      onClick={() => send(action)}
                      style={{ fontWeight: 500 }}
                    >
                      {action}
                    </Button>
                  ))}
                </Group>
              </Box>
            )}

            <div ref={bottomRef} />
          </Stack>
        </Box>
      </ScrollArea>

      {/* ── Input ───────────────────────────────────────────────── */}
      <Box
        bg="white"
        px="md" pb="md" pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-gray-2)", flexShrink: 0 }}
      >
        <Box maw={720} mx="auto">
          <Paper
            radius="xl"
            style={{
              border: `1.5px solid var(--mantine-color-gray-3)`,
              overflow: "hidden",
              transition: "border-color 0.15s",
            }}
          >
            <Flex align="flex-end" gap="xs" px="md" py="xs">
              <Textarea
                flex={1}
                placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para salto de línea)"
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autosize
                minRows={1}
                maxRows={5}
                variant="unstyled"
                size="sm"
                styles={{
                  input: {
                    padding: "6px 0",
                    fontSize: rem(14),
                    resize: "none",
                  },
                }}
              />
              <ActionIcon
                onClick={handleSend}
                disabled={!input.trim() || loading}
                radius="xl"
                size={36}
                mb={4}
                aria-label="Enviar"
                style={{
                  background: input.trim() && !loading ? color : "var(--mantine-color-gray-2)",
                  transition: "background 0.15s",
                  flexShrink: 0,
                }}
              >
                <IconSend size={16} color={input.trim() && !loading ? "white" : "var(--mantine-color-gray-5)"} />
              </ActionIcon>
            </Flex>
          </Paper>
          <Text ta="center" size="xs" c="dimmed" mt={6}>
            {agentName} puede cometer errores. Verifica la información importante.
          </Text>
        </Box>
      </Box>

    </Flex>
  );
}
