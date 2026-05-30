import { useState, useCallback, useEffect, useRef } from "react";
import { sendMessage, ChatMessage } from "./chatbotService";

const buildWelcomeMessage = (agentName: string): ChatMessage => ({
  role: "assistant",
  content: `¡Hola! Soy **${agentName}**, tu asistente de AgenditApp. Estoy aquí para ayudarte a configurar tu negocio y responder tus preguntas. ¿Por dónde empezamos?`,
});

const ONBOARDING_TRIGGER = "Hola, quiero comenzar la configuración inicial de mi negocio.";

interface UseChatbotOptions {
  onInvalidate?: (invalidates: string[]) => void;
  autoStart?: boolean;
  onAutoStartDone?: () => void;
  agentName?: string;
}

export const useChatbot = ({ onInvalidate, autoStart, onAutoStartDone, agentName = "Roxi" }: UseChatbotOptions = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);
  const sessionId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const sendInternal = useCallback(async (text: string, isAuto = false) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const current = await new Promise<ChatMessage[]>((resolve) => {
        setMessages((prev) => { resolve(prev); return prev; });
      });
      const toSend = current.filter((m) => m.role === "user" || m.role === "assistant");
      const { reply, invalidates } = await sendMessage(toSend, sessionId.current);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (invalidates.length > 0) onInvalidate?.(invalidates);
      if (isAuto) onAutoStartDone?.();
    } catch {
      setError("No pude conectarme. Intenta de nuevo.");
      if (isAuto) onAutoStartDone?.();
    } finally {
      setLoading(false);
    }
  }, [loading, onInvalidate, onAutoStartDone]);

  const send = useCallback((text: string) => sendInternal(text, false), [sendInternal]);

  // AutoStart: envía mensaje trigger cuando se abre desde el wizard
  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      setTimeout(() => sendInternal(ONBOARDING_TRIGGER, true), 300);
    }
  }, [autoStart, sendInternal]);

  // Mensaje de bienvenida cuando no es autoStart
  useEffect(() => {
    if (!autoStart && messages.length === 0) {
      setMessages([buildWelcomeMessage(agentName)]);
    }
  }, [autoStart, messages.length, agentName]);

  const reset = useCallback(() => {
    sessionId.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages(autoStart ? [] : [buildWelcomeMessage(agentName)]);
    setError(null);
    autoStarted.current = false;
  }, [autoStart, agentName]);

  return { messages, loading, error, send, reset, sessionId: sessionId.current };
};
