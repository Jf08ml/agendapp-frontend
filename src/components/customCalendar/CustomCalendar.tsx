import React, { useState } from "react";
import { Container, Button, Group, SegmentedControl } from "@mantine/core";
import { BiArrowBack } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import WeekView from "./components/WeekView";
import DayView from "./components/DayView";
import DayModal from "./components/DayModal";
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
} from "date-fns";
import { useMediaQuery } from "@mantine/hooks";
import { Employee } from "../../services/employeeService";

interface CustomCalendarProps {
  employees: Employee[];
  appointments: Appointment[];
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  employees,
  appointments,
  onOpenModal,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
}) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;

  const handleNavigation = (direction: "prev" | "next") => {
    const dateAdjustments = {
      month: { prev: subMonths, next: addMonths },
      week: { prev: subWeeks, next: addWeeks },
      day: { prev: subDays, next: addDays },
    };

    const adjustDate = dateAdjustments[view][direction];
    setCurrentDate(adjustDate(currentDate, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setModalOpened(true);
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments
      .filter((event) => isSameDay(event.startDate, day))
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  };

  return (
    <Container size="lg" mt="xl">
      <SegmentedControl
        value={view}
        onChange={(value) => setView(value as "month" | "week" | "day")}
        data={[
          { label: "Mes", value: "month" },
          { label: "Semana", value: "week" },
          { label: "Día", value: "day" },
        ]}
        fullWidth
        mb="md"
      />

      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          isMobile={isMobile}
          handleDayClick={handleDayClick}
          getAppointmentsForDay={getAppointmentsForDay}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          isMobile={isMobile}
          onOpenModal={onOpenModal}
          getAppointmentsForDay={getAppointmentsForDay}
          onEditAppointment={onEditAppointment}
          onCancelAppointment={onCancelAppointment}
          onConfirmAppointment={onConfirmAppointment}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          isMobile={isMobile}
          onOpenModal={onOpenModal}
          getAppointmentsForDay={getAppointmentsForDay}
          onEditAppointment={onEditAppointment}
          onCancelAppointment={onCancelAppointment}
          onConfirmAppointment={onConfirmAppointment}
        />
      )}

      <Group justify="center" my="md">
        <Button
          variant="light"
          leftSection={<BiArrowBack />}
          onClick={() => handleNavigation("prev")}
        >
          {view === "month"
            ? "Mes Anterior"
            : view === "week"
            ? "Semana Anterior"
            : "Día Anterior"}
        </Button>
        <Button
          variant="light"
          rightSection={<BsArrowRight />}
          onClick={() => handleNavigation("next")}
        >
          {view === "month"
            ? "Mes Siguiente"
            : view === "week"
            ? "Semana Siguiente"
            : "Día Siguiente"}
        </Button>
      </Group>

      <DayModal
        key={selectedDay?.toISOString()}
        opened={modalOpened}
        selectedDay={selectedDay}
        onClose={() => setModalOpened(false)}
        onOpenModal={onOpenModal}
        employees={employees}
        getAppointmentsForDay={getAppointmentsForDay}
        onEditAppointment={onEditAppointment}
        onCancelAppointment={onCancelAppointment}
        onConfirmAppointment={onConfirmAppointment}
      />
    </Container>
  );
};

export default CustomCalendar;
