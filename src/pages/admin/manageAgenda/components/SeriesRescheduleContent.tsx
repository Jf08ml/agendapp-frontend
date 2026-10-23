import { useState } from "react";
import { Alert, Badge, Button, Checkbox, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconArrowRight, IconRepeat } from "@tabler/icons-react";
import type { SeriesReschedulePreview, SeriesRescheduleItem } from "../../../../services/appointmentService";
import { formatInTimezone } from "../../../../utils/timezoneUtils";

interface SeriesRescheduleContentProps {
  preview: SeriesReschedulePreview;
  timezone: string;
  timeFormat?: "12h" | "24h";
  onOnlyThis: () => void;
  onThisAndFollowing: (force: boolean) => void;
  onCancel: () => void;
}

const STATUS_BADGE: Record<SeriesRescheduleItem["status"], { color: string; label: string }> = {
  available: { color: "teal", label: "Disponible" },
  conflict: { color: "orange", label: "Choque" },
  no_work: { color: "orange", label: "Fuera de horario" },
  past: { color: "gray", label: "En el pasado" },
};

/**
 * 🔁 Al reprogramar una cita de una serie: elegir si se mueve solo esa o también
 * las siguientes, con la vista previa de cómo quedarían (y cuáles chocan).
 */
export default function SeriesRescheduleContent({
  preview,
  timezone,
  timeFormat = "12h",
  onOnlyThis,
  onThisAndFollowing,
  onCancel,
}: SeriesRescheduleContentProps) {
  const [force, setForce] = useState(false);
  const { items, summary } = preview;
  const problems = summary.conflict + summary.no_work;
  const timeFmt = timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const fmt = (d: string) => formatInTimezone(d, timezone, `ddd D MMM, ${timeFmt}`);
  const willMove = summary.available + (force ? problems : 0);

  return (
    <Stack gap="sm">
      <Text size="sm">
        Esta cita es parte de una serie y tiene <b>{summary.total}</b>{" "}
        {summary.total === 1 ? "cita siguiente" : "citas siguientes"}. ¿Quieres aplicar el mismo
        cambio (día, hora y profesional) a las siguientes?
      </Text>

      <ScrollArea.Autosize mah={260} type="auto">
        <Stack gap={6}>
          {items.map((item) => (
            <Group key={item._id} gap="xs" wrap="nowrap" justify="space-between">
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="xs" fw={600} truncate>
                  {item.serviceName}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Text size="xs" c="dimmed" td="line-through">
                    {fmt(item.oldStartDate)}
                  </Text>
                  <IconArrowRight size={12} />
                  <Text size="xs">{fmt(item.newStartDate)}</Text>
                </Group>
                {item.reason && item.status !== "available" && (
                  <Text size="xs" c="orange.7">
                    {item.reason}
                  </Text>
                )}
              </Stack>
              <Badge size="xs" variant="light" color={STATUS_BADGE[item.status].color}>
                {STATUS_BADGE[item.status].label}
              </Badge>
            </Group>
          ))}
        </Stack>
      </ScrollArea.Autosize>

      {problems > 0 && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
          <Stack gap={6}>
            <Text size="xs">
              {problems === 1 ? "1 cita choca" : `${problems} citas chocan`} con otra cita o queda
              fuera del horario. Si no las mueves, se quedan en su horario actual.
            </Text>
            <Checkbox
              size="xs"
              label="Moverlas de todas formas"
              checked={force}
              onChange={(e) => setForce(e.currentTarget.checked)}
            />
          </Stack>
        </Alert>
      )}
      {summary.past > 0 && (
        <Text size="xs" c="dimmed">
          {summary.past === 1 ? "1 cita quedaría" : `${summary.past} citas quedarían`} en una fecha
          pasada y no se moverá{summary.past === 1 ? "" : "n"}.
        </Text>
      )}

      <Stack gap="xs" mt="xs">
        <Button
          leftSection={<IconRepeat size={16} />}
          onClick={() => onThisAndFollowing(force)}
          disabled={willMove === 0}
          fullWidth
        >
          Esta y las siguientes ({willMove + 1} citas)
        </Button>
        <Button variant="light" onClick={onOnlyThis} fullWidth>
          Solo esta cita
        </Button>
        <Button variant="subtle" color="gray" onClick={onCancel} fullWidth>
          Cancelar
        </Button>
      </Stack>
    </Stack>
  );
}
