// pages/admin/manageAgenda/components/ImpactSurveyModal.tsx
//
// Modal "una sola vez" que le muestra al admin el reporte de impacto de su negocio
// (más citas, reservas que llegan solas, ausencias si las registra) y le hace una
// mini-encuesta. Las respuestas se guardan para seguimiento; no se otorga
// recompensa todavía (diferido).

import { useEffect, useState } from "react";
import {
  Modal, Stack, Group, Text, Title, Paper, SimpleGrid, Select, Radio,
  Chip, Textarea, Button, Box, ThemeIcon,
} from "@mantine/core";
import { IconTrophy, IconCalendarStats, IconWorldWww, IconUserOff } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import {
  getMyImpactSurvey,
  respondImpactSurvey,
  snoozeImpactSurvey,
  type MyImpactSurvey,
} from "../../../../services/impactSurveyService";
import {
  PREVIOUS_TOOL_OPTIONS,
  FEWER_NO_SHOWS_OPTIONS,
  BIGGEST_IMPROVEMENT_OPTIONS,
} from "../../../../utils/impactSurveyOptions";

interface Props {
  organizationId?: string;
}

function StatTile({
  icon, label, value, sub, color = "blue",
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group gap={6} mb={4}>
        <ThemeIcon variant="light" color={color} size="sm">{icon}</ThemeIcon>
        <Text size="xs" c="dimmed">{label}</Text>
      </Group>
      <Text fw={700} size="lg">{value}</Text>
      {sub && <Text size="xs" c="dimmed">{sub}</Text>}
    </Paper>
  );
}

export default function ImpactSurveyModal({ organizationId }: Props) {
  const [data, setData] = useState<MyImpactSurvey | null>(null);
  const [opened, setOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Respuestas
  const [previousTool, setPreviousTool] = useState<string | null>(null);
  const [previousToolOther, setPreviousToolOther] = useState("");
  const [fewerNoShows, setFewerNoShows] = useState<string | null>(null);
  const [biggestImprovement, setBiggestImprovement] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    (async () => {
      try {
        const res = await getMyImpactSurvey();
        if (active && res.show && res.report) {
          setData(res);
          setOpened(true);
        }
      } catch {
        // silencioso: no debe interrumpir la agenda
      }
    })();
    return () => { active = false; };
  }, [organizationId]);

  const report = data?.report;

  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      await respondImpactSurvey({
        answers: {
          previousTool,
          previousToolOther: previousTool === "otro" ? previousToolOther.trim() || null : null,
          fewerNoShows,
          biggestImprovement,
          comment: comment.trim() || null,
        },
        reportSnapshot: {
          daysActive: report.org.daysActive,
          totalAppointments: report.appointments.total,
          onlineCount: report.onlineReservations.count,
          onlinePct: report.onlineReservations.pct,
          noShowApplicable: report.noShow.applicable,
          noShowRate: report.noShow.rate,
        },
      });
      setOpened(false);
      showNotification({ color: "teal", title: "¡Gracias!", message: "Tu respuesta nos ayuda a mejorar AgenditApp." });
    } catch {
      showNotification({ color: "red", title: "Error", message: "No se pudo guardar tu respuesta. Intenta de nuevo." });
    } finally {
      setSubmitting(false);
    }
  };

  // "Responder en otro momento" (y x/escape): pospone unos días, luego vuelve.
  const handleSnooze = async () => {
    setOpened(false);
    try { await snoozeImpactSurvey(); } catch { /* silencioso */ }
  };

  if (!report) return null;

  const canSubmit = !!previousTool && !!fewerNoShows && !submitting;

  return (
    <Modal
      opened={opened}
      onClose={handleSnooze}
      size="lg"
      radius="md"
      centered
      closeOnClickOutside={false}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="yellow" radius="xl"><IconTrophy size={18} /></ThemeIcon>
          <Title order={4}>Tu impacto con AgenditApp</Title>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Llevas <strong>{report.org.daysActive} días</strong> con AgenditApp. Esto es lo que pasó en tu negocio
          desde entonces:
        </Text>

        <SimpleGrid cols={{ base: 2, sm: report.noShow.applicable ? 3 : 2 }} spacing="sm">
          <StatTile
            icon={<IconCalendarStats size={14} />}
            label="Citas gestionadas"
            value={report.appointments.total.toLocaleString("es-CO")}
            sub={`~${report.appointments.avgPerMonth}/mes`}
          />
          <StatTile
            icon={<IconWorldWww size={14} />}
            label="Reservas que llegaron solas"
            value={report.onlineReservations.count.toLocaleString("es-CO")}
            sub={`${report.onlineReservations.pct}% por tu link`}
            color="teal"
          />
          {report.noShow.applicable && (
            <StatTile
              icon={<IconUserOff size={14} />}
              label="Tasa de inasistencias"
              value={`${report.noShow.rate}%`}
              color="grape"
            />
          )}
        </SimpleGrid>

        <Box>
          <Text fw={600} size="sm" mb={6}>¿Qué usabas para agendar antes de AgenditApp?</Text>
          <Select
            placeholder="Elige una opción"
            data={PREVIOUS_TOOL_OPTIONS}
            value={previousTool}
            onChange={setPreviousTool}
            allowDeselect={false}
          />
          {previousTool === "otro" && (
            <Textarea
              mt="xs"
              placeholder="¿Qué usabas?"
              autosize
              minRows={1}
              value={previousToolOther}
              onChange={(e) => setPreviousToolOther(e.currentTarget.value)}
            />
          )}
        </Box>

        <Box>
          <Text fw={600} size="sm" mb={6}>Desde que usas AgenditApp, ¿sientes que tienes menos inasistencias?</Text>
          <Radio.Group value={fewerNoShows} onChange={setFewerNoShows}>
            <Stack gap={6}>
              {FEWER_NO_SHOWS_OPTIONS.map((o) => (
                <Radio key={o.value} value={o.value} label={o.label} size="sm" />
              ))}
            </Stack>
          </Radio.Group>
        </Box>

        <Box>
          <Text fw={600} size="sm" mb={6}>¿Qué fue lo que más mejoró? <Text span c="dimmed" size="xs">(opcional)</Text></Text>
          <Chip.Group multiple value={biggestImprovement} onChange={setBiggestImprovement}>
            <Group gap="xs">
              {BIGGEST_IMPROVEMENT_OPTIONS.map((o) => (
                <Chip key={o.value} value={o.value} size="sm" variant="outline">{o.label}</Chip>
              ))}
            </Group>
          </Chip.Group>
        </Box>

        <Textarea
          label="¿Algo más que quieras contarnos?"
          placeholder="Opcional"
          autosize
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
        />

        <Group justify="space-between" mt="xs">
          <Button variant="subtle" color="gray" onClick={handleSnooze}>Responder en otro momento</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>Enviar respuesta</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
