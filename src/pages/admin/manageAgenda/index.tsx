import React, { useEffect, useState } from "react";
import { Box, Button, Group, Title } from "@mantine/core";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CustomCalendar from "../../../components/customCalendar/CustomCalendar";
import {
  Appointment,
  createAppointment,
  deleteAppointment,
  getAppointmentsByOrganizationId,
  updateAppointment,
} from "../../../services/appointmentService";
import AppointmentModal from "./components/AppointmentModal";
import {
  Employee,
  getEmployeesByOrganizationId,
} from "../../../services/employeeService";
import {
  Client,
  getClientsByOrganizationId,
} from "../../../services/clientService";
import { Service } from "../../../services/serviceService";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { CustomLoader } from "../../../components/customLoader/CustomLoader";

interface CreateAppointmentPayload {
  service: Service;
  client: Client;
  employee: Employee;
  employeeRequestedByClient: boolean;
  startDate: Date;
  endDate: Date;
  status: string;
  organizationId: string;
}

const ScheduleView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState<
    Partial<CreateAppointmentPayload>
  >({});
  const [modalOpenedAppointment, setModalOpenedAppointment] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  const userId = useSelector((state: RootState) => state.auth.userId as string);
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const organizationId = organization?._id;

  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchClients();
    fetchEmployees();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (newAppointment.employee) {
      const selectedEmployee = employees.find(
        (employee) => employee._id === newAppointment.employee?._id
      );
      if (selectedEmployee) {
        setFilteredServices(selectedEmployee.services as unknown as Service[]);
      }
    } else {
      setFilteredServices([]);
    }
  }, [newAppointment.employee, employees, setFilteredServices]);

  const fetchClients = async () => {
    setLoadingAgenda(true);
    try {
      const response = await getClientsByOrganizationId(
        organizationId as string
      );
      setClients(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const fetchEmployees = async () => {
    setLoadingAgenda(true);
    try {
      const response = await getEmployeesByOrganizationId(
        organizationId as string
      );

      // Filtrar los empleados que tengan isActive: true
      const activeEmployees = response.filter((employee) => employee.isActive);

      setEmployees(activeEmployees);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAgenda(true);
    try {
      const response = await getAppointmentsByOrganizationId(
        organizationId as string
      );
      if (hasPermission("appointments:view_all")) {
        setAppointments(response);
      } else {
        const filteredAppointments = response.filter(
          (appointment) => appointment.employee._id === userId
        );
        setAppointments(filteredAppointments);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const handleServiceChange = (serviceId: string | null) => {
    const selectedService = filteredServices.find(
      (service) => service._id === serviceId
    );
    setNewAppointment({ ...newAppointment, service: selectedService });
  };

  const handleEmployeeChange = (value: string | null) => {
    const selectedEmployee = employees.find((emp) => emp._id === value);
    if (selectedEmployee) {
      setNewAppointment({ ...newAppointment, employee: selectedEmployee });
      setFilteredServices(selectedEmployee.services as unknown as Service[]);
    } else {
      setNewAppointment({ ...newAppointment, employee: undefined });
      setFilteredServices([]);
    }
  };

  const handleClientChange = (clientId: string | null) => {
    const selectedClient = clients.find((client) => client._id === clientId);
    setNewAppointment({ ...newAppointment, client: selectedClient });
  };

  const combineDateAndTime = (
    dateDay: Date | null,
    dateHour: Date
  ): Date | null => {
    if (!dateDay) return null;

    const combinedDate = new Date(dateDay);
    combinedDate.setHours(dateHour.getHours());
    combinedDate.setMinutes(dateHour.getMinutes());
    combinedDate.setSeconds(dateHour.getSeconds());
    combinedDate.setMilliseconds(dateHour.getMilliseconds());

    return combinedDate;
  };

  const openModal = (selectedDay: Date | null, interval?: Date) => {
    const startDate =
      combineDateAndTime(selectedDay, interval || new Date()) || new Date();

    if (clients.length > 0 && employees.length > 0) {
      if (!newAppointment.startDate) {
        setNewAppointment({
          ...newAppointment,
          startDate,
        });
      }
      setModalOpenedAppointment(true);
    } else {
      showNotification({
        title: "Error",
        message: "Los datos aún no se han cargado",
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
    }
  };

  const closeModal = () => {
    setNewAppointment({});
    setModalOpenedAppointment(false);
    setSelectedAppointment(null);
    setFilteredServices([]);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewAppointment({
      service: appointment.service,
      client: appointment.client,
      employee: appointment.employee,
      startDate: new Date(appointment.startDate),
      endDate: new Date(appointment.endDate),
      status: appointment.status,
    });
    setModalOpenedAppointment(true);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    openConfirmModal({
      title: "Cancelar cita",
      children: (
        <p>
          Al cancelar se <strong>elimina</strong> el registro de la cita ¿Estás
          seguro de que deseas cancelar esta cita?
        </p>
      ),
      centered: true,
      labels: { confirm: "Cancelar y eliminar", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          // const response = await updateAppointment(appointmentId, {
          //   status: "cancelled",
          // });
          // if (response && response.status === "cancelled") {
          await deleteAppointment(appointmentId);
          showNotification({
            title: "Éxito",
            message: "La cita ha sido cancelada y eliminada.",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
          fetchAppointments();
          // }
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudo cancelar la cita.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        }
      },
    });
  };

  const handleConfirmAppointment = (appointmentId: string) => {
    openConfirmModal({
      title: "Confirmar cita",
      children: <p>¿Estás seguro de que deseas confirmar esta cita?</p>,
      centered: true,
      labels: { confirm: "Confirmar", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        try {
          await updateAppointment(appointmentId, { status: "confirmed" });
          showNotification({
            title: "Éxito",
            message: "La cita ha sido confirmada.",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
          fetchAppointments();
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudo confirmar la cita.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        }
      },
    });
  };

  const addOrUpdateAppointment = async () => {
    try {
      const {
        service,
        employee,
        employeeRequestedByClient,
        client,
        startDate,
        endDate,
        status,
      } = newAppointment;

      if (service && employee && client && startDate && endDate) {
        const appointmentPayload: CreateAppointmentPayload = {
          service,
          employee,
          client,
          employeeRequestedByClient: employeeRequestedByClient ?? false,
          startDate,
          endDate,
          status: status || "pending",
          organizationId: organizationId as string,
        };

        if (selectedAppointment) {
          try {
            const response = await updateAppointment(
              selectedAppointment._id,
              appointmentPayload
            );
            if (response) {
              showNotification({
                title: "Éxito",
                message: "Cita actualizada correctamente",
                color: "green",
                autoClose: 3000,
                position: "top-right",
              });
              closeModal();
            }
          } catch (error) {
            showNotification({
              title: "Error",
              message: (error as Error).message,
              color: "red",
              autoClose: 3000,
              position: "top-right",
            });
            console.error(error);
          }
        } else {
          try {
            const response = await createAppointment(appointmentPayload);
            if (response) {
              showNotification({
                title: "Éxito",
                message: "Cita creada correctamente",
                color: "green",
                autoClose: 3000,
                position: "top-right",
              });
              closeModal();
            }
          } catch (error) {
            showNotification({
              title: "Error",
              message: (error as Error).message,
              color: "red",
              autoClose: 3000,
              position: "top-right",
            });
            console.error(error);
          }
        }
        fetchAppointments();
      }
    } catch (error) {
      showNotification({
        title: "Error",
        message: (error as Error).message,
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
      console.error(error);
    }
  };

  if (loadingAgenda) {
    return <CustomLoader />;
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Gestionar Agenda</Title>
        <Group align="center">
          <Button variant="outline" color="blue" onClick={fetchAppointments}>
            Actualizar agenda
          </Button>
          {hasPermission("appointments:create") && (
            <Button
              color="blue"
              onClick={() => openModal(new Date(), new Date())}
            >
              Añadir Cita
            </Button>
          )}
        </Group>
      </Group>
      <CustomCalendar
        appointments={appointments}
        onOpenModal={openModal}
        onEditAppointment={handleEditAppointment}
        onCancelAppointment={handleCancelAppointment}
        onConfirmAppointment={handleConfirmAppointment}
      />
      <AppointmentModal
        opened={modalOpenedAppointment}
        onClose={closeModal}
        appointment={selectedAppointment}
        newAppointment={newAppointment}
        setNewAppointment={setNewAppointment}
        services={filteredServices}
        employees={employees}
        clients={clients}
        onServiceChange={handleServiceChange}
        onEmployeeChange={handleEmployeeChange}
        onClientChange={handleClientChange}
        onSave={addOrUpdateAppointment}
        fetchClients={fetchClients}
      />
    </Box>
  );
};

export default ScheduleView;
