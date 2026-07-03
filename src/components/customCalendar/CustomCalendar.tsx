import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayModal from "./components/DayModal";
import WeekView from "./components/WeekView";
import DayDetailPanel from "./components/DayDetailPanel";
import {
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
  Text,
  Box,
  Tooltip,
  Select,
} from "@mantine/core";
import {
  BiCalendar,
  BiChevronLeft,
  BiChevronRight,
  BiCalendarWeek,
} from "react-icons/bi";
import { MdToday } from "react-icons/md";
import { IconMaximize, IconMinimize, IconPin, IconPinnedFilled } from "@tabler/icons-react";

const STORAGE_KEY = "agenda_default_view";

const BRAND = {
  deep: "#1E3A8A",
  surface: "#FFFFFF",
  body: "#404760",
  line: "#E7E2D6",
};

interface CustomCalendarProps {
  employees: Employee[];
  services?: Service[];
  /** Cambiar este número fuerza un recálculo de disponibilidad (p.ej. tras crear un bloqueo) */
  availabilityRefreshKey?: number;
  appointments: Appointment[];
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  onEditAppointment: (appointment: Appointment) => void;
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
  onExceptionDeleted?: (employeeId: string, updatedExceptions: EmployeeScheduleException[]) => void;
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
}) => {
  const savedDefault = (localStorage.getItem(STORAGE_KEY) ?? "month") as "month" | "week";
  const [viewMode, setViewMode] = useState<"month" | "week">(savedDefault);
  const [defaultView, setDefaultView] = useState<"month" | "week">(savedDefault);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [panelDay, setPanelDay] = useState<Date>(new Date());
  const [isMaximized, setIsMaximized] = useState(false);

  const handleSetDefault = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
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

  const handleMonthNavigation = useCallback(
    (direction: "prev" | "next") => {
      const adjustDate = direction === "prev" ? subMonths : addMonths;
      const newDate = adjustDate(currentDate, 1);
      setCurrentDate(newDate);
      fetchAppointmentsForMonth(newDate);
    },
    [currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  const handleWeekNavigation = useCallback(
    (direction: "prev" | "next") => {
      const adjustDate = direction === "prev" ? subWeeks : addWeeks;
      const newDate = adjustDate(currentDate, 1);
      setCurrentDate(newDate);
      if (!isSameMonth(newDate, currentDate)) {
        fetchAppointmentsForMonth(newDate);
      }
    },
    [currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setPanelDay(today);
    if (!isSameMonth(today, currentDate)) {
      fetchAppointmentsForMonth(today);
    }
  }, [currentDate, setCurrentDate, fetchAppointmentsForMonth]);

  const handleDayClick = useCallback((day: Date) => {
    setPanelDay(day);
    setSelectedDay(day);
    setModalOpened(true);
  }, []);

  const onPrevMonth = useCallback(
    () => handleMonthNavigation("prev"),
    [handleMonthNavigation]
  );
  const onNextMonth = useCallback(
    () => handleMonthNavigation("next"),
    [handleMonthNavigation]
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

  const weekRangeLabel = (() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, "d")} – ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`;
    }
    return `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  })();

  // Show panel on desktop only (≥ 1100px) in month view
  const showPanel = !isMobile && !isTablet && viewMode === "month" && !isMaximized;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top toolbar: view toggle + week/month nav */}
      <Group justify="space-between" align="center" mb="xs" gap="xs" style={{ flexShrink: 0 }}>
        <Group gap={6} align="center">
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as "month" | "week")}
            data={[
              {
                value: "month",
                label: (
                  <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <BiCalendar size={14} />
                    <span>Mes</span>
                  </Box>
                ),
              },
              {
                value: "week",
                label: (
                  <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <BiCalendarWeek size={14} />
                    <span>Semana</span>
                  </Box>
                ),
              },
            ]}
          />
          <Tooltip
            label={defaultView === viewMode ? "Vista predeterminada activa" : "Fijar como vista predeterminada"}
            withArrow
          >
            <ActionIcon
              size="sm"
              variant={defaultView === viewMode ? "filled" : "subtle"}
              color={defaultView === viewMode ? "blue" : "gray"}
              onClick={handleSetDefault}
              aria-label="Fijar vista predeterminada"
            >
              {defaultView === viewMode ? <IconPinnedFilled size={14} /> : <IconPin size={14} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Month toolbar: prev/Hoy/next + employee legend */}
        {viewMode === "month" && (
          <Group gap={0} align="center" style={{ flexWrap: "nowrap" }}>
            {/* Navigation */}
            <Group gap={isMobile ? 4 : 4} align="center" mr={isMobile ? 0 : 16}>
              <ActionIcon
                variant="default"
                radius="xl"
                size={isMobile ? 28 : 32}
                onClick={onPrevMonth}
                style={{ border: `1px solid ${BRAND.line}`, color: BRAND.body }}
              >
                <BiChevronLeft size={16} />
              </ActionIcon>
              <Box
                onClick={goToToday}
                style={{
                  padding: isMobile ? "4px 10px" : "5px 13px",
                  borderRadius: 999,
                  background: BRAND.surface,
                  border: `1px solid ${BRAND.line}`,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                  color: BRAND.body,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background 0.12s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F1EC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = BRAND.surface)}
              >
                Hoy
              </Box>
              <ActionIcon
                variant="default"
                radius="xl"
                size={isMobile ? 28 : 32}
                onClick={onNextMonth}
                style={{ border: `1px solid ${BRAND.line}`, color: BRAND.body }}
              >
                <BiChevronRight size={16} />
              </ActionIcon>
            </Group>

            {/* Employee legend — solo en desktop */}
            {!isMobile && !isTablet && employees.length > 0 && (
              <Group gap={10} align="center">
                {employees.slice(0, 5).map((emp) => (
                  <Group key={emp._id} gap={5} align="center" style={{ cursor: "default" }}>
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: emp.color || "#3B5BDB",
                        flexShrink: 0,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: BRAND.body,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {emp.names.trim().split(/\s+/)[0]}
                    </Text>
                  </Group>
                ))}
              </Group>
            )}
          </Group>
        )}

        {/* Week navigation */}
        {viewMode === "week" && (
          <Group gap={4} align="center">
            <ActionIcon variant="subtle" size="sm" onClick={() => handleWeekNavigation("prev")}>
              <BiChevronLeft size={18} />
            </ActionIcon>
            <Text size="sm" fw={500} style={{ minWidth: isMobile ? 120 : 200, textAlign: "center" }}>
              {weekRangeLabel}
            </Text>
            <ActionIcon variant="subtle" size="sm" onClick={() => handleWeekNavigation("next")}>
              <BiChevronRight size={18} />
            </ActionIcon>
            <Tooltip label="Ir a hoy" withArrow>
              <ActionIcon variant="light" size="sm" onClick={goToToday}>
                <MdToday size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={isMaximized ? "Restaurar vista" : "Pantalla completa"} withArrow>
              <ActionIcon variant="light" size="sm" onClick={() => setIsMaximized((v) => !v)}>
                {isMaximized ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Group>

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
            leftSection={<BiCalendar size={14} />}
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
                    <Box style={{ width: 9, height: 9, borderRadius: "50%", background: "#2F9E44" }} />
                    <Text size="xs" c="dimmed">{isMobile ? "Libre" : "Con espacio"}</Text>
                  </Group>
                  <Group gap={4} align="center" wrap="nowrap">
                    <Box style={{ width: 9, height: 9, borderRadius: "50%", background: "#CED4DA" }} />
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
                background: "#fff",
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

        {viewMode === "month" ? (
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
              employees={employees}
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
            employees={employees}
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
          />
        )}
      </div>

      {/* DayModal: only used from month view */}
      {viewMode === "month" && (
        <DayModal
          key={selectedDay?.toISOString()}
          opened={modalOpened}
          selectedDay={selectedDay}
          onClose={() => setModalOpened(false)}
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
      )}
    </div>
  );
};

export default React.memo(CustomCalendar);
