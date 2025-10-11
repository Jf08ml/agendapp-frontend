import React, { useState } from "react";
import { Container } from "@mantine/core";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayModal from "./components/DayModal";
import { addMonths, subMonths, isSameDay } from "date-fns";
import { useMediaQuery } from "@mantine/hooks";
import { Employee } from "../../services/employeeService";

interface CustomCalendarProps {
  employees: Employee[];
  appointments: Appointment[];
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  fetchAppointmentsForMonth: (currentDate: Date) => void;
  loadingMonth: boolean;
  fetchAppointmentsForDay: (day: Date) => Promise<Appointment[]>;
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
  setAppointments,
  fetchAppointmentsForMonth,
  loadingMonth,
  fetchAppointmentsForDay,
}) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;

  // Decide si filtrar localmente o pedir por día
  const handleNavigation = (direction: "prev" | "next") => {
    const adjustDate = direction === "prev" ? subMonths : addMonths;
    const newDate = adjustDate(currentDate, 1);
    setCurrentDate(newDate);
    fetchAppointmentsForMonth(newDate);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setModalOpened(true);
    // Si no, solo filtras local
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments
      .filter((event) => isSameDay(new Date(event.startDate), day))
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  };

  return (
    <Container size="lg" mt="xl">
     <MonthView
        currentDate={currentDate}
        isMobile={isMobile}
        handleDayClick={handleDayClick}
        getAppointmentsForDay={getAppointmentsForDay}
        loadingMonth={loadingMonth}
        holidayConfig={{ country: "CO", language: "es" }}
        onPrevMonth={() => handleNavigation("prev")}
        onNextMonth={() => handleNavigation("next")}
        onToday={() => {
          const today = new Date();
          setCurrentDate(today);
          fetchAppointmentsForMonth(today);
        }}
      />

      {/* <Group justify="center" my="md">
        <Button
          variant="light"
          leftSection={<BiArrowBack />}
          onClick={() => handleNavigation("prev")}
        >
          Mes Anterior
        </Button>
        <Button
          variant="light"
          rightSection={<BsArrowRight />}
          onClick={() => handleNavigation("next")}
        >
          Mes Siguiente
        </Button>
      </Group> */}

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
        setAppointments={setAppointments}
        fetchAppointmentsForDay={fetchAppointmentsForDay}
      />
    </Container>
  );
};

export default CustomCalendar;
