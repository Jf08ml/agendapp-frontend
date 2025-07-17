import React, { useState } from "react";
import { Container, Button, Group } from "@mantine/core";
import { BiArrowBack } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayModal from "./components/DayModal";
import { addMonths, subMonths, isSameDay } from "date-fns";
import { useMediaQuery } from "@mantine/hooks";
import { Employee } from "../../services/employeeService";

interface CustomCalendarProps {
  employees: Employee[];
  appointments: Appointment[];
  onOpenModal: (selectedDay: Date | null, interval: Date) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  employees,
  appointments,
  onOpenModal,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  setAppointments,
}) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;

  // Determina si las citas están cargadas
  const appointmentsLoaded = appointments ? true : false;

  const handleNavigation = (direction: "prev" | "next") => {
    const adjustDate = direction === "prev" ? subMonths : addMonths;
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
      <MonthView
        currentDate={currentDate}
        isMobile={isMobile}
        handleDayClick={handleDayClick}
        getAppointmentsForDay={getAppointmentsForDay}
        appointmentsLoaded={appointmentsLoaded} // Envía la nueva prop aquí
      />

      <Group justify="center" my="md">
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
        setAppointments={setAppointments}
      />
    </Container>
  );
};

export default CustomCalendar;
