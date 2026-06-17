import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  ThemeIcon,
  Loader,
  Alert,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCreditCard, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import {
  getMpStatus,
  getMpConnectUrl,
  disconnectMp,
  MpCollectStatus,
} from "../../../../services/collectionService";

interface Props {
  organizationId: string | null;
}

/**
 * Tarjeta para conectar/desconectar la cuenta de Mercado Pago del negocio.
 * El dinero de los cobros va directo a esa cuenta (modelo marketplace/OAuth).
 */
export default function MercadoPagoConnectCard({ organizationId }: Props) {
  const [status, setStatus] = useState<MpCollectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const s = await getMpStatus(organizationId);
    setStatus(s);
    setLoading(false);
  }, [organizationId]);

  // Carga inicial + manejo del retorno del callback OAuth (?mp=connected|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mp = params.get("mp");
    if (mp) {
      if (mp === "connected") {
        showNotification({
          title: "Mercado Pago conectado",
          message: "Tu cuenta quedó lista para recibir pagos.",
          color: "green",
        });
      } else {
        showNotification({
          title: "No se pudo conectar",
          message: "Hubo un problema al conectar Mercado Pago. Intenta de nuevo.",
          color: "red",
        });
      }
      // Limpiar el query param sin recargar
      params.delete("mp");
      const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", clean);
    }
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    if (!organizationId) return;
    setBusy(true);
    const url = await getMpConnectUrl(organizationId);
    if (url) {
      window.location.href = url; // redirige a Mercado Pago para autorizar
    } else {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!organizationId) return;
    setBusy(true);
    const ok = await disconnectMp(organizationId);
    if (ok) {
      showNotification({
        title: "Mercado Pago desconectado",
        message: "Dejarás de recibir pagos hasta que vuelvas a conectar.",
        color: "blue",
      });
      await fetchStatus();
    }
    setBusy(false);
  };

  const connected = !!status?.connected;

  return (
    <Card withBorder padding="md">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="indigo">
              <IconCreditCard size={22} />
            </ThemeIcon>
            <Stack gap={2}>
              <Group gap="xs">
                <Text fw={600}>Cobros con Mercado Pago</Text>
                {connected ? (
                  <Badge color="green" variant="light" leftSection={<IconCircleCheck size={12} />}>
                    Conectado
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light">No conectado</Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Recibe pagos de tus clientes directo en tu cuenta de Mercado Pago.
              </Text>
            </Stack>
          </Group>

          {loading ? (
            <Loader size="sm" />
          ) : connected ? (
            <Button
              variant="light"
              color="red"
              size="sm"
              loading={busy}
              onClick={handleDisconnect}
            >
              Desconectar
            </Button>
          ) : (
            <Button
              size="sm"
              loading={busy}
              onClick={handleConnect}
              disabled={!organizationId}
            >
              Conectar con Mercado Pago
            </Button>
          )}
        </Group>

        {connected && (
          <Alert icon={<IconInfoCircle size={16} />} color="green" variant="light">
            <Text size="sm">
              Cuenta conectada
              {status?.site ? ` (${status.site})` : ""}
              {status?.userId ? ` · ID ${status.userId}` : ""}.
              {status?.tokenExpiresAt && (
                <> El acceso se renueva automáticamente.</>
              )}
            </Text>
          </Alert>
        )}

        {!connected && !loading && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="sm">
              Al conectar, te llevaremos a Mercado Pago para autorizar el cobro en tu
              nombre. El dinero llega directo a tu cuenta; nosotros no lo retenemos.
            </Text>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
