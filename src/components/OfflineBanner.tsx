import { Button, Group, Loader, Paper, Text } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type OfflineBannerStatus = "updating" | "cache" | "missing" | "offline";

interface OfflineBannerProps {
  /**
   * updating: se ve la copia guardada mientras llega la respuesta (servidor lento).
   * cache:    se ve la copia guardada porque la petición en vivo falló.
   * missing:  la petición falló y este mes nunca se guardó.
   * offline:  sin conexión, pero lo que hay en pantalla se cargó en vivo.
   */
  status: OfflineBannerStatus;
  /**
   * ¿Realmente sin conexión? Solo si es true se dice "Sin conexión": una consulta
   * sin respuesta con la red funcionando (servidor lento o caído) no lo es, y
   * decirlo confundía a quien sí tenía internet.
   */
  offline: boolean;
  /** Cuándo se guardó la copia mostrada (status "updating" y "cache") */
  cachedAt?: number | null;
  timeFormat?: "12h" | "24h";
  onRetry: () => void;
  retrying?: boolean;
}

const OfflineBanner = ({
  status,
  offline,
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
  const savedAtText = savedAt ? ` el ${savedAt}` : "";

  let title: string;
  let message: string;
  if (status === "updating") {
    title = "Actualizando la agenda…";
    message = `Mientras tanto ves la copia guardada${savedAtText}.`;
  } else if (status === "cache") {
    title = offline ? "Sin conexión." : "No se pudo actualizar.";
    message = offline
      ? `Estás viendo la agenda guardada${savedAtText}. Solo puedes consultarla; los cambios se habilitan al reconectar.`
      : `Estás viendo la agenda guardada${savedAtText}: el servidor no respondió. Reintenta en un momento.`;
  } else if (status === "missing") {
    title = offline ? "Sin conexión." : "No se pudo cargar este mes.";
    message = offline
      ? "No hay datos guardados de este mes. Puedes ver los meses que abriste antes con conexión."
      : "No hay una copia guardada de este mes. Reintenta en un momento.";
  } else {
    title = "Sin conexión.";
    message =
      "Puedes consultar lo que ya está cargado; los cambios se habilitan al reconectar.";
  }

  const updating = status === "updating";

  return (
    <Paper
      role="status"
      withBorder
      radius="md"
      px="sm"
      py={6}
      bg={updating ? "var(--mantine-color-blue-0)" : "var(--mantine-color-yellow-0)"}
      style={{
        flexShrink: 0,
        borderColor: updating
          ? "var(--mantine-color-blue-3)"
          : "var(--mantine-color-yellow-4)",
      }}
    >
      <Group gap="xs" wrap="nowrap" justify="space-between" align="center">
        <Group gap={8} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          {updating ? (
            <Loader size={16} color="blue" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <IconWifiOff
              size={18}
              color="var(--mantine-color-yellow-9)"
              style={{ flexShrink: 0, marginTop: 1 }}
            />
          )}
          <Text size="xs" c="dark.8" lh={1.4}>
            <strong>{title}</strong> {message}
          </Text>
        </Group>
        {!updating && (
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
        )}
      </Group>
    </Paper>
  );
};

export default OfflineBanner;
