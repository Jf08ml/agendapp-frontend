/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CustomCalendar from "../../../components/customCalendar/CustomCalendar";
import {
  Appointment,
  cancelAppointment,
  createAppointmentsBatch,
  deleteAppointment,
  getAppointmentsByOrganizationId,
  updateAppointment,
} from "../../../services/appointmentService";
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
import { openConfirmModal, modals } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { CustomLoader } from "../../../components/customLoader/CustomLoader";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { sendOrgReminders } from "../../../services/reminderService";

import { useWhatsappStatus } from "../../../hooks/useWhatsappStatus";
import WhatsappStatusIcon from "./components/WhatsappStatusIcon";
import SchedulerQuickActionsMenu from "./components/SchedulerQuickActionsMenu";

// 🚀 Lazy loading de modales para mejorar carga inicial
const AppointmentModal = lazy(() => import("./components/AppointmentModal"));
const SearchAppointmentsModal = lazy(
  () => import("./components/SearchAppointmentsModal")
);
const ReorderEmployeesModal = lazy(
  () => import("./components/ReorderEmployeesModal")
);

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
  // Duraciones personalizadas por servicio (en minutos)
  // Clave: serviceId, Valor: duración en minutos
  customDurations?: Record<string, number>;
}

const ScheduleView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState<
    Partial<CreateAppointmentPayload>
  >({ services: [] });

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

  const [reminderDate, setReminderDate] = useState<Date | null>(null);

  // Identificador del usuario actual, con su "empleado" asociado
  const userId = useSelector((state: RootState) => state.auth.userId as string);

  // Datos de la organización
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const organizationId = organization?._id;
  const organizationTimezone = organization?.timezone || "America/Bogota"; // 🌍 Timezone de la org

  const initialClientId = useMemo(
    () => organization?.clientIdWhatsapp || organization?._id || "",
    [organization?._id, organization?.clientIdWhatsapp]
  );

  // ✅ Hook centralizado de WA: es la ÚNICA fuente de la UI de WhatsApp aquí
  const {
    code, // "ready" | "connecting" | ...
    reason, // detalle técnico si aplica
    // me,           // si quieres mostrar cuenta conectada, está disponible

    // acciones y utilidades
    recheck, // para el botón "Reconsultar"
  } = useWhatsappStatus(organizationId, initialClientId);

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

  const isWhatsAppReady = code === "ready";

  // ---------- Envío de recordatorios (campaña bulk) ----------
  const handleSendDailyReminders = () => {
    if (sendingReminders) return;

    if (!reminderDate) {
      showNotification({
        title: "Selecciona una fecha",
        message:
          "Debes elegir el día para el que quieres enviar los recordatorios.",
        color: "orange",
        autoClose: 3000,
        position: "top-right",
      });
      return;
    }

    const dateLabel = reminderDate.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    openConfirmModal({
      title: "Enviar recordatorios",
      centered: true,
      children: (
        <p>
          Se enviarán mensajes a los{" "}
          <strong>clientes con citas el día {dateLabel}</strong> que{" "}
          <strong>aún no tienen recordatorio</strong>. ¿Deseas continuar?
        </p>
      ),
      labels: { confirm: "Sí, enviar", cancel: "Cancelar" },
      confirmProps: { color: "grape" },
      onConfirm: async () => {
        if (sendingReminders) return;
        setSendingReminders(true);
        try {
          if (!isWhatsAppReady) {
            showNotification({
              title: "WhatsApp no está listo",
              message: reason || "La sesión no está en estado 'ready'.",
              color: "orange",
              autoClose: 3500,
              position: "top-right",
            });
            return;
          }

          const r = await sendOrgReminders(organizationId as string, {
            dryRun: false,
            targetDate: reminderDate.toISOString(), // o .toISOString().slice(0, 10)
          });

          const results = r?.results ?? r?.data?.results ?? [];
          const prepared = results.reduce(
            (sum: number, it: { prepared: any }) =>
              sum + Number(it?.prepared ?? 0),
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
            autoClose: 3000,
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
  const fetchClients = useCallback(async () => {
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
  }, [organizationId]);

  const fetchEmployees = useCallback(async () => {
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
  }, [readyForScopedFetch, organizationId, canViewAll, userId]);

  const fetchAppointmentsForMonth = useCallback(
    async (date: Date) => {
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
    },
    [readyForScopedFetch, organizationId, canViewAll, userId]
  );

  const fetchAppointmentsForDay = useCallback(
    async (date: Date): Promise<Appointment[]> => {
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
    },
    [readyForScopedFetch, organizationId, canViewAll, userId]
  );
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
  const handleEmployeeChange = useCallback(
    (value: string | null) => {
      const selectedEmployee = employees.find((emp) => emp._id === value);
      if (selectedEmployee) {
        setNewAppointment((prev) => ({ ...prev, employee: selectedEmployee }));
        setFilteredServices(selectedEmployee.services as unknown as Service[]);
      } else {
        setNewAppointment((prev) => ({ ...prev, employee: undefined }));
        setFilteredServices([]);
      }
    },
    [employees]
  );

  /**
   * MANEJO DE CLIENTE
   */
  const handleClientChange = useCallback(
    (clientId: string | null) => {
      const selectedClient = clients.find((client) => client._id === clientId);
      setNewAppointment((prev) => ({ ...prev, client: selectedClient }));
    },
    [clients]
  );

  /**
   * COMBINAR FECHA + HORA
   */
  const combineDateAndTime = useCallback(
    (dateDay: Date | null, dateHour: Date): Date | null => {
      if (!dateDay) return null;
      const combinedDate = new Date(dateDay);
      combinedDate.setHours(dateHour.getHours());
      combinedDate.setMinutes(dateHour.getMinutes());
      combinedDate.setSeconds(dateHour.getSeconds());
      combinedDate.setMilliseconds(dateHour.getMilliseconds());
      return combinedDate;
    },
    []
  );

  /**
   * ABRIR MODAL NUEVA CITA
   */
  const openModal = useCallback(
    (selectedDay: Date | null, interval?: Date, employeeId?: string) => {
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
        showNotification({
          title: "Error",
          message:
            "Debes tener al menos un empleado activo para agendar citas.",
          color: "red",
          autoClose: 3000,
          position: "top-right",
        });
      }
    },
    [employees, combineDateAndTime]
  );

  /**
   * CERRAR MODAL
   */
  const closeModal = useCallback(() => {
    setNewAppointment({ services: [] });
    setModalOpenedAppointment(false);
    setSelectedAppointment(null);
    setFilteredServices([]);
  }, []);

  /**
   * EDITAR CITA
   */
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewAppointment({
      service: appointment.service,
      services: appointment.service ? [appointment.service] : [],
      client: appointment.client,
      employee: appointment.employee,
      employeeRequestedByClient: appointment.employeeRequestedByClient,
      startDate: new Date(appointment.startDate),
      endDate: new Date(appointment.endDate),
      status: appointment.status,
      advancePayment: appointment.advancePayment,
    });
    setModalOpenedAppointment(true);
  }, []);

  /**
   * ELIMINAR CITA - Elimina definitivamente una cita (útil para citas canceladas)
   */
  const handleDeleteAppointment = useCallback(
    (appointmentId: string) => {
      openConfirmModal({
        title: "Eliminar cita",
        centered: true,
        children: (
          <Text size="sm">
            ¿Estás seguro de que deseas eliminar esta cita definitivamente? Esta acción no se puede deshacer.
          </Text>
        ),
        labels: { confirm: "Eliminar", cancel: "Cancelar" },
        confirmProps: { color: "red" },
        onConfirm: async () => {
          try {
            await deleteAppointment(appointmentId);
            showNotification({
              title: "Éxito",
              message: "La cita ha sido eliminada definitivamente.",
              color: "green",
              autoClose: 3000,
              position: "top-right",
            });
            fetchAppointmentsForMonth(currentDate);
          } catch (error) {
            showNotification({
              title: "Error",
              message: "No se pudo eliminar la cita.",
              color: "red",
              autoClose: 3000,
              position: "top-right",
            });
            console.error(error);
          }
        },
      });
    },
    [currentDate, fetchAppointmentsForMonth]
  );

  /**
   * CANCELAR CITA - Muestra modal con opciones de cancelar o eliminar
   */
  const handleCancelAppointment = useCallback(
    (appointmentId: string) => {
      const handleCancel = async () => {
        modals.closeAll();
        try {
          await cancelAppointment(appointmentId);
          showNotification({
            title: "Éxito",
            message: "La cita ha sido cancelada y se mantiene en el historial.",
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
      };

      const handleDelete = async () => {
        modals.closeAll();
        try {
          await deleteAppointment(appointmentId);
          showNotification({
            title: "Éxito",
            message: "La cita ha sido eliminada definitivamente.",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
          fetchAppointmentsForMonth(currentDate);
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudo eliminar la cita.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        }
      };

      modals.open({
        title: "¿Qué deseas hacer con esta cita?",
        centered: true,
        children: (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Selecciona una opción:
            </Text>
            <Button
              color="orange"
              variant="light"
              fullWidth
              onClick={handleCancel}
            >
              Cancelar cita (mantener en historial)
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              La cita quedará marcada como cancelada pero visible en el historial del cliente.
            </Text>
            <Button
              color="red"
              variant="filled"
              fullWidth
              onClick={handleDelete}
            >
              Eliminar definitivamente
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              La cita se eliminará por completo del sistema. Útil para citas creadas por error.
            </Text>
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              onClick={() => modals.closeAll()}
            >
              Volver
            </Button>
          </Stack>
        ),
      });
    },
    [currentDate, fetchAppointmentsForMonth]
  );

  /**
   * CONFIRMAR CITA
   */
  const handleConfirmAppointment = useCallback(
    (appointmentId: string) => {
      const appointment = appointments.find((a) => a._id === appointmentId);
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
    },
    [appointments, fetchAppointmentsForMonth, currentDate]
  );

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
        customDurations,
      } = newAppointment;

      if (
        services &&
        services.length > 0 &&
        employee &&
        client &&
        startDate &&
        endDate
      ) {
        if (selectedAppointment) {
          const firstService = services[0];
          const payload = {
            services: [firstService],
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
          const payload = {
            services: services.map((s) => s._id ?? s),
            employee,
            client,
            employeeRequestedByClient: employeeRequestedByClient ?? false,
            startDate,
            // Solo enviar endDate si hay un solo servicio (para duraciones personalizadas simples)
            // Para múltiples servicios, enviar customDurations
            endDate: services.length === 1 ? endDate : undefined,
            organizationId: organizationId as string,
            advancePayment,
            // Duraciones personalizadas por servicio (en minutos)
            customDurations: services.length > 1 ? customDurations : undefined,
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
          closeModal();
          fetchAppointmentsForMonth(currentDate);
        }
        setCreatingAppointment(false);
        closeModal();
        fetchAppointmentsForMonth(currentDate);
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
  const handleSaveReorderedEmployees = useCallback(
    async (updatedEmployees: Employee[]) => {
      try {
        const updates = updatedEmployees.map((employee, index) => ({
          ...employee,
          order: index + 1,
        }));

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
    },
    []
  );

  // Loader inicial
  if (loadingAgenda) {
    return <CustomLoader overlay />;
  }

  return (
    <Box pos="relative" p="md">
      {sendingReminders && (
        <CustomLoader loadingText="Enviando recordatorios.." overlay />
      )}

      {/* Barra superior tipo toolbar */}
      <Paper
        withBorder
        radius="md"
        p="xs"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {/* Izquierda: estado WhatsApp */}
        <WhatsappStatusIcon
          code={code}
          reason={reason}
          onRecheck={recheck}
          onConfigure={() => navigate("/gestionar-whatsapp")}
          trigger="click"
          size="xs"
        />

        {/* Derecha: contador + quick actions */}
        <Group gap="sm" align="center">
          <Badge size="xs" radius="xl" variant="light">
            Citas este mes:{" "}
            {
              appointments.filter((apt) => !apt.status.includes("cancelled"))
                .length
            }
          </Badge>

          <Button size="xs" onClick={() => openModal(new Date(), new Date())}>
            Crear cita
          </Button>

          <SchedulerQuickActionsMenu
            onOpenSearch={() => setShowSearchModal(true)}
            onReloadMonth={() => fetchAppointmentsForMonth(currentDate)}
            onAddAppointment={() => openModal(new Date(), new Date())}
            onReorderEmployees={() => setReorderModalOpened(true)}
            onSendReminders={handleSendDailyReminders}
            isWhatsappReady={isWhatsAppReady}
            sendingReminders={sendingReminders}
            reasonForDisabled={reason}
            canSearchAppointments={hasPermission(
              "appointments:search_schedule"
            )}
            canCreate={hasPermission("appointments:create")}
            canSendReminders={hasPermission("appointments:send_reminders")}
            canReorderEmployees={hasPermission("appointments:reorderemployees")}
            reminderDate={reminderDate}
            onChangeReminderDate={setReminderDate}
          />
        </Group>
      </Paper>

      {/* Calendario principal */}
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
        onDeleteAppointment={handleDeleteAppointment}
        fetchAppointmentsForMonth={fetchAppointmentsForMonth}
        loadingMonth={loadingMonth}
        fetchAppointmentsForDay={fetchAppointmentsForDay}
        timezone={organizationTimezone}
      />

      {/* 🚀 Modales con Suspense para lazy loading */}
      <Suspense fallback={<CustomLoader overlay />}>
        {modalOpenedAppointment && (
          <AppointmentModal
            opened={modalOpenedAppointment}
            onClose={closeModal}
            appointment={selectedAppointment}
            newAppointment={newAppointment}
            setNewAppointment={setNewAppointment}
            services={filteredServices}
            employees={employees}
            clients={clients}
            onEmployeeChange={handleEmployeeChange}
            onClientChange={handleClientChange}
            onSave={addOrUpdateAppointment}
            fetchClients={fetchClients}
            creatingAppointment={creatingAppointment}
            fetchAppointmentsForMonth={fetchAppointmentsForMonth}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showSearchModal && (
          <SearchAppointmentsModal
            opened={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            appointments={appointments}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {reorderModalOpened && (
          <ReorderEmployeesModal
            opened={reorderModalOpened}
            onClose={() => setReorderModalOpened(false)}
            employees={employees}
            onSave={handleSaveReorderedEmployees}
            onFetchEmployees={fetchEmployees}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default ScheduleView;
