import { Button, Group, Paper, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type OfflineBannerStatus = "cache" | "missing" | "offline";

interface OfflineBannerProps {
  /**
   * cache:   se muestra la copia guardada de la agenda.
   * missing: sin conexión y este mes nunca se guardó.
   * offline: sin conexión, pero lo que hay en pantalla se cargó en vivo.
   */
  status: OfflineBannerStatus;
  /** Cuándo se guardó la copia mostrada (solo status "cache") */
  cachedAt?: number | null;
  timeFormat?: "12h" | "24h";
  onRetry: () => void;
  retrying?: boolean;
}

const OfflineBanner = ({
  status,
  cachedAt,
  timeFormat = "12h",
  onRetry,
  retrying = false,
}: OfflineBannerProps) => {
  const savedAt =
    cachedAt != null
      ? format(
          new Date(cachedAt),
          timeFormat === "24h" ? "d MMM, HH:mm" : "d MMM, h:mm a",
          { locale: es },
        )
      : null;

  const message =
    status === "cache"
      ? `Estás viendo la agenda guardada${savedAt ? ` el ${savedAt}` : ""}. Solo puedes consultarla; los cambios se habilitan al reconectar.`
      : status === "missing"
        ? "No hay datos guardados de este mes. Puedes ver los meses que abriste antes con conexión."
        : "Puedes consultar lo que ya está cargado; los cambios se habilitan al reconectar.";

  return (
    <Paper
      role="status"
      withBorder
      radius="md"
      px="sm"
      py={6}
      bg="var(--mantine-color-yellow-0)"
      style={{ flexShrink: 0, borderColor: "var(--mantine-color-yellow-4)" }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between" align="center">
        <Group gap={8} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <IconWifiOff
            size={18}
            color="var(--mantine-color-yellow-9)"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <Text size="xs" c="dark.8" lh={1.4}>
            <strong>Sin conexión.</strong> {message}
          </Text>
        </Group>
        <Button
          size="compact-xs"
          variant="outline"
          color="yellow.9"
          onClick={onRetry}
          loading={retrying}
          style={{ flexShrink: 0 }}
        >
          Reintentar
        </Button>
      </Group>
    </Paper>
  );
};

export default OfflineBanner;
