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
  Button,
  Badge,
  ThemeIcon,
  Alert,
  Title,
  Center,
  Divider,
  UnstyledButton,
  Modal,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconSend,
  IconRobot,
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
  IconCalendarCheck,
  IconHeart,
  IconNotes,
  IconMoodSmile,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  sendBookingMessage,
  sendBookingFeedback,
  markBookingConverted,
  BookingChatMessage,
  BookingPayload,
} from "../../services/bookingChatService";
import { createMultipleReservations } from "../../services/reservationService";

interface BookingChatPanelProps {
  onBack: () => void;
  preselectedService?: { _id: string; name: string };
}

const buildGreeting = (
  agentName: string,
  orgName: string,
  identifierField: "phone" | "email" | "documentId"
) => {
  const contactLabel =
    identifierField === "email"
      ? "correo electrónico"
      : identifierField === "documentId"
      ? "número de documento"
      : "número de teléfono (con código de país, ej: +573001234567)";

  return `¡Hola! Soy **${agentName}**, el asistente de reservas de **${orgName}**. 😊

Para agilizar tu reserva, cuéntame en un solo mensaje:
- **¿Qué servicio(s) necesitas?**
- **¿Para cuándo? (día y hora aproximada)**
- **Tu nombre completo**
- **Tu ${contactLabel}**

Por ejemplo: *"Corte de cabello, mañana por la tarde, Juan Pérez, +573001234567"*

¡Con eso te agendo en un momento!`;
};

const RATINGS: { value: 1|3|5; emoji: string; label: string }[] = [
  { value: 5, emoji: "😊", label: "¡Excelente!" },
  { value: 3, emoji: "😐", label: "Regular"     },
  { value: 1, emoji: "😞", label: "Mejorable"   },
];

export default function BookingChatPanel({ onBack, preselectedService }: BookingChatPanelProps) {
  const org = useSelector((s: RootState) => s.organization.organization);
  const color = org?.branding?.primaryColor || "#1C3461";
  const agentName = org?.aiAssistantName || "Roxi";

  const identifierField = (org?.clientFormConfig?.identifierField as "phone" | "email" | "documentId") ?? "phone";

  const [messages, setMessages] = useState<BookingChatMessage[]>([
    { role: "assistant", content: buildGreeting(agentName, org?.name ?? "", identifierField) },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingPayload, setPendingPayload] = useState<BookingPayload | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reservationDone, setReservationDone] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingPayload]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  useEffect(() => {
    if (preselectedService) {
      setInput(`Quiero reservar ${preselectedService.name}, `);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: BookingChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const greeting = buildGreeting(agentName, org?.name ?? "", identifierField);
      const history = next.filter(
        (m) => !(m.role === "assistant" && m.content === greeting)
      );
      const res = await sendBookingMessage(history, sessionId.current);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.bookingPayload) setPendingPayload(res.bookingPayload);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleConfirmReservation = async () => {
    if (!pendingPayload || confirming) return;
    setConfirming(true);
    setReservationError(null);
    try {
      await createMultipleReservations({ ...(pendingPayload as any), source: "ai_chatbot" });
      // Marcar conversión en el ChatLog (fire-and-forget, no afecta la UX)
      markBookingConverted(sessionId.current).catch(() => {});
      setReservationDone(true);
      setPendingPayload(null);
    } catch (err: any) {
      setReservationError(
        err?.response?.data?.message || err?.message || "No se pudo crear la reserva. Intenta de nuevo."
      );
    } finally {
      setConfirming(false);
    }
  };

  // ── Modal de feedback (accesible desde el header en cualquier momento) ──
  const [fbOpen, { open: openFb, close: closeFbRaw }] = useDisclosure(false);
  const [fbRating, setFbRating]   = useState<1|3|5|null>(null);
  const [fbComment, setFbComment] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbDone, setFbDone]       = useState(false);

  const closeFb = () => {
    closeFbRaw();
    setTimeout(() => { setFbRating(null); setFbComment(""); setFbDone(false); }, 300);
  };

  const handleModalFeedback = async () => {
    if (!fbRating) return;
    setFbSending(true);
    try {
      await sendBookingFeedback({
        rating: fbRating,
        message: fbComment.trim() || undefined,
        sessionId: sessionId.current,
      });
      setFbDone(true);
      setTimeout(closeFb, 2000);
    } catch {
      // silencioso
    } finally {
      setFbSending(false);
    }
  };

  // ── Estados del widget de satisfacción (pantalla de éxito) ───────────────────
  const [feedbackRating, setFeedbackRating]   = useState<1|3|5|null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone]       = useState(false);

  const handleSendFeedback = async () => {
    if (!feedbackRating) return;
    setFeedbackSending(true);
    try {
      await sendBookingFeedback({
        rating: feedbackRating,
        message: feedbackComment.trim() || undefined,
        sessionId: sessionId.current,
      });
      setFeedbackDone(true);
    } catch {
      // error silencioso — no bloquear el flujo del cliente
    } finally {
      setFeedbackSending(false);
    }
  };

  // ── Pantalla de éxito con feedback de satisfacción ────────
  if (reservationDone) {

    return (
      <Stack align="center" justify="center" gap="lg" py="xl" px="md" mih={400}>

        {/* Confirmación */}
        <Center>
          <ThemeIcon size={72} radius="xl" style={{ background: color }}>
            <IconCheck size={36} color="white" />
          </ThemeIcon>
        </Center>
        <Stack align="center" gap={6}>
          <Title order={3} ta="center">¡Reserva creada!</Title>
          <Text c="dimmed" ta="center" size="sm" maw={300}>
            Tu cita ha sido registrada. Si necesitas cancelar o modificar, el negocio te indicará los pasos.
          </Text>
        </Stack>

        {/* Separador + widget de satisfacción */}
        <Divider w="100%" maw={340} label={
          <Flex align="center" gap={4}>
            <IconHeart size={13} color="var(--mantine-color-pink-5)" />
            <Text size="xs" c="dimmed">Tu opinión nos ayuda a mejorar</Text>
          </Flex>
        } labelPosition="center" />

        {feedbackDone ? (
          <Stack align="center" gap={4}>
            <Text size="xl">🙏</Text>
            <Text fw={600} size="sm" ta="center">¡Gracias por tu opinión!</Text>
            <Text size="xs" c="dimmed" ta="center">Nos ayuda a seguir mejorando {agentName}.</Text>
          </Stack>
        ) : (
          <Stack align="center" gap="sm" w="100%" maw={340}>
            <Text fw={600} size="sm" ta="center">
              ¿Cómo fue tu experiencia con {agentName}?
            </Text>

            {/* Opciones de calificación */}
            <Flex gap="sm" justify="center">
              {RATINGS.map(({ value, emoji, label }) => (
                <UnstyledButton
                  key={value}
                  onClick={() => setFeedbackRating(value)}
                  style={{ textAlign: "center" }}
                >
                  <Stack gap={4} align="center">
                    <Paper
                      p="sm" radius="xl"
                      style={{
                        fontSize: rem(28),
                        lineHeight: 1,
                        border: feedbackRating === value
                          ? `2px solid ${color}`
                          : "2px solid var(--mantine-color-gray-2)",
                        background: feedbackRating === value
                          ? `${color}18`
                          : "var(--mantine-color-gray-0)",
                        transition: "border-color 150ms, background 150ms",
                        cursor: "pointer",
                        width: rem(56),
                        height: rem(56),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {emoji}
                    </Paper>
                    <Text size="xs" c={feedbackRating === value ? "dark" : "dimmed"}
                      fw={feedbackRating === value ? 600 : 400}>
                      {label}
                    </Text>
                  </Stack>
                </UnstyledButton>
              ))}
            </Flex>

            {/* Comentario opcional — aparece al seleccionar */}
            {feedbackRating !== null && (
              <Stack gap="xs" w="100%">
                <Textarea
                  placeholder="¿En qué podemos mejorar? (opcional)"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.currentTarget.value)}
                  autosize minRows={2} maxRows={4}
                  maxLength={500}
                  size="sm"
                  radius="md"
                />
                <Button
                  size="sm"
                  style={{ background: color }}
                  loading={feedbackSending}
                  onClick={handleSendFeedback}
                >
                  Enviar opinión
                </Button>
              </Stack>
            )}
          </Stack>
        )}

        <Button
          variant="subtle" color="gray" size="sm"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
          mt="xs"
        >
          Volver al inicio
        </Button>

      </Stack>
    );
  }

  return (
    <>
    <Flex direction="column" style={{ height: "100%", minHeight: 420 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <Box
        px="md" py="sm"
        style={{
          background: color,
          flexShrink: 0,
          borderRadius: "var(--mantine-radius-md) var(--mantine-radius-md) 0 0",
        }}
      >
        <Flex align="center" gap="sm">
          <ActionIcon variant="transparent" onClick={onBack} aria-label="Volver" style={{ color: "white" }}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <ThemeIcon size={34} radius="xl" style={{ background: "rgba(255,255,255,0.18)", flexShrink: 0 }}>
            <IconRobot size={18} color="white" />
          </ThemeIcon>
          <Box flex={1}>
            <Flex align="center" gap={6}>
              <Text fw={700} c="white" size="sm" lh={1.2}>{agentName}</Text>
              <Badge size="xs" color="yellow" variant="light"
                style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Beta
              </Badge>
            </Flex>
            <Text c="white" size="xs" style={{ opacity: 0.7, lineHeight: 1.3 }}>
              Asistente de reservas
            </Text>
          </Box>
          {/* Botón de feedback — siempre visible */}
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<IconMoodSmile size={14} />}
            onClick={openFb}
            styles={{
              root: { color: "rgba(255,255,255,0.85)", fontWeight: 500, fontSize: rem(11) },
            }}
          >
            ¿Cómo te fue?
          </Button>
        </Flex>
      </Box>

      {/* ── Mensajes ────────────────────────────────────────── */}
      <ScrollArea flex={1} py="sm"
        style={{ background: "var(--mantine-color-gray-0)" }}>
        <Stack gap="md" px="md">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <Flex key={i} justify="flex-end">
                <Paper
                  px="md" py="sm" maw="78%"
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
              <Flex key={i} align="flex-start" gap="sm">
                <ThemeIcon size={32} radius="xl"
                  style={{ background: color, flexShrink: 0, marginTop: 2 }}>
                  <IconRobot size={16} color="white" />
                </ThemeIcon>
                <Paper
                  px="md" py="sm" maw="78%"
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

          {loading && (
            <Flex align="flex-start" gap="sm">
              <ThemeIcon size={32} radius="xl" style={{ background: color, flexShrink: 0, marginTop: 2 }}>
                <IconRobot size={16} color="white" />
              </ThemeIcon>
              <Paper px="md" py="sm" shadow="xs"
                style={{ background: "white", borderRadius: rem(18), borderBottomLeftRadius: rem(4) }}>
                <Loader size="xs" color={color} type="dots" />
              </Paper>
            </Flex>
          )}

          {error && (
            <Flex justify="center">
              <Text size="xs" c="red.5">{error}</Text>
            </Flex>
          )}

          {/* ── Tarjeta de confirmación ────────────────────── */}
          {pendingPayload && !loading && (
            <Box mt="xs">
              <Paper
                withBorder radius="lg" p="md"
                style={{ borderColor: color, borderWidth: 2, background: "white" }}
              >
                <Stack gap="sm">
                  <Flex align="center" gap="xs">
                    <ThemeIcon size={28} radius="xl" style={{ background: color }}>
                      <IconCalendarCheck size={15} color="white" />
                    </ThemeIcon>
                    <Text fw={700} size="sm">¿Confirmas tu reserva?</Text>
                  </Flex>

                  {reservationError && (
                    <Alert color="red" icon={<IconAlertTriangle size={14} />} radius="md" py="xs">
                      <Text size="xs">{reservationError}</Text>
                    </Alert>
                  )}

                  <Flex gap="sm">
                    <Button
                      size="sm" loading={confirming}
                      style={{ background: color }}
                      onClick={handleConfirmReservation}
                      leftSection={<IconCheck size={14} />}
                    >
                      Sí, confirmar
                    </Button>
                    <Button
                      size="sm" variant="default" disabled={confirming}
                      onClick={() => {
                        setPendingPayload(null);
                        setReservationError(null);
                        setMessages((prev) => [...prev, {
                          role: "assistant",
                          content: "Sin problema, ¿deseas cambiar algo o empezar de nuevo?",
                        }]);
                      }}
                    >
                      Modificar
                    </Button>
                  </Flex>
                </Stack>
              </Paper>
            </Box>
          )}

          <div ref={bottomRef} />
        </Stack>
      </ScrollArea>

      {/* ── Input ───────────────────────────────────────────── */}
      <Box
        bg="white" px="md" pb="md" pt="sm"
        style={{ borderTop: "1px solid var(--mantine-color-gray-2)", flexShrink: 0 }}
      >
        <Paper
          radius="xl"
          style={{ border: `1.5px solid var(--mantine-color-gray-3)`, overflow: "hidden" }}
        >
          <Flex align="flex-end" gap="xs" px="md" py="xs">
            <Textarea
              ref={inputRef}
              flex={1}
              placeholder="Escribe un mensaje… (Enter para enviar)"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !!pendingPayload}
              autosize
              minRows={1}
              maxRows={4}
              variant="unstyled"
              size="sm"
              styles={{ input: { padding: "6px 0", fontSize: rem(14), resize: "none" } }}
            />
            <ActionIcon
              onClick={() => send(input)}
              disabled={!input.trim() || loading || !!pendingPayload}
              radius="xl" size={34} mb={4}
              aria-label="Enviar"
              style={{
                background: input.trim() && !loading && !pendingPayload
                  ? color : "var(--mantine-color-gray-2)",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <IconSend size={15}
                color={input.trim() && !loading && !pendingPayload
                  ? "white" : "var(--mantine-color-gray-5)"} />
            </ActionIcon>
          </Flex>
        </Paper>
      </Box>

    </Flex>

    {/* ── Modal de feedback (accesible en cualquier momento) ── */}
    <Modal
          opened={fbOpen}
          onClose={closeFb}
          title={
            <Flex align="center" gap="xs">
              <IconNotes size={17} />
              <Text fw={600} size="sm">¿Cómo fue tu experiencia?</Text>
            </Flex>
          }
          centered size="sm" radius="md"
        >
          {fbDone ? (
            <Stack align="center" py="md" gap="sm">
              <Text size="2xl">🙏</Text>
              <Text fw={600} ta="center">¡Gracias por tu opinión!</Text>
              <Text size="sm" c="dimmed" ta="center">
                Nos ayuda a seguir mejorando {agentName}.
              </Text>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="dimmed" ta="center">
                Tu opinión nos ayuda a mejorar el asistente, aunque no hayas completado una reserva.
              </Text>

              {/* Rating de emojis */}
              <Flex gap="sm" justify="center">
                {RATINGS.map(({ value, emoji, label }) => (
                  <UnstyledButton key={value} onClick={() => setFbRating(value)} style={{ textAlign: "center" }}>
                    <Stack gap={4} align="center">
                      <Paper
                        p="sm" radius="xl"
                        style={{
                          fontSize: rem(26), lineHeight: 1,
                          border: fbRating === value ? `2px solid ${color}` : "2px solid var(--mantine-color-gray-2)",
                          background: fbRating === value ? `${color}18` : "var(--mantine-color-gray-0)",
                          transition: "border-color 150ms, background 150ms",
                          cursor: "pointer",
                          width: rem(54), height: rem(54),
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {emoji}
                      </Paper>
                      <Text size="xs" c={fbRating === value ? "dark" : "dimmed"}
                        fw={fbRating === value ? 600 : 400}>
                        {label}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                ))}
              </Flex>

              {/* Comentario opcional */}
              {fbRating !== null && (
                <Stack gap="xs">
                  <Textarea
                    placeholder="¿En qué podemos mejorar? (opcional)"
                    value={fbComment}
                    onChange={(e) => setFbComment(e.currentTarget.value)}
                    autosize minRows={2} maxRows={4}
                    maxLength={500} size="sm" radius="md"
                  />
                  <Flex gap="sm" justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={closeFb}>Cancelar</Button>
                    <Button
                      style={{ background: color }}
                      loading={fbSending}
                      onClick={handleModalFeedback}
                    >
                      Enviar opinión
                    </Button>
                  </Flex>
                </Stack>
              )}
            </Stack>
          )}
    </Modal>

  </>
  );
}
