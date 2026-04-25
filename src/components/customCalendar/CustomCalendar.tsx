import React, { useState, useCallback } from "react";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayModal from "./components/DayModal";
import WeekView from "./components/WeekView";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Employee } from "../../services/employeeService";
import {
  SegmentedControl,
  Group,
  ActionIcon,
  Text,
  Box,
  Tooltip,
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

interface CustomCalendarProps {
  employees: Employee[];
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
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  employees,
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
}) => {
  const savedDefault = (localStorage.getItem(STORAGE_KEY) ?? "month") as "month" | "week";
  const [viewMode, setViewMode] = useState<"month" | "week">(savedDefault);
  const [defaultView, setDefaultView] = useState<"month" | "week">(savedDefault);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleSetDefault = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
    setDefaultView(viewMode);
  }, [viewMode]);
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const organization = useSelector((s: RootState) => s.organization.organization);
  const holidayCountry = organization?.default_country || "CO";

  // Month navigation
  const handleMonthNavigation = useCallback(
    (direction: "prev" | "next") => {
      const adjustDate = direction === "prev" ? subMonths : addMonths;
      const newDate = adjustDate(currentDate, 1);
      setCurrentDate(newDate);
      fetchAppointmentsForMonth(newDate);
    },
    [currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  // Week navigation
  const handleWeekNavigation = useCallback(
    (direction: "prev" | "next") => {
      const adjustDate = direction === "prev" ? subWeeks : addWeeks;
      const newDate = adjustDate(currentDate, 1);
      setCurrentDate(newDate);
      // Fetch new month if we crossed a month boundary
      if (!isSameMonth(newDate, currentDate)) {
        fetchAppointmentsForMonth(newDate);
      }
    },
    [currentDate, setCurrentDate, fetchAppointmentsForMonth]
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    if (!isSameMonth(today, currentDate)) {
      fetchAppointmentsForMonth(today);
    }
  }, [currentDate, setCurrentDate, fetchAppointmentsForMonth]);

  const handleDayClick = useCallback((day: Date) => {
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

  // For month view dot count (excludes cancelled)
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

  // For DayModal (includes cancelled)
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

  // Week range label
  const weekRangeLabel = (() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, "d")} – ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`;
    }
    return `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  })();

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar: view toggle siempre visible + navegación semanal solo en modo semana */}
      <Group justify="space-between" align="center" mb="xs" gap="xs" style={{ flexShrink: 0 }}>
        {/* View toggle + fijar predeterminada */}
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

        {/* Week navigation (only in week mode) */}
        {viewMode === "week" && (
          <Group gap={4} align="center">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => handleWeekNavigation("prev")}
            >
              <BiChevronLeft size={18} />
            </ActionIcon>

            <Text
              size="sm"
              fw={500}
              style={{ minWidth: isMobile ? 120 : 200, textAlign: "center" }}
            >
              {weekRangeLabel}
            </Text>

            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => handleWeekNavigation("next")}
            >
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

      {/* Views — ocupa todo el espacio restante */}
      <div style={
        isMaximized
          ? { position: "fixed", inset: 0, zIndex: 300, background: "#fff", display: "flex", flexDirection: "column", padding: 12, gap: 8 }
          : { flex: 1, overflow: "hidden", minHeight: 0, padding: isMobile ? 0 : 20 }
      }>
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
        <MonthView
          currentDate={currentDate}
          isMobile={isMobile}
          handleDayClick={handleDayClick}
          getAppointmentsForDay={getAppointmentsForDay}
          loadingMonth={loadingMonth}
          holidayConfig={{ country: holidayCountry, language: "es" }}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
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
            timezone={timezone}
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
        />
      )}
    </div>
  );
};

export default React.memo(CustomCalendar);
