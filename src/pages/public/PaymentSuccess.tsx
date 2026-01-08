import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getCurrentMembership } from "../../services/membershipService";
import { verifyCheckout } from "../../services/paymentsService";
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Timeline,
  Box,
} from "@mantine/core";
import {
  IconCheck,
  IconClock,
  IconRefresh,
  IconAlertCircle,
  IconCreditCard,
  IconRocket,
} from "@tabler/icons-react";

const POLLING_DURATION = 60000; // 60 segundos (Polar -> backend suele tardar ~1 min)
const POLLING_INTERVAL = 2000; // cada 2 segundos
const MAX_PROCESSING_TIME = 60; // 60 segundos estimados
const MIN_LOADING_SECONDS = 30; // mantener loading al menos 30s antes de mostrar re-consulta
import { useDispatch } from "react-redux";
import { fetchOrganizationConfig } from "../../features/organization/sliceOrganization";
import type { AppDispatch } from "../../app/store";

export default function PaymentSuccess() {
  const dispatch = useDispatch<AppDispatch>();
  const [params] = useSearchParams();
  const org = params.get("org") || "";
  const plan = params.get("plan") || "";
  const currency = (params.get("currency") || "").toUpperCase();
  const sessionId = params.get("sessionId") || "";

  const [loading, setLoading] = useState(true);
  const [manualChecking, setManualChecking] = useState(false);
  const [membershipOk, setMembershipOk] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [checkoutVerified, setCheckoutVerified] = useState(false);
  const [pollingComplete, setPollingComplete] = useState(false);

  const canManualRetry = !membershipOk && elapsedTime >= MIN_LOADING_SECONDS;
  const isBusy = loading || manualChecking;

  // Contador de tiempo transcurrido
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mantener loading mínimo 30s, luego permitir re-consulta manual
  useEffect(() => {
    if (!membershipOk && loading && elapsedTime >= MIN_LOADING_SECONDS) {
      setLoading(false);
    }
  }, [elapsedTime, membershipOk, loading]);

  // Lógica de verificación y polling
  useEffect(() => {
    let cancelled = false;
    let pollCount = 0;

    async function run() {
      try {
        // 1) Verificar checkout con Polar (si tenemos sessionId)
        if (sessionId) {
          try {
            await verifyCheckout(sessionId);
            if (!cancelled) {
              setCheckoutVerified(true);
            }
          } catch (e) {
            console.error("Error verificando checkout:", e);
          }
        }

        // 2) Poll de membresía activa
        const start = Date.now();
        while (!cancelled && Date.now() - start < POLLING_DURATION) {
          pollCount++;
          const membership = await getCurrentMembership(org);
          
          if (membership && membership.status === "active") {
            setMembershipOk(true);
            setLoading(false);
            return;
          }

          await new Promise((r) => setTimeout(r, POLLING_INTERVAL));
        }

        // Si llegamos aquí, el polling terminó sin éxito
        setPollingComplete(true);
        setLoading(false);
      } catch (err) {
        console.error("Error en verificación:", err);
        setPollingComplete(true);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [org, sessionId]);

  useEffect(() => {
    if (!membershipOk) return;
    // Actualiza el slice de organización (hasAccessBlocked, branding, etc.)
    // para que el resto del panel no dependa de un refresh manual.
    void dispatch(fetchOrganizationConfig());
  }, [dispatch, membershipOk]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleRetry = async () => {
    if (!org || manualChecking || membershipOk) return;
    setManualChecking(true);
    setPollingComplete(false);

    try {
      if (sessionId) {
        try {
          await verifyCheckout(sessionId);
          setCheckoutVerified(true);
        } catch (e) {
          console.error("Error verificando checkout:", e);
        }
      }

      const start = Date.now();
      const manualDuration = 15000; // 15s de re-consulta rápida
      while (Date.now() - start < manualDuration) {
        const membership = await getCurrentMembership(org);
        if (membership && membership.status === "active") {
          setMembershipOk(true);
          return;
        }
        await sleep(POLLING_INTERVAL);
      }

      setPollingComplete(true);
    } finally {
      setManualChecking(false);
    }
  };

  const progressValue = Math.min((elapsedTime / MAX_PROCESSING_TIME) * 100, 100);

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon
              size={80}
              radius="xl"
              variant="light"
              color={membershipOk ? "green" : isBusy ? "blue" : "yellow"}
            >
              {membershipOk ? (
                <IconCheck size={50} />
              ) : isBusy ? (
                <Loader size={50} />
              ) : (
                <IconClock size={50} />
              )}
            </ThemeIcon>

            <Title order={1} ta="center">
              {membershipOk
                ? "¡Pago Confirmado!"
                : isBusy
                ? "Procesando tu Pago"
                : "Pago Recibido"}
            </Title>

            <Text size="lg" c="dimmed" ta="center">
              {membershipOk
                ? "Tu membresía ha sido activada exitosamente"
                : isBusy
                ? "Estamos verificando tu pago y activando tu cuenta"
                : "Tu pago ha sido recibido correctamente"}
            </Text>
          </Stack>
        </Paper>

        {/* Detalles del pago */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Organización:</Text>
              <Text>{org}</Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Plan seleccionado:</Text>
              <Text>{plan}</Text>
            </Group>
            {currency && (
              <Group justify="space-between">
                <Text fw={500}>Moneda:</Text>
                <Text>{currency}</Text>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Timeline de progreso */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Estado del Proceso
          </Title>
          <Timeline active={membershipOk ? 3 : checkoutVerified ? 1 : 0} bulletSize={24}>
            <Timeline.Item
              bullet={<IconCreditCard size={12} />}
              title="Pago recibido"
            >
              <Text c="dimmed" size="sm">
                Tu pago ha sido procesado por Polar
              </Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={checkoutVerified ? <IconCheck size={12} /> : <IconClock size={12} />}
              title="Verificación de pago"
            >
              <Text c="dimmed" size="sm">
                {checkoutVerified
                  ? "Pago verificado correctamente"
                  : "Validando transacción..."}
              </Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={membershipOk ? <IconCheck size={12} /> : <IconClock size={12} />}
              title="Activación de cuenta"
            >
              <Text c="dimmed" size="sm">
                {membershipOk
                  ? "Tu cuenta ha sido activada"
                  : loading
                  ? "Activando tu membresía..."
                  : "Procesando activación..."}
              </Text>
            </Timeline.Item>

            <Timeline.Item
              bullet={<IconRocket size={12} />}
              title="¡Listo para usar!"
            >
              <Text c="dimmed" size="sm">
                {membershipOk
                  ? "Ya puedes acceder a todas las funciones"
                  : "Pronto podrás acceder a tu cuenta"}
              </Text>
            </Timeline.Item>
          </Timeline>
        </Card>

        {/* Información de tiempo de procesamiento */}
        {!membershipOk && (
          <Alert
            variant="light"
            color={pollingComplete ? "yellow" : "blue"}
            icon={<IconAlertCircle />}
            title={
              pollingComplete
                ? "¿Tu cuenta aún no está activa?"
                : "Tiempo de procesamiento"
            }
          >
            <Stack gap="sm">
              <Text size="sm">
                {pollingComplete ? (
                  <>
                    El proceso de activación puede tardar hasta{" "}
                    <strong>1-2 minutos</strong>. Si ya han pasado más de 2 minutos,
                    intenta recargar la página.
                  </>
                ) : (
                  <>
                    El proceso de activación normalmente toma entre{" "}
                    <strong>30-60 segundos</strong>. Estamos verificando
                    automáticamente el estado de tu cuenta.
                    {canManualRetry ? (
                      <> Si ya esperaste 30s, puedes volver a consultar.</>
                    ) : null}
                  </>
                )}
              </Text>

              {loading && (
                <Box>
                  <Text size="xs" c="dimmed" mb={5}>
                    Tiempo transcurrido: {elapsedTime}s
                  </Text>
                  <Progress value={progressValue} size="sm" animated />
                </Box>
              )}

              {canManualRetry && !isBusy && (
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRetry}
                  variant="light"
                  fullWidth
                  mt="sm"
                >
                  Volver a consultar
                </Button>
              )}
            </Stack>
          </Alert>
        )}

        {/* Botones de acción */}
        <Stack gap="sm">
          <Button
            component={Link}
            to="/my-membership"
            variant="filled"
            size="lg"
            fullWidth
            disabled={!membershipOk && isBusy}
          >
            {membershipOk ? "Ver Mi Membresía" : "Ir a Mi Membresía"}
          </Button>
          
          {membershipOk && (
            <Button component={Link} to="/" variant="light" size="lg" fullWidth>
              Volver al inicio
            </Button>
          )}

          {!membershipOk && !isBusy && (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="lg"
              fullWidth
              leftSection={<IconRefresh size={16} />}
            >
              Volver a consultar
            </Button>
          )}
        </Stack>

        {/* Mensaje de soporte */}
        {pollingComplete && !membershipOk && (
          <Alert variant="light" color="gray">
            <Text size="sm" ta="center">
              Si después de 2 minutos tu cuenta sigue sin activarse, por favor
              contacta nuestro soporte por WhatsApp para asistencia inmediata.
            </Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
