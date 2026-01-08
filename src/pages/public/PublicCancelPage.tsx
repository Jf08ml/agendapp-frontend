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
import "./PublicCancelPage.css";

interface AppointmentInfo {
  id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  status: string;
  clientConfirmed?: boolean;
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
  const source = searchParams.get("source") || "confirmation"; // 'confirmation' o 'reminder'

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CancellationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>(
    []
  );
  const [action, setAction] = useState<"cancel" | "confirm" | null>(null);

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

    // Si no se ha seleccionado acción, solo establecer la acción
    if (action !== "cancel") {
      setAction("cancel");
      setError(null);
      return;
    }

    // Ejecutar cancelación si ya está confirmada la acción
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

  const handleConfirm = async () => {
    if (!token) return;

    // Si no se ha seleccionado acción, solo establecer la acción
    if (action !== "confirm") {
      setAction("confirm");
      setError(null);
      return;
    }

    // Ejecutar confirmación si ya está confirmada la acción
    if (selectedAppointments.length === 0) {
      setError("Debes seleccionar al menos una cita para confirmar");
      return;
    }

    setConfirming(true);
    try {
      const response = await cancellationService.confirmByToken(
        token,
        info?.isGroup ? selectedAppointments : undefined
      );

      if (response.status === "success") {
        setConfirmed(true);
        setError(null);
      } else {
        setError(response.message || "No se pudo confirmar");
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || "Error al confirmar";
      setError(errorMsg);
    } finally {
      setConfirming(false);
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
      <Container size="sm" mt={{ base: 40, sm: 60, md: 80 }} px={{ base: "xs", sm: "md" }}>
        <Paper shadow="md" p={{ base: "md", sm: "lg", md: "xl" }} radius="md" withBorder>
          <Stack align="center" gap="md">
            <MdError size={48} color="red" style={{ fontSize: "clamp(48px, 10vw, 64px)" }} />
            <Title order={2} c="red" size={{ base: "h3", sm: "h2" }}>
              Error
            </Title>
            <Text size={{ base: "md", sm: "lg" }} c="dimmed" ta="center">
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
      <Container size="sm" mt={{ base: 40, sm: 60, md: 80 }} px={{ base: "xs", sm: "md" }}>
        <Paper shadow="md" p={{ base: "md", sm: "lg", md: "xl" }} radius="md" withBorder>
          <Stack align="center" gap="md">
            <MdCheckCircle size={48} color="red" style={{ fontSize: "clamp(48px, 10vw, 64px)" }} />
            <Title order={2} c="red" size={{ base: "h3", sm: "h2" }}>
              Cancelación exitosa
            </Title>
            <Text size={{ base: "md", sm: "lg" }} c="dimmed" ta="center">
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

  if (confirmed) {
    return (
      <Container size="sm" mt={{ base: 40, sm: 60, md: 80 }} px={{ base: "xs", sm: "md" }}>
        <Paper shadow="md" p={{ base: "md", sm: "lg", md: "xl" }} radius="md" withBorder>
          <Stack align="center" gap="md">
            <MdCheckCircle size={48} color="green" style={{ fontSize: "clamp(48px, 10vw, 64px)" }} />
            <Title order={2} c="green" size={{ base: "h3", sm: "h2" }}>
              ¡Asistencia Confirmada!
            </Title>
            <Text size={{ base: "md", sm: "lg" }} c="dimmed" ta="center">
              {info?.isGroup
                ? `Has confirmado ${selectedAppointments.length} cita(s).`
                : "Has confirmado tu asistencia a la cita."}
            </Text>
            <Alert color="blue" icon={<MdCheckCircle />} mt="md">
              <Stack gap="xs">
                <Text fw={500}>Tu confirmación ha sido registrada exitosamente.</Text>
                <Text size="sm">
                  El establecimiento recibirá una notificación de tu confirmación.
                  Recuerda que el administrador debe aprobar finalmente tu asistencia.
                </Text>
              </Stack>
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
    <Container size="sm" mt={{ base: 40, sm: 60, md: 80 }} mb={40} px={{ base: "xs", sm: "md" }}>
      <Paper shadow="md" p={{ base: "md", sm: "lg", md: "xl" }} radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Stack align="center" gap={{ base: "xs", sm: "md" }}>
            <MdEventBusy size={48} color="orange" style={{ fontSize: "clamp(48px, 10vw, 64px)" }} />
            <Title order={2} ta="center" size={{ base: "h3", sm: "h2" }}>
              Gestionar {info?.isGroup ? "Citas" : "Cita"}
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
                      <Stack gap={4} align="flex-end">
                        {apt.clientConfirmed && !apt.isCancelled && (
                          <Badge color="green" size="sm" variant="light">
                            Confirmado por ti
                          </Badge>
                        )}
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
                      </Stack>
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

              {info?.appointments?.[0]?.clientConfirmed && (
                <Alert color="green" variant="light" icon={<MdCheckCircle />}>
                  Ya has confirmado tu asistencia a esta cita
                </Alert>
              )}
            </Stack>
          )}

          <Divider />

          {/* Error message */}
          {error && (
            <Alert color="red" icon={<MdError />}>
              {error}
            </Alert>
          )}

          {/* Acciones principales - antes de cualquier advertencia */}
          {!action && (
            <Stack gap="md">
              <Text size="lg" fw={600} ta="center" c="dimmed">
                ¿Qué deseas hacer con {selectedAppointments.length > 1 ? "estas citas" : "esta cita"}?
              </Text>

              <Stack gap="md" style={{ 
                display: "grid",
                gridTemplateColumns: source === "reminder" ? "repeat(auto-fit, minmax(min(100%, 250px), 1fr))" : "1fr",
                gap: "1rem"
              }}>
                {/* Botón de confirmar solo visible en recordatorios */}
                {source === "reminder" && (
                  <Card
                    padding={{ base: "md", sm: "lg" }}
                    radius="md"
                    withBorder
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "2px solid var(--mantine-color-green-3)",
                      backgroundColor: "var(--mantine-color-green-0)",
                    }}
                    onClick={handleConfirm}
                    className="hover-lift"
                  >
                    <Stack align="center" gap={{ base: "sm", sm: "md" }}>
                      <MdCheckCircle size={40} color="var(--mantine-color-green-6)" style={{ fontSize: "clamp(40px, 8vw, 48px)" }} />
                      <Stack gap={4} align="center">
                        <Title order={4} ta="center" size={{ base: "h5", sm: "h4" }}>
                          Confirmar mi Asistencia
                        </Title>
                        <Text size={{ base: "xs", sm: "sm" }} c="dimmed" ta="center">
                          Avísale al establecimiento que sí asistirás
                        </Text>
                      </Stack>
                    </Stack>
                  </Card>
                )}

                <Card
                  padding={{ base: "md", sm: "lg" }}
                  radius="md"
                  withBorder
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "2px solid var(--mantine-color-red-3)",
                    backgroundColor: "var(--mantine-color-red-0)",
                  }}
                  onClick={handleCancel}
                  className="hover-lift"
                >
                  <Stack align="center" gap={{ base: "sm", sm: "md" }}>
                    <MdEventBusy size={40} color="var(--mantine-color-red-6)" style={{ fontSize: "clamp(40px, 8vw, 48px)" }} />
                    <Stack gap={4} align="center">
                      <Title order={4} ta="center" size={{ base: "h5", sm: "h4" }}>
                        No Podré Asistir
                      </Title>
                      <Text size={{ base: "xs", sm: "sm" }} c="dimmed" ta="center">
                        Cancela si no puedes ir
                      </Text>
                    </Stack>
                  </Stack>
                </Card>
              </Stack>
            </Stack>
          )}

          {/* Advertencia condicional */}
          {action && (
            <Alert color={action === "confirm" ? "blue" : "orange"} icon={<MdError />}>
              {action === "confirm"
                ? `¿Estás seguro de que deseas confirmar ${
                    selectedAppointments.length > 1 ? "estas citas" : "esta cita"
                  }? Esto no se puede deshacer.`
                : `¿Estás seguro de que deseas cancelar ${
                    selectedAppointments.length > 1 ? "estas citas" : "esta cita"
                  }? Esta acción no se puede deshacer.`}
            </Alert>
          )}

          {/* Motivo de cancelación (solo si es cancelación) */}
          {action === "cancel" && (
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
          )}

          {/* Botones de acción */}
          {action ? (
            <Group justify="center" mt="md" gap={{ base: "xs", sm: "md" }} style={{ flexDirection: window.innerWidth < 600 ? "column" : "row", width: "100%" }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setAction(null);
                  setError(null);
                }}
                disabled={cancelling || confirming}
                fullWidth={window.innerWidth < 600}
              >
                Volver
              </Button>
              {action === "confirm" && (
                <Button
                  color="green"
                  size="md"
                  onClick={handleConfirm}
                  disabled={cancelling || confirming}
                  fullWidth={window.innerWidth < 600}
                  leftSection={
                    confirming ? (
                      <Loader size="xs" color="white" />
                    ) : (
                      <MdCheckCircle size={20} />
                    )
                  }
                >
                  {confirming ? "Confirmando..." : "Confirmar"}
                </Button>
              )}
              {action === "cancel" && (
                <Button
                  color="red"
                  size="md"
                  onClick={handleCancel}
                  disabled={cancelling || confirming}
                  fullWidth={window.innerWidth < 600}
                  leftSection={
                    cancelling ? (
                      <Loader size="xs" color="white" />
                    ) : (
                      <MdEventBusy size={20} />
                    )
                  }
                >
                  {cancelling ? "Cancelando..." : "Cancelar"}
                </Button>
              )}
            </Group>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate("/")}
              disabled={cancelling || confirming}
              fullWidth={window.innerWidth < 600}
            >
              Volver al inicio
            </Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default PublicCancelPage;
