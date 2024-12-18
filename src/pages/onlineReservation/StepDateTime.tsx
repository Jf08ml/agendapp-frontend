import {
  Stack,
  Badge,
  Notification,
  Grid,
  Flex,
  Text,
  Card,
  Group,
  Divider,
  Button,
  Loader,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { BsExclamationCircle, BsClock } from "react-icons/bs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { fetchAppointmentsAndAvailableTimes } from "./bookingUtils";
import { Appointment } from "../../services/appointmentService";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { Reservation } from "../../services/reservationService";
import { useState } from "react";

dayjs.extend(customParseFormat);

interface StepDateTimeProps {
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
  availableTimes: string[];
  setAvailableTimes: React.Dispatch<React.SetStateAction<string[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  services: Service[];
  employees: Employee[];
}

const StepDateTime: React.FC<StepDateTimeProps> = ({
  bookingData,
  setBookingData,
  availableTimes,
  setAvailableTimes,
  setAppointments,
  services,
  employees,
}) => {
  const [, setService] = useState<Service>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  const handleDateSelection = async (date: Date) => {
    setSelectedDate(date);
    setShowConfirmation(false);
    setIsLoadingTimes(true);

    const selectedService = services.find(
      (s) => s._id === bookingData.serviceId
    );

    if (selectedService) {
      setService(selectedService);
      await fetchAppointmentsAndAvailableTimes(
        bookingData.employeeId as string | null,
        date,
        selectedService.duration,
        setAppointments,
        setAvailableTimes,
        employees
      );
    }

    setIsLoadingTimes(false);
  };

  const handleTimeSelection = (time: string) => {
    if (!selectedDate) return;

    // Combinar la fecha seleccionada con la hora seleccionada
    const combinedDateTime = dayjs(
      `${dayjs(selectedDate).format("YYYY-MM-DD")} ${time}`,
      "YYYY-MM-DD h:mm A"
    );

    if (!combinedDateTime.isValid()) {
      console.error("Fecha inválida:", combinedDateTime);
      return;
    }

    setBookingData({ ...bookingData, startDate: combinedDateTime.toDate() });
    setShowConfirmation(true);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        {/* Selección de Fecha */}
        <Group align="center">
          <Text size="lg" fw={600}>
            Selecciona una Fecha
          </Text>
          <BsClock size={24} />
        </Group>
        <Divider />
        <Flex justify="center">
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && handleDateSelection(date)}
            minDate={new Date()}
            size="sm"
          />
        </Flex>

        <Divider />

        {/* Horarios Disponibles */}
        {isLoadingTimes ? (
          <Flex direction="column" align="center" justify="center" mt="md">
            <Loader size="lg" />
            <Text>Cargando horarios</Text>
          </Flex>
        ) : showConfirmation && bookingData.startDate ? (
          // Mensaje de Confirmación
          <Stack align="center" m="md">
            <Text size="lg" ta="center">
              Vas a agendar para el día{" "}
              <strong>
                {dayjs(bookingData.startDate).format(
                  "DD [de] MMMM [a las] h:mm A"
                )}
              </strong>
              .
            </Text>
            <Button
              variant="subtle"
              color="blue"
              onClick={() => setShowConfirmation(false)}
            >
              Cambiar la hora
            </Button>
          </Stack>
        ) : selectedDate && availableTimes.length > 0 ? (
          // Horarios Disponibles
          <Grid gutter="md">
            {availableTimes.map((time) => (
              <Grid.Col key={time} span={{ base: 6, sm: 4, md: 3 }}>
                <Badge
                  fullWidth
                  variant={
                    bookingData.startDate &&
                    dayjs(bookingData.startDate).format("h:mm A") === time
                      ? "filled"
                      : "outline"
                  }
                  onClick={() => handleTimeSelection(time)}
                  size="lg"
                  style={{
                    cursor: "pointer",
                    textAlign: "center",
                    padding: "10px",
                  }}
                >
                  {time}
                </Badge>
              </Grid.Col>
            ))}
          </Grid>
        ) : selectedDate && availableTimes.length === 0 ? (
          // Mensaje de No Disponibilidad
          <Notification
            icon={<BsExclamationCircle />}
            color="red"
            title="No hay horarios disponibles"
            radius="md"
          >
            Selecciona otro día o verifica la disponibilidad.
          </Notification>
        ) : (
          // Mensaje Inicial
          <Text ta="center" size="md" c="dimmed">
            Selecciona una fecha para ver los horarios disponibles.
          </Text>
        )}
      </Stack>
    </Card>
  );
};

export default StepDateTime;
