/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  Grid,
  Select,
  Text,
  Group,
  Checkbox,
  NumberInput,
  MultiSelectProps,
  Avatar,
  Card,
  Loader,
  Divider,
  Badge,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import { addMinutes } from "date-fns";
import { Service } from "../../../../services/serviceService";
import { Employee } from "../../../../services/employeeService";
import { Client, searchClients } from "../../../../services/clientService";
import { Appointment } from "../../../../services/appointmentService";
import ClientFormModal from "../../manageClients/ClientFormModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatCurrency } from "../../../../utils/formatCurrency";
import {
  formatInTimezone,
  formatFullDateInTimezone,
} from "../../../../utils/timezoneUtils";

dayjs.extend(utc);
dayjs.extend(timezone);
import { CreateAppointmentPayload } from "..";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";

// 🔁 Imports para citas recurrentes
import RecurrenceSelector from "../../../../components/customCalendar/components/RecurrenceSelector";
import SeriesPreview from "../../../../components/customCalendar/components/SeriesPreview";
import {
  RecurrencePattern,
  SeriesPreview as SeriesPreviewType,
  createAppointmentSeries,
} from "../../../../services/appointmentService";
import { notifications } from "@mantine/notifications";

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  newAppointment: Partial<CreateAppointmentPayload>;
  setNewAppointment: React.Dispatch<
    React.SetStateAction<Partial<CreateAppointmentPayload>>
  >;
  services: Service[];
  employees: Employee[];
  clients: Client[];
  // onServiceChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  onClientChange: (value: string | null) => void;
  onSave: () => void;
  fetchClients: () => void;
  creatingAppointment: boolean;
  fetchAppointmentsForMonth?: (date: Date) => Promise<void>;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  opened,
  onClose,
  appointment,
  newAppointment,
  setNewAppointment,
  services,
  employees,
  // onServiceChange,
  onEmployeeChange,
  onClientChange,
  onSave,
  fetchClients,
  creatingAppointment,
  fetchAppointmentsForMonth,
}) => {
  const [createClientModalOpened, setCreateClientModalOpened] =
    useState<boolean>(false);
  const auth = useSelector((state: RootState) => state.auth);

  // 🚀 Estado para búsqueda asíncrona de clientes
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(clientSearchQuery, 300);
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // 🔁 Estados para citas recurrentes
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    {
      type: "none",
      intervalWeeks: 1,
      weekdays: [],
      endType: "count",
      count: 4,
    },
  );
  const [seriesPreview, setSeriesPreview] = useState<SeriesPreviewType | null>(
    null,
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [notifyAllAppointments, setNotifyAllAppointments] = useState(false); // 📨 Por defecto solo primera cita

  const today = dayjs();
  const organization = useSelector(
    (state: RootState) => state.organization.organization,
  );
  const organizationId = organization?._id;
  const timezone = organization?.timezone || "America/Bogota"; // 🌍 Timezone de la organización

  // 🚀 Búsqueda asíncrona de clientes con debounce
  useEffect(() => {
    if (!organizationId) return;

    const searchClientsAsync = async () => {
      setLoadingClients(true);
      try {
        const results = await searchClients(
          organizationId,
          debouncedSearch,
          20,
        );

        // Si hay un cliente seleccionado, asegurarse de que esté en la lista
        if (
          newAppointment.client &&
          typeof newAppointment.client._id !== "undefined" &&
          !results.find((c) => c._id === newAppointment.client!._id)
        ) {
          setSearchedClients([newAppointment.client, ...results]);
        } else {
          setSearchedClients(results);
        }
      } catch (error) {
        console.error("Error buscando clientes:", error);
        // Si hay error pero existe cliente seleccionado, mantenerlo
        if (newAppointment.client) {
          setSearchedClients([newAppointment.client]);
        } else {
          setSearchedClients([]);
        }
      } finally {
        setLoadingClients(false);
      }
    };

    searchClientsAsync();
  }, [debouncedSearch, organizationId, newAppointment.client]);

  useEffect(() => {
    if (appointment) {
      // Parse dates in organization timezone and create local Date with same hour values
      // This prevents TimeSelector from showing wrong time due to browser timezone conversion
      const startParsed = dayjs.tz(appointment.startDate, timezone);
      const endParsed = dayjs.tz(appointment.endDate, timezone);

      const startDate = new Date(
        startParsed.year(),
        startParsed.month(),
        startParsed.date(),
        startParsed.hour(),
        startParsed.minute(),
      );

      const endDate = new Date(
        endParsed.year(),
        endParsed.month(),
        endParsed.date(),
        endParsed.hour(),
        endParsed.minute(),
      );

      setNewAppointment({
        ...appointment,
        startDate,
        endDate,
        employee: appointment?.employee || newAppointment.employee,
        services: appointment.service ? [appointment.service] : [],
        client: appointment.client,
      });

      // Si hay cliente en appointment, agregarlo a la lista de búsqueda
      if (
        appointment.client &&
        !searchedClients.find((c) => c._id === appointment.client._id)
      ) {
        setSearchedClients((prev) => [appointment.client, ...prev]);
      }
    }
  }, [appointment, setNewAppointment]);

  useEffect(() => {
    if (!appointment) {
      // MODO CREACIÓN: recalcular endDate basado en duración de servicios
      if (newAppointment.startDate && newAppointment.services) {
        const totalDuration = newAppointment.services.reduce((acc, s) => {
          // Usar duración personalizada si existe, sino la duración del servicio
          const customDuration = newAppointment.customDurations?.[s._id];
          return acc + (customDuration ?? s.duration ?? 0);
        }, 0);
        const end = addMinutes(newAppointment.startDate, totalDuration);
        setNewAppointment((prev) => ({ ...prev, endDate: end }));
      }
    } else {
      // MODO EDICIÓN: mantener la duración original al cambiar startDate
      // Calcular la duración actual y aplicarla al nuevo startDate
      if (newAppointment.startDate && newAppointment.endDate) {
        const currentDurationMs =
          new Date(newAppointment.endDate).getTime() -
          new Date(newAppointment.startDate).getTime();

        // Solo recalcular si la duración es inválida (endDate antes de startDate)
        // Esto ocurre cuando se cambia el día del startDate
        if (currentDurationMs < 0) {
          // Obtener la duración original de la cita en BD
          const originalDurationMs =
            new Date(appointment.endDate).getTime() -
            new Date(appointment.startDate).getTime();
          const newEnd = new Date(newAppointment.startDate.getTime() + originalDurationMs);
          setNewAppointment((prev) => ({ ...prev, endDate: newEnd }));
        }
      }
    }
  }, [
    appointment,
    newAppointment.startDate,
    newAppointment.services,
    newAppointment.customDurations,
    setNewAppointment,
  ]);

  // Inicializar customDurations cuando cambian los servicios seleccionados
  useEffect(() => {
    if (
      !appointment &&
      newAppointment.services &&
      newAppointment.services.length > 0
    ) {
      // Solo inicializar si no existen duraciones personalizadas para los servicios actuales
      const currentDurations = newAppointment.customDurations || {};
      const needsInit = newAppointment.services.some(
        (s) => !(s._id in currentDurations),
      );

      if (needsInit) {
        const initialDurations: Record<string, number> = {};
        newAppointment.services.forEach((s) => {
          // Mantener duración existente o usar la del servicio
          initialDurations[s._id] = currentDurations[s._id] ?? s.duration ?? 0;
        });
        setNewAppointment((prev) => ({
          ...prev,
          customDurations: initialDurations,
        }));
      }
    }
  }, [appointment, newAppointment.services]);

  const renderMultiSelectOption: MultiSelectProps["renderOption"] = ({
    option,
  }) => {
    const employee = employees.find((e) => e._id === option.value);

    if (!employee) {
      return null; // Si no se encuentra el empleado, no renderizar nada
    }

    return (
      <Group gap="sm">
        <Avatar src={employee.profileImage} size={36} radius="xl" />
        <div>
          <Text size="sm">{employee.names}</Text>
          <Text size="xs" opacity={0.5}>
            {employee.position}
          </Text>
        </div>
      </Group>
    );
  };

  // 🔁 Función para generar preview de citas recurrentes
  const handleGeneratePreview = async () => {
    if (
      !newAppointment.employee ||
      !newAppointment.client ||
      !newAppointment.startDate ||
      !newAppointment.services ||
      newAppointment.services.length === 0
    ) {
      notifications.show({
        title: "⚠️ Campos requeridos",
        message: "Por favor completa empleado, cliente, servicios y fecha",
        color: "yellow",
      });
      return;
    }

    if (!organizationId) {
      notifications.show({
        title: "⚠️ Error",
        message: "No se encontró la organización",
        color: "red",
      });
      return;
    }

    setLoadingPreview(true);
    try {
      // Extraer IDs de objetos
      const employeeId =
        typeof newAppointment.employee === "string"
          ? newAppointment.employee
          : newAppointment.employee?._id;
      const clientId =
        typeof newAppointment.client === "string"
          ? newAppointment.client
          : newAppointment.client?._id;
      const serviceIds =
        newAppointment.services
          ?.filter((s) => s && (s._id || typeof s === "string"))
          .map((s) => (typeof s === "string" ? s : s._id)) || [];

      if (!employeeId || !clientId || serviceIds.length === 0) {
        const missing = [];
        if (!employeeId) missing.push("empleado");
        if (!clientId) missing.push("cliente");
        if (serviceIds.length === 0) missing.push("servicios");

        notifications.show({
          title: "⚠️ Campos faltantes",
          message: `Por favor selecciona: ${missing.join(", ")}`,
          color: "yellow",
        });
        return;
      }

      const result = await createAppointmentSeries(
        {
          employee: employeeId,
          client: clientId,
          services: serviceIds,
          startDate: newAppointment.startDate,
          organizationId,
          advancePayment: newAppointment.advancePayment,
        },
        recurrencePattern,
        { previewOnly: true },
      );

      // El backend devuelve el preview directamente: { totalOccurrences, availableCount, occurrences }
      if (
        result &&
        "totalOccurrences" in result &&
        "availableCount" in result &&
        "occurrences" in result
      ) {
        setSeriesPreview(result as SeriesPreviewType);
        notifications.show({
          title: "✅ Preview generado",
          message: `Se generaron ${result.totalOccurrences} citas (${result.availableCount} disponibles)`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "⚠️ Sin preview",
          message: "No se pudo generar el preview",
          color: "yellow",
        });
      }
    } catch (error: unknown) {
      notifications.show({
        title: "❌ Error al generar preview",
        message: error instanceof Error ? error.message : "Ocurrió un error",
        color: "red",
      });
      setSeriesPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // 🔁 Resetear preview cuando cambian los parámetros de recurrencia
  useEffect(() => {
    setSeriesPreview(null);
  }, [
    recurrencePattern,
    newAppointment.employee,
    newAppointment.client,
    newAppointment.startDate,
    newAppointment.services,
  ]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Text size="xl" fw={700}>
            {appointment ? "✏️ Editar Cita" : "📅 Nueva Cita"}
          </Text>
        }
        zIndex={300}
        centered
        size="xl"
        radius="md"
        overlayProps={{
          opacity: 0.3,
          blur: 3,
        }}
        styles={{
          body: {
            padding: "1.5rem",
          },
          header: {
            borderBottom: "1px solid #e9ecef",
            paddingBottom: "1rem",
          },
        }}
      >
        <Box>
          {/* Sección: Cliente y Empleado */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              👤 Cliente y Profesional
            </Text>

            <Select
              label="Cliente"
              size="md"
              placeholder="Escribe para buscar cliente..."
              searchable
              mb="md"
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
              data={[
                ...searchedClients.map((client) => {
                  let isBirthday = false;
                  if (client.birthDate) {
                    const birthDate = dayjs(client.birthDate);
                    if (birthDate.isValid()) {
                      isBirthday =
                        birthDate.month() === today.month() &&
                        birthDate.date() === today.date();
                    }
                  }

                  return {
                    value: client._id,
                    label: isBirthday
                      ? `🎉 ${client.name} 🎉`
                      : auth.role === "admin"
                        ? client.name + " - " + client.phoneNumber
                        : client.name,
                    isBirthday,
                  };
                }),
                { value: "create-client", label: "+ Crear nuevo cliente" },
              ]}
              value={newAppointment.client?._id || ""}
              searchValue={clientSearchQuery}
              onSearchChange={setClientSearchQuery}
              onChange={(value) => {
                if (value === "create-client") {
                  setCreateClientModalOpened(true);
                } else {
                  onClientChange(value);
                  setClientSearchQuery(""); // Limpiar búsqueda después de seleccionar
                }
              }}
              onBlur={() => {
                // No limpiar el searchQuery en blur, solo cuando se selecciona
                // Esto evita que se borre mientras el usuario escribe
              }}
              rightSection={loadingClients ? <Loader size="xs" /> : null}
              nothingFoundMessage={
                loadingClients ? (
                  <Box p="sm" style={{ textAlign: "center" }}>
                    <Loader size="sm" />
                  </Box>
                ) : (
                  <Box p="sm">
                    <Text size="sm" c="dimmed">
                      {clientSearchQuery
                        ? `No se encontraron clientes con "${clientSearchQuery}"`
                        : "Escribe para buscar clientes"}
                    </Text>
                    <Button
                      mt="sm"
                      fullWidth
                      size="xs"
                      onClick={() => setCreateClientModalOpened(true)}
                    >
                      Crear cliente
                    </Button>
                  </Box>
                )
              }
            />

            <Select
              label="Empleado"
              size="md"
              placeholder="Selecciona un empleado"
              renderOption={renderMultiSelectOption}
              data={employees.map((employee) => ({
                value: employee._id,
                label: employee.names,
              }))}
              value={newAppointment.employee?._id || ""}
              onChange={(value) => onEmployeeChange(value)}
              searchable
              required
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
            />

            <Checkbox
              size="sm"
              mt="sm"
              label="Empleado solicitado por el cliente"
              checked={!!newAppointment.employeeRequestedByClient}
              onChange={(event) =>
                setNewAppointment({
                  ...newAppointment,
                  employeeRequestedByClient: event.currentTarget.checked,
                })
              }
            />
          </Box>

          {/* Sección: Servicios */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              ✨ Servicios
            </Text>

            <Checkbox.Group
              size="lg"
              required
              value={
                // Array de IDs seleccionados
                newAppointment.services
                  ? newAppointment.services.map((s) => s._id)
                  : []
              }
              onChange={(selectedIds) => {
                // selectedIds es un array de IDs
                const selectedServices = services.filter((s) =>
                  selectedIds.includes(s._id),
                );
                setNewAppointment((prev) => ({
                  ...prev,
                  services: selectedServices,
                }));
              }}
            >
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {services.map((service) => {
                  const isSelected = newAppointment.services
                    ? newAppointment.services.some((s) => s._id === service._id)
                    : false;

                  return (
                    <Card
                      key={service._id}
                      shadow={isSelected ? "md" : "xs"}
                      padding="xs"
                      withBorder
                      radius="md"
                      style={{
                        backgroundColor: isSelected ? "#e7f5ff" : "white",
                        borderColor: isSelected ? "#228be6" : "#e9ecef",
                        borderWidth: isSelected ? 2 : 1,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Group gap="xs" wrap="nowrap" align="flex-start">
                        <Checkbox
                          size="xs"
                          value={service._id}
                          styles={{
                            input: {
                              cursor: "pointer",
                            },
                          }}
                          mt={1}
                        />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                            {service.name}
                          </Text>
                          <Group gap={6} mt={2}>
                            <Text size="xs" c="dimmed">
                              ⏱️ {service.duration} min
                            </Text>
                            {service.price && (
                              <Text size="xs" c="dimmed">
                                💵{" "}
                                {formatCurrency(
                                  service.price,
                                  organization?.currency || "COP",
                                )}
                              </Text>
                            )}
                          </Group>
                        </Box>
                      </Group>
                    </Card>
                  );
                })}
              </Box>
            </Checkbox.Group>
          </Box>

          {/* Sección: Fecha y Hora */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              🕒 Fecha y Hora
            </Text>

            {/* Selector de fecha de inicio (siempre visible) */}
            <Grid gutter="md" mb="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Box
                  p="xs"
                  style={{
                    backgroundColor: "white",
                    borderRadius: 8,
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Text size="xs" fw={600} mb="xs" c="dimmed">
                    Inicio de la primera cita
                  </Text>
                  <DateSelector
                    label="Fecha"
                    value={newAppointment.startDate}
                    onChange={(date) =>
                      setNewAppointment({ ...newAppointment, startDate: date })
                    }
                  />
                  <TimeSelector
                    label="Hora"
                    date={newAppointment.startDate}
                    onChange={(date) => {
                      // En modo edición, recalcular endDate basado en la duración del servicio
                      if (appointment && newAppointment.services && newAppointment.services.length > 0) {
                        const totalDuration = newAppointment.services.reduce(
                          (acc, s) => acc + (s.duration ?? 0),
                          0
                        );
                        const newEndDate = addMinutes(date, totalDuration);
                        setNewAppointment({ ...newAppointment, startDate: date, endDate: newEndDate });
                      } else {
                        setNewAppointment({ ...newAppointment, startDate: date });
                      }
                    }}
                  />
                </Box>
              </Grid.Col>

              {/* Mostrar selector de fin solo si hay 1 servicio o en modo edición */}
              {(newAppointment.services?.length === 1 || appointment) && (
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Box
                    p="xs"
                    style={{
                      backgroundColor: "white",
                      borderRadius: 8,
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <Text size="xs" fw={600} mb="xs" c="dimmed">
                      Fin
                    </Text>
                    <DateSelector
                      label="Fecha"
                      value={newAppointment.endDate}
                      onChange={(date) =>
                        setNewAppointment({ ...newAppointment, endDate: date })
                      }
                    />
                    <TimeSelector
                      label="Hora"
                      date={newAppointment.endDate}
                      onChange={(date) =>
                        setNewAppointment({ ...newAppointment, endDate: date })
                      }
                    />
                  </Box>
                </Grid.Col>
              )}
            </Grid>

            {/* Controles de duración individual para múltiples servicios */}
            {!appointment &&
              newAppointment.services &&
              newAppointment.services.length > 1 && (
                <>
                  <Divider
                    label="Duración por servicio"
                    labelPosition="center"
                    mb="md"
                    color="blue"
                  />
                  <Box
                    p="sm"
                    style={{
                      backgroundColor: "#e7f5ff",
                      borderRadius: 8,
                      border: "1px solid #74c0fc",
                    }}
                  >
                    <Text size="xs" c="blue.7" mb="sm">
                      Ajusta la duración de cada servicio. El horario se
                      calculará automáticamente en secuencia.
                    </Text>

                    {newAppointment.services.map((service, index) => {
                      // Calcular hora de inicio para este servicio
                      let serviceStartTime = newAppointment.startDate;
                      if (serviceStartTime && index > 0) {
                        let accumulatedMinutes = 0;
                        for (let i = 0; i < index; i++) {
                          const prevService = newAppointment.services![i];
                          const prevDuration =
                            newAppointment.customDurations?.[prevService._id] ??
                            prevService.duration ??
                            0;
                          accumulatedMinutes += prevDuration;
                        }
                        serviceStartTime = addMinutes(
                          newAppointment.startDate!,
                          accumulatedMinutes,
                        );
                      }

                      // Calcular hora de fin para este servicio
                      const currentDuration =
                        newAppointment.customDurations?.[service._id] ??
                        service.duration ??
                        0;
                      const serviceEndTime = serviceStartTime
                        ? addMinutes(serviceStartTime, currentDuration)
                        : undefined;

                      return (
                        <Box
                          key={service._id}
                          p="sm"
                          mb={
                            index < newAppointment.services!.length - 1
                              ? "sm"
                              : 0
                          }
                          style={{
                            backgroundColor: "white",
                            borderRadius: 8,
                            border: "1px solid #d0ebff",
                          }}
                        >
                          <Group justify="space-between" wrap="nowrap" mb="xs">
                            <Group gap="xs">
                              <Badge size="sm" variant="light" color="blue">
                                {index + 1}
                              </Badge>
                              <Text size="sm" fw={600}>
                                {service.name}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              Original: {service.duration} min
                            </Text>
                          </Group>

                          <Grid gutter="xs" align="center">
                            <Grid.Col span={4}>
                              <NumberInput
                                size="xs"
                                label="Duración (min)"
                                value={
                                  newAppointment.customDurations?.[
                                    service._id
                                  ] ??
                                  service.duration ??
                                  0
                                }
                                onChange={(value) => {
                                  const numValue =
                                    typeof value === "number" ? value : 0;
                                  setNewAppointment((prev) => ({
                                    ...prev,
                                    customDurations: {
                                      ...prev.customDurations,
                                      [service._id]: numValue,
                                    },
                                  }));
                                }}
                                min={5}
                                max={480}
                                step={5}
                                styles={{
                                  input: { borderRadius: 6 },
                                }}
                              />
                            </Grid.Col>
                            <Grid.Col span={8}>
                              <Text size="xs" c="dimmed" ta="right">
                                {serviceStartTime && serviceEndTime ? (
                                  <>
                                    {dayjs(serviceStartTime).format("h:mm A")} →{" "}
                                    {dayjs(serviceEndTime).format("h:mm A")}
                                  </>
                                ) : (
                                  "Selecciona hora de inicio"
                                )}
                              </Text>
                            </Grid.Col>
                          </Grid>
                        </Box>
                      );
                    })}

                    {/* Resumen del tiempo total */}
                    <Box
                      mt="sm"
                      pt="sm"
                      style={{ borderTop: "1px dashed #74c0fc" }}
                    >
                      <Group justify="space-between">
                        <Text size="sm" fw={600} c="blue.7">
                          Tiempo total:
                        </Text>
                        <Text size="sm" fw={700} c="blue.7">
                          {newAppointment.services.reduce(
                            (acc, s) =>
                              acc +
                              (newAppointment.customDurations?.[s._id] ??
                                s.duration ??
                                0),
                            0,
                          )}{" "}
                          min
                          {newAppointment.startDate &&
                            newAppointment.endDate && (
                              <Text span size="xs" c="dimmed" ml="xs">
                                (
                                {dayjs(newAppointment.startDate).format(
                                  "h:mm A",
                                )}{" "}
                                →{" "}
                                {dayjs(newAppointment.endDate).format("h:mm A")}
                                )
                              </Text>
                            )}
                        </Text>
                      </Group>
                    </Box>
                  </Box>
                </>
              )}
          </Box>

          {/* 🔁 Sección: Citas Recurrentes (solo para nuevas citas) */}
          {!appointment && (
            <Box
              mb="xl"
              p="md"
              style={{
                backgroundColor: "#f0f8ff",
                borderRadius: 8,
                border: "1px solid #b0d4f1",
              }}
            >
              <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
                🔁 Citas Recurrentes
              </Text>

              <RecurrenceSelector
                value={recurrencePattern}
                onChange={setRecurrencePattern}
                startDate={newAppointment.startDate}
              />

              {recurrencePattern.type === "weekly" && (
                <>
                  <Button
                    mt="md"
                    variant="light"
                    color="blue"
                    loading={loadingPreview}
                    onClick={handleGeneratePreview}
                    leftSection={<Text>🔍</Text>}
                  >
                    Generar Vista Previa
                  </Button>

                  {/* 📨 Checkbox para controlar notificación */}
                  <Box
                    mt="md"
                    p="md"
                    style={{
                      backgroundColor: "#e7f5ff",
                      borderRadius: 8,
                      border: "1px solid #339af0",
                    }}
                  >
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
                      📨 Notificación por WhatsApp
                    </Text>

                    <Checkbox
                      label={
                        <Text size="sm" fw={500}>
                          Enviar mensaje con todas las citas de la serie
                        </Text>
                      }
                      checked={notifyAllAppointments}
                      onChange={(event) =>
                        setNotifyAllAppointments(event.currentTarget.checked)
                      }
                      color="blue"
                    />

                    <Box
                      mt="xs"
                      p="xs"
                      style={{
                        backgroundColor: notifyAllAppointments
                          ? "#d0ebff"
                          : "#fff3bf",
                        borderRadius: 6,
                        borderLeft: `3px solid ${notifyAllAppointments ? "#339af0" : "#fab005"}`,
                      }}
                    >
                      <Text
                        size="xs"
                        c={notifyAllAppointments ? "blue.7" : "yellow.9"}
                        fw={600}
                      >
                        {notifyAllAppointments
                          ? "✅ Se enviará un mensaje con TODAS las citas programadas"
                          : "📅 Se enviará mensaje solo de LA PRIMERA cita"}
                      </Text>
                    </Box>
                  </Box>
                </>
              )}

              {seriesPreview && (
                <Box mt="lg">
                  <SeriesPreview preview={seriesPreview} />
                </Box>
              )}
            </Box>
          )}

          {/* Sección: Pago */}
          <Box
            mb="xl"
            p="md"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              border: "1px solid #e9ecef",
            }}
          >
            <Text size="sm" fw={600} mb="md" c="dimmed" tt="uppercase">
              💰 Información de Pago
            </Text>

            <NumberInput
              label="Monto del Abono"
              size="md"
              placeholder="Ingresa el monto del abono"
              prefix="$ "
              thousandSeparator
              min={0}
              value={newAppointment.advancePayment || 0}
              onChange={(value) =>
                setNewAppointment((prev) => ({
                  ...prev,
                  advancePayment: typeof value === "number" ? value : 0,
                }))
              }
              styles={{
                input: {
                  borderRadius: 8,
                },
              }}
            />

            {(newAppointment.client ||
              newAppointment.employee ||
              (newAppointment.services &&
                newAppointment.services.length > 0)) && (
              <Box
                mt="md"
                p="md"
                style={{
                  backgroundColor: "#e7f5ff",
                  borderRadius: 8,
                  border: "1px solid #74c0fc",
                }}
              >
                <Text size="sm" fw={700} mb="sm" c="blue">
                  📋 Resumen de la Cita
                </Text>

                {newAppointment.client && (
                  <Box mb="xs">
                    <Text size="xs" c="dimmed" mb={2}>
                      Cliente:
                    </Text>
                    <Text size="sm" fw={600}>
                      {newAppointment.client.name}
                    </Text>
                  </Box>
                )}

                {newAppointment.employee && (
                  <Box mb="xs">
                    <Text size="xs" c="dimmed" mb={2}>
                      Profesional:
                    </Text>
                    <Group gap="xs">
                      <Avatar
                        src={newAppointment.employee.profileImage}
                        size={24}
                        radius="xl"
                      />
                      <Text size="sm" fw={600}>
                        {newAppointment.employee.names}
                      </Text>
                      {newAppointment.employeeRequestedByClient && (
                        <Text size="xs" c="violet" fw={600}>
                          (solicitado)
                        </Text>
                      )}
                    </Group>
                  </Box>
                )}

                {newAppointment.services &&
                  newAppointment.services.length > 0 && (
                    <>
                      <Box mb="xs">
                        <Text size="xs" c="dimmed" mb={4}>
                          Servicios:
                        </Text>
                        {newAppointment.services.map((service, index) => (
                          <Box
                            key={service._id}
                            mb={4}
                            p={6}
                            style={{
                              backgroundColor: "white",
                              borderRadius: 6,
                              border: "1px solid #d0ebff",
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap">
                              <Text size="sm" fw={500}>
                                {index + 1}. {service.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                ⏱️ {service.duration} min
                              </Text>
                            </Group>
                          </Box>
                        ))}
                      </Box>

                      <Box
                        mt="sm"
                        pt="sm"
                        style={{
                          borderTop: "1px solid #a5d8ff",
                        }}
                      >
                        <Group justify="space-between" mb={4}>
                          <Text size="sm" c="dimmed">
                            Total servicios:
                          </Text>
                          <Text size="sm" fw={700}>
                            {formatCurrency(
                              newAppointment.services.reduce(
                                (acc, s) => acc + (s.price || 0),
                                0,
                              ),
                              organization?.currency || "COP",
                            )}
                          </Text>
                        </Group>

                        {typeof newAppointment.advancePayment === "number" &&
                          newAppointment.advancePayment > 0 && (
                            <>
                              <Group justify="space-between" mb={4}>
                                <Text size="sm" c="dimmed">
                                  Abono:
                                </Text>
                                <Text size="sm" fw={600} c="green">
                                  -{" "}
                                  {formatCurrency(
                                    newAppointment.advancePayment,
                                    organization?.currency || "COP",
                                  )}
                                </Text>
                              </Group>
                              <Group justify="space-between">
                                <Text size="sm" fw={600}>
                                  Pendiente:
                                </Text>
                                <Text size="sm" fw={700} c="orange">
                                  {formatCurrency(
                                    newAppointment.services.reduce(
                                      (acc, s) => acc + (s.price || 0),
                                      0,
                                    ) - (newAppointment.advancePayment || 0),
                                    organization?.currency || "COP",
                                  )}
                                </Text>
                              </Group>
                            </>
                          )}
                      </Box>
                    </>
                  )}

                {newAppointment.startDate && newAppointment.endDate && (
                  <Box
                    mt="sm"
                    pt="sm"
                    style={{
                      borderTop: "1px solid #a5d8ff",
                    }}
                  >
                    <Text size="xs" c="dimmed" mb={4}>
                      Horario:
                    </Text>
                    <Text size="sm" fw={600}>
                      {formatFullDateInTimezone(
                        appointment
                          ? appointment.startDate
                          : newAppointment.startDate!,
                        timezone,
                        "DD/MM/YYYY",
                      )}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {formatInTimezone(
                        appointment
                          ? appointment.startDate
                          : newAppointment.startDate!,
                        timezone,
                        "h:mm A",
                      )}{" "}
                      -{" "}
                      {formatInTimezone(
                        appointment
                          ? appointment.endDate
                          : newAppointment.endDate!,
                        timezone,
                        "h:mm A",
                      )}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          {/* Botones de acción */}
          <Group
            mt="xl"
            pt="md"
            justify="space-between"
            style={{
              borderTop: "1px solid #e9ecef",
            }}
          >
            <Button
              variant="subtle"
              onClick={onClose}
              size="xs"
              radius="md"
              color="gray"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                // 🔁 Si es cita recurrente, crearla como serie
                if (!appointment && recurrencePattern.type === "weekly") {
                  if (!organizationId) {
                    notifications.show({
                      title: "⚠️ Error",
                      message: "No se encontró la organización",
                      color: "red",
                    });
                    return;
                  }

                  try {
                    // Extraer IDs de objetos si es necesario
                    const employeeId =
                      typeof newAppointment.employee === "string"
                        ? newAppointment.employee
                        : newAppointment.employee?._id;
                    const clientId =
                      typeof newAppointment.client === "string"
                        ? newAppointment.client
                        : newAppointment.client?._id;
                    const serviceIds =
                      newAppointment.services
                        ?.filter((s) => s && (s._id || typeof s === "string"))
                        .map((s) => (typeof s === "string" ? s : s._id)) || [];

                    if (serviceIds.length === 0) {
                      notifications.show({
                        title: "⚠️ Error",
                        message:
                          "No se pudieron procesar los servicios seleccionados",
                        color: "yellow",
                      });
                      return;
                    }

                    setCreatingSeries(true);

                    const result = await createAppointmentSeries(
                      {
                        employee: employeeId,
                        client: clientId,
                        services: serviceIds,
                        startDate: newAppointment.startDate,
                        organizationId,
                        advancePayment: newAppointment.advancePayment,
                      },
                      recurrencePattern,
                      {
                        previewOnly: false,
                        notifyAllAppointments, // 📨 Enviar a backend la opción seleccionada
                      },
                    );

                    if (result && "createdCount" in result) {
                      notifications.show({
                        title: "✅ Serie creada exitosamente",
                        message: `Se crearon ${result.createdCount} de ${result.totalOccurrences} citas recurrentes`,
                        color: "green",
                        autoClose: 4000,
                      });
                    }

                    // Cerrar modal
                    onClose();

                    // Refrescar citas del mes actual sin recargar toda la página
                    if (fetchAppointmentsForMonth) {
                      await fetchAppointmentsForMonth(
                        newAppointment.startDate || new Date(),
                      );
                    }
                  } catch (error: unknown) {
                    notifications.show({
                      title: "❌ Error al crear serie",
                      message:
                        error instanceof Error
                          ? error.message
                          : "Error al crear las citas recurrentes",
                      color: "red",
                      autoClose: 5000,
                    });
                  } finally {
                    setCreatingSeries(false);
                  }
                } else {
                  // 📅 Cita normal o edición
                  onSave();
                }
              }}
              disabled={creatingAppointment || creatingSeries}
              loading={creatingAppointment || creatingSeries}
              size="xs"
              radius="md"
              leftSection={
                appointment
                  ? "✏️"
                  : recurrencePattern.type === "weekly"
                    ? "🔁"
                    : "➕"
              }
              styles={{
                root: {
                  minWidth: 160,
                },
              }}
            >
              {appointment
                ? "Actualizar Cita"
                : recurrencePattern.type === "weekly"
                  ? "Crear Serie Recurrente"
                  : "Crear Cita"}
            </Button>
          </Group>
        </Box>
      </Modal>

      {/* Modal para crear cliente */}
      <ClientFormModal
        opened={createClientModalOpened}
        onClose={() => {
          setCreateClientModalOpened(false);
          // Recargar búsqueda después de crear cliente
          if (organizationId) {
            searchClients(organizationId, clientSearchQuery, 20).then(
              setSearchedClients,
            );
          }
        }}
        fetchClients={fetchClients}
      />
    </>
  );
};

export default AppointmentModal;
