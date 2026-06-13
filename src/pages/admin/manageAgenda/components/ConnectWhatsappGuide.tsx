import { useState } from "react";
import { Paper, Group, Stack, Text, Button, ThemeIcon, ActionIcon } from "@mantine/core";
import { IconBrandWhatsapp, IconArrowRight, IconX } from "@tabler/icons-react";

interface Props {
  /** Navega a la página de conexión de WhatsApp. */
  onConnect: () => void;
  /** Id de la org para recordar el descarte por negocio. */
  organizationId?: string;
}

const dismissKey = (orgId?: string) => `agenda_wa_nudge_dismissed_${orgId || "x"}`;

/**
 * Puente C2 → C4: una vez que el negocio ya creó al menos una cita pero todavía
 * no conectó WhatsApp, lo invita a conectarlo para que sus clientes reciban
 * confirmaciones y recordatorios automáticos (el "aha" mágico). Descartable.
 */
export default function ConnectWhatsappGuide({ onConnect, organizationId }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissKey(organizationId)) === "1"
  );
  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey(organizationId), "1");
    setDismissed(true);
  };

  return (
    <Paper
      withBorder
      radius="lg"
      p="lg"
      mb="md"
      style={{
        background:
          "linear-gradient(135deg, var(--mantine-color-teal-0) 0%, var(--mantine-color-green-0) 100%)",
        borderColor: "var(--mantine-color-teal-2)",
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" gap="md" wrap="nowrap">
          <ThemeIcon size={48} radius="xl" variant="light" color="teal" style={{ flexShrink: 0 }}>
            <IconBrandWhatsapp size={26} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={700} size="md">
              Conecta tu WhatsApp para avisar a tus clientes
            </Text>
            <Text size="sm" c="dimmed" maw={580}>
              ¡Ya tienes tu primera cita! Conecta tu línea de WhatsApp y tus clientes recibirán
              automáticamente la confirmación y el recordatorio antes de cada cita. Toma menos de un
              minuto y reduce las inasistencias.
            </Text>
            <Group gap="xs" mt={6}>
              <Button
                color="teal"
                leftSection={<IconBrandWhatsapp size={16} />}
                rightSection={<IconArrowRight size={14} />}
                onClick={onConnect}
              >
                Conectar mi WhatsApp
              </Button>
              <Button variant="subtle" color="gray" size="sm" onClick={dismiss}>
                Ahora no
              </Button>
            </Group>
          </Stack>
        </Group>
        <ActionIcon variant="subtle" color="gray" onClick={dismiss} aria-label="Descartar">
          <IconX size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
