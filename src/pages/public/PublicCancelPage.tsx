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
  policyBlocked?: boolean;
  policyBlockedReason?: string;
}

interface CancellationPolicy {
  minHoursBeforeAppointment?: number;
  preventCancellingConfirmed?: boolean;
}

interface CancellationInfo {
  customerName: string;
  organizationName: string;
  timezone?: string;
  isGroup?: boolean;
  appointments?: AppointmentInfo[];
  allBlockedByPolicy?: boolean;
  cancellationPolicy?: CancellationPolicy;
  policyBlocked?: boolean; // Para reservaciones
  policyBlockedReason?: string; // Para reservaciones
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
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadCancellationInfo = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await cancellationService.getCancellationInfo(token);

      if (response.status === "success") {
        setInfo(response.data);

        // Pre-seleccionar citas que se pueden cancelar (no canceladas, futuras y no bloqueadas por política)
        if (response.data.appointments) {
          const cancellableIds = response.data.appointments
            .filter((apt: AppointmentInfo) => !apt.isCancelled && !apt.isPast && !apt.policyBlocked)
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
            <Title order={2} c="red">
              Error
            </Title>
            <Text size="md" c="dimmed" ta="center">
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
            <Title order={2} c="red">
              Cancelación exitosa
            </Title>
            <Text size="md" c="dimmed" ta="center">
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
            <Title order={2} c="green">
              ¡Asistencia Confirmada!
            </Title>
            <Text size="md" c="dimmed" ta="center">
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
      .filter((apt) => !apt.isCancelled && !apt.isPast && !apt.policyBlocked)
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
          <Stack align="center" gap="md">
            <MdEventBusy size={48} color="orange" style={{ fontSize: "clamp(48px, 10vw, 64px)" }} />
            <Title order={2} ta="center">
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
                    (apt) => !apt.isCancelled && !apt.isPast && !apt.policyBlocked
                  ).length
                    ? "Deseleccionar todas"
                    : "Seleccionar todas"}
                </Button>
              </Group>

              <Stack gap="xs">
                {info.appointments.map((apt) => {
                  const isDisabled = apt.isCancelled || apt.isPast || apt.policyBlocked;
                  return (
                    <Card
                      key={apt.id}
                      padding="md"
                      withBorder
                      style={{
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                      onClick={() => {
                        if (!isDisabled) {
                          toggleAppointment(apt.id);
                        }
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="md" wrap="nowrap">
                          <Checkbox
                            checked={selectedAppointments.includes(apt.id)}
                            onChange={() => toggleAppointment(apt.id)}
                            disabled={isDisabled}
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
                            {apt.policyBlocked && apt.policyBlockedReason && (
                              <Text size="xs" c="orange" fw={500}>
                                {apt.policyBlockedReason}
                              </Text>
                            )}
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
                          {apt.policyBlocked && !apt.isCancelled && !apt.isPast && (
                            <Badge color="orange" size="sm">
                              No cancelable
                            </Badge>
                          )}
                        </Stack>
                      </Group>
                    </Card>
                  );
                })}
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

              {info?.appointments?.[0]?.policyBlocked && (
                <Alert color="orange" variant="light" icon={<MdError />}>
                  <Stack gap="xs">
                    <Text fw={500}>{info.appointments[0].policyBlockedReason || "Esta cita no puede ser cancelada según la política de cancelación"}</Text>
                    <Text size="sm">
                      Si necesitas cancelar, por favor comunícate directamente con {info?.organizationName || "el establecimiento"} a través de sus líneas de atención.
                    </Text>
                  </Stack>
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

          {/* Alerta cuando todas las citas están bloqueadas por política */}
          {info?.allBlockedByPolicy && (
            <Alert color="orange" icon={<MdError />}>
              <Stack gap="xs">
                <Text fw={500}>No hay citas que se puedan cancelar según la política de cancelación del establecimiento.</Text>
                <Text size="sm">
                  Si necesitas cancelar tu cita, por favor comunícate directamente con {info?.organizationName || "el establecimiento"} a través de sus líneas de atención.
                </Text>
              </Stack>
            </Alert>
          )}

          {/* Nota cuando hay algunas citas bloqueadas por política */}
          {!info?.allBlockedByPolicy && info?.appointments?.some(apt => apt.policyBlocked) && (
            <Alert color="blue" icon={<MdError />} variant="light">
              <Text size="sm">
                Algunas citas no pueden ser canceladas según la política del establecimiento. Si necesitas cancelarlas, comunícate directamente con {info?.organizationName || "el establecimiento"}.
              </Text>
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
                    padding="lg"
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
                    <Stack align="center" gap="md">
                      <MdCheckCircle size={40} color="var(--mantine-color-green-6)" style={{ fontSize: "clamp(40px, 8vw, 48px)" }} />
                      <Stack gap={4} align="center">
                        <Title order={4} ta="center">
                            Confirmar mi Asistencia
                          </Title>
                        <Text size="sm" c="dimmed" ta="center">
                          Avísale al establecimiento que sí asistirás
                        </Text>
                      </Stack>
                    </Stack>
                  </Card>
                )}

                {/* Botón de cancelar - deshabilitado si no hay citas cancelables */}
                {(() => {
                  const cancellableCount = (info?.appointments || []).filter(
                    (apt) => !apt.isCancelled && !apt.isPast && !apt.policyBlocked
                  ).length;
                  const isDisabled = cancellableCount === 0 || info?.policyBlocked;

                  return (
                    <Card
                      padding="lg"
                      radius="md"
                      withBorder
                      style={{
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                        border: `2px solid ${isDisabled ? "var(--mantine-color-gray-3)" : "var(--mantine-color-red-3)"}`,
                        backgroundColor: isDisabled ? "var(--mantine-color-gray-0)" : "var(--mantine-color-red-0)",
                        opacity: isDisabled ? 0.6 : 1,
                      }}
                      onClick={isDisabled ? undefined : handleCancel}
                      className={isDisabled ? "" : "hover-lift"}
                    >
                      <Stack align="center" gap="md">
                        <MdEventBusy
                          size={40}
                          color={isDisabled ? "var(--mantine-color-gray-5)" : "var(--mantine-color-red-6)"}
                          style={{ fontSize: "clamp(40px, 8vw, 48px)" }}
                        />
                        <Stack gap={4} align="center">
                          <Title order={4} ta="center" c={isDisabled ? "dimmed" : undefined}>
                            No Podré Asistir
                          </Title>
                          <Text size="sm" c="dimmed" ta="center">
                            {isDisabled
                              ? "No hay citas que se puedan cancelar"
                              : "Cancela si no puedes ir"}
                          </Text>
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })()}
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
            <Group justify="center" mt="md" gap="md" style={{ flexDirection: isMobile ? "column" : "row", width: "100%" }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setAction(null);
                  setError(null);
                }}
                disabled={cancelling || confirming}
                fullWidth={isMobile}
              >
                Volver
              </Button>
              {action === "confirm" && (
                <Button
                  color="green"
                  size="md"
                  onClick={handleConfirm}
                  disabled={cancelling || confirming}
                  fullWidth={isMobile}
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
                  fullWidth={isMobile}
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
              fullWidth={isMobile}
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
