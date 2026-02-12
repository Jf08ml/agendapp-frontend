import React, { useState, useCallback } from "react";
import { Appointment } from "../../services/appointmentService";
import MonthView from "./components/MonthView";
import DayModal from "./components/DayModal";
import { addMonths, subMonths, isSameDay } from "date-fns";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
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
  onDeleteAppointment?: (appointmentId: string) => void;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  fetchAppointmentsForMonth: (currentDate: Date) => void;
  loadingMonth: boolean;
  fetchAppointmentsForDay: (day: Date) => Promise<Appointment[]>;
  timezone?: string; // 🌍 Timezone de la organización (ej: "America/Mexico_City")
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
  onDeleteAppointment,
  setAppointments,
  fetchAppointmentsForMonth,
  loadingMonth,
  fetchAppointmentsForDay,
  timezone = 'America/Bogota', // 🌍 Default a Colombia si no se proporciona
}) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const organization = useSelector((s: RootState) => s.organization.organization);
  const holidayCountry = organization?.default_country || "CO";

  // Decide si filtrar localmente o pedir por día
  const handleNavigation = useCallback((direction: "prev" | "next") => {
    const adjustDate = direction === "prev" ? subMonths : addMonths;
    const newDate = adjustDate(currentDate, 1);
    setCurrentDate(newDate);
    fetchAppointmentsForMonth(newDate);
  }, [currentDate, setCurrentDate, fetchAppointmentsForMonth]);

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay(day);
    setModalOpened(true);
    // Si no, solo filtras local
  }, []);

  // 📊 Para el contador del día (excluye canceladas)
  const getAppointmentsForDay = useCallback((day: Date) => {
    return appointments
      .filter((event) => 
        isSameDay(new Date(event.startDate), day) &&
        !event.status.includes('cancelled') // ❌ Excluir citas canceladas del contador
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }, [appointments]);

  // 📋 Para el DayModal (incluye TODAS las citas, incluso canceladas)
  const getAllAppointmentsForDay = useCallback((day: Date) => {
    return appointments
      .filter((event) => isSameDay(new Date(event.startDate), day))
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }, [appointments]);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", marginTop: "1rem" }}>
     <MonthView
        currentDate={currentDate}
        isMobile={isMobile}
        handleDayClick={handleDayClick}
        getAppointmentsForDay={getAppointmentsForDay}
        loadingMonth={loadingMonth}
        holidayConfig={{ country: holidayCountry, language: "es" }}
        onPrevMonth={useCallback(() => handleNavigation("prev"), [handleNavigation])}
        onNextMonth={useCallback(() => handleNavigation("next"), [handleNavigation])}
        // onToday={() => {
        //   const today = new Date();
        //   setCurrentDate(today);
        //   fetchAppointmentsForMonth(today);
        // }}
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
        getAppointmentsForDay={getAllAppointmentsForDay}
        onEditAppointment={onEditAppointment}
        onCancelAppointment={onCancelAppointment}
        onConfirmAppointment={onConfirmAppointment}
        onDeleteAppointment={onDeleteAppointment}
        setAppointments={setAppointments}
        fetchAppointmentsForDay={fetchAppointmentsForDay}
        timezone={timezone}
      />
    </div>
  );
};

export default React.memo(CustomCalendar);
