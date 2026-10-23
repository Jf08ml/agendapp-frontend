// components/PlanCheckout.tsx
// Contenido de pago de un plan (org → AgenditApp): elección de modalidad + botones PayPal
// + contacto de soporte. Compartido por ActivatePlanModal y PaymentMethodsModal.
import { useState } from "react";
import {
  Stack,
  Text,
  Group,
  Alert,
  Paper,
  SimpleGrid,
  UnstyledButton,
  ThemeIcon,
  Loader,
  Center,
  Anchor,
} from "@mantine/core";
import {
  IconCalendarRepeat,
  IconCalendarOff,
  IconInfoCircle,
  IconLock,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { BsWhatsapp } from "react-icons/bs";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { apiGeneral } from "../services/axiosConfig";
import { billingShort } from "../utils/billingCycle";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useNavigate } from "react-router-dom";

// WhatsApp de soporte para enviar comprobantes o resolver dudas de pago
const SUPPORT_WHATSAPP = "573506674686";
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;

type PayMode = "subscription" | "once";

interface PlanCheckoutProps {
  planId: string | undefined;
  paypalPlanId: string | null | undefined;
  planName: string;
  price: number;
  currency: string;
  billingCycle: string;
  /** Acción para el mensaje a soporte, p. ej. "activar mi plan Pro" */
  supportAction: string;
}

export function PlanCheckout({
  planId,
  paypalPlanId,
  planName,
  price,
  currency,
  billingCycle,
  supportAction,
}: PlanCheckoutProps) {
  const isLifetime = billingCycle === "lifetime";
  const [payMode, setPayMode] = useState<PayMode>(isLifetime ? "once" : "subscription");
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);
  const navigate = useNavigate();

  const cur = currency.toUpperCase();
  const period = billingShort(billingCycle);
  const canPayOnline = !!paypalPlanId && !!planId;

  const sdkOptions =
    payMode === "subscription"
      ? { clientId: PAYPAL_CLIENT_ID, vault: true, intent: "subscription" }
      : { clientId: PAYPAL_CLIENT_ID, intent: "capture" };

  const handleSubscriptionApprove = async (data: { subscriptionID: string | null }) => {
    if (!data.subscriptionID || !planId || !organizationId) return;
    setProcessing(true);
    setPaypalError(null);
    try {
      await apiGeneral.post("/payments/paypal/subscription-created", {
        subscriptionId: data.subscriptionID,
        planId,
        organizationId,
      });
      navigate("/payment-success");
    } catch {
      setPaypalError("No se pudo registrar la suscripción. Contacta soporte.");
    } finally {
      setProcessing(false);
    }
  };

  const handleOrderApprove = async (data: { orderID: string }) => {
    if (!planId || !organizationId) return;
    setProcessing(true);
    setPaypalError(null);
    try {
      // El capture se hace en el backend para mayor fiabilidad
      await apiGeneral.post("/payments/paypal/order-captured", {
        orderId: data.orderID,
        planId,
        organizationId,
      });
      navigate("/payment-success");
    } catch (err) {
      console.error("[PayPal] Error en pago único:", err);
      setPaypalError("El pago falló o fue rechazado. Intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  const supportHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    `Hola! Quiero ${supportAction} (${planName}, $${price} ${cur}). Mi organización es: ${organization?.name || "No especificado"}.`
  )}`;

  const selectMode = (mode: PayMode) => {
    setPayMode(mode);
    setPaypalError(null);
  };

  return (
    <Stack gap="lg">
      {/* ─── Precio ───────────────────────────────────────────────────── */}
      <Paper radius="md" p="md" bg="var(--mantine-color-default-hover)">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={600}>{planName}</Text>
          <Text fw={800} size="xl" style={{ whiteSpace: "nowrap" }}>
            ${price} <Text span size="sm" c="dimmed" fw={500}>{cur}{!isLifetime && ` / ${period}`}</Text>
          </Text>
        </Group>
      </Paper>

      {canPayOnline ? (
        <>
          {/* ─── Modalidad ─────────────────────────────────────────────── */}
          {!isLifetime && (
            <Stack gap="xs">
              <Text size="sm" fw={600}>¿Cómo quieres pagar?</Text>
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                <ModeCard
                  selected={payMode === "subscription"}
                  onClick={() => selectMode("subscription")}
                  icon={<IconCalendarRepeat size={18} />}
                  title="Renovación automática"
                  description={`Se cobra cada ${period}. Cancela cuando quieras.`}
                />
                <ModeCard
                  selected={payMode === "once"}
                  onClick={() => selectMode("once")}
                  icon={<IconCalendarOff size={18} />}
                  title={`Solo este ${period}`}
                  description="Pago único, no se renueva solo."
                />
              </SimpleGrid>
            </Stack>
          )}

          {/* ─── PayPal ────────────────────────────────────────────────── */}
          <Stack gap="xs">
            {paypalError && (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                {paypalError}
              </Alert>
            )}
            {processing ? (
              <Center py="lg">
                <Stack align="center" gap="xs">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Procesando tu pago...</Text>
                </Stack>
              </Center>
            ) : (
              <PayPalScriptProvider key={payMode} options={sdkOptions}>
                {payMode === "subscription" ? (
                  <PayPalButtons
                    style={{ layout: "vertical", label: "subscribe", shape: "rect" }}
                    createSubscription={(_data, actions) =>
                      actions.subscription.create({ plan_id: paypalPlanId! })
                    }
                    onApprove={(data) => handleSubscriptionApprove(data as { subscriptionID: string | null })}
                    onError={() => setPaypalError("Ocurrió un error con PayPal. Intenta de nuevo.")}
                    onCancel={() => setPaypalError(null)}
                  />
                ) : (
                  <PayPalButtons
                    style={{ layout: "vertical", label: "pay", shape: "rect" }}
                    createOrder={(_data, actions) =>
                      actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                          {
                            amount: {
                              currency_code: cur,
                              value: price.toFixed(2),
                            },
                          },
                        ],
                      })
                    }
                    onApprove={(data) => handleOrderApprove(data)}
                    onError={(err) => { console.error("[PayPal] onError pago único:", err); setPaypalError("Ocurrió un error con PayPal. Intenta de nuevo."); }}
                    onCancel={() => setPaypalError(null)}
                  />
                )}
              </PayPalScriptProvider>
            )}
            <Group gap={6} justify="center">
              <IconLock size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">Pago seguro procesado por PayPal</Text>
            </Group>
          </Stack>
        </>
      ) : (
        <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
          Este plan aún no tiene pago en línea. Escríbenos por WhatsApp y te ayudamos.
        </Alert>
      )}

      {/* ─── Soporte ──────────────────────────────────────────────────── */}
      <Group gap={6} justify="center" wrap="nowrap">
        <BsWhatsapp size={16} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
        <Text size="sm" c="dimmed" ta="center">
          ¿Dudas o ya pagaste y no se activó?{" "}
          <Anchor href={supportHref} target="_blank" rel="noopener noreferrer" size="sm" fw={600}>
            Escríbenos
          </Anchor>
        </Text>
      </Group>
    </Stack>
  );
}

// ─── Tarjeta seleccionable de modalidad ─────────────────────────────────────
function ModeCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <UnstyledButton onClick={onClick} aria-pressed={selected}>
      <Paper
        withBorder
        radius="md"
        p="sm"
        h="100%"
        style={{
          borderColor: selected ? "var(--mantine-primary-color-filled)" : undefined,
          borderWidth: selected ? 2 : 1,
          backgroundColor: selected ? "var(--mantine-primary-color-light)" : undefined,
        }}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon variant={selected ? "filled" : "light"} radius="md" size={32}>
            {icon}
          </ThemeIcon>
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="sm" fw={600}>{title}</Text>
            <Text size="xs" c="dimmed">{description}</Text>
          </Stack>
          {selected && <IconCircleCheckFilled size={18} color="var(--mantine-primary-color-filled)" />}
        </Group>
      </Paper>
    </UnstyledButton>
  );
}
