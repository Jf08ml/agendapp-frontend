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
  Loader,
  Paper,
  ThemeIcon,
  CheckIcon,
} from "@mantine/core";
import {
  IconCreditCard,
  IconBuildingBank,
  IconBolt,
  IconClock,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { BsWhatsapp } from "react-icons/bs";
import { BiInfoCircle } from "react-icons/bi";
import { apiGeneral } from "../services/axiosConfig";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

interface Plan {
  _id: string;
  displayName: string;
  price: number;
  currency: string;
  billingCycle: string;
}

interface ActivatePlanModalProps {
  opened: boolean;
  onClose: () => void;
  plan: Plan | null;
}

// Datos de pago manual
const PAYMENT_NUMBER = "3132735116";
const PAYMENT_NAME = "Juan Felipe Lasso";
const PAYPAL_EMAIL = "lassojuanfe@gmail.com";

export function ActivatePlanModal({ opened, onClose, plan }: ActivatePlanModalProps) {
  const [lsLoading, setLsLoading] = useState(false);
  const [lsError, setLsError] = useState<string | null>(null);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);

  const handleCardPayment = async () => {
    if (!plan || !organizationId) return;
    setLsLoading(true);
    setLsError(null);
    try {
      const res = await apiGeneral.post("/payments/checkout", {
        provider: "lemonsqueezy",
        planId: plan._id,
        organizationId,
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/my-membership`,
      });
      const checkoutUrl = res.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        // Guardar el momento del pago para que PaymentSuccess detecte si el webhook
        // llegó antes de que el usuario aterrizara en la página
        sessionStorage.setItem("ls_payment_initiated_at", Date.now().toString());
        window.location.href = checkoutUrl;
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "No se pudo iniciar el pago. Intenta de nuevo.";
      setLsError(msg);
    } finally {
      setLsLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola! Acabo de realizar el pago de $${plan?.price} ${plan?.currency} para activar mi plan ${plan?.displayName}. Mi organización es: ${organization?.name || "No especificado"}`
    );
    window.open(`https://wa.me/57${PAYMENT_NUMBER}?text=${message}`, "_blank");
  };

  if (!plan) return null;

  const billingLabel = plan.billingCycle === "monthly" ? "mes" : plan.billingCycle;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={2}>
          <Text size="lg" fw={700}>
            Activar mi plan
          </Text>
          <Text size="sm" c="dimmed">
            {plan.displayName} — ${plan.price} {plan.currency}/{billingLabel}
          </Text>
        </Stack>
      }
      size="lg"
      centered
    >
      <Stack gap="xl">

        {/* ─── OPCIÓN 1: Tarjeta ──────────────────────────────────────── */}
        <Paper withBorder p="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size={40} radius="md" color="blue" variant="light">
                  <IconCreditCard size={22} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="md">
                    Pago con tarjeta
                  </Text>
                  <Text size="xs" c="dimmed">
                    Crédito, débito o cualquier método digital
                  </Text>
                </div>
              </Group>
              <Badge
                color="green"
                variant="light"
                leftSection={<IconBolt size={12} />}
                size="sm"
              >
                Activación inmediata
              </Badge>
            </Group>

            <Text size="sm" c="dimmed">
              Serás redirigido a nuestra plataforma de pago segura. Una vez
              completado, tu plan se activará automáticamente sin ninguna espera.
            </Text>

            {lsError && (
              <Alert color="red" variant="light" icon={<BiInfoCircle size={16} />}>
                {lsError}
              </Alert>
            )}

            <Button
              fullWidth
              size="md"
              onClick={handleCardPayment}
              disabled={lsLoading}
              leftSection={lsLoading ? <Loader size="xs" color="white" /> : <IconCreditCard size={16} />}
            >
              {lsLoading ? "Preparando pago..." : `Pagar $${plan.price} ${plan.currency} con tarjeta`}
            </Button>
          </Stack>
        </Paper>

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
                <Text fw={600} size="md">
                  Transferencia bancaria
                </Text>
                <Text size="xs" c="dimmed">
                  Nequi, Daviplata o PayPal
                </Text>
              </div>
            </Group>
            <Badge
              color="yellow"
              variant="light"
              leftSection={<IconClock size={12} />}
              size="sm"
            >
              Activación en &lt;24 h
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            Realiza la transferencia a cualquiera de las cuentas a continuación
            y envíanos el comprobante por WhatsApp. Activaremos tu plan en menos
            de 24 horas.
          </Text>

          {/* Cuentas */}
          <Stack gap="sm">
            {/* Nequi */}
            <AccountRow
              label="Nequi"
              color="grape"
              value={PAYMENT_NUMBER}
              secondaryLabel={`Nombre: ${PAYMENT_NAME}`}
            />
            {/* Daviplata */}
            <AccountRow
              label="Daviplata / Bre-B"
              color="red"
              value={PAYMENT_NUMBER}
              secondaryLabel={`Nombre: ${PAYMENT_NAME}`}
            />
            {/* PayPal */}
            <AccountRow
              label="PayPal"
              color="blue"
              value={PAYPAL_EMAIL}
              secondaryLabel={`Nombre: ${PAYMENT_NAME}`}
            />
          </Stack>

          {/* Monto */}
          <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-0)">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Monto a transferir:
              </Text>
              <Group gap="xs">
                <Text fw={700} size="lg">
                  ${plan.price} {plan.currency}
                </Text>
                <CopyButton value={String(plan.price)}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copiado" : "Copiar monto"}>
                      <ActionIcon
                        color={copied ? "teal" : "gray"}
                        variant="light"
                        size="sm"
                        onClick={copy}
                      >
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Group>
          </Paper>

          {/* Botón WhatsApp */}
          <Button
            fullWidth
            size="md"
            color="teal"
            variant="light"
            leftSection={<BsWhatsapp size={18} />}
            onClick={handleWhatsApp}
          >
            Enviar comprobante por WhatsApp
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

// ─── Sub-componente fila de cuenta ─────────────────────────────────────────
function AccountRow({
  label,
  color,
  value,
  secondaryLabel,
}: {
  label: string;
  color: string;
  value: string;
  secondaryLabel: string;
}) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Badge color={color} variant="filled" size="sm" style={{ flexShrink: 0 }}>
            {label}
          </Badge>
          <Stack gap={0}>
            <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>
              {value}
            </Text>
            <Text size="xs" c="dimmed">
              {secondaryLabel}
            </Text>
          </Stack>
        </Group>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "Copiado" : "Copiar"}>
              <ActionIcon
                color={copied ? "teal" : "gray"}
                variant="light"
                size="sm"
                onClick={copy}
                style={{ flexShrink: 0 }}
              >
                {copied ? <CheckIcon size={12} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Paper>
  );
}
