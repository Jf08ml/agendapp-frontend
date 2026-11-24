import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Appointment, type AppointmentMove } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayView from "./components/DayView";
import WeekView from "./components/WeekView";
import DayDetailPanel from "./components/DayDetailPanel";
import {
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { Service } from "../../services/serviceService";
import { checkDaysAvailability } from "../../services/scheduleService";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Employee, EmployeeScheduleException } from "../../services/employeeService";
import {
  SegmentedControl,
  Group,
  ActionIcon,
  Button,
  Text,
  Box,
  Tooltip,
  Select,
  Center,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconLayoutColumns,
  IconList,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
  IconPin,
  IconPinnedFilled,
} from "@tabler/icons-react";

const STORAGE_KEY = "agenda_default_view";

type CalendarView = "day" | "week" | "month";

// Vista inicial: la fijada por la persona; si no hay, Día (AgendaEscritorio/AgendaMovil:
// el mes ya no es la vista por defecto).
function readDefaultView(): CalendarView {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "day" || saved === "week" || saved === "month") return saved;
  } catch {
    /* sin almacenamiento */
  }
  return "day";
}

// Vista Día: Tarjetas (columnas por profesional) o Lista; se recuerda lo último elegido.
const DAY_MODE_KEY = "agenda_day_mode";
export type DayMode = "calendar" | "compact";

function readDayMode(): DayMode {
  try {
    const saved = localStorage.getItem(DAY_MODE_KEY);
    if (saved === "calendar" || saved === "compact") return saved;
  } catch {
    /* sin almacenamiento */
  }
  return "calendar";
}

interface CustomCalendarProps {
  employees: Employee[];
  services?: Service[];
  /** Cambiar este número fuerza un recálculo de disponibilidad (p.ej. tras crear un bloqueo) */
  availabilityRefreshKey?: number;
  appointments: Appointment[];
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  onEditAppointment: (appointment: Appointment, initialTab?: string, move?: AppointmentMove) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  onDeleteAppointment?: (appointmentId: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  fetchAppointmentsForMonth: (currentDate: Date) => void;
  loadingMonth: boolean;
  fetchAppointmentsForDay: (day: Date) => Promise<Appointment[]>;
  timezone?: string;
  /** Se llama tras eliminar un bloqueo desde el calendario */
  onExceptionDeleted: (employeeId: string, updatedExceptions: EmployeeScheduleException[]) => void;
  /** Acciones de la página (WhatsApp, Bloquear, Nueva cita…) al final de la barra del calendario */
  toolbarActions?: React.ReactNode;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  employees,
  services = [],
  availabilityRefreshKey = 0,
  appointments,
  currentDate,
  setCurrentDate,
  onOpenModal,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  onDeleteAppointment,
  setAppointments,
  fetchAppointmentsForMonth,
  loadingMonth,
  fetchAppointmentsForDay,
  timezone = "America/Bogota",
  onExceptionDeleted,
  toolbarActions,
}) => {
  const [viewMode, setViewMode] = useState<CalendarView>(readDefaultView);
  const [dayMode, setDayMode] = useState<DayMode>(readDayMode);
  const changeDayMode = useCallback((value: DayMode) => {
    setDayMode(value);
    try {
      localStorage.setItem(DAY_MODE_KEY, value);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  const [defaultView, setDefaultView] = useState<CalendarView>(readDefaultView);
  const [panelDay, setPanelDay] = useState<Date>(new Date());
  const [isMaximized, setIsMaximized] = useState(false);
  // Filtro de la vista Semana: «Todos» (7 columnas, citas compactas) o un profesional
  const [weekEmployeeId, setWeekEmployeeId] = useState<string | null>(null);
  const weekEmployees = useMemo(
    () => (weekEmployeeId ? employees.filter((e) => e._id === weekEmployeeId) : employees),
    [employees, weekEmployeeId]
  );

  const handleSetDefault = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode);
    } catch {
      /* sin almacenamiento */
    }
    setDefaultView(viewMode);
  }, [viewMode]);

  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const isTablet = useMediaQuery("(max-width: 1100px)") ?? false;
  const organization = useSelector((s: RootState) => s.organization.organization);
  const holidayCountry = organization?.default_country || "CO";

  // ── Disponibilidad mensual (Fase 1) ────────────────────────────────────────
  const [availServiceId, setAvailServiceId] = useState<string | null>(null);
  const [availEmployeeId, setAvailEmployeeId] = useState<string | null>(null); // null = Todos
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean> | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const selectedAvailService = useMemo(
    () => services.find((s) => s._id === availServiceId) || null,
    [services, availServiceId]
  );

  // Profesionales elegibles para el servicio seleccionado
  const eligibleEmployees = useMemo(() => {
    if (!availServiceId) return employees;
    const filtered = employees.filter((e) =>
      (e.services || []).some((s) => s._id === availServiceId)
    );
    return filtered.length > 0 ? filtered : employees;
  }, [employees, availServiceId]);

  // Si el profesional seleccionado deja de ser elegible, resetear a Todos
  useEffect(() => {
    if (availEmployeeId && !eligibleEmployees.some((e) => e._id === availEmployeeId)) {
      setAvailEmployeeId(null);
    }
  }, [eligibleEmployees, availEmployeeId]);

  const monthKey = format(currentDate, "yyyy-MM");

  useEffect(() => {
    // Solo en vista mensual y con un servicio elegido
    if (viewMode !== "month" || !availServiceId || !organization?._id || !selectedAvailService) {
      setAvailabilityMap(null);
      return;
    }
    let cancelled = false;
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    setLoadingAvailability(true);
    checkDaysAvailability(
      organization._id,
      [{ serviceId: availServiceId, employeeId: availEmployeeId, duration: selectedAvailService.duration }],
      format(gridStart, "yyyy-MM-dd"),
      format(gridEnd, "yyyy-MM-dd")
    )
      .then((res) => {
        if (!cancelled) setAvailabilityMap(res?.availability ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, availServiceId, availEmployeeId, monthKey, organization?._id, appointments, availabilityRefreshKey]);

  // Anterior / siguiente según la vista (día, semana o mes). Si se sale del mes
  // cargado, se piden las citas del mes nuevo (igual que antes en semana y mes).
  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      const step = direction === "prev" ? -1 : 1;
      const newDate =
        viewMode === "day"
          ? addDays(currentDate, step)
          : viewMode === "week"
            ? (step < 0 ? subWeeks : addWeeks)(currentDate, 1)
            : (step < 0 ? subMonths : addMonths)(currentDate, 1);
      setCurrentDate(newDate);
      if (viewMode === "month" || !isSameMonth(newDate, currentDate)) {
        fetchAppointmentsForMonth(newDate);
      }
    },
    [viewMode, currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setPanelDay(today);
    if (!isSameMonth(today, currentDate)) {
      fetchAppointmentsForMonth(today);
    }
  }, [currentDate, setCurrentDate, fetchAppointmentsForMonth]);

  // Tocar un día del mes abre la vista Día de ese día (antes, un modal)
  const handleDayClick = useCallback(
    (day: Date) => {
      setPanelDay(day);
      setCurrentDate(day);
      if (!isSameMonth(day, currentDate)) fetchAppointmentsForMonth(day);
      setViewMode("day");
    },
    [currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  const getAppointmentsForDay = useCallback(
    (day: Date) =>
      appointments
        .filter(
          (event) =>
            isSameDay(new Date(event.startDate), day) &&
            !event.status.includes("cancelled")
        )
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
    [appointments]
  );

  const getAllAppointmentsForDay = useCallback(
    (day: Date) =>
      appointments
        .filter((event) => isSameDay(new Date(event.startDate), day))
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
    [appointments]
  );

  // Fecha de la barra: día en largo, rango de la semana o mes
  const rangeLabel = (() => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (viewMode === "day") {
      return cap(format(currentDate, isMobile ? "EEE d MMM" : "EEEE d 'de' MMMM", { locale: es }));
    }
    if (viewMode === "month") return cap(format(currentDate, "MMMM yyyy", { locale: es }));
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, "d")} – ${format(weekEnd, "d 'de' MMMM", { locale: es })}`;
    }
    return `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM", { locale: es })}`;
  })();

  // Show panel on desktop only (≥ 1100px) in month view
  const showPanel = !isMobile && !isTablet && viewMode === "month" && !isMaximized;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Barra del calendario (ag-pagehead): Hoy, anterior/siguiente, fecha y vista */}
      <Group justify="space-between" align="center" mb="xs" gap="xs" style={{ flexShrink: 0 }} wrap="wrap">
        <Group gap={6} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <Button variant="default" size="compact-sm" onClick={goToToday}>
            Hoy
          </Button>
          <ActionIcon variant="subtle" color="gray" size="md" onClick={() => handleNavigate("prev")} aria-label={`${viewMode === "day" ? "Día" : viewMode === "week" ? "Semana" : "Mes"} anterior`}>
            <IconChevronLeft size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size="md" onClick={() => handleNavigate("next")} aria-label={`${viewMode === "day" ? "Día" : viewMode === "week" ? "Semana" : "Mes"} siguiente`}>
            <IconChevronRight size={18} />
          </ActionIcon>
          <Text fw={600} fz={isMobile ? 14 : 15} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {rangeLabel}
          </Text>
        </Group>

        <Group gap={6} align="center" wrap="wrap" justify="flex-end">
          {viewMode === "day" && (
            <SegmentedControl
              size="xs"
              value={dayMode}
              onChange={(v) => changeDayMode(v as DayMode)}
              data={[
                {
                  value: "calendar",
                  label: (
                    <Tooltip label="Tarjetas por profesional" withArrow>
                      <Center>
                        <IconLayoutColumns size={16} />
                        <VisuallyHidden>Tarjetas</VisuallyHidden>
                      </Center>
                    </Tooltip>
                  ),
                },
                {
                  value: "compact",
                  label: (
                    <Tooltip label="Lista" withArrow>
                      <Center>
                        <IconList size={16} />
                        <VisuallyHidden>Lista</VisuallyHidden>
                      </Center>
                    </Tooltip>
                  ),
                },
              ]}
            />
          )}
          {viewMode === "week" && employees.length > 1 && (
            <Select
              size="xs"
              aria-label="Profesional"
              data={[
                { value: "all", label: "Todos" },
                ...employees.map((e) => ({ value: e._id, label: e.names.trim() })),
              ]}
              value={weekEmployeeId ?? "all"}
              onChange={(v) => setWeekEmployeeId(!v || v === "all" ? null : v)}
              allowDeselect={false}
              w={160}
              comboboxProps={{ zIndex: 350 }}
            />
          )}
          {viewMode === "week" && (
            <Tooltip label={isMaximized ? "Restaurar vista" : "Pantalla completa"} withArrow>
              <ActionIcon variant="subtle" color="gray" size="md" onClick={() => setIsMaximized((v) => !v)} aria-label={isMaximized ? "Restaurar vista" : "Pantalla completa"}>
                {isMaximized ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as CalendarView)}
            data={[
              { value: "day", label: "Día" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mes" },
            ]}
          />
          <Tooltip
            label={defaultView === viewMode ? "Vista predeterminada activa" : "Fijar como vista predeterminada"}
            withArrow
          >
            <ActionIcon
              size="md"
              variant="subtle"
              color={defaultView === viewMode ? "dark" : "gray"}
              onClick={handleSetDefault}
              aria-label="Fijar vista predeterminada"
              aria-pressed={defaultView === viewMode}
            >
              {defaultView === viewMode ? <IconPinnedFilled size={16} /> : <IconPin size={16} />}
            </ActionIcon>
          </Tooltip>
          {toolbarActions}
        </Group>
      </Group>

      {/* Leyenda de profesionales (Mes y Semana, escritorio) */}
      {viewMode !== "day" && !isMobile && !isTablet && employees.length > 0 && (
        <Group gap={14} align="center" mb="xs" style={{ flexShrink: 0 }}>
          {employees.slice(0, 8).map((emp) => (
            <span key={emp._id} className="ag-appt__pro">
              <i style={{ background: emp.color || "var(--pro-8)" }} />
              {emp.names.trim().split(/\s+/)[0]}
            </span>
          ))}
        </Group>
      )}

      {/* Barra de disponibilidad (solo vista mensual) */}
      {viewMode === "month" && services.length > 0 && employees.length > 0 && (
        <Group
          gap="xs"
          align="center"
          mb="xs"
          wrap="wrap"
          style={{ flexShrink: 0 }}
        >
          <Select
            size="xs"
            placeholder="Ver disponibilidad por servicio"
            data={services.map((s) => ({ value: s._id, label: s.name }))}
            value={availServiceId}
            onChange={setAvailServiceId}
            clearable
            searchable
            leftSection={<IconCalendar size={14} />}
            style={{ flex: isMobile ? "1 1 100%" : "0 0 240px", minWidth: 0 }}
            comboboxProps={{ zIndex: 350 }}
          />

          {availServiceId && (
            <Select
              size="xs"
              placeholder="Profesional"
              data={[
                { value: "all", label: "Todos los profesionales" },
                ...eligibleEmployees.map((e) => ({ value: e._id, label: e.names.trim() })),
              ]}
              value={availEmployeeId ?? "all"}
              onChange={(v) => setAvailEmployeeId(v === "all" ? null : v)}
              style={{ flex: isMobile ? "1 1 150px" : "0 0 210px", minWidth: 0 }}
              comboboxProps={{ zIndex: 350 }}
            />
          )}

          {availServiceId && (
            <Group gap={isMobile ? 8 : 12} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
              {loadingAvailability ? (
                <Text size="xs" c="dimmed">Calculando…</Text>
              ) : (
                <>
                  <Group gap={4} align="center" wrap="nowrap">
                    <Box style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--success)" }} />
                    <Text size="xs" c="dimmed">{isMobile ? "Libre" : "Con espacio"}</Text>
                  </Group>
                  <Group gap={4} align="center" wrap="nowrap">
                    <Box style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--line-strong)" }} />
                    <Text size="xs" c="dimmed">{isMobile ? "Ocupado" : "Sin espacio"}</Text>
                  </Group>
                </>
              )}
            </Group>
          )}
        </Group>
      )}

      {/* Views */}
      <div
        style={
          isMaximized
            ? {
                position: "fixed",
                inset: 0,
                zIndex: 300,
                background: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                padding: 12,
                gap: 8,
              }
            : { flex: 1, overflow: "hidden", minHeight: 0, padding: isMobile ? 0 : 0 }
        }
      >
        {isMaximized && (
          <Group justify="flex-end" style={{ flexShrink: 0 }}>
            <Tooltip label="Restaurar vista" withArrow>
              <ActionIcon variant="light" size="sm" onClick={() => setIsMaximized(false)}>
                <IconMinimize size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}

        {viewMode === "day" ? (
          <DayView
            day={currentDate}
            mode={dayMode}
            onOpenModal={onOpenModal}
            employees={employees}
            getAppointmentsForDay={getAllAppointmentsForDay}
            onEditAppointment={onEditAppointment}
            onCancelAppointment={onCancelAppointment}
            onConfirmAppointment={onConfirmAppointment}
            onMarkAttendance={onMarkAttendance}
            onDeleteAppointment={onDeleteAppointment}
            setAppointments={setAppointments}
            fetchAppointmentsForDay={fetchAppointmentsForDay}
            loadedMonthDate={currentDate}
            timezone={timezone}
            onExceptionDeleted={onExceptionDeleted}
          />
        ) : viewMode === "month" ? (
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: showPanel ? "1fr 320px" : "1fr",
              gap: showPanel ? 16 : 0,
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* Left: calendar grid */}
            <Box style={{ minHeight: 0, overflow: "hidden" }}>
              <MonthView
                currentDate={currentDate}
                isMobile={isMobile}
                handleDayClick={handleDayClick}
                getAppointmentsForDay={getAppointmentsForDay}
                loadingMonth={loadingMonth}
                holidayConfig={{ country: holidayCountry, language: "es" }}
                selectedDay={panelDay}
                availabilityMap={availabilityMap}
                availabilityActive={!!availServiceId}
              />
            </Box>

            {/* Right: day detail panel (desktop only) */}
            {showPanel && (
              <Box style={{ minHeight: 0, overflow: "hidden" }}>
                <DayDetailPanel
                  selectedDay={panelDay}
                  allMonthAppointments={appointments}
                  onCreateAppointment={(day) => onOpenModal(day, new Date())}
                  onEditAppointment={onEditAppointment}
                  timezone={timezone}
                  currentDate={currentDate}
                />
              </Box>
            )}
          </Box>
        ) : isMaximized ? (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <WeekView
              appointments={appointments}
              employees={weekEmployees}
              currentDate={currentDate}
              onOpenModal={onOpenModal}
              onEditAppointment={onEditAppointment}
              onCancelAppointment={onCancelAppointment}
              onConfirmAppointment={onConfirmAppointment}
              onMarkAttendance={onMarkAttendance}
              onDeleteAppointment={onDeleteAppointment}
              setAppointments={setAppointments}
              loadingMonth={loadingMonth}
              timezone={timezone}
              onExceptionDeleted={onExceptionDeleted}
            />
          </div>
        ) : (
          <WeekView
            appointments={appointments}
            employees={weekEmployees}
            currentDate={currentDate}
            onOpenModal={onOpenModal}
            onEditAppointment={onEditAppointment}
            onCancelAppointment={onCancelAppointment}
            onConfirmAppointment={onConfirmAppointment}
            onMarkAttendance={onMarkAttendance}
            onDeleteAppointment={onDeleteAppointment}
            setAppointments={setAppointments}
            loadingMonth={loadingMonth}
            timezone={timezone}
            onExceptionDeleted={onExceptionDeleted}
          />
        )}
      </div>

    </div>
  );
};

export default React.memo(CustomCalendar);
