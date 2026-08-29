import { SimpleGrid, Stack, TextInput, Textarea, Select, Text, Group, Button, Alert } from "@mantine/core";
import { useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { QRCodeCanvas } from "qrcode.react";
import { showNotification } from "@mantine/notifications";
import { RootState } from "../../../../../app/store";
import {
  IconBuilding,
  IconMail,
  IconPhone,
  IconGlobe,
  IconClock,
  IconCurrencyDollar,
  IconLink,
  IconLayoutColumns,
  IconWriting,
  IconClockHour3,
  IconRobot,
  IconQrcode,
  IconCopy,
  IconDownload,
  IconAlertCircle,
} from "@tabler/icons-react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import { getAllCountries, getAllTimezones, getAllCurrencies } from "../../../../../utils/geoData";
import { getOrgUrl } from "../../../../../utils/domainUtils";

export default function ContactTab({
  form,
  isEditing,
  domains,
  slug,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
  domains: string[];
  slug?: string;
}) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const bookingUrl = useMemo(() => {
    const base = getOrgUrl({ slug, domains });
    return base ? `${base}/online-reservation` : null;
  }, [slug, domains]);

  const handleCopyLink = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      showNotification({ color: "green", message: "Enlace copiado" });
    } catch {
      showNotification({ color: "red", message: "No se pudo copiar el enlace" });
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-reserva-online${slug ? `-${slug}` : ""}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  // Listas completas memoizadas (ya están memoizadas en geoData, pero useMemo
  // evita recalcular el .map() del Select en cada render).
  const planLimits = useSelector((s: RootState) => (s.organization.organization as any)?.planLimits);
  const canUseLanding = planLimits?.professionalLanding !== false;

  const countryData = useMemo(
    () => getAllCountries().map((c) => ({ value: c.value, label: c.label })),
    []
  );

  const timezoneData = useMemo(
    () => getAllTimezones().map((tz) => ({ value: tz.value, label: tz.label })),
    []
  );

  const currencyData = useMemo(
    () => getAllCurrencies().map((c) => ({ value: c.value, label: c.label })),
    []
  );

  return (
    <Stack gap="md">
      <SectionCard
        title="Nombre y contacto"
        description="Estos datos se usan en tu encabezado, recibos y comunicaciones con clientes."
        icon={<IconBuilding size={16} />}
        iconColor="blue"
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            label="Nombre del negocio"
            placeholder="Mi Salón"
            leftSection={<IconBuilding size={16} />}
            {...form.getInputProps("name")}
            disabled={!isEditing}
          />
          <TextInput
            label="Correo electrónico"
            placeholder="contacto@minegocio.com"
            leftSection={<IconMail size={16} />}
            {...form.getInputProps("email")}
            disabled={!isEditing}
          />
          <TextInput
            label="Teléfono"
            placeholder="+57 300 000 0000"
            leftSection={<IconPhone size={16} />}
            {...form.getInputProps("phoneNumber")}
            disabled={!isEditing}
          />
          <Select
            label="País por defecto"
            description="País para validar números telefónicos de nuevos clientes"
            leftSection={<IconGlobe size={16} />}
            {...form.getInputProps("default_country")}
            disabled={!isEditing}
            searchable
            data={countryData}
          />
          <Select
            label="Zona horaria"
            description="Busca tu zona horaria (ej: America/Bogota, Europe/Madrid)"
            leftSection={<IconClock size={16} />}
            {...form.getInputProps("timezone")}
            disabled={!isEditing}
            searchable
            data={timezoneData}
          />
          <Select
            label="Moneda"
            description="Moneda principal usada por la organización"
            leftSection={<IconCurrencyDollar size={16} />}
            {...form.getInputProps("currency")}
            disabled={!isEditing}
            searchable
            data={currencyData}
          />
          <Select
            label="Formato de hora"
            description="Cómo se muestran las horas a tus clientes"
            leftSection={<IconClockHour3 size={16} />}
            {...form.getInputProps("timeFormat")}
            disabled={!isEditing}
            data={[
              { value: "12h", label: "12 horas (ej: 2:30 PM)" },
              { value: "24h", label: "24 horas (ej: 14:30)" },
            ]}
          />
          <TextInput
            label="Dominios"
            description="Gestionados por el equipo de soporte"
            leftSection={<IconLink size={16} />}
            value={(domains || []).join(", ")}
            disabled
          />
        </SimpleGrid>
      </SectionCard>

      <SectionCard
        title="Reserva en línea: enlace y código QR"
        description="Comparte este enlace o el código QR para que tus clientes agenden citas directamente, sin pasar por tu página de inicio."
        icon={<IconQrcode size={16} />}
        iconColor="grape"
      >
        {bookingUrl ? (
          <Stack gap="md">
            <Group align="flex-start" gap="xl" wrap="wrap">
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={bookingUrl}
                size={180}
                level="Q"
                marginSize={2}
              />
              <Stack gap="xs" style={{ flex: 1, minWidth: 240 }}>
                <TextInput
                  label="Enlace de reserva en línea"
                  value={bookingUrl}
                  readOnly
                  leftSection={<IconLink size={16} />}
                />
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconCopy size={14} />}
                    onClick={handleCopyLink}
                  >
                    Copiar enlace
                  </Button>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconDownload size={14} />}
                    onClick={handleDownloadQr}
                  >
                    Descargar QR (PNG)
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">
                  Este código no cambia mientras no cambie tu dominio o subdominio: puedes
                  imprimirlo una sola vez y reutilizarlo indefinidamente.
                </Text>
              </Stack>
            </Group>
          </Stack>
        ) : (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            No se pudo determinar el enlace público de tu negocio. Contacta a soporte para
            configurar tu subdominio.
          </Alert>
        )}
      </SectionCard>

      <SectionCard
        title="Asistente IA"
        description="Personaliza el nombre del asistente inteligente que aparece en el panel de administración."
        icon={<IconRobot size={16} />}
      >
        <Stack gap="xs">
          <TextInput
            label="Nombre del asistente"
            placeholder="Ej: Roxi, Luna, Max…"
            leftSection={<IconRobot size={16} />}
            maxLength={50}
            {...form.getInputProps("aiAssistantName")}
            disabled={!isEditing}
          />
          <Text size="xs" c="dimmed">
            Este nombre se mostrará en el botón del footer, en el encabezado del chat y en el mensaje de bienvenida del asistente.
          </Text>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Mensaje de bienvenida"
        description="Personaliza el mensaje que verán tus clientes en la página de inicio pública."
        icon={<IconWriting size={16} />}
        iconColor="violet"
      >
        <Stack gap="md">
          <Select
            label="Diseño de página de inicio"
            description="Elige cómo se mostrará la página principal a tus clientes"
            leftSection={<IconLayoutColumns size={16} />}
            {...form.getInputProps("homeLayout")}
            disabled={!isEditing}
            data={[
              { value: "modern", label: "Moderno - Tarjetas en fila con ícono circular" },
              { value: "minimal", label: "Minimalista - Diseño limpio y simple" },
              { value: "cards", label: "Tarjetas - Cuadrícula centrada" },
              {
                value: "landing",
                label: canUseLanding
                  ? "Landing - Página de presentación completa"
                  : "Landing - Página de presentación completa (Plan Marca/Pro)",
                disabled: !canUseLanding,
              },
              {
                value: "academy",
                label: canUseLanding
                  ? "Academia - Programas y servicios"
                  : "Academia - Programas y servicios (Plan Marca/Pro)",
                disabled: !canUseLanding,
              },
            ]}
          />
          <TextInput
            label="Título de bienvenida"
            placeholder="¡Hola! Bienvenido"
            {...form.getInputProps("welcomeTitle")}
            disabled={!isEditing}
          />
          <Textarea
            label="Descripción de bienvenida"
            placeholder="Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨"
            {...form.getInputProps("welcomeDescription")}
            disabled={!isEditing}
            minRows={3}
          />
        </Stack>
      </SectionCard>
    </Stack>
  );
}
