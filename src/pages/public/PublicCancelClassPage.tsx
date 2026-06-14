import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Container, Paper, Title, Text, Button, Alert, Loader, Center,
  Stack, Group, Card, Badge, Checkbox, Divider,
} from "@mantine/core";
import { MdEventBusy, MdCheckCircle, MdError } from "react-icons/md";
import {
  formatFullDateInTimezone,
  formatInTimezone,
} from "../../utils/timezoneUtils";
import {
  getEnrollmentByToken,
  cancelEnrollmentByToken,
  EnrollmentCancelInfo,
} from "../../services/classService";

export const PublicCancelClassPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<EnrollmentCancelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!token) {
      setError("Enlace inválido: falta el token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getEnrollmentByToken(token);
      if (!data) {
        setError("No se encontró la inscripción o el enlace expiró.");
      } else {
        setInfo(data);
        // Pre-seleccionar las cancelables (futuras y no canceladas)
        setSelected(
          data.enrollments.filter((e) => !e.isCancelled && !e.isPast).map((e) => e.id)
        );
      }
    } catch {
      setError("No se encontró la inscripción o el enlace expiró.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const tz = info?.timezone || "America/Bogota";
  const cancelable = info?.enrollments.filter((e) => !e.isCancelled && !e.isPast) ?? [];
  const showCheckboxes = (info?.isGroup ?? false) && cancelable.length > 1;

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      const ids = showCheckboxes ? selected : undefined;
      const result = await cancelEnrollmentByToken(token, ids);
      if (result) {
        setCancelled(true);
      } else {
        setError("No se pudo cancelar la inscripción. Intenta nuevamente.");
      }
    } catch {
      setError("No se pudo cancelar la inscripción. Intenta nuevamente.");
    } finally {
      setCancelling(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ── Estados de pantalla ──────────────────────────────
  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Text c="dimmed">Cargando tu inscripción…</Text>
        </Stack>
      </Center>
    );
  }

  if (error && !info) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="md">
            <MdError size={48} color="var(--mantine-color-red-6)" />
            <Title order={3} ta="center">Enlace no válido</Title>
            <Text c="dimmed" ta="center">{error}</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (cancelled) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="md">
            <MdCheckCircle size={48} color="var(--mantine-color-green-6)" />
            <Title order={3} ta="center">Inscripción cancelada</Title>
            <Text c="dimmed" ta="center">
              Hemos cancelado tu inscripción. Si fue un error, comunícate con {info?.organizationName}.
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Paper withBorder p="xl" radius="md">
        <Stack gap="md">
          <Group gap="xs">
            <MdEventBusy size={28} color="var(--mantine-color-red-6)" />
            <Title order={3}>Cancelar inscripción</Title>
          </Group>
          <Text size="sm" c="dimmed">
            {info?.organizationName}
          </Text>

          <Divider />

          <Stack gap="xs">
            {info?.enrollments.map((e) => {
              const blocked = e.isCancelled || e.isPast;
              return (
                <Card key={e.id} withBorder radius="md" p="sm" opacity={blocked ? 0.6 : 1}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      {showCheckboxes && !blocked && (
                        <Checkbox
                          checked={selected.includes(e.id)}
                          onChange={() => toggle(e.id)}
                        />
                      )}
                      <div>
                        <Text fw={600} size="sm">{e.className}</Text>
                        <Text size="xs" c="dimmed">{e.attendeeName}</Text>
                        <Text size="xs">
                          {formatFullDateInTimezone(e.startDate, tz, "dddd D [de] MMMM")}
                          {" · "}
                          {formatInTimezone(e.startDate, tz)} – {formatInTimezone(e.endDate, tz)}
                        </Text>
                      </div>
                    </Group>
                    {e.isCancelled ? (
                      <Badge color="red" variant="light">Cancelada</Badge>
                    ) : e.isPast ? (
                      <Badge color="gray" variant="light">Finalizada</Badge>
                    ) : null}
                  </Group>
                </Card>
              );
            })}
          </Stack>

          {cancelable.length === 0 ? (
            <Alert color="gray">
              No hay inscripciones que se puedan cancelar (ya finalizaron o fueron canceladas).
            </Alert>
          ) : !confirmStep ? (
            <Button color="red" fullWidth onClick={() => setConfirmStep(true)}>
              Cancelar inscripción
            </Button>
          ) : (
            <Stack gap="xs">
              <Alert color="red">
                ¿Seguro que deseas cancelar? Esta acción no se puede deshacer.
              </Alert>
              <Group grow>
                <Button variant="default" onClick={() => setConfirmStep(false)}>
                  Volver
                </Button>
                <Button
                  color="red"
                  loading={cancelling}
                  disabled={showCheckboxes && selected.length === 0}
                  onClick={handleCancel}
                >
                  Sí, cancelar
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default PublicCancelClassPage;
