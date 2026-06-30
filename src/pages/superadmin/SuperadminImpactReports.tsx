// pages/superadmin/SuperadminImpactReports.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Container, Title, Text, Stack, Group, Card, Paper, Badge, SimpleGrid,
  Loader, Switch, Box, Tooltip, Divider, Alert, Table, ScrollArea, Progress,
} from "@mantine/core";
import { IconBulb, IconCalendarStats, IconWorldWww, IconUserOff, IconMessage2 } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import SuperadminNav from "./SuperadminNav";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getImpactReports,
  getImpactSurveyResponses,
  type ImpactReportsResponse,
  type ImpactReport,
  type ImpactSurveyResponseRow,
} from "../../services/impactReportService";
import {
  PREVIOUS_TOOL_OPTIONS,
  FEWER_NO_SHOWS_OPTIONS,
  BIGGEST_IMPROVEMENT_OPTIONS,
  PREVIOUS_TOOL_LABELS,
  FEWER_NO_SHOWS_LABELS,
  BIGGEST_IMPROVEMENT_LABELS,
} from "../../utils/impactSurveyOptions";

dayjs.locale("es");

/** Texto que vería el dueño del negocio (preview del mensaje cara-al-cliente). */
function buildPreviewText(r: ImpactReport): string {
  const parts: string[] = [];
  parts.push(`Llevas ${r.org.daysActive} días con AgenditApp.`);
  parts.push(`En ese tiempo gestionaste ${r.appointments.total.toLocaleString("es-CO")} citas`);
  if (r.onlineReservations.count > 0) {
    parts[parts.length - 1] +=
      `, de las cuales ${r.onlineReservations.count.toLocaleString("es-CO")} (${r.onlineReservations.pct}%) llegaron solas por tu link de reservas`;
  }
  parts[parts.length - 1] += ".";
  if (r.noShow.applicable) {
    parts.push(`Tu tasa de ausencias registrada es ${r.noShow.rate}%.`);
  }
  parts.push("¿Qué usabas para agendar antes de AgenditApp?");
  return parts.join(" ");
}

/** Mini gráfico de barras de la tendencia mensual (últimos 12 meses). */
function TrendBars({ byMonth }: { byMonth: ImpactReport["appointments"]["byMonth"] }) {
  const data = byMonth.slice(-12);
  const max = Math.max(1, ...data.map((m) => m.count));
  if (data.length === 0) return null;
  return (
    <Group gap={3} align="flex-end" h={48} wrap="nowrap">
      {data.map((m) => (
        <Tooltip key={m.month} label={`${dayjs(m.month + "-01").format("MMM YYYY")}: ${m.count} citas`} withArrow>
          <Box
            style={{
              width: 14,
              height: `${Math.max(4, (m.count / max) * 48)}px`,
              background: "var(--mantine-color-blue-5)",
              borderRadius: 3,
            }}
          />
        </Tooltip>
      ))}
    </Group>
  );
}

function StatTile({
  icon, label, value, sub, color = "blue",
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group gap={6} mb={4}>
        <Box c={color}>{icon}</Box>
        <Text size="xs" c="dimmed">{label}</Text>
      </Group>
      <Text fw={700} size="lg">{value}</Text>
      {sub && <Text size="xs" c="dimmed">{sub}</Text>}
    </Paper>
  );
}

function ReportCard({ r }: { r: ImpactReport }) {
  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
        <div>
          <Group gap="xs">
            <Text fw={700} size="md">{r.org.name}</Text>
            {!r.eligible && <Badge size="sm" color="gray" variant="light">no elegible</Badge>}
            {r.noShow.applicable && <Badge size="sm" color="grape" variant="light">con ausencias</Badge>}
          </Group>
          <Text size="xs" c="dimmed">
            {r.org.businessVertical ? `${r.org.businessVertical} · ` : ""}
            {r.org.daysActive} días activo · desde {dayjs(r.org.registeredAt).format("DD MMM YYYY")}
          </Text>
        </div>
        <TrendBars byMonth={r.appointments.byMonth} />
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <StatTile
          icon={<IconCalendarStats size={16} />}
          label="Citas gestionadas"
          value={r.appointments.total.toLocaleString("es-CO")}
          sub={`~${r.appointments.avgPerMonth}/mes`}
        />
        <StatTile
          icon={<IconWorldWww size={16} />}
          label="Reservas que llegan solas"
          value={r.onlineReservations.count.toLocaleString("es-CO")}
          sub={`${r.onlineReservations.pct}% del total`}
          color="teal"
        />
        <StatTile
          icon={<IconCalendarStats size={16} />}
          label="Mejor mes"
          value={r.appointments.peakMonth ? r.appointments.peakMonth.count.toLocaleString("es-CO") : "—"}
          sub={r.appointments.peakMonth ? dayjs(r.appointments.peakMonth.month + "-01").format("MMM YYYY") : undefined}
          color="indigo"
        />
        <StatTile
          icon={<IconUserOff size={16} />}
          label="Ausencias"
          value={r.noShow.applicable ? `${r.noShow.rate}%` : "sin datos"}
          sub={r.noShow.applicable ? `${r.noShow.count} no-show` : "no las registran"}
          color={r.noShow.applicable ? "grape" : "gray"}
        />
      </SimpleGrid>

      <Divider my="sm" label="Vista previa del mensaje al dueño" labelPosition="left" />
      <Paper withBorder p="sm" radius="md" bg="gray.0">
        <Text size="sm" style={{ fontStyle: "italic" }}>“{buildPreviewText(r)}”</Text>
      </Paper>
    </Card>
  );
}

const NO_SHOW_COLOR: Record<string, string> = {
  mucho_menos: "teal", algo_menos: "green", igual: "gray", mas: "red", no_se: "gray",
};

function DistRow({ label, count, total, color = "blue" }: {
  label: string; count: number; total: number; color?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Box>
      <Group justify="space-between" mb={2}>
        <Text size="sm">{label}</Text>
        <Text size="sm" c="dimmed">{count} · {pct}%</Text>
      </Group>
      <Progress value={pct} size="md" radius="sm" color={color} />
    </Box>
  );
}

function SurveyAnalysis({ rows, eligibleCount }: { rows: ImpactSurveyResponseRow[]; eligibleCount: number }) {
  const n = rows.length;
  const prev: Record<string, number> = {};
  const fewer: Record<string, number> = {};
  const impr: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.answers.previousTool) prev[r.answers.previousTool] = (prev[r.answers.previousTool] || 0) + 1;
    if (r.answers.fewerNoShows) fewer[r.answers.fewerNoShows] = (fewer[r.answers.fewerNoShows] || 0) + 1;
    (r.answers.biggestImprovement || []).forEach((b) => { impr[b] = (impr[b] || 0) + 1; });
  });
  const fewerYes = (fewer["mucho_menos"] || 0) + (fewer["algo_menos"] || 0);
  const fewerYesPct = n > 0 ? Math.round((fewerYes / n) * 100) : 0;
  const responseRate = eligibleCount > 0 ? Math.round((n / eligibleCount) * 100) : 0;

  return (
    <Card withBorder radius="md" p="md">
      <Text fw={700} size="lg" mb="xs">Análisis de respuestas</Text>
      <Text size="xs" c="dimmed" mb="sm">
        Agregado interno (auto-reportado, muestra pequeña — no es claim de marketing todavía).
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" mb="md">
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">Tasa de respuesta</Text>
          <Text fw={700} size="lg">{responseRate}%</Text>
          <Text size="xs" c="dimmed">{n} de {eligibleCount} elegibles</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">Percibe menos inasistencias</Text>
          <Text fw={700} size="lg" c="teal">{fewerYesPct}%</Text>
          <Text size="xs" c="dimmed">{fewerYes} de {n} (mucho + algo menos)</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed">Respuestas totales</Text>
          <Text fw={700} size="lg">{n}</Text>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Box>
          <Text fw={600} size="sm" mb="xs">¿Qué usaban antes?</Text>
          <Stack gap="xs">
            {PREVIOUS_TOOL_OPTIONS.filter((o) => prev[o.value]).map((o) => (
              <DistRow key={o.value} label={o.label} count={prev[o.value]} total={n} color="indigo" />
            ))}
          </Stack>
        </Box>
        <Box>
          <Text fw={600} size="sm" mb="xs">Percepción de inasistencias</Text>
          <Stack gap="xs">
            {FEWER_NO_SHOWS_OPTIONS.filter((o) => fewer[o.value]).map((o) => (
              <DistRow key={o.value} label={o.label} count={fewer[o.value]} total={n} color={NO_SHOW_COLOR[o.value]} />
            ))}
          </Stack>
        </Box>
        <Box>
          <Text fw={600} size="sm" mb="xs">¿Qué mejoró más?</Text>
          <Stack gap="xs">
            {BIGGEST_IMPROVEMENT_OPTIONS.filter((o) => impr[o.value]).map((o) => (
              <DistRow key={o.value} label={o.label} count={impr[o.value]} total={n} color="blue" />
            ))}
          </Stack>
        </Box>
      </SimpleGrid>
    </Card>
  );
}

function ResponsesTable({ rows }: { rows: ImpactSurveyResponseRow[] }) {
  if (rows.length === 0) {
    return <Text c="dimmed" size="sm">Aún no hay respuestas de admins.</Text>;
  }
  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Negocio</Table.Th>
            <Table.Th>Usaba antes</Table.Th>
            <Table.Th>¿Menos inasistencias?</Table.Th>
            <Table.Th>Mejoró más</Table.Th>
            <Table.Th>Comentario</Table.Th>
            <Table.Th>Fecha</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => {
            const prev = r.answers.previousTool === "otro"
              ? `Otro: ${r.answers.previousToolOther || "—"}`
              : (PREVIOUS_TOOL_LABELS[r.answers.previousTool || ""] || "—");
            return (
              <Table.Tr key={r.orgId}>
                <Table.Td><Text size="sm" fw={500}>{r.orgName}</Text></Table.Td>
                <Table.Td><Text size="sm">{prev}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={
                    r.answers.fewerNoShows === "mucho_menos" ? "teal"
                      : r.answers.fewerNoShows === "algo_menos" ? "green"
                      : r.answers.fewerNoShows === "mas" ? "red" : "gray"
                  }>
                    {FEWER_NO_SHOWS_LABELS[r.answers.fewerNoShows || ""] || "—"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {(r.answers.biggestImprovement || []).map((b) => (
                      <Badge key={b} size="xs" variant="outline" color="indigo">
                        {BIGGEST_IMPROVEMENT_LABELS[b] || b}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td><Text size="xs" c="dimmed" lineClamp={2}>{r.answers.comment || "—"}</Text></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{dayjs(r.respondedAt).format("DD MMM YY")}</Text></Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export default function SuperadminImpactReports() {
  const [loading, setLoading] = useState(true);
  const [includeIneligible, setIncludeIneligible] = useState(false);
  const [data, setData] = useState<ImpactReportsResponse | null>(null);
  const [responses, setResponses] = useState<ImpactSurveyResponseRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setData(await getImpactReports({ includeIneligible }));
      } catch (err) {
        console.error("Error cargando reportes de impacto:", err);
        notifications.show({ color: "red", title: "Error", message: "No se pudieron cargar los reportes" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [includeIneligible]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getImpactSurveyResponses();
        setResponses(res.responses);
      } catch (err) {
        console.error("Error cargando respuestas de la encuesta:", err);
      }
    })();
  }, []);

  const c = data?.counts;
  const bestOnline = useMemo(() => {
    if (!data?.reports.length) return null;
    return [...data.reports].sort((a, b) => b.onlineReservations.pct - a.onlineReservations.pct)[0];
  }, [data]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <SuperadminNav />

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Title order={2}>Reportes de impacto</Title>
              <Text c="dimmed" size="sm">
                Lo que AgenditApp le aportó a cada negocio desde que se registró. Preview interno — aún no se le
                muestra a ningún cliente.
              </Text>
            </div>
            <Group gap="md" align="center">
              <Switch
                label="Incluir no elegibles"
                checked={includeIneligible}
                onChange={(e) => setIncludeIneligible(e.currentTarget.checked)}
              />
              {loading && <Loader size="sm" />}
            </Group>
          </Group>

          {c && (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="md">
              <StatTile icon={<IconCalendarStats size={16} />} label="Con citas" value={String(c.withAppointments)} />
              <StatTile icon={<IconBulb size={16} />} label="Elegibles (≥45d, ≥20 citas)" value={String(c.eligible)} color="teal" />
              <StatTile icon={<IconWorldWww size={16} />} label="Con reservas online" value={String(c.withOnline)} color="indigo" />
              <StatTile icon={<IconUserOff size={16} />} label="Con bloque de ausencias" value={String(c.withNoShowBlock)} color="grape" />
            </SimpleGrid>
          )}
        </Card>

        {responses.length > 0 && (
          <SurveyAnalysis rows={responses} eligibleCount={c?.eligible ?? 0} />
        )}

        <Card withBorder radius="md" p="md">
          <Group gap="xs" mb="xs">
            <IconMessage2 size={18} />
            <Text fw={700} size="lg">Respuestas de la encuesta</Text>
            <Badge variant="light">{responses.length}</Badge>
          </Group>
          <Text size="xs" c="dimmed" mb="sm">
            Lo que respondieron los admins (qué usaban antes, percepción de inasistencias). Sin agregación de
            marketing todavía — esto es seguimiento.
          </Text>
          <Divider mb="sm" />
          <ResponsesTable rows={responses} />
        </Card>

        {bestOnline && bestOnline.onlineReservations.count > 0 && (
          <Alert icon={<IconBulb size={18} />} color="teal" variant="light" title="Titular más fuerte">
            <Text size="sm">
              <strong>{bestOnline.org.name}</strong> tiene el mejor caso de “reservas que llegan solas”:{" "}
              <strong>{bestOnline.onlineReservations.count.toLocaleString("es-CO")}</strong> reservas
              ({bestOnline.onlineReservations.pct}% de sus citas) entraron por su link sin intervención del equipo.
            </Text>
          </Alert>
        )}

        {!loading && data?.reports.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">No hay organizaciones que cumplan los criterios.</Text>
        )}

        <Stack gap="md">
          {data?.reports.map((r) => <ReportCard key={r.org.id} r={r} />)}
        </Stack>
      </Stack>
    </Container>
  );
}
