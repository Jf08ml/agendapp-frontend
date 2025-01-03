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
} from "@mantine/core";
import DateSelector from "./DateSelector";
import TimeSelector from "./TimeSelector";
import { addMinutes } from "date-fns";
import { Service } from "../../../../services/serviceService";
import { Employee } from "../../../../services/employeeService";
import { Client } from "../../../../services/clientService";
import { Appointment } from "../../../../services/appointmentService";
import ClientFormModal from "../../manageClients/ClientFormModal";

interface AppointmentModalProps {
  opened: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  newAppointment: Partial<Appointment>;
  setNewAppointment: React.Dispatch<React.SetStateAction<Partial<Appointment>>>;
  services: Service[];
  employees: Employee[];
  clients: Client[];
  onServiceChange: (value: string | null) => void;
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
  onServiceChange,
  onEmployeeChange,
  onClientChange,
  onSave,
  fetchClients,
}) => {
  const [createClientModalOpened, setCreateClientModalOpened] =
    useState<boolean>(false);

  useEffect(() => {
    if (appointment) {
      setNewAppointment({
        ...appointment,
        startDate: new Date(appointment.startDate),
        endDate: new Date(appointment.endDate),
        employee: appointment?.employee || newAppointment.employee,
      });
    }
  }, [appointment, setNewAppointment]);

  useEffect(() => {
    if (newAppointment.startDate && newAppointment.service) {
      const selectedService = services.find(
        (s) => s._id === newAppointment.service?._id
      );

      if (selectedService?.duration) {
        const endDate = addMinutes(
          newAppointment.startDate,
          selectedService.duration
        );

        setNewAppointment((prev) => ({
          ...prev,
          endDate: new Date(endDate),
        }));
      }
    }
  }, [
    newAppointment.startDate,
    newAppointment.service,
    services,
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
              ...clients.map((client) => ({
                value: client._id,
                label: client.name,
              })),
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

          <Select
            label="Servicio"
            placeholder="Selecciona un servicio"
            data={services.map((service) => ({
              value: service._id,
              label: service.name,
            }))}
            value={newAppointment.service?._id || ""}
            onChange={(value) => onServiceChange(value)}
            searchable
            required
          />

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
