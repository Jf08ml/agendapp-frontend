/* eslint-disable @typescript-eslint/no-explicit-any */
// components/PaymentMethodsModal.tsx
import { Modal, Stack, Text, Button, Group, CopyButton, Alert, ActionIcon, Tooltip, Divider, Badge, CheckIcon, Tabs } from "@mantine/core";
import { Membership } from "../services/membershipService";
import { BiCopy, BiInfoCircle } from "react-icons/bi";
import { BsWhatsapp } from "react-icons/bs";
import { CgCreditCard } from "react-icons/cg";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { createMembershipCheckout } from "../services/paymentsService";
import { notifications } from "@mantine/notifications";
import { useState } from "react";

interface PaymentMethodsModalProps {
  opened: boolean;
  onClose: () => void;
  membership: Membership | null;
  planPrice?: number;
  planName?: string;
}

export function PaymentMethodsModal({
  opened,
  onClose,
  membership,
  planPrice,
  planName,
}: PaymentMethodsModalProps) {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [loadingPolar, setLoadingPolar] = useState(false);
  
  // Información de pago
  const PAYMENT_NUMBER = "3132735116";
  const PAYMENT_NAME = "Juan Felipe Lasso";
  const PAYPAL_EMAIL = "lassojuanfe@gmail.com";

  const price = planPrice || membership?.planId?.price || 0;
  const currency = membership?.planId?.currency || "USD";
  const plan = planName || membership?.planId?.displayName || "Plan";
  const planSlug = membership?.planId?.slug;

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hola! Acabo de realizar el pago de $${price} ${currency} para renovar mi membresía (${plan}). Mi organización es: ${organization?.name || "No especificado"}`
    );
    window.open(`https://wa.me/57${PAYMENT_NUMBER}?text=${message}`, "_blank");
  };

  const handlePolarCheckout = async () => {
    if (!organization?._id || !planSlug) {
      notifications.show({
        title: "Error",
        message: "No se pudo obtener la información del plan",
        color: "red",
      });
      return;
    }

    setLoadingPolar(true);
    try {
      const { checkoutUrl } = await createMembershipCheckout({
        organizationId: organization._id,
        planSlug: planSlug,
        currency: "USD",
      });

      notifications.show({
        title: "Redirigiendo...",
        message: "Serás redirigido al checkout de Polar",
        color: "blue",
      });

      window.location.href = checkoutUrl;
    } catch (error: any) {
      notifications.show({
        title: "Error al crear checkout",
        message: error.response?.data?.message || "No se pudo crear el checkout",
        color: "red",
      });
    } finally {
      setLoadingPolar(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          💳 Renovar Membresía
        </Text>
      }
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Información del plan */}
        <Alert icon={<BiInfoCircle size={20} />} color="blue" variant="light">
          <Text size="sm" fw={500}>
            {plan}
          </Text>
          <Text size="xl" fw={700} mt="xs">
            ${price} {currency} / mes
          </Text>
        </Alert>

        {/* Tabs para métodos de pago */}
        <Tabs defaultValue="international" variant="pills">
          <Tabs.List grow>
            <Tabs.Tab value="international" leftSection={<CgCreditCard size={16} />}>
              Tarjeta / Internacional
            </Tabs.Tab>
            <Tabs.Tab value="transfer" leftSection={<BiCopy size={16} />}>
              Transferencia Directa
            </Tabs.Tab>
          </Tabs.List>

          {/* Panel: Pago con Tarjeta (Polar) */}
          <Tabs.Panel value="international" pt="lg">
            <Stack gap="md">
              <Alert color="blue" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  🌍 Pago Internacional con Tarjeta
                </Text>
                <Text size="xs">
                  Acepta tarjetas de crédito/débito de todo el mundo. Procesado de forma segura por Polar.
                </Text>
                <Divider my="sm" />
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Monto a pagar:
                  </Text>
                  <Text size="lg" fw={700} c="blue">
                    ${price} {currency}
                  </Text>
                </Group>
              </Alert>

              <Button
                size="lg"
                fullWidth
                leftSection={<CgCreditCard size={20} />}
                onClick={handlePolarCheckout}
                loading={loadingPolar}
                color="blue"
              >
                {loadingPolar ? "Redirigiendo..." : "Pagar con Tarjeta (Polar)"}
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                Serás redirigido a una página segura de pago. Después del pago exitoso, tu membresía se renovará automáticamente.
              </Text>
            </Stack>
          </Tabs.Panel>

          {/* Panel: Transferencia Directa */}
          <Tabs.Panel value="transfer" pt="lg">
            <Stack gap="md">
              <Alert color="green" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  🇨🇴 Transferencia Directa (Colombia)
                </Text>
                <Text size="xs">
                  Realiza una transferencia bancaria a alguna de estas cuentas y envía el comprobante por WhatsApp.
                </Text>
              </Alert>

              {/* Nequi */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge color="grape" variant="filled" size="lg">
                    Nequi
                  </Badge>
                </Group>

                <Stack gap="sm" p="md" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Número:
                    </Text>
                    <Group gap="xs">
                      <Text size="lg" fw={600} style={{ fontFamily: "monospace" }}>
                        {PAYMENT_NUMBER}
                      </Text>
                      <CopyButton value={PAYMENT_NUMBER}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "¡Copiado!" : "Copiar"}>
                            <ActionIcon
                              color={copied ? "teal" : "gray"}
                              variant="light"
                              onClick={copy}
                            >
                              {copied ? <CheckIcon size={16} /> : <BiCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </div>

                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Nombre:
                    </Text>
                    <Text size="sm" fw={500}>
                      {PAYMENT_NAME}
                    </Text>
                  </div>
                </Stack>
              </Stack>

              {/* Daviplata */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge color="red" variant="filled" size="lg">
                    Daviplata
                  </Badge>
                </Group>

                <Stack gap="sm" p="md" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Número / Llave:
                    </Text>
                    <Group gap="xs">
                      <Text size="lg" fw={600} style={{ fontFamily: "monospace" }}>
                        {PAYMENT_NUMBER}
                      </Text>
                      <CopyButton value={PAYMENT_NUMBER}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "¡Copiado!" : "Copiar"}>
                            <ActionIcon
                              color={copied ? "teal" : "gray"}
                              variant="light"
                              onClick={copy}
                            >
                              {copied ? <CheckIcon size={16} /> : <BiCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">
                      También: Llave Bre-B {PAYMENT_NUMBER}
                    </Text>
                  </div>

                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Nombre:
                    </Text>
                    <Text size="sm" fw={500}>
                      {PAYMENT_NAME}
                    </Text>
                  </div>
                </Stack>
              </Stack>

              {/* PayPal */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge color="blue" variant="filled" size="lg">
                    PayPal
                  </Badge>
                </Group>

                <Stack gap="sm" p="md" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Correo PayPal:
                    </Text>
                    <Group gap="xs">
                      <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>
                        {PAYPAL_EMAIL}
                      </Text>
                      <CopyButton value={PAYPAL_EMAIL}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "¡Copiado!" : "Copiar"}>
                            <ActionIcon
                              color={copied ? "teal" : "gray"}
                              variant="light"
                              onClick={copy}
                            >
                              {copied ? <CheckIcon size={16} /> : <BiCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </div>

                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Nombre:
                    </Text>
                    <Text size="sm" fw={500}>
                      {PAYMENT_NAME}
                    </Text>
                  </div>
                </Stack>
              </Stack>

              {/* Monto a transferir */}
              <Alert color="grape" variant="light">
                <Text size="xs" fw={500} mb={4}>
                  Monto a transferir:
                </Text>
                <Group gap="md" align="center">
                  <Text size="xl" fw={700}>
                    ${price} {currency}
                  </Text>
                  <CopyButton value={price.toString()}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "¡Copiado!" : "Copiar monto"}>
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="light"
                          onClick={copy}
                        >
                          {copied ? <CheckIcon size={16} /> : <BiCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Alert>

              {/* Instrucciones */}
              <Alert color="yellow" variant="light" icon={<BiInfoCircle size={18} />}>
                <Text size="xs" fw={500} mb={4}>
                  Instrucciones:
                </Text>
                <Stack gap={4}>
                  <Text size="xs">1. Realiza la transferencia a alguna de las cuentas</Text>
                  <Text size="xs">2. Envía el comprobante por WhatsApp</Text>
                  <Text size="xs">3. Espera la confirmación de activación</Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    ⏱️ Activación en menos de 24 horas
                  </Text>
                </Stack>
              </Alert>

              {/* Botón WhatsApp */}
              <Button
                size="lg"
                fullWidth
                leftSection={<BsWhatsapp size={18} />}
                color="teal"
                onClick={handleWhatsAppContact}
              >
                Enviar Comprobante por WhatsApp
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Botón cerrar */}
        <Group justify="center" mt="md">
          <Button variant="light" color="gray" onClick={onClose}>
            Cerrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
