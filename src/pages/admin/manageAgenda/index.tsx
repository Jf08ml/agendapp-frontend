/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { IoNotificationsOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

import { sendOrgReminders } from "../../../services/reminderService";
import {
  getWaStatus,
  connectWaSession,
  WaCode,
} from "../../../services/waService";
import { setWhatsappMeta } from "../../../features/organization/sliceOrganization";

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
  ) as WaCode | "";
  const whatsappReason = useSelector(
    (s: RootState) => s.organization.whatsappReason
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

  // ---------- DATA FETCH ----------
  useEffect(() => {
    if (!readyForScopedFetch) return; // espera orgId y, si no hay view_all, también userId
    fetchClients();
    fetchEmployees();
    fetchAppointmentsForMonth(currentDate);
  }, [readyForScopedFetch]);

  // ---------- WA STATUS: Reset suave al cambiar org/sesión ----------
  useEffect(() => {
    if (organizationId && clientIdWhatsapp) {
      dispatch(setWhatsappMeta({ code: "connecting", reason: null }));
    } else {
      dispatch(setWhatsappMeta({ code: "", reason: null }));
    }
  }, [organizationId, clientIdWhatsapp, dispatch]);

  // ---------- WA STATUS: precarga por REST (agenda-backend) ----------
  useEffect(() => {
    if (!organizationId) return;
    getWaStatus(organizationId)
      .then((s) => {
        if (s?.code) {
          dispatch(
            setWhatsappMeta({
              code: s.code as WaCode,
              reason: s.reason ?? null,
              readySince: s.readySince ?? null,
              me: s.me ?? null,
            })
          );
        }
      })
      .catch(() => {});
  }, [organizationId, dispatch]);

  // ---------- SOCKET: conectar con ws.url + token efímero ----------
  useEffect(() => {
    if (!organizationId || !clientIdWhatsapp) return;

    let mounted = true;

    connectWaSession(organizationId, clientIdWhatsapp)
      .then((resp) => {
        if (!mounted) return;

        const ws = resp?.ws;
        if (!ws?.url || !ws?.token) {
          dispatch(
            setWhatsappMeta({ code: "error", reason: "WS no disponible" })
          );
          return;
        }

        // Limpieza previa si existía
        if (socketRef.current) {
          socketRef.current.off("status");
          socketRef.current.off("connect");
          socketRef.current.off("connect_error");
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        const socket: Socket = io(ws.url, {
          transports: ["websocket"],
          auth: { token: ws.token }, // JWT efímero
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join", { clientId: clientIdWhatsapp });
        });

        socket.on("status", (data: { code: string; reason?: string }) => {
          console.log("wa status:", data);
          dispatch(
            setWhatsappMeta({ code: data.code as WaCode, reason: data.reason })
          );
        });

        socket.on("connect_error", (err) => {
          dispatch(setWhatsappMeta({ code: "error", reason: err.message }));
          console.error("socket error:", err.message);
        });
      })
      .catch((e) => {
        dispatch(setWhatsappMeta({ code: "error", reason: e?.message }));
      });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off("status");
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [organizationId, clientIdWhatsapp, dispatch]);

  // ---------- Ajuste de servicios según empleado ----------
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
  }, [newAppointment.employee, employees]);

  const isWhatsAppReady = whatsappStatus === "ready";

  const [refreshingWa, setRefreshingWa] = useState(false);

  const recheckWaStatus = async () => {
    if (!organizationId) return;
    setRefreshingWa(true);
    try {
      const s = await getWaStatus(organizationId as string);
      dispatch(
        setWhatsappMeta({
          code: (s?.code as WaCode) || "",
          reason: s?.reason ?? null,
          readySince: s?.readySince ?? null,
          me: s?.me ?? null,
        })
      );
    } catch (e) {
      dispatch(
        setWhatsappMeta({ code: "error", reason: (e as Error)?.message })
      );
      console.error(e);
    } finally {
      setRefreshingWa(false);
    }
  };

  // ---------- Envío de recordatorios (campaña bulk) ----------
  const handleSendDailyReminders = () => {
    if (sendingReminders) return; // locker básico

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
        if (sendingReminders) return;
        setSendingReminders(true);
        try {
          // Pre-flight: valida estado actualizado
          const s = await getWaStatus(organizationId as string);
          if (s?.code !== "ready") {
            dispatch(
              setWhatsappMeta({
                code: (s?.code as WaCode) || "error",
                reason: s?.reason,
              })
            );
            showNotification({
              title: "WhatsApp no está listo",
              message: s?.reason || "La sesión no está en estado 'ready'.",
              color: "orange",
              autoClose: 3500,
              position: "top-right",
            });
            return;
          }

          // Enviar campaña
          const r = await sendOrgReminders(organizationId as string, {
            dryRun: false,
          });

          // Soporta ambos casos: que el servicio devuelva data ya “desenvuelta” o el AxiosResponse
          const results = r?.results ?? r?.data?.results ?? [];
          // Si pudiera haber varias orgs en el array, suma todo:
          const prepared = results.reduce(
            (sum: number, it: { prepared: any; }) => sum + Number(it?.prepared ?? 0),
            0
          );

          showNotification({
            title: "Campaña creada",
            message: `Se prepararon ${prepared} mensajes para enviar.`,
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

  // ---------- DATA: Clientes/Empleados/Citas ----------
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

  const fetchEmployees = async () => {
    if (!readyForScopedFetch) return;
    setLoadingAgenda(true);
    try {
      const response = await getEmployeesByOrganizationId(
        organizationId as string
      );
      let activeEmployees = response.filter((e) => e.isActive);

      if (!canViewAll) {
        if (!userId) return;
        activeEmployees = activeEmployees.filter((emp) => emp._id === userId);
      }
      setEmployees(activeEmployees);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const fetchAppointmentsForMonth = async (date: Date) => {
    if (!readyForScopedFetch) return;
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
    if (!readyForScopedFetch) return [];
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

  const RecheckBtn = (
    <Button
      size="xs"
      variant="outline"
      leftSection={<BiRefresh size={14} />}
      loading={refreshingWa}
      onClick={recheckWaStatus}
    >
      Reconsultar
    </Button>
  );

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
              {RecheckBtn}
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
              {RecheckBtn}
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
              {RecheckBtn}
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
              {RecheckBtn}
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
              {RecheckBtn}
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
              {RecheckBtn}
            </Group>
          )}

          {whatsappStatus === "reconnecting" && (
            <Group gap="xs">
              <Loader size="xs" color="orange" />
              <Text size="sm" c="orange" fw={700}>
                Reconectando...
              </Text>
              {RecheckBtn}
            </Group>
          )}

          {whatsappStatus === "error" && (
            <Group gap="xs">
              <IoAlertCircleOutline color="red" />
              <Text size="sm" c="red" fw={700}>
                Error de conexión
              </Text>
              <Text size="sm" c="red" fw={700}>
                - Inhabilitado temporalemente
              </Text>
              {RecheckBtn}
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
              {RecheckBtn}
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
          label={
            isWhatsAppReady
              ? ""
              : whatsappReason || "Conecta tu sesión de WhatsApp"
          }
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
            disabled={sendingReminders || !isWhatsAppReady}
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
