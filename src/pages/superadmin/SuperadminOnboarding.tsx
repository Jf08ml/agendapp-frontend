// pages/superadmin/SuperadminOnboarding.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Container, Title, Text, Stack, Group, Card, Paper, Badge, Table,
  Divider, Loader, ScrollArea, Progress, Alert,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconBulb } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import SuperadminNav from "./SuperadminNav";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  getOnboardingFunnel,
  type OnboardingFunnel,
} from "../../services/onboardingFunnelService";

dayjs.locale("es");

export default function SuperadminOnboarding() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingFunnel | null>(null);
  const [range, setRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(29, "day").startOf("day").toDate(),
    dayjs().endOf("day").toDate(),
  ]);

  const dateParams = useMemo(() => {
    if (!range[0] || !range[1]) return null;
    return {
      startDate: dayjs(range[0]).format("YYYY-MM-DD"),
      endDate: dayjs(range[1]).format("YYYY-MM-DD"),
    };
  }, [range]);

  useEffect(() => {
    const load = async () => {
      if (!dateParams) return;
      setLoading(true);
      try {
        setData(await getOnboardingFunnel(dateParams));
      } catch (err) {
        console.error("Error cargando funnel de onboarding:", err);
        notifications.show({ color: "red", title: "Error", message: "No se pudo cargar el funnel" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [dateParams]);

  // Insight: hito con mayor tasa de conversión a pago (entre los que tienen base relevante)
  const bestPredictor = useMemo(() => {
    if (!data) return null;
    const candidates = data.conversionPorHito.filter((c) => c.base >= 3);
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (b.tasaPago > a.tasaPago ? b : a));
  }, [data]);

  const registered = data?.funnel.find((f) => f.clave === "registrados")?.total ?? 0;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Navegación superadmin (compartida) */}
        <SuperadminNav />

        {/* Header + filtros */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Title order={2}>Funnel de activación y onboarding</Title>
              <Text c="dimmed" size="sm">
                De los negocios registrados en el rango, cuántos alcanzan cada hito y cuál predice mejor la conversión a pago
              </Text>
            </div>
            <Group gap="sm" align="flex-end">
              <DatePickerInput
                type="range" label="Registrados entre" placeholder="Rango"
                value={range} onChange={setRange} locale="es" dropdownType="modal"
              />
              {loading && <Loader size="sm" />}
            </Group>
          </Group>
        </Card>

        {/* Insight destacado */}
        {bestPredictor && (
          <Alert icon={<IconBulb size={18} />} color="violet" variant="light" title="Hito que mejor predice la compra">
            <Text size="sm">
              En este rango, los negocios que alcanzan <strong>“{bestPredictor.hito}”</strong> convierten a pago en{" "}
              <strong>{bestPredictor.tasaPago}%</strong> ({bestPredictor.pagaron} de {bestPredictor.base}). Es la palanca de
              activación con mayor correlación con la conversión — vale la pena empujar a los usuarios hacia este hito.
            </Text>
          </Alert>
        )}

        {/* Funnel */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">Funnel de activación</Text>
          <Divider mb="md" />
          <Stack gap="sm">
            {(data?.funnel ?? []).map((step) => (
              <div key={step.clave}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500}>{step.hito}</Text>
                  <Group gap="xs">
                    <Text size="sm" fw={700}>{step.total.toLocaleString("es-CO")}</Text>
                    <Badge size="sm" variant="light" color={step.clave === "convertidasPago" ? "green" : "blue"}>
                      {step.pct}%
                    </Badge>
                  </Group>
                </Group>
                <Progress
                  value={step.pct}
                  color={step.clave === "convertidasPago" ? "green" : step.clave === "primeraCita" ? "violet" : "blue"}
                  size="lg" radius="sm"
                />
              </div>
            ))}
            {(!data || registered === 0) && !loading && (
              <Text c="dimmed" ta="center" py="md">No hay registros en el rango seleccionado.</Text>
            )}
          </Stack>
        </Card>

        {/* Conversión a pago por hito */}
        <Card withBorder radius="md" p="md">
          <Text fw={700} size="lg" mb="xs">Conversión a pago según hito alcanzado</Text>
          <Text size="xs" c="dimmed" mb="sm">
            De los negocios que alcanzaron cada hito, qué porcentaje terminó pagando la suscripción.
          </Text>
          <Divider mb="sm" />
          <ScrollArea>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Hito alcanzado</Table.Th>
                  <Table.Th>Negocios</Table.Th>
                  <Table.Th>Pagaron</Table.Th>
                  <Table.Th>Tasa de conversión a pago</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(data?.conversionPorHito ?? []).map((c) => (
                  <Table.Tr key={c.hito}>
                    <Table.Td><Text size="sm" fw={500}>{c.hito}</Text></Table.Td>
                    <Table.Td>{c.base}</Table.Td>
                    <Table.Td>{c.pagaron}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={c.tasaPago >= 50 ? "green" : c.tasaPago >= 25 ? "yellow" : "gray"}>
                        {c.tasaPago}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>

        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Text size="xs" c="dimmed">
            Los hitos se registran desde el 13/06/2026. Negocios anteriores no tienen estos timestamps, así que el funnel es
            representativo solo para cohortes registradas después de esa fecha.
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}
