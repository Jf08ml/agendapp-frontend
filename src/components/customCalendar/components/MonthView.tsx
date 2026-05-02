import React, { useMemo } from "react";
import { Box, Text } from "@mantine/core";
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  startOfWeek as startOfCalendarWeek,
  endOfWeek as endOfCalendarWeek,
} from "date-fns";
import { Appointment } from "../../../services/appointmentService";
import CustomLoader from "../../customLoader/CustomLoader";
import { useHolidays, type HolidayConfig } from "../../../hooks/useHolidays";

const BRAND = {
  deep: "#1E3A8A",
  cream: "#FAF7F2",
  surface: "#FFFFFF",
  ink: "#101526",
  body: "#404760",
  muted: "#8B92A6",
  line: "#E7E2D6",
  lineSoft: "#F0EBE0",
  accent: "#D97A4A",
  accentSoft: "#FDF1E8",
};

// DOM · LUN · MAR · MIÉ · JUE · VIE · SÁB
const WEEK_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const WEEK_LABELS_SHORT = ["D", "L", "M", "X", "J", "V", "S"];

interface DayData {
  count: number;
  avatars: { color: string; initials: string }[];
}

interface MonthViewProps {
  currentDate: Date;
  isMobile: boolean;
  handleDayClick: (day: Date) => void;
  getAppointmentsForDay: (day: Date) => Appointment[];
  loadingMonth: boolean;
  holidayConfig?: HolidayConfig;
  selectedDay?: Date | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  isMobile,
  handleDayClick,
  getAppointmentsForDay,
  loadingMonth,
  holidayConfig = { country: "CO", language: "es" },
  selectedDay,
}) => {
  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);

  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfCalendarWeek(startMonth, { weekStartsOn: 0 }),
        end: endOfCalendarWeek(endMonth, { weekStartsOn: 0 }),
      }),
    [startMonth, endMonth]
  );

  const { isHoliday } = useHolidays(currentDate, holidayConfig);

  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const d of daysInMonth) {
      const key = d.toISOString().slice(0, 10);
      const apts = getAppointmentsForDay(d);
      const seen = new Set<string>();
      const avatars: { color: string; initials: string }[] = [];
      for (const apt of apts) {
        const empId = apt.employee?._id;
        if (empId && !seen.has(empId)) {
          seen.add(empId);
          avatars.push({
            color: apt.employee?.color || "#3B5BDB",
            initials: getInitials(apt.employee?.names || "?"),
          });
        }
      }
      map.set(key, { count: apts.length, avatars });
    }
    return map;
  }, [daysInMonth, getAppointmentsForDay]);

  const weekLabels = isMobile ? WEEK_LABELS_SHORT : WEEK_LABELS;

  return (
    <Box
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "auto" : "100%",
        overflow: "hidden",
        // Calendar shell card
        background: BRAND.surface,
        border: `1px solid ${BRAND.line}`,
        borderRadius: isMobile ? 12 : 18,
      }}
    >
      {/* Week day header row */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: `1px solid ${BRAND.line}`,
          background: BRAND.cream,
          flexShrink: 0,
        }}
      >
        {weekLabels.map((label, i) => (
          <Box key={label} style={{ textAlign: "center", padding: isMobile ? "8px 0" : "12px 0" }}>
            <Text
              style={{
                fontSize: isMobile ? 9 : 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: i === 0 || i === 6 ? BRAND.deep : BRAND.muted,
              }}
            >
              {label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        style={{
          flex: isMobile ? "initial" : 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: isMobile ? undefined : "repeat(5, 1fr)",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {daysInMonth.map((day, idx) => {
          const key = day.toISOString().slice(0, 10);
          const data = dayDataMap.get(key) ?? { count: 0, avatars: [] };
          const outside = !isSameMonth(day, currentDate);
          const holiday = !outside && isHoliday(day);
          const weekend = idx % 7 === 0 || idx % 7 === 6;
          const today = isToday(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;

          // Cell background
          let cellBg = BRAND.surface;
          if (outside) cellBg = BRAND.cream;
          else if (selected) cellBg = BRAND.deep;
          else if (holiday) cellBg = BRAND.accentSoft;

          // Day number color
          let numColor = BRAND.ink;
          if (outside) numColor = "#C9C2B5";
          else if (selected) numColor = "#fff";
          else if (holiday) numColor = BRAND.accent;
          else if (today) numColor = BRAND.deep;
          else if (weekend) numColor = BRAND.body;

          const numWeight = today && !selected ? 700 : 500;

          const row = Math.floor(idx / 7);
          const col = idx % 7;
          const isLastRow = row === Math.floor((daysInMonth.length - 1) / 7);
          const isLastCol = col === 6;

          return (
            <Box
              key={key}
              role="button"
              onClick={() => !outside && handleDayClick(day)}
              style={{
                padding: isMobile ? "6px 5px" : "10px 9px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minHeight: isMobile ? 52 : 0,
                cursor: outside ? "default" : "pointer",
                background: cellBg,
                opacity: outside ? 0.65 : loadingMonth ? 0.7 : 1,
                borderBottom: isLastRow ? "none" : `1px solid ${BRAND.lineSoft}`,
                borderRight: isLastCol ? "none" : `1px solid ${BRAND.lineSoft}`,
                transition: "background 0.12s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!outside && !selected)
                  e.currentTarget.style.background = selected
                    ? BRAND.deep
                    : holiday
                    ? "#FBEADC"
                    : "#F5F1EC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = cellBg;
              }}
            >
              {/* Day number row */}
              <Box
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Box style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <Text
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: isMobile ? 15 : 18,
                      fontWeight: numWeight,
                      color: numColor,
                      letterSpacing: -0.4,
                      lineHeight: 1,
                    }}
                  >
                    {day.getDate()}
                  </Text>
                  {today && !selected && (
                    <Text
                      style={{
                        fontSize: 7.5,
                        fontWeight: 800,
                        letterSpacing: 1,
                        color: BRAND.deep,
                        textTransform: "uppercase",
                      }}
                    >
                      Hoy
                    </Text>
                  )}
                </Box>
                {holiday && (
                  <Text
                    style={{
                      fontSize: 7.5,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      color: selected ? "#FFB48A" : BRAND.accent,
                      textTransform: "uppercase",
                    }}
                  >
                    {isMobile ? "F" : "Fest."}
                  </Text>
                )}
              </Box>

              {/* Employee avatars + count — desktop only */}
              {!isMobile && data.count > 0 && (
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "auto",
                  }}
                >
                  {data.avatars.slice(0, 3).map((av, i) => (
                    <Box
                      key={i}
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: "50%",
                        background: av.color,
                        color: "#fff",
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1.5px solid ${selected ? BRAND.deep : "#fff"}`,
                        marginLeft: i === 0 ? 0 : -4,
                        flexShrink: 0,
                        zIndex: 3 - i,
                        position: "relative",
                      }}
                    >
                      {av.initials[0]}
                    </Box>
                  ))}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: selected ? "rgba(255,255,255,0.85)" : BRAND.muted,
                      marginLeft: 5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {data.count} {data.count === 1 ? "cita" : "citas"}
                  </Text>
                </Box>
              )}

              {/* Mobile: count + label */}
              {isMobile && data.count > 0 && (
                <Box style={{ display: "flex", justifyContent: "center" }}>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: selected ? "rgba(255,255,255,0.85)" : BRAND.muted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {data.count} {data.count === 1 ? "cita" : "citas"}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Loading overlay */}
      {loadingMonth && (
        <Box
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
          }}
        >
          <CustomLoader loadingText="Obteniendo citas..." overlay />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(MonthView);
