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
  MultiSelect,
} from "@mantine/core";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import { addMinutes } from "date-fns";
import { Service } from "../../../../services/serviceService";
import { Employee } from "../../../../services/employeeService";
import { Client } from "../../../../services/clientService";
import { Appointment } from "../../../../services/appointmentService";
import ClientFormModal from "../../manageClients/ClientFormModal";
import dayjs from "dayjs";
import { CreateAppointmentPayload } from "..";

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  newAppointment: Partial<CreateAppointmentPayload>;
  setNewAppointment: React.Dispatch<React.SetStateAction<Partial<CreateAppointmentPayload>>>;
  services: Service[];
  employees: Employee[];
  clients: Client[];
  // onServiceChange: (value: string | null) => void;
  onEmployeeChange: (value: string | null) => void;
  onClientChange: (value: string | null) => void;
  onSave: () => void;
  fetchClients: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  opened,
  onClose,
  appointment,
  newAppointment,
  setNewAppointment,
  services,
  employees,
  clients,
  // onServiceChange,
  onEmployeeChange,
  onClientChange,
  onSave,
  fetchClients,
}) => {
  const [createClientModalOpened, setCreateClientModalOpened] =
    useState<boolean>(false);

  const today = dayjs();

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

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={appointment ? "Editar Cita" : "Añadir nueva cita"}
        zIndex={300}
        centered
        size="lg"
      >
        <Box>
          {/* Selector de clientes */}
          <Select
            label="Cliente"
            placeholder="Selecciona un cliente"
            searchable
            data={[
              ...clients.map((client) => {
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
                  label: isBirthday ? `🎉 ${client.name} 🎉` : client.name,
                  isBirthday,
                };
              }),
              { value: "create-client", label: "+ Crear nuevo cliente" },
            ]}
            value={newAppointment.client?._id || ""}
            onChange={(value) => {
              if (value === "create-client") {
                setCreateClientModalOpened(true);
              } else {
                onClientChange(value);
              }
            }}
            nothingFoundMessage={
              <Box p="sm">
                <Text size="sm" c="dimmed">
                  No se encontraron clientes
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
            }
          />
          {/* Otros Selects */}
          <Select
            label="Empleado"
            placeholder="Selecciona un empleado"
            data={employees.map((employee) => ({
              value: employee._id,
              label: employee.names,
            }))}
            value={newAppointment.employee?._id || ""}
            onChange={(value) => onEmployeeChange(value)}
            searchable
            required
          />
          <Checkbox
            size="xs"
            my="xs"
            mb="md"
            label="Empleado solicitado por el cliente"
            checked={!!newAppointment.employeeRequestedByClient}
            onChange={(event) =>
              setNewAppointment({
                ...newAppointment,
                employeeRequestedByClient: event.currentTarget.checked,
              })
            }
          />

          {appointment ? (
            // MODO EDICIÓN: Solo un servicio
            <Select
              label="Servicio"
              placeholder="Selecciona un servicio"
              data={services.map((service) => ({
                value: service._id,
                label: service.name,
              }))}
              // El value es un string con el ID del servicio
              value={newAppointment.services?.[0]?._id || ""}
              onChange={(value) => {
                // value es el ID del servicio
                const selected = services.find((s) => s._id === value);
                setNewAppointment((prev) => ({
                  ...prev,
                  services: selected ? [selected] : [],
                }));
              }}
              required
            />
          ) : (
            // MODO CREACIÓN: Múltiples servicios
            <MultiSelect
              label="Servicios"
              placeholder="Selecciona uno o varios servicios"
              data={services.map((service) => ({
                value: service._id,
                label: service.name,
              }))}
              value={
                // array de IDs
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
              searchable
              required
            />
          )}
          <NumberInput
            label="Monto del Abono"
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
            mb="sm"
          />
          {/* Controles para fechas y horas */}
          <Grid mt="md" gutter="sm">
            <Grid.Col span={6}>
              <DateSelector
                label="Fecha de inicio"
                value={newAppointment.startDate}
                onChange={(date) =>
                  setNewAppointment({ ...newAppointment, startDate: date })
                }
              />
              <TimeSelector
                label="Hora de inicio"
                date={newAppointment.startDate}
                onChange={(date) =>
                  setNewAppointment({ ...newAppointment, startDate: date })
                }
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <DateSelector
                label="Fecha de fin"
                value={newAppointment.endDate}
                onChange={(date) =>
                  setNewAppointment({ ...newAppointment, endDate: date })
                }
              />
              <TimeSelector
                label="Hora de fin"
                date={newAppointment.endDate}
                onChange={(date) =>
                  setNewAppointment({ ...newAppointment, endDate: date })
                }
              />
            </Grid.Col>
          </Grid>
          <Group mt="lg" justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onSave}>
              {appointment ? "Actualizar Cita" : "Crear Cita"}
            </Button>
          </Group>
        </Box>
      </Modal>

      {/* Modal para crear cliente */}
      <ClientFormModal
        opened={createClientModalOpened}
        onClose={() => setCreateClientModalOpened(false)}
        fetchClients={fetchClients}
      />
    </>
  );
};

export default AppointmentModal;
