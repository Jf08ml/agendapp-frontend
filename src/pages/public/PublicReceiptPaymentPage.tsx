import { useEffect, useRef, useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  ThemeIcon,
  Alert,
  Card,
  Group,
  CopyButton,
  ActionIcon,
  Tooltip,
  Image,
  Divider,
  Badge,
  Loader,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from "@mantine/dropzone";
import {
  IconCircleCheck,
  IconClockHour4,
  IconCopy,
  IconCheck,
  IconUpload,
  IconPhoto,
  IconX,
  IconReceipt,
  IconCircleX,
} from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  submitReceipt,
  getOrderStatus,
  type ReceiptPaymentMethod,
} from "../../services/collectionService";

// Pantalla de pago por transferencia + comprobante. El flujo de reserva/clase/
// paquete navega aquí (react-router state) tras crear el Order manual; el cliente
// transfiere a la cuenta del negocio, sube la foto del comprobante y la IA valida.

interface ReceiptPaymentState {
  externalReference: string;
  amount: number;
  currency: string;
  paymentMethods: ReceiptPaymentMethod[];
  orderType?: "reservation" | "class" | "package";
}

type View = "upload" | "submitting" | "paid" | "review" | "rejected";

const METHOD_LABEL: Record<string, string> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  daviplata: "Daviplata",
  mercado_pago: "Mercado Pago",
  pix: "Pix",
  yape: "Yape",
  sinpe: "SINPE",
  transferencia_bancaria: "Transferencia bancaria",
  efectivo: "Efectivo",
  otros: "Otro",
};

function CopyField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <div style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="sm" fw={500} style={{ wordBreak: "break-all" }}>
          {value}
        </Text>
      </div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
            <ActionIcon variant="subtle" color={copied ? "teal" : "gray"} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

export default function PublicReceiptPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ReceiptPaymentState | null;

  const [file, setFile] = useState<FileWithPath | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [view, setView] = useState<View>("upload");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling: si quedó en revisión manual, escuchamos cuando el negocio lo
  // apruebe (→ paid) o rechace (→ failed/expired) para actualizar al cliente.
  useEffect(() => {
    if (view !== "review" || !state?.externalReference) return;
    const ref = state.externalReference;
    const stop = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    const tick = async () => {
      const order = await getOrderStatus(ref);
      if (!order) return;
      if (order.status === "paid") {
        stop();
        setView("paid");
      } else if (order.status === "failed" || order.status === "expired") {
        stop();
        setView("rejected");
      }
    };
    pollRef.current = setInterval(tick, 6000);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Sin datos (recarga directa): no podemos continuar.
  if (!state?.externalReference) {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={72} radius="xl" color="gray" variant="light">
          <IconReceipt size={44} />
        </ThemeIcon>
        <Title order={3} ta="center">
          No encontramos tu pago
        </Title>
        <Text c="dimmed" ta="center">
          Vuelve a iniciar la reserva para subir tu comprobante.
        </Text>
        <Button onClick={() => navigate("/")}>Volver al inicio</Button>
      </Stack>
    );
  }

  const amountLabel = `${state.amount.toLocaleString()} ${state.currency}`;

  const handleDrop = (files: FileWithPath[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setView("submitting");
    setError(null);
    const { result, message } = await submitReceipt(state.externalReference, file);
    if (!result) {
      setError(message);
      setView("upload");
      return;
    }
    setView(result.autoApproved ? "paid" : "review");
  };

  // ── Confirmado automáticamente ──────────────────────────────────────────────
  if (view === "paid") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="teal" variant="light">
          <IconCircleCheck size={52} />
        </ThemeIcon>
        <Title order={2} ta="center">
          ¡Pago confirmado!
        </Title>
        <Text c="dimmed" ta="center">
          Validamos tu comprobante y tu reserva quedó confirmada. Te enviaremos los
          detalles por WhatsApp.
        </Text>
        <Button size="md" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Stack>
    );
  }

  // ── Recibido, en revisión manual (con polling en vivo) ──────────────────────
  if (view === "review") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="yellow" variant="light">
          <IconClockHour4 size={52} />
        </ThemeIcon>
        <Title order={2} ta="center">
          Recibimos tu comprobante
        </Title>
        <Text c="dimmed" ta="center">
          Lo estamos validando. Esta pantalla se actualizará automáticamente cuando
          el negocio lo confirme, y también te avisaremos por WhatsApp.
        </Text>
        <Group gap="xs">
          <Loader size="sm" color="yellow" />
          <Text size="sm" c="dimmed">
            Esperando confirmación…
          </Text>
        </Group>
        <Button size="md" variant="light" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Stack>
    );
  }

  // ── Rechazado por el negocio ────────────────────────────────────────────────
  if (view === "rejected") {
    return (
      <Stack align="center" justify="center" mt={80} gap="lg" maw={480} mx="auto">
        <ThemeIcon size={80} radius="xl" color="red" variant="light">
          <IconCircleX size={52} />
        </ThemeIcon>
        <Title order={2} ta="center">
          Tu comprobante no fue aprobado
        </Title>
        <Text c="dimmed" ta="center">
          El negocio no pudo validar tu pago. Si crees que es un error, comunícate
          con ellos o intenta reservar de nuevo.
        </Text>
        <Button size="md" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Stack>
    );
  }

  // ── Subida del comprobante ──────────────────────────────────────────────────
  return (
    <Stack mt={40} gap="lg" maw={520} mx="auto" px="md" pb={60}>
      <Stack gap={4} align="center">
        <ThemeIcon size={56} radius="xl" color="blue" variant="light">
          <IconReceipt size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">
          Paga y sube tu comprobante
        </Title>
        <Text c="dimmed" ta="center" size="sm">
          Transfiere{" "}
          <Text span fw={700} c="blue">
            {amountLabel}
          </Text>{" "}
          a una de las cuentas y sube la captura. Validamos el pago al instante.
        </Text>
      </Stack>

      {/* Cuentas para pagar */}
      <Card withBorder radius="md" p="md">
        <Text fw={600} mb="sm">
          Cuentas para pagar
        </Text>
        <Stack gap="md">
          {state.paymentMethods.length === 0 && (
            <Text size="sm" c="dimmed">
              El negocio no configuró cuentas. Contáctalo para coordinar el pago.
            </Text>
          )}
          {state.paymentMethods.map((pm, i) => (
            <div key={i}>
              {i > 0 && <Divider mb="md" />}
              <Group justify="space-between" mb={6}>
                <Badge variant="light">{METHOD_LABEL[pm.type] || pm.type}</Badge>
              </Group>
              <Stack gap={6}>
                <CopyField label="Titular" value={pm.accountName} />
                <CopyField label="Número de cuenta" value={pm.accountNumber} />
                <CopyField label="Teléfono" value={pm.phoneNumber} />
                {pm.notes && (
                  <Text size="xs" c="dimmed">
                    {pm.notes}
                  </Text>
                )}
                {pm.qrCodeUrl && (
                  <Image src={pm.qrCodeUrl} alt="QR de pago" w={140} h={140} fit="contain" />
                )}
              </Stack>
            </div>
          ))}
        </Stack>
      </Card>

      {/* Subida del comprobante */}
      <Card withBorder radius="md" p="md">
        <Text fw={600} mb="sm">
          Sube tu comprobante
        </Text>
        {preview ? (
          <Stack gap="sm" align="center">
            <Image src={preview} alt="Comprobante" mah={320} fit="contain" radius="md" />
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
            >
              Cambiar imagen
            </Button>
          </Stack>
        ) : (
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_MIME_TYPE}
            maxSize={8 * 1024 ** 2}
            multiple={false}
          >
            <Group justify="center" gap="xl" mih={140} style={{ pointerEvents: "none" }}>
              <Dropzone.Accept>
                <IconUpload size={42} color="var(--mantine-color-blue-6)" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={42} color="var(--mantine-color-red-6)" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={42} color="var(--mantine-color-dimmed)" />
              </Dropzone.Idle>
              <div>
                <Text size="sm" inline>
                  Arrastra la captura aquí o haz clic para elegirla
                </Text>
                <Text size="xs" c="dimmed" inline mt={6}>
                  JPG, PNG o WEBP — máx. 8MB
                </Text>
              </div>
            </Group>
          </Dropzone>
        )}
      </Card>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Button
        size="md"
        disabled={!file || view === "submitting"}
        leftSection={view === "submitting" ? <Loader size="xs" color="white" /> : undefined}
        onClick={handleSubmit}
      >
        {view === "submitting" ? "Validando comprobante..." : "Enviar comprobante"}
      </Button>
      <Text size="xs" c="dimmed" ta="center">
        Validamos tu comprobante con IA. Si todo coincide, tu reserva se confirma al
        instante; si no, el negocio lo revisará.
      </Text>
    </Stack>
  );
}
