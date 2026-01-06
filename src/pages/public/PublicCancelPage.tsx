import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Box,
  Alert,
  Loader,
  Divider,
  Textarea,
  Stack,
  Group,
  Center,
  Checkbox,
  Card,
  Badge,
} from "@mantine/core";
import {
  formatInTimezone,
  formatFullDateInTimezone,
} from "../../utils/timezoneUtils";
import cancellationService from "../../services/cancellationService";
import { MdEventBusy, MdCheckCircle, MdError } from "react-icons/md";

interface AppointmentInfo {
  id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  isCancelled: boolean;
  isPast: boolean;
}

interface CancellationInfo {
  customerName: string;
  organizationName: string;
  timezone?: string;
  isGroup?: boolean;
  appointments?: AppointmentInfo[];
}

export const PublicCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CancellationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>(
    []
  );

  const loadCancellationInfo = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await cancellationService.getCancellationInfo(token);

      if (response.status === "success") {
        setInfo(response.data);

        // Pre-seleccionar citas que se pueden cancelar (no canceladas y futuras)
        if (response.data.appointments) {
          const cancellableIds = response.data.appointments
            .filter((apt: AppointmentInfo) => !apt.isCancelled && !apt.isPast)
            .map((apt: AppointmentInfo) => apt.id);
          setSelectedAppointments(cancellableIds);
        }

        setError(null);
      } else {
        setError(response.message || "No se pudo cargar la información");
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message ||
        "Error al cargar la información de cancelación";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("Token de cancelación no válido");
      setLoading(false);
      return;
    }

    loadCancellationInfo();
  }, [token, loadCancellationInfo]);

  const handleCancel = async () => {
    if (!token) return;

    if (selectedAppointments.length === 0) {
      setError("Debes seleccionar al menos una cita para cancelar");
      return;
    }

    setCancelling(true);
    try {
      const response = await cancellationService.cancelByToken(
        token,
        reason || undefined,
        info?.isGroup ? selectedAppointments : undefined
      );

      if (response.status === "success") {
        setCancelled(true);
        setError(null);
      } else {
        setError(response.message || "No se pudo cancelar");
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || "Error al cancelar";
      setError(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string, tz?: string) => {
    try {
      const timezone = tz || info?.timezone || "America/Bogota";
      return formatFullDateInTimezone(
        dateString,
        timezone,
        "dddd, D [de] MMMM [de] YYYY [a las] HH:mm"
      );
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container size="sm" mt={80}>
        <Center>
          <Stack align="center" gap="md">
            <Loader size="xl" />
            <Title order={3}>Cargando información...</Title>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error && !info) {
    return (
      <Container size="sm" mt={80}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <MdError size={64} color="red" />
            <Title order={2} c="red">
              Error
            </Title>
            <Text size="lg" c="dimmed" ta="center">
              {error}
            </Text>
            <Button variant="outline" onClick={() => navigate("/")} mt="md">
              Volver al inicio
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (cancelled) {
    return (
      <Container size="sm" mt={80}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <MdCheckCircle size={64} color="green" />
            <Title order={2} c="green">
              Cancelación exitosa
            </Title>
            <Text size="lg" c="dimmed" ta="center">
              {info?.isGroup
                ? `Se cancelaron ${selectedAppointments.length} cita(s) correctamente.`
                : "Tu cita ha sido cancelada correctamente."}
            </Text>
            <Alert color="blue" icon={<MdError />} mt="md">
              Recibirás una confirmación por WhatsApp o correo electrónico.
            </Alert>
            <Button variant="outline" onClick={() => navigate("/")} mt="md">
              Volver al inicio
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const toggleAppointment = (id: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(id) ? prev.filter((aptId) => aptId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    const cancellableIds = (info?.appointments || [])
      .filter((apt) => !apt.isCancelled && !apt.isPast)
      .map((apt) => apt.id);

    if (selectedAppointments.length === cancellableIds.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(cancellableIds);
    }
  };

  return (
    <Container size="sm" mt={80} mb={40}>
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Stack align="center" gap="md">
            <MdEventBusy size={64} color="orange" />
            <Title order={2} ta="center">
              Cancelar {info?.isGroup ? "Citas" : "Cita"}
            </Title>
          </Stack>

          <Divider />

          {/* Información del cliente */}
          <Stack gap="sm">
            <Box>
              <Text size="sm" c="dimmed" fw={500}>
                Organización
              </Text>
              <Title order={4}>{info?.organizationName}</Title>
            </Box>

            <Box>
              <Text size="sm" c="dimmed" fw={500}>
                Cliente
              </Text>
              <Text size="md">{info?.customerName}</Text>
            </Box>
          </Stack>

          <Divider />

          {/* Lista de citas (si es grupo) */}
          {info?.isGroup &&
          info?.appointments &&
          info.appointments.length > 1 ? (
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Selecciona las citas a cancelar:</Text>
                <Button size="xs" variant="subtle" onClick={toggleAll}>
                  {selectedAppointments.length ===
                  info.appointments.filter(
                    (apt) => !apt.isCancelled && !apt.isPast
                  ).length
                    ? "Deseleccionar todas"
                    : "Seleccionar todas"}
                </Button>
              </Group>

              <Stack gap="xs">
                {info.appointments.map((apt) => (
                  <Card
                    key={apt.id}
                    padding="md"
                    withBorder
                    style={{
                      opacity: apt.isCancelled || apt.isPast ? 0.5 : 1,
                      cursor:
                        apt.isCancelled || apt.isPast
                          ? "not-allowed"
                          : "pointer",
                    }}
                    onClick={() => {
                      if (!apt.isCancelled && !apt.isPast) {
                        toggleAppointment(apt.id);
                      }
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md" wrap="nowrap">
                        <Checkbox
                          checked={selectedAppointments.includes(apt.id)}
                          onChange={() => toggleAppointment(apt.id)}
                          disabled={apt.isCancelled || apt.isPast}
                        />
                        <Stack gap={4}>
                          <Text fw={600}>{apt.serviceName}</Text>
                          <Text size="sm" c="dimmed">
                            {formatFullDateInTimezone(
                              apt.startDate,
                              info?.timezone || "America/Bogota",
                              "ddd, D [de] MMM YYYY"
                            )}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {formatInTimezone(
                              apt.startDate,
                              info?.timezone || "America/Bogota",
                              "HH:mm"
                            )}{" "}
                            -{" "}
                            {formatInTimezone(
                              apt.endDate,
                              info?.timezone || "America/Bogota",
                              "HH:mm"
                            )}
                          </Text>
                        </Stack>
                      </Group>
                      {apt.isCancelled && (
                        <Badge color="red" size="sm">
                          Cancelada
                        </Badge>
                      )}
                      {apt.isPast && !apt.isCancelled && (
                        <Badge color="gray" size="sm">
                          Pasada
                        </Badge>
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Stack>
          ) : (
            /* Info de cita única */
            <Stack gap="sm">
              <Box>
                <Text size="sm" c="dimmed" fw={500}>
                  Servicio
                </Text>
                <Text size="md">{info?.appointments?.[0]?.serviceName}</Text>
              </Box>

              <Box>
                <Text size="sm" c="dimmed" fw={500}>
                  Fecha y hora
                </Text>
                <Text size="md">
                  {info?.appointments?.[0]?.startDate &&
                    formatDate(info.appointments[0].startDate)}
                </Text>
              </Box>
            </Stack>
          )}

          <Divider />

          {/* Advertencia */}
          <Alert color="orange" icon={<MdError />}>
            ¿Estás seguro de que deseas cancelar{" "}
            {selectedAppointments.length > 1 ? "estas citas" : "esta cita"}?
            Esta acción no se puede deshacer.
          </Alert>

          {/* Error message */}
          {error && (
            <Alert color="red" icon={<MdError />}>
              {error}
            </Alert>
          )}

          {/* Motivo de cancelación */}
          <Textarea
            label="Motivo de cancelación (opcional)"
            placeholder="Puedes indicarnos el motivo de la cancelación..."
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setReason(e.target.value)
            }
            minRows={3}
            autosize
          />

          {/* Botones */}
          <Group justify="center" mt="md">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/")}
              disabled={cancelling}
            >
              Volver
            </Button>
            <Button
              color="red"
              size="lg"
              onClick={handleCancel}
              disabled={cancelling}
              leftSection={
                cancelling ? (
                  <Loader size="xs" color="white" />
                ) : (
                  <MdEventBusy size={20} />
                )
              }
            >
              {cancelling ? "Cancelando..." : "Confirmar Cancelación"}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
};

export default PublicCancelPage;
