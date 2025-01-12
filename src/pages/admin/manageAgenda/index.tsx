/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Box, Button, Group, Text, Title } from "@mantine/core";
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
  updateEmployee,
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
import SearchAppointmentsModal from "./components/SearchAppointmentsModal";
import { addMinutes } from "date-fns";
import ReorderEmployeesModal from "./components/ReorderEmployeesModal";
import { BiPlus, BiRefresh, BiSearch, BiSort } from "react-icons/bi";

export interface CreateAppointmentPayload {
  service: Service;
  services: Service[];
  client: Client;
  employee: Employee;
  employeeRequestedByClient: boolean;
  startDate: Date;
  endDate: Date;
  status: string;
  organizationId: string;
  advancePayment?: number;
}

const ScheduleView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState<
    Partial<CreateAppointmentPayload>
  >({
    services: [],
  });

  const [modalOpenedAppointment, setModalOpenedAppointment] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);

  // Identificador del usuario actual, con su "empleado" asociado
  const userId = useSelector((state: RootState) => state.auth.userId as string);

  // Datos de la organización
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
    // Cada vez que cambie el empleado seleccionado, ajustamos servicios
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
  }, [newAppointment.employee, employees]);

  /**
   * OBTENER CLIENTES
   */
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

  /**
   * OBTENER EMPLEADOS
   */
  const fetchEmployees = async () => {
    setLoadingAgenda(true);
    try {
      const response = await getEmployeesByOrganizationId(
        organizationId as string
      );

      // Filtrar por "isActive" para ocultar los inactivos
      let activeEmployees = response.filter((employee) => employee.isActive);

      // Si NO tiene permisos para ver todos, filtrar solo el suyo
      if (!hasPermission("appointments:view_all")) {
        activeEmployees = activeEmployees.filter((emp) => emp._id === userId);
      }

      setEmployees(activeEmployees);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  /**
   * OBTENER CITAS
   */
  const fetchAppointments = async () => {
    try {
      const response = await getAppointmentsByOrganizationId(
        organizationId as string
      );

      // Si tiene permiso "view_all", mostramos todas
      if (hasPermission("appointments:view_all")) {
        setAppointments(response);
      } else {
        // Caso contrario, solo las que correspondan a su empleado
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

  /**
   * MANEJO DE SERVICIO
   */
  // const handleServiceChange = (serviceId: string | null) => {
  //   const selectedService = filteredServices.find(
  //     (service) => service._id === serviceId
  //   );
  //   setNewAppointment({ ...newAppointment, services: selectedService });
  // };

  /**
   * MANEJO DE EMPLEADO
   */
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

  /**
   * MANEJO DE CLIENTE
   */
  const handleClientChange = (clientId: string | null) => {
    const selectedClient = clients.find((client) => client._id === clientId);
    setNewAppointment({ ...newAppointment, client: selectedClient });
  };

  /**
   * COMBINAR FECHA + HORA
   */
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

  /**
   * ABRIR MODAL NUEVA CITA
   */
  const openModal = (
    selectedDay: Date | null,
    interval?: Date,
    employeeId?: string
  ) => {
    const startDate =
      combineDateAndTime(selectedDay, interval || new Date()) || new Date();

    if (clients.length > 0 && employees.length > 0) {
      setNewAppointment((prev) => ({
        ...prev,
        startDate: prev.startDate || startDate,
        employee: employeeId
          ? employees.find((employee) => employee._id === employeeId) ||
            prev.employee
          : prev.employee,
      }));
      setModalOpenedAppointment(true);
    } else {
      // Notificación si no cargaron datos aún
      showNotification({
        title: "Error",
        message: "Los datos aún no se han cargado",
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
    }
  };

  /**
   * CERRAR MODAL
   */
  const closeModal = () => {
    setNewAppointment({});
    setModalOpenedAppointment(false);
    setSelectedAppointment(null);
    setFilteredServices([]);
  };

  /**
   * EDITAR CITA
   */
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

  /**
   * CANCELAR CITA
   */
  const handleCancelAppointment = (appointmentId: string) => {
    openConfirmModal({
      title: "Cancelar cita",
      children: (
        <p>
          Al cancelar se <strong>elimina</strong> el registro de la cita. ¿Estás
          seguro de que deseas cancelar esta cita?
        </p>
      ),
      centered: true,
      labels: { confirm: "Cancelar y eliminar", cancel: "Volver" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteAppointment(appointmentId);
          showNotification({
            title: "Éxito",
            message: "La cita ha sido cancelada y eliminada.",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
          fetchAppointments();
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

  /**
   * CONFIRMAR CITA
   */
  const handleConfirmAppointment = (appointmentId: string) => {
    const appointment = appointments.find((a) => a._id === appointmentId); // Buscar la cita seleccionada

    if (!appointment) {
      showNotification({
        title: "Error",
        message: "No se encontró la cita seleccionada.",
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
      return;
    }

    openConfirmModal({
      title: "Confirmar cita",
      children: (
        <div>
          <p>¿Estás seguro de que deseas confirmar esta cita?</p>
          <Box mt="md">
            <Text size="sm" fw={500}>
              Resumen de la cita:
            </Text>
            <Text size="sm">Cliente: {appointment.client?.name}</Text>
            <Text size="sm">Servicio: {appointment.service?.name}</Text>
            <Text size="sm">
              Fecha y hora:{" "}
              {new Date(appointment.startDate).toLocaleString("es-CO")}
            </Text>
            <Text size="sm">
              Empleado: {appointment.employee?.names || "No asignado"}
            </Text>
            <Text size="sm">
              Abono: ${appointment.advancePayment?.toLocaleString("es-CO")}
            </Text>
          </Box>
        </div>
      ),
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

  /**
   * CREAR O ACTUALIZAR CITA
   */
  const addOrUpdateAppointment = async () => {
    try {
      const {
        services,
        employee,
        employeeRequestedByClient,
        client,
        startDate,
        endDate,
        status,
        advancePayment,
      } = newAppointment;

      // Verifica que tengas datos
      if (
        services && // Array de servicios
        services.length > 0 &&
        employee &&
        client &&
        startDate &&
        endDate
      ) {
        if (selectedAppointment) {
          // MODO EDICIÓN
          // Solo tomamos el primer servicio (o el que estuviera antes)
          // porque en backend sigues teniendo 1 cita = 1 servicio.

          const firstService = services[0]; // tomamos solo el primero
          const payload = {
            services: [firstService], // en la BD tu endpoint quizás espera 'service' suelto
            employee,
            client,
            employeeRequestedByClient: employeeRequestedByClient ?? false,
            startDate,
            endDate,
            status: status || "pending",
            organizationId: organizationId as string,
            advancePayment,
          };

          await updateAppointment(selectedAppointment._id, payload);
          showNotification({
            title: "Éxito",
            message: "Cita actualizada correctamente",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
        } else {
          // MODO CREACIÓN
          let currentStart = startDate; // Hora de inicio de la PRIMER cita

          for (const service of services) {
            // Calculamos la hora de fin para este servicio
            // usando su duración (en minutos).
            const serviceEnd = addMinutes(currentStart, service.duration || 0);

            // Construimos el payload para ESTA cita
            const payload = {
              service,
              employee,
              client,
              employeeRequestedByClient: employeeRequestedByClient ?? false,
              startDate: currentStart, // Empieza donde terminó el anterior
              endDate: serviceEnd, // Termina después de su duración
              status: status || "pending",
              organizationId: organizationId as string,
              advancePayment,
            };

            await createAppointment(payload);

            // El próximo servicio empieza donde terminó éste
            currentStart = serviceEnd;
          }

          showNotification({
            title: "Éxito",
            message:
              "Citas creadas correctamente para los servicios seleccionados",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
        }

        closeModal(); // cierra el modal
        fetchAppointments(); // refresca la agenda
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

  /**
   * ACTUALIZAR ORDEN DE EMPLEADOS
   */
  const handleSaveReorderedEmployees = async (updatedEmployees: Employee[]) => {
    try {
      const updates = updatedEmployees.map((employee, index) => ({
        ...employee,
        order: index + 1, // Actualizar el orden basado en la posición
      }));

      // Actualizar en la base de datos
      await Promise.all(
        updates.map((employee) => updateEmployee(employee._id, employee))
      );

      setEmployees(updates);
      showNotification({
        title: "Éxito",
        message: "Empleados reordenados correctamente.",
        color: "green",
        autoClose: 3000,
        position: "top-right",
      });
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "No se pudo guardar el nuevo orden de los empleados.",
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
    }
  };

  // Muestra un loader si estamos cargando
  if (loadingAgenda) {
    return <CustomLoader />;
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Group justify="space-between" mb="md">
          <Title order={2}>Gestionar Agenda</Title>
          <Group align="center">
            <Button
              size="xs"
              variant="outline"
              color="teal"
              leftSection={<BiSearch size={16} />}
              onClick={() => setShowSearchModal(true)}
            >
              Buscar Citas
            </Button>
            <Button
              size="xs"
              variant="filled"
              color="blue"
              leftSection={<BiRefresh size={16} />}
              onClick={fetchAppointments}
            >
              Actualizar
            </Button>
            {hasPermission("appointments:create") && (
              <Button
                size="xs"
                color="green"
                leftSection={<BiPlus size={16} />}
                onClick={() => openModal(new Date(), new Date())}
              >
                Añadir Cita
              </Button>
            )}
            <Button
              size="xs"
              color="orange"
              leftSection={<BiSort size={16} />}
              onClick={() => setReorderModalOpened(true)}
            >
              Reordenar Empleados
            </Button>
          </Group>
        </Group>
      </Group>

      <CustomCalendar
        employees={employees}
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
        // onServiceChange={handleServiceChange}
        onEmployeeChange={handleEmployeeChange}
        onClientChange={handleClientChange}
        onSave={addOrUpdateAppointment}
        fetchClients={fetchClients}
      />
      <SearchAppointmentsModal
        opened={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        appointments={appointments}
      />
      <ReorderEmployeesModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        employees={employees}
        onSave={handleSaveReorderedEmployees}
        onFetchEmployees={fetchEmployees}
      />
    </Box>
  );
};

export default ScheduleView;
