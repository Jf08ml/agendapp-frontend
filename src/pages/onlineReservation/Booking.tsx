/* eslint-disable no-case-declarations */
import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Divider,
  Button,
  Group,
  Loader,
  Stepper,
} from "@mantine/core";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { Appointment } from "../../services/appointmentService";
import { Employee } from "../../services/employeeService";
import { Service } from "../../services/serviceService";
import { fetchServicesAndEmployees } from "./bookingUtils";
import StepServiceEmployee from "./StepServiceEmployee";
import StepDateTime from "./StepDateTime";
import StepCustomerData from "./StepCustomerData";
import {
  Reservation,
  createReservation,
} from "../../services/reservationService";
import BookingCompleted from "./BookingCompleted";
import { showNotification } from "@mantine/notifications";

const Booking = () => {
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [, setAppointments] = useState<Appointment[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    serviceId: "",
    employeeId: null,
    startDate: "",
    customerDetails: {
      name: "",
      email: "",
      phone: "",
      birthDate: new Date()
    },
    organizationId: organization?._id,
    status: "pending",
  });
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization?._id) {
      fetchServicesAndEmployees(organization?._id, setServices, setEmployees);
    }
  }, [organization]);

  // Validar si se puede avanzar al siguiente paso
  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!bookingData.serviceId;
      case 2:
        return !!bookingData.startDate;
      case 3:
        // Aseguramos que `customerDetails` tenga valores iniciales
        const customerDetails = bookingData.customerDetails || {
          name: "",
          email: "",
          phone: "",
        };
        return (
          customerDetails.name.trim() !== "" &&
          customerDetails.phone.trim() !== "" &&
          customerDetails.email.trim() !== ""
        );
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!canAdvance()) {
      let errorMessage = "";
      switch (currentStep) {
        case 1:
          errorMessage = "Por favor, selecciona un servicio y un empleado.";
          break;
        case 2:
          errorMessage = "Por favor, selecciona una fecha y una hora.";
          break;
        case 3:
          errorMessage =
            "Por favor, completa los campos de nombre, teléfono y correo electrónico.";
          break;
        default:
          errorMessage = "Algo salió mal. Intenta nuevamente.";
      }
      showNotification({
        title: "Error",
        message: errorMessage,
        color: "red",
        autoClose: 3000,
        position: "top-right",
      });
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const isSubmitDisabled = () => {
    const { serviceId, startDate, customerDetails } = bookingData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const isCustomerDetailsValid =
      customerDetails &&
      customerDetails.name.trim() !== "" &&
      customerDetails.phone.trim() !== "" &&
      emailRegex.test(customerDetails.email.trim());

    return loading || !serviceId || !startDate || !isCustomerDetailsValid;
  };

  const handleBooking = async () => {
    if (!bookingData.serviceId || !bookingData.startDate) {
      showNotification({
        title: "Error",
        message: "Por favor completa todos los campos obligatorios.",
        color: "red",
        autoClose: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      const reservationPayload = {
        ...bookingData,
        organizationId: organization?._id,
      } as Reservation;

      await createReservation(reservationPayload);

      setIsBookingConfirmed(true);
      setLoading(false);
      setCurrentStep(4);
    } catch (error) {
      console.error(error);
      setLoading(false);
      showNotification({
        title: "Error",
        message: "Error al enviar la reserva. Intenta nuevamente.",
        color: "red",
        autoClose: 3000,
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepServiceEmployee
            services={services}
            employees={employees}
            filteredEmployees={filteredEmployees}
            setFilteredEmployees={setFilteredEmployees}
            bookingData={bookingData}
            setBookingData={setBookingData}
          />
        );
      case 2:
        return (
          <StepDateTime
            bookingData={bookingData}
            setBookingData={setBookingData}
            availableTimes={availableTimes}
            setAvailableTimes={setAvailableTimes}
            setAppointments={setAppointments}
            services={services}
            employees={employees}
          />
        );
      case 3:
        return (
          <StepCustomerData
            bookingData={bookingData}
            setBookingData={setBookingData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container fluid>
      <Title ta="center">Reserva en Línea</Title>
      <Divider my="xs" />
      <Stepper active={currentStep - 1} size="sm">
        <Stepper.Step label="Servicio y Empleado" />
        <Stepper.Step label="Fecha y Hora" />
        <Stepper.Step label="Datos del Cliente" />
        <Stepper.Completed>
          <BookingCompleted
            isBookingConfirmed={isBookingConfirmed}
            bookingData={bookingData}
            employees={employees}
            services={services}
          />
        </Stepper.Completed>
      </Stepper>
      <Divider my="xs" />
      {renderStepContent()}
      <Group justify="space-between" my="xl">
        {currentStep > 1 && currentStep < 4 && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
          >
            Atrás
          </Button>
        )}
        {currentStep < 3 && (
          <Button onClick={handleNextStep} disabled={!canAdvance()}>
            Siguiente
          </Button>
        )}
        {currentStep === 3 && (
          <Button
            color="green"
            onClick={handleBooking}
            disabled={loading || isSubmitDisabled()}
            leftSection={loading && <Loader size="xs" />}
          >
            {loading ? "Procesando..." : "Enviar Reserva"}
          </Button>
        )}
      </Group>
    </Container>
  );
};

export default Booking;
