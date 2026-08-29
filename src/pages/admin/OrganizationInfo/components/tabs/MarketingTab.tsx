import { SimpleGrid, Stack, TextInput, Text, Alert, Accordion, List, Anchor } from "@mantine/core";
import { IconBrandGoogle, IconTarget, IconInfoCircle, IconHelpCircle } from "@tabler/icons-react";
import SectionCard from "../SectionCard";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";

export default function MarketingTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const hasAdsId = !!form.values.analyticsConfig?.googleAdsId;

  return (
    <Stack gap="md">
      <SectionCard
        title="Google Analytics"
        description="Mide las visitas a tu página de reserva en línea desde tu propia cuenta de Google Analytics (GA4)."
        icon={<IconBrandGoogle size={16} />}
        iconColor="blue"
      >
        <Stack gap="sm">
          <TextInput
            label="ID de medición (GA4)"
            description="Lo encuentras en Google Analytics → Administrar → Flujos de datos → tu flujo web. Formato: G-XXXXXXXXXX"
            placeholder="G-ABC1234567"
            {...form.getInputProps("analyticsConfig.gaMeasurementId")}
            disabled={!isEditing}
          />
          <Accordion variant="separated">
            <Accordion.Item value="ga-guide">
              <Accordion.Control icon={<IconHelpCircle size={16} />}>
                <Text size="sm">¿No sabes de dónde sacar este dato? Sigue estos pasos</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <List type="ordered" size="sm" spacing={4}>
                  <List.Item>
                    Entra a{" "}
                    <Anchor href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                      analytics.google.com
                    </Anchor>{" "}
                    con tu cuenta de Google (o crea una gratis si no tienes).
                  </List.Item>
                  <List.Item>
                    Si es tu primera vez, sigue el asistente "Crear cuenta" → nombra tu negocio →
                    elige "Web" como plataforma y pon la dirección de tu página de reserva.
                  </List.Item>
                  <List.Item>
                    Ya dentro, ve al ícono de engranaje (Administrar) → columna "Propiedad" →{" "}
                    <b>Flujos de datos</b> → selecciona tu flujo web.
                  </List.Item>
                  <List.Item>
                    Copia el <b>ID de medición</b> (empieza con "G-") y pégalo en el campo de arriba.
                  </List.Item>
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Google Ads"
        description="Rastrea visitas y conversiones de tus campañas de Google Ads en tu página de reserva."
        icon={<IconTarget size={16} />}
        iconColor="orange"
      >
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="ID de conversión de Google Ads"
              description="Lo encuentras en Google Ads → Herramientas → Conversiones. Formato: AW-XXXXXXXXX"
              placeholder="AW-123456789"
              {...form.getInputProps("analyticsConfig.googleAdsId")}
              disabled={!isEditing}
            />
            <TextInput
              label="Etiqueta de conversión"
              description="La parte después de la barra en 'Enviar a' (ej: AW-123456789/AbC-D_efG12h3IjK)"
              placeholder="AbC-D_efG12h3IjK"
              {...form.getInputProps("analyticsConfig.googleAdsConversionLabel")}
              disabled={!isEditing || !hasAdsId}
            />
          </SimpleGrid>
          <Text size="xs" c="dimmed">
            Con la etiqueta configurada, registramos automáticamente una conversión cada vez que un
            cliente completa una reserva desde tu página pública (asistente de reservas o formulario
            manual).
          </Text>
          <Accordion variant="separated">
            <Accordion.Item value="ads-guide">
              <Accordion.Control icon={<IconHelpCircle size={16} />}>
                <Text size="sm">¿No sabes de dónde sacar estos datos? Sigue estos pasos</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <List type="ordered" size="sm" spacing={4}>
                  <List.Item>
                    Entra a{" "}
                    <Anchor href="https://ads.google.com" target="_blank" rel="noopener noreferrer">
                      ads.google.com
                    </Anchor>{" "}
                    con tu cuenta (o crea una si aún no tienes campañas).
                  </List.Item>
                  <List.Item>
                    Ve al ícono de llave inglesa (Herramientas y configuración) → sección "Medición"
                    → <b>Conversiones</b>.
                  </List.Item>
                  <List.Item>
                    Haz clic en "+ Nueva acción de conversión" → elige <b>"Sitio web"</b>.
                  </List.Item>
                  <List.Item>
                    Ponle un nombre (ej: "Reserva completada"), categoría "Programar cita" o
                    "Reserva", y guarda.
                  </List.Item>
                  <List.Item>
                    Google te mostrará un fragmento de código con algo como{" "}
                    <code>send_to: 'AW-123456789/AbC-D_efG12h3IjK'</code>. La parte antes de la
                    barra ("AW-...") va en <b>ID de conversión</b>; la parte después de la barra va
                    en <b>Etiqueta de conversión</b>.
                  </List.Item>
                </List>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </SectionCard>

      <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
        <Text size="xs" c="dimmed">
          Estos tags solo miden reservas hechas desde el enlace público (web). Las reservas hechas
          directamente por WhatsApp con tu asistente no se pueden reportar a Google Ads porque
          ocurren fuera del navegador.
        </Text>
      </Alert>
    </Stack>
  );
}
