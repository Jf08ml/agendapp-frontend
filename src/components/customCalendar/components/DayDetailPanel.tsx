import React, { useMemo } from "react";
import { Box, Text, ScrollArea } from "@mantine/core";
import { format, isSameDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Appointment } from "../../../services/appointmentService";
import { formatInTimezone } from "../../../utils/timezoneUtils";

const BRAND = {
  deep: "#1E3A8A",
  cream: "#FAF7F2",
  surface: "#FFFFFF",
  ink: "#101526",
  body: "#404760",
  muted: "#8B92A6",
  line: "#E7E2D6",
};

interface DayDetailPanelProps {
  selectedDay: Date;
  allMonthAppointments: Appointment[];
  onCreateAppointment: (day: Date) => void;
  onEditAppointment: (appointment: Appointment) => void;
  timezone?: string;
  currentDate: Date;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}

const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  selectedDay,
  allMonthAppointments,
  onCreateAppointment,
  onEditAppointment,
  timezone = "America/Bogota",
  currentDate,
}) => {
  const dayAppointments = useMemo(
    () =>
      allMonthAppointments
        .filter(
          (a) =>
            isSameDay(new Date(a.startDate), selectedDay) &&
            !a.status.includes("cancelled")
        )
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        ),
    [allMonthAppointments, selectedDay]
  );

  const monthTotal = useMemo(
    () =>
      allMonthAppointments.filter(
        (a) =>
          isSameMonth(new Date(a.startDate), currentDate) &&
          !a.status.includes("cancelled")
      ).length,
    [allMonthAppointments, currentDate]
  );

  // 12 mini bars: day-by-day counts for the current month
  const miniBars = useMemo(() => {
    const counts: Record<string, number> = {};
    allMonthAppointments
      .filter(
        (a) =>
          isSameMonth(new Date(a.startDate), currentDate) &&
          !a.status.includes("cancelled")
      )
      .forEach((a) => {
        const key = format(new Date(a.startDate), "yyyy-MM-dd");
        counts[key] = (counts[key] || 0) + 1;
      });
    const values = Object.values(counts);
    if (values.length === 0) return Array(12).fill(10);
    const max = Math.max(...values, 1);
    const filled = values.slice(-12);
    while (filled.length < 12) filled.unshift(0);
    return filled.map((v) => Math.max(8, Math.round((v / max) * 100)));
  }, [allMonthAppointments, currentDate]);

  const dayOfWeek = format(selectedDay, "EEEE", { locale: es }).toUpperCase();
  const dateLabel = format(selectedDay, "d 'de' MMMM", { locale: es });

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Stats card */}
      <Box
        style={{
          background: BRAND.deep,
          backgroundImage:
            "radial-gradient(circle at 90% 0%, rgba(255,255,255,0.08), transparent 60%)",
          borderRadius: 16,
          padding: 18,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            fontSize: 10.5,
            letterSpacing: 2,
            opacity: 0.7,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Citas este mes
        </Text>
        <Box
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 48,
              fontWeight: 500,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {monthTotal}
          </Text>
          <Box
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 28,
              paddingBottom: 2,
            }}
          >
            {miniBars.map((h, i) => (
              <Box
                key={i}
                style={{
                  width: 5,
                  height: `${h}%`,
                  background: "rgba(255,255,255,0.6)",
                  borderRadius: 2,
                  minHeight: 3,
                }}
              />
            ))}
          </Box>
        </Box>
        <Text style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </Text>
      </Box>

      {/* Day detail card */}
      <Box
        style={{
          flex: 1,
          background: BRAND.surface,
          border: `1px solid ${BRAND.line}`,
          borderRadius: 16,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box>
            <Text
              style={{
                fontSize: 11,
                color: BRAND.muted,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {dayOfWeek}
            </Text>
            <Text
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: BRAND.ink,
                lineHeight: 1.15,
              }}
            >
              {dateLabel}
            </Text>
          </Box>
          <Text
            style={{
              fontSize: 11.5,
              color: BRAND.body,
              fontWeight: 600,
              marginTop: 2,
              whiteSpace: "nowrap",
            }}
          >
            {dayAppointments.length === 0
              ? "Sin citas"
              : `${dayAppointments.length} ${
                  dayAppointments.length === 1 ? "cita" : "citas"
                }`}
          </Text>
        </Box>

        {/* Appointment list or empty state */}
        {dayAppointments.length === 0 ? (
          <Box
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              textAlign: "center",
            }}
          >
            <Text style={{ fontSize: 24, color: BRAND.muted }}>○</Text>
            <Text style={{ fontSize: 13, color: BRAND.muted, fontWeight: 500 }}>
              Día libre
            </Text>
            <Text style={{ fontSize: 11, color: BRAND.muted, opacity: 0.7 }}>
              Sin citas agendadas
            </Text>
          </Box>
        ) : (
          <ScrollArea style={{ flex: 1 }} scrollbarSize={4} offsetScrollbars>
            <Box
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingRight: 2,
              }}
            >
              {dayAppointments.map((appt) => {
                const empColor = appt.employee?.color || "#3B5BDB";
                const empName = appt.employee?.names || "";
                const empInitials = getInitials(empName);
                const clientName = appt.client?.name || "Sin cliente";
                const serviceName = appt.service?.name || "";
                const firstName = empName.trim().split(/\s+/)[0] || "";
                const time = formatInTimezone(
                  new Date(appt.startDate),
                  timezone,
                  "HH:mm"
                );

                return (
                  <Box
                    key={appt._id}
                    onClick={() => onEditAppointment(appt)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 28px",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 12px",
                      background: BRAND.cream,
                      borderRadius: 10,
                      borderLeft: `3px solid ${empColor}`,
                      cursor: "pointer",
                      transition: "opacity 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.82")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Text
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: BRAND.ink,
                        lineHeight: 1,
                      }}
                    >
                      {time}
                    </Text>
                    <Box>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: BRAND.ink,
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {clientName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: BRAND.muted,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {serviceName}
                        {firstName ? ` · ${firstName}` : ""}
                      </Text>
                    </Box>
                    <Box
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: empColor,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {empInitials}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </ScrollArea>
        )}

        {/* CTA */}
        <Box
          onClick={() => onCreateAppointment(selectedDay)}
          style={{
            background: BRAND.deep,
            color: "#fff",
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(30,58,138,0.2)",
            flexShrink: 0,
            transition: "opacity 0.12s",
            userSelect: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Crear cita para este día
        </Box>
      </Box>
    </Box>
  );
};

export default DayDetailPanel;
