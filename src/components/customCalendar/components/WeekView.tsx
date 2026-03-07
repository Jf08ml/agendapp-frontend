/* eslint-disable react-hooks/exhaustive-deps */
import React, { FC, useMemo, useEffect, useState } from "react";
import { Box, Text } from "@mantine/core";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { Appointment } from "../../../services/appointmentService";
import { Employee } from "../../../services/employeeService";
import {
  generateTimeIntervals,
  organizeAppointmentsByEmployee,
  organizeAppointmentsInLayers,
} from "../utils/scheduleUtils";
import { useExpandAppointment } from "../hooks/useExpandAppointment";
import { usePermissions } from "../../../hooks/usePermissions";
import { HOUR_HEIGHT, CARD_WIDTH } from "./DayModal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import DayModalTimeColumn from "./subcomponents/DayModalTimeColumn";
import DayModalEmployeeColumn from "./subcomponents/DayModalEmployeeColumn";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// Text contrast helper (same as DayModalHeader)
const getTextColor = (hex: string): string => {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#000000";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#000000" : "#FFFFFF";
};

interface WeekViewProps {
  appointments: Appointment[];
  employees: Employee[];
  currentDate: Date;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  onDeleteAppointment?: (appointmentId: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  timezone?: string;
}

const WeekView: FC<WeekViewProps> = ({
  appointments,
  employees,
  currentDate,
  onOpenModal,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  setAppointments,
  timezone: tz = "America/Bogota",
}) => {
  const { handleToggleExpand, isExpanded } = useExpandAppointment();
  const { hasPermission } = usePermissions();
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const organization = useSelector((s: RootState) => s.organization.organization);
  const timeFormat = organization?.timeFormat || "12h";

  // 7 days of the week starting on Monday
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate]);

  // Appointments for the entire week
  const weekAppointments = useMemo(
    () =>
      appointments.filter((apt) =>
        weekDays.some((day) => isSameDay(new Date(apt.startDate), day))
      ),
    [appointments, weekDays]
  );

  // Appointments per day
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      map.set(
        key,
        weekAppointments.filter((apt) =>
          isSameDay(new Date(apt.startDate), day)
        )
      );
    });
    return map;
  }, [weekDays, weekAppointments]);

  const getDayKey = (day: Date) => format(day, "yyyy-MM-dd");
  const getDayAppointments = (day: Date) =>
    appointmentsByDay.get(getDayKey(day)) ?? [];

  // Opening hours from org config
  const orgStartHour = organization?.openingHours?.start
    ? parseInt(organization.openingHours.start.split(":")[0], 10)
    : 8;
  const orgEndHour = organization?.openingHours?.end
    ? parseInt(organization.openingHours.end.split(":")[0], 10)
    : 22;

  // Expand time range to fit all week appointments
  const { startHour, endHour } = useMemo(() => {
    const active = weekAppointments.filter((a) => !a.status.includes("cancelled"));
    const earliest = active.length
      ? Math.min(...active.map((a) => dayjs.tz(a.startDate, tz).hour()))
      : orgStartHour;
    const latest = active.length
      ? Math.max(...active.map((a) => dayjs.tz(a.endDate, tz).hour()))
      : orgEndHour;
    return {
      startHour: Math.min(earliest, orgStartHour),
      endHour: Math.max(latest, orgEndHour),
    };
  }, [weekAppointments, orgStartHour, orgEndHour, tz]);

  const timeIntervals = useMemo(
    () => generateTimeIntervals(startHour, endHour, weekDays[0]),
    [startHour, endHour, weekDays]
  );

  // Per-day appointmentsByEmployee map (for DayModalEmployeeColumn)
  const appointmentsByEmployeeByDay = useMemo(() => {
    const result = new Map<string, Record<string, Appointment[]>>();
    weekDays.forEach((day) => {
      result.set(getDayKey(day), organizeAppointmentsByEmployee(getDayAppointments(day)));
    });
    return result;
  }, [weekDays, appointmentsByDay]);

  // Per-day, per-employee column width (based on layer count)
  const columnWidthMapByDay = useMemo(() => {
    const result = new Map<string, Map<string, number>>();
    weekDays.forEach((day) => {
      const key = getDayKey(day);
      const apptByEmp = appointmentsByEmployeeByDay.get(key) ?? {};
      const map = new Map<string, number>();
      const base = isMobile ? 64 : CARD_WIDTH;
      const extraPerLayer = 28;
      const maxW = isMobile ? 120 : 200;
      employees.forEach((emp) => {
        const appts = (apptByEmp[emp._id] || []).filter(
          (a) => !a.status.includes("cancelled")
        );
        const layers = organizeAppointmentsInLayers(appts);
        const w = Math.min(maxW, base + (Math.max(layers.length, 1) - 1) * extraPerLayer);
        map.set(emp._id, w);
      });
      result.set(key, map);
    });
    return result;
  }, [weekDays, appointmentsByEmployeeByDay, employees, isMobile]);

  // Width of each day group (sum of employee columns for that day)
  const dayGroupWidths = useMemo(() => {
    return weekDays.map((day) => {
      const map = columnWidthMapByDay.get(getDayKey(day));
      return employees.reduce(
        (sum, emp) => sum + (map?.get(emp._id) ?? (isMobile ? 64 : CARD_WIDTH)) + 2,
        0
      );
    });
  }, [weekDays, columnWidthMapByDay, employees, isMobile]);

  // Current time line
  const [currentLineTop, setCurrentLineTop] = useState<number | null>(null);
  const [, setTodayDayIndex] = useState<number>(-1);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const idx = weekDays.findIndex((d) => isToday(d));
      setTodayDayIndex(idx);
      if (idx >= 0) {
        const totalMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();
        if (totalMinutes >= 0 && now.getHours() <= endHour) {
          setCurrentLineTop((totalMinutes / 60) * HOUR_HEIGHT);
        } else {
          setCurrentLineTop(null);
        }
      } else {
        setCurrentLineTop(null);
      }
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [weekDays, startHour, endHour]);

  const TIME_COL_W = 80;
  // Heights for sticky rows
  const DAY_ROW_H = 62;  // day name + circle
  const EMP_ROW_H = 32;  // employee name chips

  return (
    <Box
      style={{
        borderRadius: 8,
        border: "1px solid #e9ecef",
        overflow: "hidden",
        backgroundColor: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/*
       * Single scroll container for both X and Y.
       * - Row 1 (day names):   position:sticky top:0
       * - Row 2 (emp names):   position:sticky top:DAY_ROW_H
       * - Body:                scrolls normally
       * - Time column:         position:sticky left:0  (inside body and both header rows)
       *
       * Scrolling horizontally moves everything (headers + body) together.
       * Scrolling vertically keeps headers pinned.
       */}
      <Box
        style={{
          overflowX: "auto",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── ROW 1: Day name headers ── sticky top:0 */}
        <Box
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            display: "flex",
            backgroundColor: "#f8f9fb",
            borderBottom: "1px solid #e9ecef",
            minWidth: "max-content",
          }}
        >
          {/* Spacer aligned with time column */}
          <Box
            style={{
              position: "sticky",
              left: 0,
              zIndex: 101,
              width: TIME_COL_W,
              minWidth: TIME_COL_W,
              height: DAY_ROW_H,
              backgroundColor: "#f8f9fb",
              borderRight: "1px solid #e9ecef",
            }}
          />

          {weekDays.map((day, i) => {
            const isCurrentDay = isToday(day);
            const dayApts = getDayAppointments(day).filter(
              (a) => !a.status.includes("cancelled")
            );
            return (
              <Box
                key={i}
                style={{
                  width: `${dayGroupWidths[i]}px`,
                  minWidth: `${dayGroupWidths[i]}px`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 4px 4px",
                  borderRight: "2px solid #dee2e6",
                  backgroundColor: isCurrentDay
                    ? "var(--mantine-color-blue-0)"
                    : "transparent",
                  borderBottom: isCurrentDay
                    ? "2px solid var(--mantine-color-blue-5)"
                    : "2px solid transparent",
                }}
              >
                <Text
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={600}
                  style={{ letterSpacing: "0.04em" }}
                >
                  {format(day, isMobile ? "EEE" : "EEEE", { locale: es })}
                </Text>
                <Box
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                    backgroundColor: isCurrentDay
                      ? "var(--mantine-color-blue-6)"
                      : "transparent",
                  }}
                >
                  <Text
                    size="sm"
                    fw={isCurrentDay ? 700 : 500}
                    c={isCurrentDay ? "white" : "dark"}
                    style={{ lineHeight: 1 }}
                  >
                    {format(day, "d")}
                  </Text>
                </Box>
                {dayApts.length > 0 ? (
                  <Text
                    size="9px"
                    c={isCurrentDay ? "blue.6" : "dimmed"}
                    fw={500}
                    style={{ lineHeight: 1, marginTop: 2 }}
                  >
                    {dayApts.length} {dayApts.length === 1 ? "cita" : "citas"}
                  </Text>
                ) : (
                  <Text size="9px" style={{ lineHeight: 1, marginTop: 2, opacity: 0 }}>
                    —
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── ROW 2: Employee name headers ── sticky top:DAY_ROW_H */}
        <Box
          style={{
            position: "sticky",
            top: DAY_ROW_H,
            zIndex: 99,
            display: "flex",
            backgroundColor: "#f8f9fb",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            minWidth: "max-content",
          }}
        >
          {/* Spacer aligned with time column */}
          <Box
            style={{
              position: "sticky",
              left: 0,
              zIndex: 100,
              width: TIME_COL_W,
              minWidth: TIME_COL_W,
              minHeight: EMP_ROW_H,
              backgroundColor: "#f8f9fb",
              borderRight: "1px solid #e9ecef",
            }}
          />

          {weekDays.map((day, dayIdx) => {
            const widthMap = columnWidthMapByDay.get(getDayKey(day));
            return (
              <Box
                key={dayIdx}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  width: `${dayGroupWidths[dayIdx]}px`,
                  minWidth: `${dayGroupWidths[dayIdx]}px`,
                  borderRight: "2px solid #dee2e6",
                  padding: "4px 0",
                }}
              >
                {employees.map((emp) => {
                  const color = emp.color || "#dee2e6";
                  const textColor = getTextColor(color);
                  const width = widthMap?.get(emp._id) ?? (isMobile ? 64 : CARD_WIDTH);
                  return (
                    <Box
                      key={emp._id}
                      style={{
                        width: `${width}px`,
                        minWidth: `${width}px`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 2,
                        backgroundColor: color,
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.08)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        padding: "6px 4px",
                        textAlign: "center",
                      }}
                    >
                      <Text
                        size="xs"
                        fw={600}
                        style={{
                          color: textColor,
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                        }}
                      >
                        {isMobile ? emp.names.split(" ")[0] : emp.names}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        {/* ── BODY: time column + employee columns per day ── */}
        <Box
          style={{
            display: "flex",
            position: "relative",
            minWidth: "max-content",
            marginTop: 4,
          }}
        >
          {/* Time column (sticky left) */}
          <Box
            style={{
              position: "sticky",
              left: 0,
              zIndex: 50,
              backgroundColor: "#fff",
              flexShrink: 0,
            }}
          >
            <DayModalTimeColumn
              timeIntervals={timeIntervals}
              timeFormat={timeFormat}
            />
          </Box>

          {/* Day groups */}
          {weekDays.map((day, dayIdx) => {
            const dayKey = getDayKey(day);
            const apptByEmp = appointmentsByEmployeeByDay.get(dayKey) ?? {};
            const widthMap = columnWidthMapByDay.get(dayKey);
            const isCurrentDay = isToday(day);

            return (
              <Box
                key={dayKey}
                style={{
                  position: "relative",
                  display: "flex",
                  width: `${dayGroupWidths[dayIdx]}px`,
                  minWidth: `${dayGroupWidths[dayIdx]}px`,
                  borderRight: "2px solid #dee2e6",
                  backgroundColor: isCurrentDay
                    ? "rgba(224, 231, 255, 0.08)"
                    : "transparent",
                }}
              >
                {/* Current time indicator inside today's column group */}
                {isCurrentDay && currentLineTop !== null && (
                  <Box
                    style={{
                      position: "absolute",
                      top: `${currentLineTop}px`,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: "red",
                      zIndex: 20,
                      pointerEvents: "none",
                    }}
                  >
                    <Box
                      style={{
                        position: "absolute",
                        left: -1,
                        top: -4,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: "red",
                      }}
                    />
                  </Box>
                )}

                {/* One DayModalEmployeeColumn per employee */}
                {employees.map((emp) => (
                  <DayModalEmployeeColumn
                    key={emp._id}
                    employee={emp}
                    appoinments={weekAppointments}
                    setAppointments={setAppointments}
                    appointmentsByEmployee={apptByEmp}
                    columnWidth={widthMap?.get(emp._id)}
                    startHour={startHour}
                    endHour={endHour}
                    selectedDay={day}
                    isExpanded={isExpanded}
                    handleToggleExpand={handleToggleExpand}
                    onEditAppointment={onEditAppointment}
                    onCancelAppointment={onCancelAppointment}
                    onConfirmAppointment={onConfirmAppointment}
                    onMarkAttendance={onMarkAttendance}
                    hasPermission={hasPermission}
                    onOpenModal={onOpenModal}
                    timezone={tz}
                    timeFormat={timeFormat}
                  />
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(WeekView);
