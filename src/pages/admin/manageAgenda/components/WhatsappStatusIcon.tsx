// components/whatsapp/WhatsappStatusIcon.tsx
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Group,
  Indicator,
  Popover,
  Stack,
  Text,
  Button,
  Divider,
  Box,
  Paper,
  Transition,
  Flex,
} from "@mantine/core";
import { IoLogoWhatsapp, IoAlertCircleOutline } from "react-icons/io5";
import { Loader } from "@mantine/core";
import { BiRefresh } from "react-icons/bi";

export type WaCode =
  | "connecting"
  | "waiting_qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "reconnecting"
  | "error";

type Size = "xs" | "sm" | "md";
type Trigger = "hover" | "click";

export interface WhatsappStatusIconProps {
  code: WaCode | "";
  reason?: string | null;

  onConfigure?: () => void;
  onRecheck?: () => void;

  showConfigure?: boolean; // default: true
  showRecheck?: boolean; // default: true

  trigger?: Trigger; // default: "click"
  size?: Size; // default: "sm"
  ariaLabel?: string;
  disabled?: boolean;
  /** Muestra el icono gris con mensaje "no disponible en tu plan" */
  blocked?: boolean;

  // === controles del banner "bandera" ===
  /** ms visibilidad al cambiar de estado (ej. cuando se estabiliza en ready) */
  flagShowOnChangeMs?: number; // default 2400
  /** ms visibilidad mientras está en estados "processing" (connecting/authenticated/reconnecting) */
  flagWhileProcessingMs?: number; // default 3000
}

function useUi(code: WaCode | "") {
  return useMemo(() => {
    const base = { processing: false as boolean, hint: "" as string };
    // Sugerencia genérica para estados no listos
    const CLICK_HINT = " · haz clic para opciones";

    switch (code) {
      case "ready":
        return {
          ...base,
          color: "green",
          label: "Conectado",
          dot: "green",
          pulse: false,
          iconAlt: <IoLogoWhatsapp />,
          hint: "Listo para enviar mensajes desde tu número de tu organización.",
        };

      case "connecting":
        return {
          processing: true,
          color: "orange",
          label: "Conectando…",
          dot: "orange",
          pulse: true,
          iconAlt: <Loader size="xs" />,
          hint: CLICK_HINT,
        };

      case "waiting_qr":
        return {
          ...base,
          color: "teal",
          label: "Sesión sin autenticación",
          dot: "teal",
          pulse: false,
          iconAlt: <Loader size="xs" />,
          hint: CLICK_HINT,
        };

      case "authenticated":
        return {
          processing: true,
          color: "blue",
          label: "Autenticando…",
          dot: "blue",
          pulse: true,
          iconAlt: <Loader size="xs" />,
          hint: CLICK_HINT,
        };

      case "auth_failure":
        return {
          ...base,
          color: "red",
          label: "Error de autenticación",
          dot: "red",
          pulse: false,
          iconAlt: <IoAlertCircleOutline />,
          hint: CLICK_HINT,
        };

      case "disconnected":
        return {
          ...base,
          color: "red",
          label: "Desconectado",
          dot: "red",
          pulse: false,
          iconAlt: <IoAlertCircleOutline />,
          hint: CLICK_HINT,
        };

      case "reconnecting":
        return {
          processing: true,
          color: "orange",
          label: "Reconectando…",
          dot: "orange",
          pulse: true,
          iconAlt: <Loader size="xs" />,
          hint: CLICK_HINT,
        };

      case "error":
        return {
          ...base,
          color: "red",
          label: "Error de conexión",
          dot: "red",
          pulse: false,
          iconAlt: <IoAlertCircleOutline />,
          hint: CLICK_HINT,
        };

      default:
        return {
          ...base,
          color: "gray",
          label: "Sin información",
          dot: "gray",
          pulse: false,
          iconAlt: <IoAlertCircleOutline />,
          hint: CLICK_HINT,
        };
    }
  }, [code]);
}

const SIZES: Record<Size, number> = { xs: 26, sm: 30, md: 36 };
const DOTS: Record<Size, number> = { xs: 8, sm: 9, md: 10 };

const WhatsappStatusIcon: React.FC<WhatsappStatusIconProps> = ({
  code,
  reason,
  onConfigure,
  onRecheck,
  showConfigure = true,
  showRecheck = true,
  trigger = "click",
  size = "sm",
  ariaLabel = "Estado de WhatsApp",
  disabled,
  blocked,

  // banner flags
  flagShowOnChangeMs = 2400,
  flagWhileProcessingMs = 3000,
}) => {
  if (disabled) return null;

  const ui = useUi(blocked ? "" : code);
  const isReady = code === "ready";
  const actionIconSize = SIZES[size];
  const dotSize = DOTS[size];

  // --- lógica de la "bandera" ---
  const [flagOpen, setFlagOpen] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const lastCodeRef = useRef<WaCode | "">("");

  // Mostrar bandera al cambiar de estado; ocultar tras timeout
  useEffect(() => {
    // si cambió el estado, muestra la bandera
    if (lastCodeRef.current !== code) {
      setFlagOpen(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      // si llegó a "ready" u otro estable, la mostramos breve
      const ms = ui.processing ? flagWhileProcessingMs : flagShowOnChangeMs;
      timerRef.current = window.setTimeout(() => setFlagOpen(false), ms);
      lastCodeRef.current = code;
      return;
    }

    // si no cambió pero sigue procesando, asegura autocierre tras X ms
    if (ui.processing && flagOpen) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(
        () => setFlagOpen(false),
        flagWhileProcessingMs
      );
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ui.processing, flagShowOnChangeMs, flagWhileProcessingMs]);

  const ConfigureLabel =
    code === "waiting_qr"
      ? "Ver / Escanear QR"
      : code === "auth_failure"
      ? "Reintentar / Configurar"
      : code === "disconnected"
      ? "Conectar sesión"
      : "Configurar WhatsApp";

  const recheckDisabled = Boolean(isReady && !reason);

  return (
    <Box
      pos="relative"
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      {/* Icono + DOT + Popover con acciones */}
      <Popover
        withArrow
        position="bottom"
        shadow="md"
        trapFocus={false}
        closeOnEscape
        {...(trigger === "hover"
          ? { openDelay: 80, closeDelay: 120, keepMounted: true }
          : {})}
      >
        <Popover.Target>
          <Indicator
            inline
            size={dotSize}
            offset={3}
            color={blocked ? "gray" : ui.dot}
            processing={!blocked && ui.pulse}
            disabled={blocked || !code}
          >
            <ActionIcon
              variant="subtle"
              aria-label={ariaLabel}
              size={actionIconSize}
              onClick={
                trigger === "click" ? (e) => e.preventDefault() : undefined
              }
              style={{
                ...(blocked ? { opacity: 0.45, cursor: "default" } : {}),
                ...(ui.pulse && !blocked
                  ? { animation: "wa-pulse 1.2s ease-in-out infinite" }
                  : {}),
              }}
            >
              <IoLogoWhatsapp />
            </ActionIcon>
          </Indicator>
        </Popover.Target>

        <Popover.Dropdown>
          {blocked ? (
            <Stack gap={4} miw={0}>
              <Text size="xs" fw={700} c="dimmed">
                WhatsApp no disponible
              </Text>
              <Text size="xs" c="dimmed">
                Tu plan actual no incluye integración con WhatsApp. Mejora tu
                plan para activar esta función.
              </Text>
            </Stack>
          ) : (
          <Stack gap="xs" miw={0}>
            <Group gap={8} align="center">
              <Indicator inline size={8} color={ui.dot} processing={ui.pulse}>
                <div style={{ width: 6, height: 6 }} />
              </Indicator>
              <Text size="xs" fw={700} c={ui.color}>
                {ui.label}
              </Text>
            </Group>

            {reason && (
              <Text size="xs" c="dimmed">
                {reason}
              </Text>
            )}

            {code !== "ready" && (showConfigure || showRecheck) && (
              <Divider my={4} />
            )}

            {code !== "ready" && (
              <Group gap="xs" wrap="wrap">
                {showConfigure && typeof onConfigure === "function" && (
                  <Button
                    size="xs"
                    variant="outline"
                    color="blue"
                    onClick={onConfigure}
                  >
                    {ConfigureLabel}
                  </Button>
                )}

                {showRecheck && typeof onRecheck === "function" && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<BiRefresh size={14} />}
                    onClick={onRecheck}
                    disabled={recheckDisabled}
                  >
                    Reconsultar
                  </Button>
                )}
              </Group>
            )}
          </Stack>
          )}
        </Popover.Dropdown>
      </Popover>

      {/* BANDERA: aparece debajo del icono, alineada al start (izquierda) */}
      <Box
        pos="absolute"
        left={0}
        top={actionIconSize + 6}
        style={{ zIndex: 5,width: "300px" }}
      >
        <Transition
          mounted={flagOpen && !blocked}
          transition="slide-down"
          duration={220}
          timingFunction="ease"
        >
          {(styles) => (
            <Paper
              withBorder
              shadow="sm"
              radius="md"
              p="xs"
              style={{
                ...styles,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "white",
                // ancho auto para que la bandera sea lo más compacta posible
                maxWidth: 260,
              }}
            >
              {/* mini dot del estado */}
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  background: `var(--mantine-color-${ui.color}-filled, ${ui.color})`,
                }}
              />

              <Flex direction="column" gap={2} align="flex-start">
                <Text size="xs" fw={700} c={ui.color}>
                  {ui.label}
                </Text>
                {ui.hint && (
                  <Text size="xs" c="dimmed">
                    {ui.hint}
                  </Text>
                )}
              </Flex>

              {/* “piquito” superior apuntando al icono (borde) */}
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  left: 10, // controla dónde cae la flecha respecto al start del icono
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: "6px solid rgba(0,0,0,0.08)", // sombra/borde
                }}
              />
              {/* “piquito” relleno */}
              <span
                style={{
                  position: "absolute",
                  top: -5,
                  left: 11,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "5px solid white", // relleno
                }}
              />
            </Paper>
          )}
        </Transition>
      </Box>

      <style>
        {`
        @keyframes wa-pulse {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.05); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        `}
      </style>
    </Box>
  );
};

export default React.memo(WhatsappStatusIcon);
