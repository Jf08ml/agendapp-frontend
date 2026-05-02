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
import {
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CustomCalendar from "../../../components/customCalendar/CustomCalendar";
import {
  Appointment,
  cancelAppointment,
  createAppointmentsBatch,
  createMultiEmployeeBatch,
  deleteAppointment,
  getAppointmentsByOrganizationId,
  markAttendance,
  updateAppointment,
} from "../../../services/appointmentService";
import {
  Employee,
  getEmployeesByOrganizationId,
  updateEmployee,
} from "../../../services/employeeService";
import { Client } from "../../../services/clientService";
import { Service } from "../../../services/serviceService";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal, modals } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { usePermissions } from "../../../hooks/usePermissions";
import { CustomLoader } from "../../../components/customLoader/CustomLoader";
import {
  endOfDayInTimezone,
  endOfMonthInTimezone,
  startOfDayInTimezone,
  startOfMonthInTimezone,
} from "../../../utils/timezoneUtils";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { sendOrgReminders } from "../../../services/reminderService";

import { useWhatsappStatus } from "../../../hooks/useWhatsappStatus";
import WhatsAppStatusPill from "./components/WhatsAppStatusPill";
import SchedulerQuickActionsMenu from "./components/SchedulerQuickActionsMenu";
import SetupGuide from "./components/SetupGuide";

import type { EmployeeBlockData } from "./components/AppointmentModal";

// 🚀 Lazy loading de modales para mejorar carga inicial
const AppointmentModal = lazy(() => import("./components/AppointmentModal"));
const SearchAppointmentsModal = lazy(
  () => import("./components/SearchAppointmentsModal"),
);
const ReorderEmployeesModal = lazy(
  () => import("./components/ReorderEmployeesModal"),
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
  // Paquete de sesiones del cliente (si aplica)
  clientPackageId?: string;
  usePackageForServices?: Record<string, string>; // serviceId -> clientPackageId
}

const ScheduleView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState<
    Partial<CreateAppointmentPayload>
  >({ services: [] });

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;

  const [modalOpenedAppointment, setModalOpenedAppointment] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
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

  // Identificador del usuario actual, con su "profesional" asociado
  const userId = useSelector((state: RootState) => state.auth.userId as string);

  // organizationId del auth slice: se setea junto con los permisos en useAuthInitializer,
  // así que su presencia garantiza que los permisos ya están cargados.
  const authOrgId = useSelector(
    (state: RootState) => state.auth.organizationId,
  );

  // Datos de la organización
  const organization = useSelector(
    (state: RootState) => state.organization.organization,
  );
  const organizationId = organization?._id;
  const organizationTimezone = organization?.timezone || "UTC"; // 🌍 Timezone de la org

  const initialClientId = useMemo(
    () => organization?.clientIdWhatsapp || organization?._id || "",
    [organization?._id, organization?.clientIdWhatsapp],
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
    Boolean(organizationId) &&
    Boolean(authOrgId) &&
    (canViewAll || Boolean(userId));

  const normalizeAppointmentDates = (apts: Appointment[]): Appointment[] =>
    apts.map((a) => ({
      ...a,
      startDate: new Date(a.startDate),
      endDate: new Date(a.endDate),
    }));

  // ---------- DATA FETCH ----------
  useEffect(() => {
    if (!readyForScopedFetch) return;
    setLoadingAgenda(true);
    Promise.all([
      fetchEmployees(),
      fetchAppointmentsForMonth(currentDate),
    ]).finally(() => setLoadingAgenda(false));
  }, [readyForScopedFetch]);

  // ---------- Ajuste de servicios según profesional ----------
  useEffect(() => {
    if (newAppointment.employee) {
      const selectedEmployee = employees.find(
        (employee) => employee._id === newAppointment.employee?._id,
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
            0,
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

  // ---------- DATA: Profesionales/Citas ----------
  const fetchEmployees = useCallback(async () => {
    if (!readyForScopedFetch) return;
    try {
      const response = await getEmployeesByOrganizationId(
        organizationId as string,
      );
      let activeEmployees = response.filter((e) => e.isActive);

      if (!canViewAll) {
        if (!userId) return;
        activeEmployees = activeEmployees.filter((emp) => emp._id === userId);
      }
      setEmployees(activeEmployees);
    } catch (error) {
      console.error(error);
    }
  }, [readyForScopedFetch, organizationId, canViewAll, userId]);

  const fetchAppointmentsForMonth = useCallback(
    async (date: Date) => {
      if (!readyForScopedFetch) return;
      setLoadingMonth(true);
      try {
        const start = startOfMonthInTimezone(date, organizationTimezone);
        const end = endOfMonthInTimezone(date, organizationTimezone);
        const response = await getAppointmentsByOrganizationId(
          organizationId as string,
          start,
          end,
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
    [readyForScopedFetch, organizationId, organizationTimezone, canViewAll, userId],
  );

  const fetchAppointmentsForDay = useCallback(
    async (date: Date): Promise<Appointment[]> => {
      if (!readyForScopedFetch) return [];
      try {
        const start = startOfDayInTimezone(date, organizationTimezone);
        const end = endOfDayInTimezone(date, organizationTimezone);
        const response = await getAppointmentsByOrganizationId(
          organizationId as string,
          start,
          end,
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
    [readyForScopedFetch, organizationId, organizationTimezone, canViewAll, userId],
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
    [employees],
  );

  /**
   * MANEJO DE CLIENTE
   */
  const handleClientChange = useCallback(
    (client: Client | null) => {
      setNewAppointment((prev) => ({ ...prev, client: client ?? undefined }));
    },
    [],
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
    [],
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
            "Debes tener al menos un profesional activo para agendar citas.",
          color: "red",
          autoClose: 3000,
          position: "top-right",
        });
      }
    },
    [employees, combineDateAndTime],
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
            ¿Estás seguro de que deseas eliminar esta cita definitivamente? Esta
            acción no se puede deshacer.
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
    [currentDate, fetchAppointmentsForMonth],
  );

  /**
   * CANCELAR CITA - Muestra modal con opciones de cancelar o eliminar
   */
  const handleCancelAppointment = useCallback(
    (appointmentId: string) => {
      const CancelModalContent = () => {
        const [loading, setLoading] = useState(false);
        const [notifyClient, setNotifyClient] = useState(false);

        const handleCancel = async () => {
          setLoading(true);
          try {
            await cancelAppointment(appointmentId, notifyClient);
            modals.closeAll();
            showNotification({
              title: "Éxito",
              message: notifyClient
                ? "La cita ha sido cancelada y se ha notificado al cliente."
                : "La cita ha sido cancelada y se mantiene en el historial.",
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
            setLoading(false);
          }
        };

        const handleDelete = async () => {
          setLoading(true);
          try {
            await deleteAppointment(appointmentId);
            modals.closeAll();
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
            setLoading(false);
          }
        };

        return (
          <Stack gap="md">
            {loading && (
              <Group justify="center" py="md">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Procesando...
                </Text>
              </Group>
            )}
            {!loading && (
              <>
                <Text size="sm" c="dimmed">
                  Selecciona una opción:
                </Text>
                <Checkbox
                  label="Informar al cliente de la cancelación por WhatsApp"
                  description="Se enviará un mensaje automático al cliente notificando la cancelación"
                  checked={notifyClient}
                  onChange={(e) => setNotifyClient(e.currentTarget.checked)}
                />
                <Button
                  color="orange"
                  variant="light"
                  fullWidth
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar cita (mantener en historial)
                </Button>
                <Text size="xs" c="dimmed" ta="center">
                  La cita quedará marcada como cancelada pero visible en el
                  historial del cliente.
                </Text>
                <Button
                  color="red"
                  variant="filled"
                  fullWidth
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Eliminar definitivamente
                </Button>
                <Text size="xs" c="dimmed" ta="center">
                  La cita se eliminará por completo del sistema. Útil para citas
                  creadas por error.
                </Text>
                <Button
                  variant="subtle"
                  color="gray"
                  fullWidth
                  onClick={() => modals.closeAll()}
                  disabled={loading}
                >
                  Volver
                </Button>
              </>
            )}
          </Stack>
        );
      };

      modals.open({
        title: "¿Qué deseas hacer con esta cita?",
        centered: true,
        closeOnClickOutside: false,
        closeOnEscape: false,
        withCloseButton: true,
        children: <CancelModalContent />,
      });
    },
    [currentDate, fetchAppointmentsForMonth],
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
                Profesional: {appointment.employee?.names || "No asignado"}
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
    [appointments, fetchAppointmentsForMonth, currentDate],
  );

  /**
   * MARCAR ASISTENCIA
   */
  const handleMarkAttendance = useCallback(
    (appointmentId: string, status: "attended" | "no_show") => {
      // "Asistió" se ejecuta directamente sin modal
      if (status === "attended") {
        openConfirmModal({
          title: "Marcar asistencia",
          centered: true,
          children: (
            <Text size="sm">
              ¿Confirmas que el cliente asistió a esta cita?
            </Text>
          ),
          labels: { confirm: "Sí, asistió", cancel: "Cancelar" },
          confirmProps: { color: "teal" },
          onConfirm: async () => {
            try {
              await markAttendance(appointmentId, "attended");
              showNotification({
                title: "Éxito",
                message: "La cita se marcó como asistida.",
                color: "teal",
                autoClose: 3000,
                position: "top-right",
              });
              fetchAppointmentsForMonth(currentDate);
            } catch (error) {
              showNotification({
                title: "Error",
                message: "No se pudo registrar la asistencia.",
                color: "red",
                autoClose: 3000,
                position: "top-right",
              });
              console.error(error);
            }
          },
        });
        return;
      }

      // "No asistió" abre modal con opción de notificar por WhatsApp
      const NoShowModalContent = () => {
        const [loading, setLoading] = useState(false);
        const [notifyClient, setNotifyClient] = useState(false);

        const handleConfirm = async () => {
          setLoading(true);
          try {
            await markAttendance(appointmentId, "no_show", notifyClient);
            modals.closeAll();
            showNotification({
              title: "Éxito",
              message: notifyClient
                ? "La cita se marcó como no asistida y se notificó al cliente."
                : "La cita se marcó como no asistida.",
              color: "pink",
              autoClose: 3000,
              position: "top-right",
            });
            fetchAppointmentsForMonth(currentDate);
          } catch (error) {
            showNotification({
              title: "Error",
              message: "No se pudo registrar la asistencia.",
              color: "red",
              autoClose: 3000,
              position: "top-right",
            });
            console.error(error);
            setLoading(false);
          }
        };

        return (
          <Stack gap="md">
            {loading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Procesando...
                </Text>
              </Group>
            ) : (
              <>
                <Text size="sm">
                  ¿Confirmas que el cliente no asistió a esta cita?
                </Text>
                <Checkbox
                  label="Informar al cliente por WhatsApp"
                  description="Se enviará un mensaje automático notificando la no asistencia"
                  checked={notifyClient}
                  onChange={(e) => setNotifyClient(e.currentTarget.checked)}
                />
                <Button
                  color="pink"
                  variant="light"
                  fullWidth
                  onClick={handleConfirm}
                >
                  Marcar como no asistió
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  fullWidth
                  onClick={() => modals.closeAll()}
                >
                  Cancelar
                </Button>
              </>
            )}
          </Stack>
        );
      };

      modals.open({
        title: "Marcar no asistencia",
        centered: true,
        closeOnClickOutside: false,
        closeOnEscape: false,
        withCloseButton: true,
        children: <NoShowModalContent />,
      });
    },
    [fetchAppointmentsForMonth, currentDate],
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
        clientPackageId,
        usePackageForServices,
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
            // Paquete de sesiones (si el admin eligió usar paquete)
            clientPackageId,
            usePackageForServices,
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
   * CREAR CITAS MULTI-PROFESIONAL
   */
  const handleMultiSave = useCallback(
    async (blocks: EmployeeBlockData[]) => {
      if (!organizationId || !newAppointment.client) return;
      setCreatingAppointment(true);
      try {
        await createMultiEmployeeBatch({
          client: newAppointment.client._id,
          organizationId,
          advancePayment: newAppointment.advancePayment,
          employeeRequestedByClient: newAppointment.employeeRequestedByClient ?? false,
          blocks: blocks.map((b) => ({
            employee: b.employee._id,
            services: b.services.map((s) => s._id),
            startDate: (() => {
              const d = b.startDate;
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
            })(),
            endDate: (() => {
              const d = b.endDate;
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
            })(),
            customDurations: b.customDurations,
          })),
        });
        showNotification({
          title: "Éxito",
          message: `Citas creadas para ${blocks.length} profesionales`,
          color: "green",
          autoClose: 3000,
          position: "top-right",
        });
        closeModal();
        fetchAppointmentsForMonth(currentDate);
      } catch (error) {
        showNotification({
          title: "Error",
          message: (error as Error).message,
          color: "red",
          autoClose: 3000,
          position: "top-right",
        });
      } finally {
        setCreatingAppointment(false);
      }
    },
    [organizationId, newAppointment, currentDate, fetchAppointmentsForMonth, closeModal],
  );

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
          updates.map((employee) => updateEmployee(employee._id, employee)),
        );

        setEmployees(updates);
        showNotification({
          title: "Éxito",
          message: "Profesionales reordenados correctamente.",
          color: "green",
          autoClose: 3000,
          position: "top-right",
        });
      } catch (error) {
        console.error(error);
        showNotification({
          title: "Error",
          message: "No se pudo guardar el nuevo orden de los profesionales.",
          color: "red",
          autoClose: 3000,
          position: "top-right",
        });
      }
    },
    [],
  );

  // Loader inicial
  if (loadingAgenda) {
    return <CustomLoader overlay />;
  }

  return (
    <Box
      pos="relative"
      style={{
        height: "calc(100dvh - 66px)", // 50px AppShell header + 16px AppShell.Main padding-top
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "4px 4px 0" : "8px 8px 0",
        gap: 8,
      }}
    >
      {sendingReminders && (
        <CustomLoader loadingText="Enviando recordatorios.." overlay />
      )}

      {/* Header V3 */}
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
          padding: isMobile ? "2px 2px 4px" : "2px 4px 6px",
        }}
      >
        {/* Left: eyebrow (hidden on mobile) + Fraunces month title */}
        <Box style={{ minWidth: 0 }}>
          {!isMobile && (
            <Text
              style={{
                fontSize: 10.5,
                letterSpacing: 2,
                color: "#8B92A6",
                fontWeight: 700,
                textTransform: "uppercase",
                lineHeight: 1,
                marginBottom: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "clamp(160px, 30vw, 340px)",
              }}
            >
              {organization?.name
                ? `${organization.name} · Calendario`
                : "Calendario"}
            </Text>
          )}
          <Text
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: isMobile ? 20 : 26,
              fontWeight: 600,
              letterSpacing: -1,
              color: "#101526",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {format(currentDate, "MMMM", { locale: es }).charAt(0).toUpperCase() +
              format(currentDate, "MMMM", { locale: es }).slice(1)}
            {!isMobile && (
              <span style={{ color: "#8B92A6", fontStyle: "italic", fontWeight: 400 }}>
                {" "}{format(currentDate, "yyyy")}
              </span>
            )}
          </Text>
        </Box>

        {/* Right: WA pill (compact on mobile) + create btn + actions menu */}
        <Group gap={isMobile ? 6 : 8} align="center" style={{ flexShrink: 0 }}>
          <WhatsAppStatusPill
            code={code}
            reason={reason}
            onRecheck={recheck}
            onConfigure={() => navigate("/gestionar-whatsapp")}
            blocked={organization?.planLimits?.whatsappIntegration === false}
            compact={isMobile}
          />

          {!isMobile && hasPermission("appointments:create") && (
            <Button
              size="xs"
              onClick={() => openModal(new Date(), new Date())}
              style={{ borderRadius: 8 }}
            >
              Crear cita
            </Button>
          )}

          <SchedulerQuickActionsMenu
            onOpenSearch={() => setShowSearchModal(true)}
            onReloadMonth={() => fetchAppointmentsForMonth(currentDate)}
            onAddAppointment={() => openModal(new Date(), new Date())}
            onReorderEmployees={() => setReorderModalOpened(true)}
            onSendReminders={handleSendDailyReminders}
            isWhatsappReady={isWhatsAppReady}
            sendingReminders={sendingReminders}
            reasonForDisabled={reason}
            canSearchAppointments={hasPermission("appointments:search_schedule")}
            canCreate={hasPermission("appointments:create")}
            canSendReminders={hasPermission("appointments:send_reminders")}
            canReorderEmployees={hasPermission("appointments:reorderemployees")}
            reminderDate={reminderDate}
            onChangeReminderDate={setReminderDate}
          />
        </Group>
      </Box>

      {/* Guía de configuración inicial — se muestra solo si no hay profesionales */}
      {employees.length === 0 && <SetupGuide employees={employees} />}

      {/* Calendario principal — ocupa todo el alto restante */}
      <Box style={{ flex: 1, overflow: "hidden", minHeight: 0, marginBottom: 8 }}>
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
          onMarkAttendance={handleMarkAttendance}
          onDeleteAppointment={handleDeleteAppointment}
          fetchAppointmentsForMonth={fetchAppointmentsForMonth}
          loadingMonth={loadingMonth}
          fetchAppointmentsForDay={fetchAppointmentsForDay}
          timezone={organizationTimezone}
        />
      </Box>

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
            onEmployeeChange={handleEmployeeChange}
            onClientChange={handleClientChange}
            onSave={addOrUpdateAppointment}
            onSaveMulti={handleMultiSave}
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
