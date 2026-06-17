import { useEffect, useRef, useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  ThemeIcon,
  Loader,
  Alert,
  RingProgress,
  Badge,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconClock,
  IconAlertTriangle,
  IconCircleX,
} from "@tabler/icons-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrderStatus, type OrderStatus } from "../../services/collectionService";

// Pantalla de retorno tras pagar el depósito de la reserva en Mercado Pago.
// MP redirige aquí (back_urls) con ?status=success|failure|pending&ref=<externalReference>.
// La confirmación real la da el webhook → hacemos polling al estado del Order.

const POLL_INTERVAL_MS = 4000; // cada 4 segundos
const MAX_ATTEMPTS = 15; // ~60 segundos

type PageStatus = "waiting" | "paid" | "failed" | "timeout";

export default function PublicReservationPaymentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const mpStatus = params.get("status"); // pista de MP (no autoritativa)

  const [pageStatus, setPageStatus] = useState<PageStatus>("waiting");
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const mapOrderStatus = (status: OrderStatus): PageStatus | null => {
    if (status === "paid") return "paid";
    if (status === "failed" || status === "expired") return "failed";
    return null; // created/pending/refunded → seguir esperando
  };

  const check = async () => {
    if (!ref) {
      stopPolling();
      setPageStatus("failed");
      return;
    }
    const order = await getOrderStatus(ref);
    if (order) {
      const mapped = mapOrderStatus(order.status);
      if (mapped) {
        stopPolling();
        setPageStatus(mapped);
        return;
      }
    }
    setAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        stopPolling();
        setPageStatus("timeout");
      }
      return next;
    });
  };

  useEffect(() => {
    // Sin referencia o MP ya indicó fallo → no hay nada que confirmar.
    if (!ref || mpStatus === "failure") {
      setPageStatus("failed");
      return;
    }
    setPageStatus("waiting");
    setAttempts(0);
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const progressValue = Math.min(100, (attempts / MAX_ATTEMPTS) * 100);

  // ── Esperando confirmación del webhook ─────────────────────────────────────
  if (pageStatus === "waiting") {
    return (
      <Stack align="center" justify="center" mt={80} gap="xl" maw={480} mx="auto">
        <RingProgress
          size={120}
          thickness={8}
          roundCaps
          sections={[{ value: progressValue, color: "blue" }]}
          label={
            <Stack align="center" gap={0}>
              <Loader size="sm" color="blue" />
            </Stack>
          }
        />
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">
            Confirmando tu pago...
          </Title>
          <Text c="dimmed" ta="center" size="sm">
            Estamos verificando el depósito con Mercado Pago. Suele tardar menos
            de 30 segundos.
          </Text>
          <Badge color="blue" variant="light" leftSection={<IconClock size={12} />}>
            Intento {attempts + 1} de {MAX_ATTEMPTS}
          </Badge>
        </Stack>
        <Alert color="gray" variant="light" style={{ width: "100%" }}>
          <Text size="xs" c="dimmed" ta="center">
            No cierres esta página. Tu reserva se confirma automáticamente al
            recibir el pago.
          </Text>
        </Alert>
      </Stack>
    );
  }

  // ── Pago confirmado / reserva creada ───────────────────────────────────────
  if (pageStatus === "paid") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="teal" variant="light">
          <IconCircleCheck size={52} />
        </ThemeIcon>
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">
            ¡Reserva confirmada!
          </Title>
          <Text c="dimmed" ta="center">
            Recibimos tu depósito y tu reserva quedó confirmada. Te enviaremos
            los detalles por WhatsApp.
          </Text>
        </Stack>
        <Button size="md" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Stack>
    );
  }

  // ── Pago rechazado / expirado ──────────────────────────────────────────────
  if (pageStatus === "failed") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="red" variant="light">
          <IconCircleX size={52} />
        </ThemeIcon>
        <Stack align="center" gap="xs">
          <Title order={2} ta="center">
            No se completó el pago
          </Title>
          <Text c="dimmed" ta="center">
            Tu reserva no se confirmó porque el depósito no se completó. Puedes
            intentar reservar de nuevo.
          </Text>
        </Stack>
        <Button size="md" onClick={() => navigate("/online-reservation")}>
          Reservar de nuevo
        </Button>
      </Stack>
    );
  }

  // ── Timeout — el webhook está tardando ─────────────────────────────────────
  return (
    <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
      <ThemeIcon size={80} radius="xl" color="yellow" variant="light">
        <IconAlertTriangle size={52} />
      </ThemeIcon>
      <Stack align="center" gap="xs">
        <Title order={2} ta="center">
          Tu pago está siendo procesado
        </Title>
        <Text c="dimmed" ta="center">
          El pago fue enviado pero la confirmación está tardando. Si lo
          completaste, tu reserva se confirmará en los próximos minutos y
          recibirás un WhatsApp.
        </Text>
      </Stack>
      <Button size="md" variant="light" onClick={() => navigate("/")}>
        Volver al inicio
      </Button>
    </Stack>
  );
}
