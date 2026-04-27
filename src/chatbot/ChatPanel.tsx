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
  CloseButton,
  Divider,
  rem,
} from "@mantine/core";
import { IconSend, IconRobot } from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import { useChatbot } from "./useChatbot";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

interface ChatPanelProps {
  onClose: () => void;
  onInvalidate?: (invalidates: string[]) => void;
  autoStart?: boolean;
  onAutoStartDone?: () => void;
}

export default function ChatPanel({ onClose, onInvalidate, autoStart, onAutoStartDone }: ChatPanelProps) {
  const { messages, loading, error, send } = useChatbot({ onInvalidate, autoStart, onAutoStartDone });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const color = useSelector((s: RootState) => s.organization.organization?.branding?.primaryColor || "#1C3461");

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Flex direction="column" h="100%" style={{ overflow: "hidden" }}>
      {/* Header */}
      <Flex align="center" justify="space-between" px="md" py="sm" bg={color} style={{ flexShrink: 0 }}>
        <Flex align="center" gap="xs">
          <IconRobot size={20} color="white" />
          <Text fw={600} c="white" size="sm">Asistente AgenditApp</Text>
        </Flex>
        <CloseButton onClick={onClose} color="white" variant="transparent" />
      </Flex>

      <Divider />

      {/* Mensajes */}
      <ScrollArea flex={1} px="md" py="xs">
        <Stack gap="xs" py="xs">
          {messages.map((msg, i) => (
            <Flex key={i} justify={msg.role === "user" ? "flex-end" : "flex-start"}>
              <Paper
                px="sm"
                py={rem(6)}
                radius="md"
                maw="80%"
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
              <Text size="xs" c="red">{error}</Text>
            </Flex>
          )}
          <div ref={bottomRef} />
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
            disabled={loading}
            size="sm"
            radius="xl"
          />
          <ActionIcon
            onClick={handleSend}
            disabled={!input.trim() || loading}
            color={color}
            variant="filled"
            radius="xl"
            size="lg"
            style={{ background: color }}
          >
            <IconSend size={16} />
          </ActionIcon>
        </Flex>
      </Box>
    </Flex>
  );
}
