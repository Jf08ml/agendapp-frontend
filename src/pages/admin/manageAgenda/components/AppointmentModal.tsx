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
import { CreateAppointmentPayload } from "..";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";

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
}) => {
  const [createClientModalOpened, setCreateClientModalOpened] =
    useState<boolean>(false);
  const auth = useSelector((state: RootState) => state.auth);
  
  // 🚀 Estado para búsqueda asíncrona de clientes
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(clientSearchQuery, 300);
  const [searchedClients, setSearchedClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const today = dayjs();
  const organization = useSelector((state: RootState) => state.organization.organization);
  const organizationId = organization?._id;

  // 🚀 Búsqueda asíncrona de clientes con debounce
  useEffect(() => {
    if (!organizationId) return;
    
    const searchClientsAsync = async () => {
      setLoadingClients(true);
      try {
        const results = await searchClients(organizationId, debouncedSearch, 20);
        
        // Si hay un cliente seleccionado, asegurarse de que esté en la lista
        if (
          newAppointment.client &&
          typeof newAppointment.client._id !== "undefined" &&
          !results.find(c => c._id === newAppointment.client!._id)
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
      setNewAppointment({
        ...appointment,
        startDate: new Date(appointment.startDate),
        endDate: new Date(appointment.endDate),
        employee: appointment?.employee || newAppointment.employee,
        services: appointment.service ? [appointment.service] : [],
        client: appointment.client,
      });
      
      // Si hay cliente en appointment, agregarlo a la lista de búsqueda
      if (appointment.client && !searchedClients.find(c => c._id === appointment.client._id)) {
        setSearchedClients(prev => [appointment.client, ...prev]);
      }
    }
  }, [appointment, setNewAppointment]);

  useEffect(() => {
    if (appointment) {
      // MODO EDICIÓN
      // Recalcular endDate con base en un solo servicio
      const service = newAppointment.services?.[0];
      if (newAppointment.startDate && service) {
        // Asumiendo que 'service.duration' es minutos
        const end = addMinutes(newAppointment.startDate, service.duration);
        setNewAppointment((prev) => ({ ...prev, endDate: end }));
      }
    } else {
      // MODO CREACIÓN
      // Sumar la duración de todos los servicios
      if (newAppointment.startDate && newAppointment.services) {
        const totalDuration = newAppointment.services.reduce(
          (acc, s) => acc + (s.duration || 0),
          0
        );
        const end = addMinutes(newAppointment.startDate, totalDuration);
        setNewAppointment((prev) => ({ ...prev, endDate: end }));
      }
    }
  }, [
    appointment,
    newAppointment.startDate,
    newAppointment.services,
    setNewAppointment,
  ]);

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
                  selectedIds.includes(s._id)
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
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                }).format(service.price)}
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

            <Grid gutter="md">
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
                    Inicio
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
                    onChange={(date) =>
                      setNewAppointment({ ...newAppointment, startDate: date })
                    }
                  />
                </Box>
              </Grid.Col>

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
            </Grid>
          </Box>

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

            {(newAppointment.client || newAppointment.employee || (newAppointment.services && newAppointment.services.length > 0)) && (
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

                {newAppointment.services && newAppointment.services.length > 0 && (
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
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(
                            newAppointment.services.reduce(
                              (acc, s) => acc + (s.price || 0),
                              0
                            )
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
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                }).format(newAppointment.advancePayment)}
                              </Text>
                            </Group>
                            <Group justify="space-between">
                              <Text size="sm" fw={600}>
                                Pendiente:
                              </Text>
                              <Text size="sm" fw={700} c="orange">
                                {new Intl.NumberFormat("es-CO", {
                                  style: "currency",
                                  currency: "COP",
                                  minimumFractionDigits: 0,
                                }).format(
                                  newAppointment.services.reduce(
                                    (acc, s) => acc + (s.price || 0),
                                    0
                                  ) - (newAppointment.advancePayment || 0)
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
                      {dayjs(newAppointment.startDate).format("DD/MM/YYYY")}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {dayjs(newAppointment.startDate).format("h:mm A")} -{" "}
                      {dayjs(newAppointment.endDate).format("h:mm A")}
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
              onClick={onSave}
              disabled={creatingAppointment}
              loading={creatingAppointment}
              size="xs"
              radius="md"
              leftSection={appointment ? "✏️" : "➕"}
              styles={{
                root: {
                  minWidth: 160,
                },
              }}
            >
              {appointment ? "Actualizar Cita" : "Crear Cita"}
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
            searchClients(organizationId, clientSearchQuery, 20).then(setSearchedClients);
          }
        }}
        fetchClients={fetchClients}
      />
    </>
  );
};

export default AppointmentModal;
