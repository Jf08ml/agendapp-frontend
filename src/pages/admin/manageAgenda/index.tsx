/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Group,
  Loader,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import "react-big-calendar/lib/css/react-big-calendar.css";
import io, { Socket } from "socket.io-client";
import { setWhatsappStatus } from "../../../features/organization/sliceOrganization";
import CustomCalendar from "../../../components/customCalendar/CustomCalendar";
import {
  Appointment,
  createAppointmentsBatch,
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
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { CustomLoader } from "../../../components/customLoader/CustomLoader";
import SearchAppointmentsModal from "./components/SearchAppointmentsModal";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import ReorderEmployeesModal from "./components/ReorderEmployeesModal";
import { BiPlus, BiRefresh, BiSearch, BiSort } from "react-icons/bi";
import { FaCheck } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";
import { runDailyReminder } from "../../../services/cronService";
import { IoNotificationsOutline } from "react-icons/io5";

import { useNavigate } from "react-router-dom";

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

  const navigate = useNavigate();

  const [modalOpenedAppointment, setModalOpenedAppointment] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [sendingReminders, setSendingReminders] = useState(false);

  // Identificador del usuario actual, con su "empleado" asociado
  const userId = useSelector((state: RootState) => state.auth.userId as string);

  const dispatch = useDispatch();

  const BACKEND_URL = import.meta.env.VITE_API_URL_WHATSAPP;
  const API_KEY = import.meta.env.VITE_API_KEY;
  // const [localWhatsappStatus, setLocalWhatsappStatus] = useState(""); // opcional, solo si quieres local también
  const socketRef = useRef<Socket | null>(null);

  // Datos de la organización
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const organizationId = organization?._id;
  const clientIdWhatsapp =
    organization?.clientIdWhatsapp || organization?._id || "";
  const whatsappStatus = useSelector(
    (state: RootState) => state.organization.whatsappStatus
  );

  const { hasPermission } = usePermissions();

  const canViewAll = hasPermission("appointments:view_all");
  const readyForScopedFetch =
    Boolean(organizationId) && (canViewAll || Boolean(userId));

  const normalizeAppointmentDates = (apts: Appointment[]): Appointment[] =>
    apts.map((a) => ({
      ...a,
      startDate: new Date(a.startDate),
      endDate: new Date(a.endDate),
    }));

  const isWhatsAppReady = whatsappStatus === "ready";

  useEffect(() => {
    if (!readyForScopedFetch) return; // 👈 espera orgId y, si no hay view_all, también userId
    fetchClients();
    fetchEmployees();
    fetchAppointmentsForMonth(currentDate);
  }, [readyForScopedFetch]);

  useEffect(() => {
    if (!clientIdWhatsapp || !BACKEND_URL || !API_KEY) return;

    fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/status/${clientIdWhatsapp}`, {
      headers: { "x-api-key": API_KEY },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.code) dispatch(setWhatsappStatus(data.code));
      })
      .catch(() => {});
  }, [clientIdWhatsapp, BACKEND_URL, API_KEY, dispatch]);

  useEffect(() => {
    if (!clientIdWhatsapp || !BACKEND_URL || !API_KEY) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Conéctate con auth de apiKey (el backend lo valida en io.use)
    const socket: Socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: { apiKey: API_KEY },
    });
    socketRef.current = socket;

    // Únete a la “sala” de la sesión
    socket.on("connect", () => {
      socket.emit("join", { clientId: clientIdWhatsapp });
    });

    // Estado normalizado: { code, reason? }
    socket.on("status", (data: { code: string; reason?: string }) => {
      dispatch(setWhatsappStatus(data.code)); // 👈 guarda el "code" en Redux
    });

    socket.on("connect_error", (err) => {
      // si quieres, refleja error como “error”
      dispatch(setWhatsappStatus("error"));
      console.error("socket error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [clientIdWhatsapp, BACKEND_URL, API_KEY, dispatch]);

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

  /**ENVIAR RECORDATORIOS */
  const handleSendDailyReminders = () => {
    if (!isWhatsAppReady) {
      showNotification({
        title: "WhatsApp no conectado",
        message:
          "Conecta tu sesión de WhatsApp para poder enviar recordatorios.",
        color: "orange",
        autoClose: 3500,
        position: "top-right",
      });
      return;
    }

    openConfirmModal({
      title: "Enviar recordatorios de hoy",
      centered: true,
      children: (
        <p>
          Se enviarán mensajes a los <strong>clientes con citas de hoy</strong>{" "}
          que <strong>aún no tienen recordatorio</strong>. ¿Deseas continuar?
        </p>
      ),
      labels: { confirm: "Sí, enviar", cancel: "Cancelar" },
      confirmProps: { color: "grape" },
      onConfirm: async () => {
        setSendingReminders(true);
        try {
          await runDailyReminder();
          showNotification({
            title: "Listo",
            message: "Se ejecutó el envío de recordatorios.",
            color: "green",
            autoClose: 3500,
            position: "top-right",
          });
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudieron enviar los recordatorios.",
            color: "red",
            autoClose: 3500,
            position: "top-right",
          });
          console.error(error);
        } finally {
          setSendingReminders(false);
        }
      },
    });
  };

  /**
   * OBTENER CLIENTES
   */
  const fetchClients = async () => {
    if (!organizationId) return;
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
    if (!readyForScopedFetch) return; // 👈
    setLoadingAgenda(true);
    try {
      const response = await getEmployeesByOrganizationId(
        organizationId as string
      );
      let activeEmployees = response.filter((e) => e.isActive);

      if (!canViewAll) {
        if (!userId) return; // 👈 evita setear [] prematuramente
        activeEmployees = activeEmployees.filter((emp) => emp._id === userId);
      }
      console.log(activeEmployees);
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
  const fetchAppointmentsForMonth = async (date: Date) => {
    if (!readyForScopedFetch) return; // 👈
    setLoadingMonth(true);
    try {
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();
      const response = await getAppointmentsByOrganizationId(
        organizationId as string,
        start,
        end
      );

      const scoped = canViewAll
        ? response
        : userId
        ? response.filter((a) => a.employee._id === userId)
        : [];

      setAppointments(normalizeAppointmentDates(scoped));
    } finally {
      setLoadingMonth(false);
    }
  };

  const fetchAppointmentsForDay = async (
    date: Date
  ): Promise<Appointment[]> => {
    if (!readyForScopedFetch) return []; // 👈
    try {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();
      const response = await getAppointmentsByOrganizationId(
        organizationId as string,
        start,
        end
      );

      const scoped = canViewAll
        ? response
        : userId
        ? response.filter((a) => a.employee._id === userId)
        : [];

      return normalizeAppointmentDates(scoped);
    } catch {
      console.error("Error al obtener citas del día");
      return [];
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

    if (employees.length > 0) {
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
        message: "Debes tener al menos un empleado activo para agendar citas.",
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
          fetchAppointmentsForMonth(currentDate);
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
          fetchAppointmentsForMonth(currentDate);
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
    setCreatingAppointment(true);
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
          const payload = {
            services: services.map((s) => s._id ?? s), // aseguramos que sean IDs
            employee,
            client,
            employeeRequestedByClient: employeeRequestedByClient ?? false,
            startDate, // inicio de la primera cita
            organizationId: organizationId as string,
            advancePayment,
            // si manejas precios personalizados o adicionales, aquí también:
            // customPrices: { [serviceId]: number },
            // additionalItemsByService: { [serviceId]: [{ name, price, quantity }] }
          };

          await createAppointmentsBatch(payload);

          showNotification({
            title: "Éxito",
            message:
              "Citas creadas correctamente para los servicios seleccionados",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });

          setCreatingAppointment(false);
          closeModal(); // cierra el modal
          fetchAppointmentsForMonth(currentDate); // refresca la agenda
        }
        setCreatingAppointment(false);
        closeModal(); // cierra el modal
        fetchAppointmentsForMonth(currentDate); // refresca la agenda
      }
    } catch (error) {
      showNotification({
        title: "Error",
        message: (error as Error).message,
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
      setCreatingAppointment(false);
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
    return <CustomLoader overlay />;
  }

  return (
    <Box>
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
            onClick={() => fetchAppointmentsForMonth(currentDate)}
          >
            Recargar agenda
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
      {hasPermission("whatsapp:read") && (
        <Group align="center" gap="xs" mt={-10}>
          <Text size="sm" fw={500}>
            WhatsApp:
          </Text>

          {whatsappStatus === "ready" && (
            <Group gap="xs">
              <FaCheck color="green" />
              <Text size="sm" c="green" fw={700}>
                Conectado
              </Text>
            </Group>
          )}

          {whatsappStatus === "connecting" && (
            <Group gap="xs">
              <Loader size="xs" color="orange" />
              <Text size="sm" c="orange" fw={700}>
                Conectando...
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}

          {whatsappStatus === "waiting_qr" && (
            <Group gap="xs">
              <Loader size="xs" color="teal" />
              <Text size="sm" c="teal" fw={700}>
                Sesión sin autenticación
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}

          {whatsappStatus === "authenticated" && (
            <Group gap="xs">
              <Loader size="xs" color="blue" />
              <Text size="sm" c="blue" fw={700}>
                Autenticando...
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}

          {whatsappStatus === "auth_failure" && (
            <Group gap="xs">
              <IoAlertCircleOutline color="red" />
              <Text size="sm" c="red" fw={700}>
                Error de autenticación
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}

          {whatsappStatus === "disconnected" && (
            <Group gap="xs">
              <IoAlertCircleOutline color="red" />
              <Text size="sm" c="red" fw={700}>
                Desconectado
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}

          {whatsappStatus === "reconnecting" && (
            <Group gap="xs">
              <Loader size="xs" color="orange" />
              <Text size="sm" c="orange" fw={700}>
                Reconectando...
              </Text>
            </Group>
          )}

          {whatsappStatus === "error" && (
            <Group gap="xs">
              <IoAlertCircleOutline color="red" />
              <Text size="sm" c="red" fw={700}>
                Error de conexión
              </Text>
              {/* <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button> */}
              <Text size="sm" c="red" fw={700}>
                - Inhabilitado temporalemente
              </Text>
            </Group>
          )}

          {!whatsappStatus && (
            <Group gap="xs">
              <IoAlertCircleOutline color="gray" />
              <Text size="sm" c="gray" fw={700}>
                Sin información
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="blue"
                ml={8}
                onClick={() => navigate("/gestionar-whatsapp")}
              >
                Configurar WhatsApp
              </Button>
            </Group>
          )}
        </Group>
      )}

      <CustomCalendar
        employees={employees}
        appointments={appointments}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        setAppointments={setAppointments}
        onOpenModal={openModal}
        onEditAppointment={handleEditAppointment}
        onCancelAppointment={handleCancelAppointment}
        onConfirmAppointment={handleConfirmAppointment}
        fetchAppointmentsForMonth={fetchAppointmentsForMonth}
        loadingMonth={loadingMonth}
        fetchAppointmentsForDay={fetchAppointmentsForDay}
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
        creatingAppointment={creatingAppointment}
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
      {hasPermission("appointments:send_reminders") && (
        <Tooltip
          label="Conecta WhatsApp para enviar recordatorios"
          disabled={isWhatsAppReady}
          withArrow
        >
          <Button
            size="xs"
            variant="outline"
            color="grape"
            leftSection={
              sendingReminders ? (
                <Loader size="xs" />
              ) : (
                <IoNotificationsOutline size={16} />
              )
            }
            onClick={handleSendDailyReminders}
            // disabled={sendingReminders || !isWhatsAppReady}
            disabled={true}
            title="Enviar recordatorios de WhatsApp de las citas de hoy no enviadas"
          >
            Enviar recordatorios
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};

export default ScheduleView;
