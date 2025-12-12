// components/PaymentMethodsModal.tsx
import { Modal, Stack, Text, Button, Group, CopyButton, Alert, ActionIcon, Tooltip, Divider, Badge, CheckIcon } from "@mantine/core";
import { Membership } from "../services/membershipService";
import { BiCopy, BiInfoCircle } from "react-icons/bi";
import { BsWhatsapp } from "react-icons/bs";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

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
  
  // Información de pago (puedes mover esto a variables de entorno o configuración)
  const NEQUI_NUMBER = "3132735116"; // Número de WhatsApp del administrador
  const NEQUI_NAME = "Juan Felipe Lasso";

  const amount = planPrice || membership?.planId?.price || 0;
  const plan = planName || membership?.planId?.displayName || "Plan";

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Hola! Acabo de realizar el pago de $${amount.toLocaleString()} COP para renovar mi membresía (${plan}). Mi organización es: ${organization?.name || "No especificado"}`
    );
    window.open(`https://wa.me/57${NEQUI_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          💳 Métodos de Pago
        </Text>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Información del plan */}
        <Alert icon={<BiInfoCircle size={20} />} color="blue" variant="light">
          <Text size="sm">
            <strong>{plan}</strong>
          </Text>
          <Text size="xl" fw={700} mt="xs">
            ${amount.toLocaleString()} COP
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Pago mensual
          </Text>
        </Alert>

        <Divider />

        {/* Método Nequi */}
        <Stack gap="xs">
          <Group gap="xs">
            <Badge color="grape" variant="filled" size="lg">
              Nequi
            </Badge>
            <Text size="sm" fw={500}>
              Transferencia Directa
            </Text>
          </Group>

          <Stack gap="sm" p="md" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            {/* Número de Nequi */}
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                Número de Nequi:
              </Text>
              <Group gap="xs">
                <Text size="lg" fw={600} style={{ fontFamily: "monospace" }}>
                  {NEQUI_NUMBER}
                </Text>
                <CopyButton value={NEQUI_NUMBER}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "¡Copiado!" : "Copiar número"}>
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

            {/* Nombre */}
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                Nombre:
              </Text>
              <Text size="sm" fw={500}>
                {NEQUI_NAME}
              </Text>
            </div>

            {/* Monto */}
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                Monto a transferir:
              </Text>
              <Group gap="xs">
                <Text size="lg" fw={700} c="grape">
                  ${amount.toLocaleString()} COP
                </Text>
                <CopyButton value={amount.toString()}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "¡Copiado!" : "Copiar monto"}>
                      <ActionIcon
                        color={copied ? "teal" : "gray"}
                        variant="light"
                        onClick={copy}
                        size="sm"
                      >
                        {copied ? <CheckIcon size={14} /> : <BiCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </div>
          </Stack>
        </Stack>

        {/* Instrucciones */}
        <Alert color="yellow" variant="light" icon={<BiInfoCircle size={18} />}>
          <Text size="xs" fw={500} mb={4}>
            Instrucciones:
          </Text>
          <Stack gap={4}>
            <Text size="xs">1. Realiza la transferencia por Nequi</Text>
            <Text size="xs">2. Envía el comprobante por WhatsApp</Text>
            <Text size="xs">3. Espera la confirmación de activación</Text>
            <Text size="xs" c="dimmed" mt="xs">
              ⏱️ Activación en menos de 24 horas
            </Text>
          </Stack>
        </Alert>

        {/* Botones de acción */}
        <Group justify="space-between" mt="md">
          <Button
            variant="light"
            color="gray"
            onClick={onClose}
          >
            Cerrar
          </Button>

          <Button
            leftSection={<BsWhatsapp size={18} />}
            color="teal"
            onClick={handleWhatsAppContact}
          >
            Enviar Comprobante
          </Button>
        </Group>

        {/* Nota final */}
        <Text size="xs" c="dimmed" ta="center">
          Después de realizar el pago, nos contactaremos contigo para activar tu membresía
        </Text>
      </Stack>
    </Modal>
  );
}
