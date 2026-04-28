import { useEffect, useRef, useState, KeyboardEvent } from "react";
import {
  Box,
  Text,
  TextInput,
  ActionIcon,
  ScrollArea,
  Loader,
  Stack,
  Paper,
  Flex,
  Button,
  Divider,
  Badge,
  rem,
  Alert,
  Title,
  Center,
} from "@mantine/core";
import {
  IconSend,
  IconRobot,
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  sendBookingMessage,
  BookingChatMessage,
  BookingPayload,
} from "../../services/bookingChatService";
import { createMultipleReservations } from "../../services/reservationService";

interface BookingChatPanelProps {
  onBack: () => void;
}

const GREETING =
  "¡Hola! Soy tu asistente de reservas. ¿En qué puedo ayudarte hoy? Puedo ayudarte a reservar un servicio, consultar disponibilidad o responder tus dudas. 😊";

export default function BookingChatPanel({ onBack }: BookingChatPanelProps) {
  const color =
    useSelector(
      (s: RootState) => s.organization.organization?.branding?.primaryColor
    ) || "#1C3461";

  const [messages, setMessages] = useState<BookingChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado de la reserva lista para confirmar
  const [pendingPayload, setPendingPayload] = useState<BookingPayload | null>(
    null
  );
  const [confirming, setConfirming] = useState(false);
  const [reservationDone, setReservationDone] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, pendingPayload]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: BookingChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Solo enviar role+content al backend (sin el greeting ficticio del estado inicial)
      const history = next.filter(
        (m) => !(m.role === "assistant" && m.content === GREETING)
      );

      const res = await sendBookingMessage(history);

      const assistantMsg: BookingChatMessage = {
        role: "assistant",
        content: res.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.bookingPayload) {
        setPendingPayload(res.bookingPayload);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
      await createMultipleReservations(pendingPayload as any);
      setReservationDone(true);
      setPendingPayload(null);
    } catch (err: any) {
      setReservationError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo crear la reserva. Intenta de nuevo."
      );
    } finally {
      setConfirming(false);
    }
  };

  if (reservationDone) {
    return (
      <Stack align="center" justify="center" gap="lg" py="xl" mih={320}>
        <Center>
          <ActionIcon
            size={rem(72)}
            radius="xl"
            style={{ background: color, cursor: "default" }}
          >
            <IconCheck size={36} color="white" />
          </ActionIcon>
        </Center>
        <Stack align="center" gap="xs">
          <Title order={3} ta="center">
            ¡Reserva creada!
          </Title>
          <Text c="dimmed" ta="center" size="sm">
            Te esperamos. Si necesitas cancelar o modificar, el negocio te
            informará los pasos.
          </Text>
        </Stack>
        <Button variant="light" onClick={onBack}>
          Volver al inicio
        </Button>
      </Stack>
    );
  }

  return (
    <Flex direction="column" style={{ height: "70dvh", minHeight: 400 }}>
      {/* Header */}
      <Flex
        align="center"
        gap="xs"
        px="md"
        py="sm"
        style={{
          background: color,
          flexShrink: 0,
          borderRadius: "var(--mantine-radius-md) var(--mantine-radius-md) 0 0",
        }}
      >
        <ActionIcon
          variant="transparent"
          onClick={onBack}
          title="Volver"
          style={{ color: "white" }}
        >
          <IconArrowLeft size={18} />
        </ActionIcon>
        <IconRobot size={20} color="white" />
        <Text fw={600} c="white" size="sm" flex={1}>
          Asistente de reservas
        </Text>
        <Badge size="xs" variant="light" color="yellow">
          Beta
        </Badge>
      </Flex>

      {/* Mensajes */}
      <ScrollArea flex={1} px="md" py="xs" viewportRef={viewportRef}>
        <Stack gap="xs" py="xs">
          {messages.map((msg, i) => (
            <Flex
              key={i}
              justify={msg.role === "user" ? "flex-end" : "flex-start"}
            >
              <Paper
                px="sm"
                py={rem(6)}
                radius="md"
                maw="82%"
                bg={msg.role === "user" ? color : "gray.1"}
                style={{ wordBreak: "break-word" }}
              >
                {msg.role === "user" ? (
                  <Text size="sm" c="white" style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </Text>
                ) : (
                  <Text size="sm" c="dark" component="div">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p style={{ margin: "2px 0" }}>{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong style={{ fontWeight: 700 }}>{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul
                            style={{ paddingLeft: "1.2rem", margin: "4px 0" }}
                          >
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol
                            style={{ paddingLeft: "1.2rem", margin: "4px 0" }}
                          >
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li style={{ marginBottom: 2 }}>{children}</li>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </Text>
                )}
              </Paper>
            </Flex>
          ))}

          {loading && (
            <Flex justify="flex-start">
              <Paper px="sm" py={rem(6)} radius="md" bg="gray.1">
                <Loader size="xs" color={color} type="dots" />
              </Paper>
            </Flex>
          )}

          {error && (
            <Flex justify="center">
              <Text size="xs" c="red">
                {error}
              </Text>
            </Flex>
          )}

          {/* Tarjeta de confirmación cuando la reserva está lista */}
          {pendingPayload && !loading && (
            <Box mt="sm">
              <Paper withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Text fw={600} size="sm">
                    ¿Confirmas tu reserva?
                  </Text>
                  {reservationError && (
                    <Alert
                      color="red"
                      icon={<IconAlertTriangle size={16} />}
                      radius="md"
                      py="xs"
                    >
                      <Text size="xs">{reservationError}</Text>
                    </Alert>
                  )}
                  <Flex gap="sm" wrap="wrap">
                    <Button
                      size="sm"
                      loading={confirming}
                      style={{ background: color }}
                      onClick={handleConfirmReservation}
                    >
                      Sí, confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={confirming}
                      onClick={() => {
                        setPendingPayload(null);
                        setReservationError(null);
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: "assistant",
                            content:
                              "Sin problema, ¿deseas cambiar algo o empezar de nuevo?",
                          },
                        ]);
                      }}
                    >
                      No, modificar
                    </Button>
                  </Flex>
                </Stack>
              </Paper>
            </Box>
          )}

        </Stack>
      </ScrollArea>

      <Divider />

      {/* Input */}
      <Box px="md" py="sm" style={{ flexShrink: 0 }}>
        <Flex gap="xs" align="center">
          <TextInput
            flex={1}
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !!pendingPayload}
            size="sm"
            radius="xl"
          />
          <ActionIcon
            onClick={() => send(input)}
            disabled={!input.trim() || loading || !!pendingPayload}
            style={{ background: color }}
            radius="xl"
            size={rem(36)}
          >
            <IconSend size={16} color="white" />
          </ActionIcon>
        </Flex>
      </Box>
    </Flex>
  );
}
