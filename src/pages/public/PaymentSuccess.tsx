import { useEffect, useRef, useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  ThemeIcon,
  Loader,
  Alert,
  Group,
  RingProgress,
  Badge,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";
import { BsWhatsapp } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { getCurrentMembership } from "../../services/membershipService";

// Configuración del polling
const POLL_INTERVAL_MS = 4000;   // cada 4 segundos
const MAX_ATTEMPTS = 15;          // 60 segundos máximo

type PageStatus = "waiting" | "activated" | "timeout";

const SUPPORT_WHATSAPP = "573132735116";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const [pageStatus, setPageStatus] = useState<PageStatus>("waiting");
  const [attempts, setAttempts] = useState(0);

  // Timestamp guardado en sessionStorage por ActivatePlanModal antes del redirect a LS.
  // Nos permite detectar si el webhook llegó antes de que el usuario aterrizara aquí.
  const paymentInitiatedAt = useRef<number>(
    Number(sessionStorage.getItem("ls_payment_initiated_at") || 0)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkActivation = async () => {
    if (!organizationId) return;

    try {
      const membership = await getCurrentMembership(organizationId);

      if (!membership) {
        setAttempts((prev) => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) { stopPolling(); setPageStatus("timeout"); }
          return next;
        });
        return;
      }

      if (membership.status === "active" && membership.lastPaymentDate) {
        const paymentDate = new Date(membership.lastPaymentDate).getTime();
        // Activado si lastPaymentDate es posterior (o muy cercano) a cuando se inició el pago.
        // Buffer de 30s para absorber diferencias de reloj o pagos que tardaron segundos.
        const isThisPayment = paymentDate >= paymentInitiatedAt.current - 30_000;
        if (isThisPayment) {
          sessionStorage.removeItem("ls_payment_initiated_at");
          stopPolling();
          setPageStatus("activated");
          return;
        }
      }

      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) { stopPolling(); setPageStatus("timeout"); }
        return next;
      });
    } catch {
      // Ignorar errores de red en polling, seguir intentando
    }
  };

  useEffect(() => {
    // organizationId = null puede significar dos cosas:
    // a) Usuario no autenticado → timeout inmediato
    // b) Autenticado pero organizationId aún no hidratado (useAuthInitializer async) → esperar
    if (!organizationId) {
      if (!isAuthenticated) {
        setPageStatus("timeout");
      }
      return;
    }

    // organizationId disponible: arrancar polling desde cero
    setPageStatus("waiting");
    setAttempts(0);

    checkActivation();
    intervalRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);

    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, isAuthenticated]);

  const handleManualCheck = () => {
    stopPolling();
    setAttempts(0);
    setPageStatus("waiting");
    checkActivation();
    intervalRef.current = setInterval(checkActivation, POLL_INTERVAL_MS);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      "Hola! Acabo de realizar un pago en AgenditApp pero mi plan aún no se activó. ¿Pueden verificarlo?"
    );
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`, "_blank");
  };

  const progressValue = Math.min(100, (attempts / MAX_ATTEMPTS) * 100);

  // ── ESTADO: esperando webhook ─────────────────────────────────────────────
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
            Verificando tu pago...
          </Title>
          <Text c="dimmed" ta="center" size="sm">
            Estamos confirmando la activación de tu plan con el procesador de
            pagos. Esto suele tardar menos de 30 segundos.
          </Text>
          <Badge color="blue" variant="light" leftSection={<IconClock size={12} />}>
            Intento {attempts + 1} de {MAX_ATTEMPTS}
          </Badge>
        </Stack>

        <Alert color="gray" variant="light" style={{ width: "100%" }}>
          <Text size="xs" c="dimmed" ta="center">
            No cierres esta página. Serás redirigido automáticamente cuando
            tu membresía esté activa.
          </Text>
        </Alert>
      </Stack>
    );
  }

  // ── ESTADO: plan activado ─────────────────────────────────────────────────
  if (pageStatus === "activated") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="teal" variant="light">
          <IconCircleCheck size={52} />
        </ThemeIcon>

        <Stack align="center" gap="xs">
          <Title order={2} ta="center">
            ¡Plan activado!
          </Title>
          <Text c="dimmed" ta="center">
            Tu membresía está activa. Ya puedes usar todas las funciones de tu
            nuevo plan.
          </Text>
        </Stack>

        <Group>
          <Button size="md" onClick={() => navigate("/gestionar-agenda")}>
            Ir a mi agenda
          </Button>
          <Button size="md" variant="light" onClick={() => navigate("/my-membership")}>
            Ver mi membresía
          </Button>
        </Group>
      </Stack>
    );
  }

  // ── ESTADO: timeout — no llegó el webhook a tiempo ───────────────────────
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
          El pago fue enviado, pero la activación está tardando más de lo
          normal. Esto puede ocurrir por demoras en la red.
        </Text>
      </Stack>

      <Alert color="blue" variant="light" style={{ width: "100%" }}>
        <Text size="sm">
          Si completaste el pago en Lemon Squeezy, tu plan se activará
          automáticamente en los próximos minutos. También puedes contactarnos
          por WhatsApp para una activación manual inmediata.
        </Text>
      </Alert>

      <Stack gap="sm" style={{ width: "100%" }}>
        <Button
          fullWidth
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={handleManualCheck}
        >
          Verificar de nuevo
        </Button>
        <Button
          fullWidth
          color="teal"
          variant="light"
          leftSection={<BsWhatsapp size={16} />}
          onClick={handleWhatsApp}
        >
          Contactar soporte por WhatsApp
        </Button>
        <Button
          fullWidth
          variant="subtle"
          color="gray"
          onClick={() => navigate("/my-membership")}
        >
          Ver estado de mi membresía
        </Button>
      </Stack>
    </Stack>
  );
}
