// components/ActivatePlanModal.tsx
import { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Badge,
  Divider,
  Alert,
  CopyButton,
  ActionIcon,
  Tooltip,
  Paper,
  ThemeIcon,
  CheckIcon,
  SegmentedControl,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconBuildingBank,
  IconClock,
  IconCopy,
  IconCheck,
  IconCalendarRepeat,
  IconCalendarOff,
  IconInfoCircle,
} from "@tabler/icons-react";
import { BsWhatsapp } from "react-icons/bs";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { apiGeneral } from "../services/axiosConfig";
import { billingLabel, billingShort } from "../utils/billingCycle";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useNavigate } from "react-router-dom";

interface Plan {
  _id: string;
  displayName: string;
  price: number;
  currency: string;
  billingCycle: string;
  paypalPlanId: string | null;
}

interface ActivatePlanModalProps {
  opened: boolean;
  onClose: () => void;
  plan: Plan | null;
  modalTitle?: string;
}

// Datos de pago manual
const PAYMENT_NUMBER = "3132735116";
const PAYMENT_NAME = "Juan Felipe Lasso";
const PAYPAL_EMAIL = "lassojuanfe@gmail.com";
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;

type PayMode = "subscription" | "once";

export function ActivatePlanModal({ opened, onClose, plan, modalTitle = "Activar mi plan" }: ActivatePlanModalProps) {
  const [payMode, setPayMode] = useState<PayMode>("subscription");
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);
  const navigate = useNavigate();

  if (!plan) return null;

  const billingShortLabel = billingShort(plan.billingCycle);
  const hasPaypalPlan = !!plan.paypalPlanId;

  // ── PayPal SDK config cambia según el modo ────────────────────────────────
  const sdkOptions =
    payMode === "subscription"
      ? { clientId: PAYPAL_CLIENT_ID, vault: true, intent: "subscription" }
      : { clientId: PAYPAL_CLIENT_ID, intent: "capture" };

  // ── Suscripción: onApprove ────────────────────────────────────────────────
  const handleSubscriptionApprove = async (data: { subscriptionID: string | null }) => {
    if (!data.subscriptionID || !organizationId) return;
    setProcessing(true);
    setPaypalError(null);
    try {
      await apiGeneral.post("/payments/paypal/subscription-created", {
        subscriptionId: data.subscriptionID,
        planId: plan._id,
        organizationId,
      });
      navigate("/payment-success");
    } catch {
      setPaypalError("No se pudo registrar la suscripción. Contacta soporte.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Pago único: onApprove ─────────────────────────────────────────────────
  const handleOrderApprove = async (data: { orderID: string }) => {
    if (!organizationId) return;
    setProcessing(true);
    setPaypalError(null);
    try {
      // El capture se hace en el backend para mayor fiabilidad
      await apiGeneral.post("/payments/paypal/order-captured", {
        orderId: data.orderID,
        planId: plan._id,
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

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola! Acabo de realizar el pago de $${plan.price} ${plan.currency} para activar mi plan ${plan.displayName}. Mi organización es: ${organization?.name || "No especificado"}`
    );
    window.open(`https://wa.me/57${PAYMENT_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Text size="lg" fw={700}>{modalTitle}</Text>
          <Text size="sm" c="dimmed">
            {plan.displayName} — ${plan.price} {plan.currency}/{billingShortLabel}
          </Text>
        </Stack>
      }
      size="lg"
      centered
    >
      <Stack gap="xl">

        {/* ─── OPCIÓN 1: PayPal ─────────────────────────────────────────── */}
        {hasPaypalPlan && (
          <Paper withBorder p="lg" radius="md">
            <Stack gap="md">
              <Text fw={600} size="md">Pagar con PayPal</Text>

              {/* Selector de modalidad */}
              <SegmentedControl
                value={payMode}
                onChange={(v) => { setPayMode(v as PayMode); setPaypalError(null); }}
                data={[
                  {
                    value: "subscription",
                    label: (
                      <Group gap="xs" justify="center">
                        <IconCalendarRepeat size={14} />
                        <span>Suscripción automática</span>
                      </Group>
                    ),
                  },
                  {
                    value: "once",
                    label: (
                      <Group gap="xs" justify="center">
                        <IconCalendarOff size={14} />
                        <span>Solo este {billingShortLabel}</span>
                      </Group>
                    ),
                  },
                ]}
              />

              {payMode === "subscription" ? (
                <Alert color="blue" variant="light" icon={<IconCalendarRepeat size={16} />}>
                  <Text size="sm">
                    Se cobrará <strong>${plan.price} {plan.currency}</strong> cada {billingShortLabel} de forma automática.
                    Puedes cancelar desde tu cuenta de PayPal en cualquier momento.
                  </Text>
                </Alert>
              ) : (
                <Alert color="teal" variant="light" icon={<IconCalendarOff size={16} />}>
                  <Text size="sm">
                    Pago único de <strong>${plan.price} {plan.currency}</strong>. Tu acceso dura 1 {billingShortLabel} y no se renueva automáticamente.
                  </Text>
                </Alert>
              )}

              {paypalError && (
                <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                  {paypalError}
                </Alert>
              )}

              {processing ? (
                <Center py="sm">
                  <Stack align="center" gap="xs">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Procesando tu pago...</Text>
                  </Stack>
                </Center>
              ) : (
                // key fuerza remount del provider al cambiar intent (subscription vs capture)
                <PayPalScriptProvider key={payMode} options={sdkOptions}>
                  {payMode === "subscription" ? (
                    <PayPalButtons
                      style={{ layout: "vertical", label: "subscribe" }}
                      createSubscription={(_data, actions) =>
                        actions.subscription.create({ plan_id: plan.paypalPlanId! })
                      }
                      onApprove={(data) => handleSubscriptionApprove(data as { subscriptionID: string | null })}
                      onError={() => setPaypalError("Ocurrió un error con PayPal. Intenta de nuevo.")}
                      onCancel={() => setPaypalError(null)}
                    />
                  ) : (
                    <PayPalButtons
                      style={{ layout: "vertical", label: "pay" }}
                      createOrder={(_data, actions) =>
                        actions.order.create({
                          intent: "CAPTURE" as const,
                          purchase_units: [
                            {
                              amount: {
                                currency_code: plan.currency.toUpperCase(),
                                value: plan.price.toFixed(2),
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
            </Stack>
          </Paper>
        )}

        {/* ─── DIVISOR ────────────────────────────────────────────────── */}
        <Divider
          label={
            <Text size="sm" c="dimmed" fw={500}>
              o paga por transferencia bancaria
            </Text>
          }
          labelPosition="center"
        />

        {/* ─── OPCIÓN 2: Transferencia ─────────────────────────────────── */}
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" color="teal" variant="light">
                <IconBuildingBank size={22} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="md">Transferencia bancaria</Text>
                <Text size="xs" c="dimmed">Nequi, Daviplata o PayPal</Text>
              </div>
            </Group>
            <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />} size="sm">
              Activación en &lt;24 h
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            Realiza la transferencia y envíanos el comprobante por WhatsApp.
            Activaremos tu plan en menos de 24 horas.
          </Text>

          <Stack gap="sm">
            <AccountRow label="Nequi" color="grape" value={PAYMENT_NUMBER} secondaryLabel={`Nombre: ${PAYMENT_NAME}`} />
            <AccountRow label="Daviplata / Bre-B" color="red" value={PAYMENT_NUMBER} secondaryLabel={`Nombre: ${PAYMENT_NAME}`} />
            <AccountRow label="PayPal" color="blue" value={PAYPAL_EMAIL} secondaryLabel={`Nombre: ${PAYMENT_NAME}`} />
          </Stack>

          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-0)">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Monto a transferir:</Text>
              <Group gap="xs">
                <Text fw={700} size="lg">${plan.price} {plan.currency}</Text>
                <CopyButton value={String(plan.price)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copiado" : "Copiar monto"}>
                      <ActionIcon color={copied ? "teal" : "gray"} variant="light" size="sm" onClick={copy}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Group>
          </Paper>

          <Button fullWidth size="md" color="teal" variant="light" leftSection={<BsWhatsapp size={18} />} onClick={handleWhatsApp}>
            Enviar comprobante por WhatsApp
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

// ─── Sub-componente fila de cuenta ─────────────────────────────────────────
function AccountRow({ label, color, value, secondaryLabel }: { label: string; color: string; value: string; secondaryLabel: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Badge color={color} variant="filled" size="sm" style={{ flexShrink: 0 }}>{label}</Badge>
          <Stack gap={0}>
            <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>{value}</Text>
            <Text size="xs" c="dimmed">{secondaryLabel}</Text>
          </Stack>
        </Group>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "Copiado" : "Copiar"}>
              <ActionIcon color={copied ? "teal" : "gray"} variant="light" size="sm" onClick={copy} style={{ flexShrink: 0 }}>
                {copied ? <CheckIcon size={12} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Paper>
  );
}
