import { Button, Group, Progress, Stack, Text } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

interface WhatsappQuotaUsageProps {
  /** usage.whatsappAppointmentsThisMonth de /memberships/my-plan-info */
  usage?: { current: number; max: number | null } | null;
  /** Muestra el botón para ver planes cuando el cupo se está acabando */
  showUpgrade?: boolean;
}

/**
 * Consumo del tope mensual de citas con WhatsApp automático (planes de entrada).
 * No renderiza nada si el plan no tiene tope.
 */
export default function WhatsappQuotaUsage({ usage, showUpgrade = false }: WhatsappQuotaUsageProps) {
  const navigate = useNavigate();
  if (!usage || usage.max == null) return null;

  const { current, max } = usage;
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 100;
  const full = current >= max;
  const near = !full && pct >= 80;

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <IconBrandWhatsapp size={16} color="var(--mantine-color-green-6)" />
          <Text size="sm">Citas con WhatsApp este mes</Text>
        </Group>
        <Text size="sm" fw={600}>
          {current} / {max}
        </Text>
      </Group>
      <Progress value={pct} color={full ? "red" : near ? "orange" : "green"} size="sm" radius="xl" />
      {(full || near) && (
        <Text size="xs" c={full ? "red" : "orange"}>
          {full
            ? `Usaste las ${max} citas con confirmación y recordatorio de este mes. Tu agenda sigue funcionando, pero las próximas citas no recibirán mensajes automáticos hasta el próximo mes.`
            : `Te quedan ${max - current} citas con WhatsApp este mes. Después, las citas siguientes no recibirán mensajes automáticos hasta el próximo mes.`}
        </Text>
      )}
      {showUpgrade && (full || near) && (
        <Group>
          <Button size="xs" variant="light" color="green" onClick={() => navigate("/my-membership")}>
            Ver Plan Esencial: WhatsApp sin tope
          </Button>
        </Group>
      )}
    </Stack>
  );
}
