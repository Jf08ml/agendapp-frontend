import React from "react";
import { Popover, Stack, Text, Group, Indicator, Button, Divider, Box } from "@mantine/core";
import { BiRefresh } from "react-icons/bi";
import type { WaCode } from "./WhatsappStatusIcon";

interface PillConfig {
  bg: string;
  color: string;
  dot: string;
  label: string;
  detail: string;
  pulse: boolean;
}

function getPillConfig(code: WaCode | "", blocked?: boolean): PillConfig {
  if (blocked) {
    return {
      bg: "#F3F4F6",
      color: "#9CA3AF",
      dot: "#9CA3AF",
      label: "WhatsApp no disponible",
      detail: "No incluido en tu plan",
      pulse: false,
    };
  }
  switch (code) {
    case "ready":
      return {
        bg: "#E8F8EE",
        color: "#1FA653",
        dot: "#1FA653",
        label: "WhatsApp conectado",
        detail: "Listo para enviar",
        pulse: false,
      };
    case "connecting":
    case "authenticated":
    case "reconnecting":
      return {
        bg: "#FEF6E0",
        color: "#A1740A",
        dot: "#E0B025",
        label: code === "reconnecting" ? "Reconectando..." : "Sincronizando...",
        detail: "Reconectando",
        pulse: true,
      };
    case "waiting_qr":
      return {
        bg: "#FEF6E0",
        color: "#A1740A",
        dot: "#E0B025",
        label: "Sin autenticación",
        detail: "Escanea el QR",
        pulse: false,
      };
    case "disconnected":
    case "auth_failure":
    case "error":
      return {
        bg: "#FDECEC",
        color: "#B23A3A",
        dot: "#D14747",
        label: "WhatsApp desconectado",
        detail: "Toca para reconectar",
        pulse: false,
      };
    default:
      return {
        bg: "#F3F4F6",
        color: "#6B7280",
        dot: "#9CA3AF",
        label: "Sin información",
        detail: "Estado desconocido",
        pulse: false,
      };
  }
}

const WA_SVG = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.4c1.4.7 3 1.2 4.8 1.2h.1c5.5 0 10-4.5 10-10S17.5 2 12 2zM12 20c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C3.9 14.7 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5s8.5 3.8 8.5 8.5S16.7 20 12 20z" />
  </svg>
);

interface WhatsAppStatusPillProps {
  code: WaCode | "";
  reason?: string | null;
  onRecheck?: () => void;
  onConfigure?: () => void;
  blocked?: boolean;
  /** Solo muestra el ícono con el dot, sin texto (para mobile) */
  compact?: boolean;
}

const WhatsAppStatusPill: React.FC<WhatsAppStatusPillProps> = ({
  code,
  reason,
  onRecheck,
  onConfigure,
  blocked,
  compact = false,
}) => {
  const cfg = getPillConfig(code, blocked);

  const ConfigureLabel =
    code === "waiting_qr"
      ? "Ver / Escanear QR"
      : code === "auth_failure"
      ? "Reintentar / Configurar"
      : code === "disconnected"
      ? "Conectar sesión"
      : "Configurar WhatsApp";

  return (
    <Popover withArrow position="bottom-end" shadow="md" closeOnEscape>
      <Popover.Target>
        <Box
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? 0 : 9,
            padding: compact ? "6px 8px" : "6px 12px 6px 9px",
            background: cfg.bg,
            borderRadius: 999,
            cursor: "pointer",
            userSelect: "none",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {/* Icon + dot */}
          <Box style={{ position: "relative", width: 20, height: 20, color: cfg.color }}>
            {WA_SVG}
            <Box
              style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cfg.dot,
                border: `2px solid ${cfg.bg}`,
                animation: cfg.pulse ? "wa-pill-pulse 1.4s infinite" : "none",
              }}
            />
          </Box>

          {/* Labels — hidden in compact mode */}
          {!compact && (
            <Box style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <Text style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                {cfg.label}
              </Text>
              <Text style={{ fontSize: 10, color: cfg.color, opacity: 0.75, lineHeight: 1, marginTop: 1 }}>
                {cfg.detail}
              </Text>
            </Box>
          )}
        </Box>
      </Popover.Target>

      <Popover.Dropdown>
        {blocked ? (
          <Stack gap={4} maw={220}>
            <Text size="xs" fw={700} c="dimmed">WhatsApp no disponible</Text>
            <Text size="xs" c="dimmed">
              Tu plan actual no incluye integración con WhatsApp.
            </Text>
          </Stack>
        ) : (
          <Stack gap="xs" maw={220}>
            <Group gap={8} align="center">
              <Indicator inline size={8} color={code === "ready" ? "green" : code === "disconnected" || code === "error" || code === "auth_failure" ? "red" : "orange"} processing={cfg.pulse}>
                <div style={{ width: 6, height: 6 }} />
              </Indicator>
              <Text size="xs" fw={700} style={{ color: cfg.color }}>{cfg.label}</Text>
            </Group>

            {reason && (
              <Text size="xs" c="dimmed">{reason}</Text>
            )}

            {code !== "ready" && (
              <>
                <Divider my={2} />
                <Group gap="xs" wrap="wrap">
                  {typeof onConfigure === "function" && (
                    <Button size="xs" variant="outline" color="blue" onClick={onConfigure}>
                      {ConfigureLabel}
                    </Button>
                  )}
                  {typeof onRecheck === "function" && (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<BiRefresh size={13} />}
                      onClick={onRecheck}
                    >
                      Reconsultar
                    </Button>
                  )}
                </Group>
              </>
            )}
          </Stack>
        )}
      </Popover.Dropdown>

      <style>{`
        @keyframes wa-pill-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </Popover>
  );
};

export default React.memo(WhatsAppStatusPill);
