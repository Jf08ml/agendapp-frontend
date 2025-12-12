// components/ReservationDepositAlert.tsx
import { Alert, Stack, Text, Button, Group, Card, Badge, CopyButton, ActionIcon, Tooltip, Image, Modal } from "@mantine/core";
import { BiInfoCircle, BiCopy } from "react-icons/bi";
import { BsWhatsapp } from "react-icons/bs";
import { CheckIcon } from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useState } from "react";

interface ReservationDepositAlertProps {
  reservationId?: string;
  clientName?: string;
  serviceName?: string;
  servicePrice?: number;
  appointmentDate?: string;
  appointmentTime?: string;
}

export function ReservationDepositAlert({
  reservationId,
  clientName,
  serviceName,
  servicePrice = 0,
  appointmentDate,
  appointmentTime,
}: ReservationDepositAlertProps) {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedQR, setSelectedQR] = useState<{ url: string; label: string } | null>(null);
  const isMobile = useMediaQuery("(max-width: 48rem)");
  
  const requireDeposit = organization?.requireReservationDeposit || false;
  const depositPercentage = organization?.reservationDepositPercentage || 50;
  const paymentMethods = organization?.paymentMethods || [];
  const whatsappUrl = organization?.whatsappUrl || "";

  // Si no se requiere depósito, no mostrar nada
  if (!requireDeposit) {
    return null;
  }

  const depositAmount = (servicePrice * depositPercentage) / 100;

  const paymentTypeLabels: Record<string, string> = {
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    daviplata: "Daviplata",
    otros: "Otros",
  };

  const paymentTypeColors: Record<string, string> = {
    nequi: "grape",
    bancolombia: "yellow",
    daviplata: "red",
    otros: "gray",
  };

  const handleSendWhatsApp = () => {
    // Extraer número de WhatsApp de la URL
    let phoneNumber = "";
    if (whatsappUrl) {
      const match = whatsappUrl.match(/wa\.me\/(\d+)/);
      if (match) {
        phoneNumber = match[1];
      }
    }

    if (!phoneNumber) {
      phoneNumber = organization?.phoneNumber || "";
    }

    const message = encodeURIComponent(
      `Hola! Adjunto comprobante de pago para mi reserva:\n\n` +
      `📅 Fecha: ${appointmentDate || "N/A"}\n` +
      `🕐 Hora: ${appointmentTime || "N/A"}\n` +
      `💇 Servicio: ${serviceName || "N/A"}\n` +
      `👤 Cliente: ${clientName || "N/A"}\n` +
      `💰 Abono: $${depositAmount.toLocaleString()} COP (${depositPercentage}%)\n` +
      `📝 ID Reserva: ${reservationId || "N/A"}\n\n` +
      `Espero confirmación de la reserva. Gracias!`
    );

    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handleQRClick = (qrUrl: string, methodType: string) => {
    setSelectedQR({ url: qrUrl, label: paymentTypeLabels[methodType] });
    open();
  };

  return (
    <Alert 
      icon={!isMobile ? <BiInfoCircle size={20} /> : undefined} 
      color="orange" 
      variant="light"
      p={isMobile ? "sm" : "md"}
    >
      <Stack gap={isMobile ? "sm" : "md"}>
        <div>
          <Text size="sm" fw={600} mb={4}>
            Abono requerido para aprobar tu reserva
          </Text>
          <Text size={isMobile ? "xs" : "sm"}>
            Para asegurar tu cita, deberás hacer un abono del <strong>{depositPercentage}%</strong> del
            valor del servicio.
          </Text>
        </div>

        {/* Monto a abonar */}
        <Card withBorder padding="sm" style={{ backgroundColor: "#fff3e0" }}>
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="xs" c="dimmed">
                Monto a abonar:
              </Text>
              <Text size={isMobile ? "md" : "lg"} fw={700} c="orange">
                ${depositAmount.toLocaleString()} COP
              </Text>
            </div>
            <CopyButton value={depositAmount.toString()}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "¡Copiado!" : "Copiar monto"}>
                  <ActionIcon
                    color={copied ? "teal" : "gray"}
                    variant="light"
                    onClick={copy}
                    size={isMobile ? "md" : "lg"}
                  >
                    {copied ? <CheckIcon size={16} /> : <BiCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Card>

        {/* Métodos de pago */}
        {paymentMethods.length > 0 && (
          <div>
            <Text size="xs" fw={600} mb={isMobile ? 6 : 8}>
              Métodos de pago disponibles:
            </Text>
            <Stack gap={isMobile ? "sm" : "xs"}>
              {paymentMethods.map((method, index) => (
                <Card key={index} withBorder padding={isMobile ? "sm" : "xs"} style={{ backgroundColor: "white" }}>
                  <Stack gap={isMobile ? "xs" : "sm"}>
                    {/* Info del método */}
                    <Stack gap="xs">
                      <Group justify="space-between" wrap="wrap" gap="xs">
                        <Group gap="xs">
                          <Badge color={paymentTypeColors[method.type]} size="sm">
                            {paymentTypeLabels[method.type]}
                          </Badge>
                          {method.accountName && (
                            <Text size="xs" truncate={isMobile ? "end" : undefined}>
                              {method.accountName}
                            </Text>
                          )}
                        </Group>
                        {method.phoneNumber && (
                          <Group gap={4}>
                            <Text size="xs" style={{ fontFamily: "monospace" }}>
                              {method.phoneNumber}
                            </Text>
                            <CopyButton value={method.phoneNumber}>
                              {({ copied, copy }) => (
                                <ActionIcon
                                  size="xs"
                                  color={copied ? "teal" : "gray"}
                                  variant="subtle"
                                  onClick={copy}
                                >
                                  {copied ? <CheckIcon size={12} /> : <BiCopy size={12} />}
                                </ActionIcon>
                              )}
                            </CopyButton>
                          </Group>
                        )}
                      </Group>
                      {method.accountNumber && (
                        <Group gap={4} wrap="wrap">
                          <Text size="xs" c="dimmed">
                            Cuenta: {method.accountNumber}
                          </Text>
                          <CopyButton value={method.accountNumber}>
                            {({ copied, copy }) => (
                              <ActionIcon
                                size="xs"
                                color={copied ? "teal" : "gray"}
                                variant="subtle"
                                onClick={copy}
                              >
                                {copied ? <CheckIcon size={12} /> : <BiCopy size={12} />}
                              </ActionIcon>
                            )}
                          </CopyButton>
                        </Group>
                      )}
                      {method.notes && (
                        <Text size="xs" c="dimmed" fs="italic">
                          {method.notes}
                        </Text>
                      )}
                    </Stack>
                    
                    {/* QR Code centrado en mobile */}
                    {method.qrCodeUrl && (
                      <Group justify={isMobile ? "center" : "flex-end"}>
                        <Image
                          src={method.qrCodeUrl}
                          alt={`QR ${paymentTypeLabels[method.type]}`}
                          w={isMobile ? 120 : 100}
                          h={isMobile ? 120 : 100}
                          fit="contain"
                          style={{ 
                            border: "1px solid #e0e0e0", 
                            borderRadius: 4,
                            cursor: "pointer",
                            transition: "transform 0.2s"
                          }}
                          onClick={() => handleQRClick(method.qrCodeUrl!, method.type)}
                          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        />
                      </Group>
                    )}
                  </Stack>
                </Card>
              ))}
            </Stack>
          </div>
        )}

        {/* Botón de WhatsApp */}
        <Button
          leftSection={<BsWhatsapp size={18} />}
          color="teal"
          onClick={handleSendWhatsApp}
          fullWidth
        >
          Enviar Comprobante por WhatsApp
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          Una vez realices el pago, envíanos el comprobante y aprobaremos tu reserva
        </Text>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={`Código QR - ${selectedQR?.label || ""}`}
        centered
        size={isMobile ? "sm" : "auto"}
        fullScreen={isMobile}
      >
        <Stack align="center" gap="md" p={isMobile ? "xs" : "md"}>
          {selectedQR && (
            <Image
              src={selectedQR.url}
              alt={`QR ${selectedQR.label}`}
              maw={isMobile ? "100%" : 400}
              w={isMobile ? "100%" : "auto"}
              fit="contain"
            />
          )}
          <Text size="sm" c="dimmed" ta="center">
            Escanea este código QR para realizar el pago
          </Text>
        </Stack>
      </Modal>
    </Alert>
  );
}
