import { Card, Text, Divider, Stack, Group, Box } from "@mantine/core";
import {
  BsCheckCircle,
  BsExclamationCircle,
  BsCalendar,
  BsPerson,
  BsEnvelope,
  BsTelephone,
} from "react-icons/bs";
import { Reservation } from "../../services/reservationService";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { ReservationDepositAlert } from "../../components/ReservationDepositAlert";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import dayjs from "dayjs";

interface BookingCompletedProps {
  isBookingConfirmed: boolean;
  bookingData: Partial<Reservation>;
  services: Service[];
  employees: Employee[];
}

const BookingCompleted: React.FC<BookingCompletedProps> = ({
  isBookingConfirmed,
  bookingData,
  services,
  employees,
}) => {
  const organization = useSelector((state: RootState) => state.organization.organization);
  
  const customerDetails = bookingData.customerDetails || {
    name: "",
    email: "",
    phone: "",
  };

  // Resolver el nombre del servicio
  const serviceName =
    typeof bookingData.serviceId === "string"
      ? services.find((service) => service._id === bookingData.serviceId)
          ?.name || "No especificado"
      : bookingData.serviceId?.name || "No especificado";

  // Resolver el precio del servicio
  const servicePrice =
    typeof bookingData.serviceId === "string"
      ? services.find((service) => service._id === bookingData.serviceId)
          ?.price || 0
      : bookingData.serviceId?.price || 0;

  // Resolver el nombre del empleado
  const employeeName =
    typeof bookingData.employeeId === "string"
      ? employees.find((employee) => employee._id === bookingData.employeeId)
          ?.names || "Sin preferencia"
      : bookingData.employeeId?.names || "Sin preferencia";

  return (
    <Card shadow="sm" radius="md" withBorder>
      {isBookingConfirmed ? (
        <Stack m="xs">
          {/* Mensaje de Confirmación */}
          <Group align="center">
            <BsCheckCircle size={32} color="green" />
            <Text size="xl" fw={700} c="green">
              ¡Reserva Enviada!
            </Text>
          </Group>
          <Text size="md" c="blue">
            Tu reserva ha sido enviada con éxito. Te confirmaremos vía WhatsApp
            o correo electrónico.
          </Text>
          <Divider />

          {/* Información de la Reserva */}
          <Text fw={600} size="lg">
            Detalles de la Reserva
          </Text>
          <Box>
            <Group wrap="nowrap" m="xs" align="center">
              <BsCalendar />
              <Text style={{ flexGrow: 1 }}>
                <strong>Servicio:</strong> {serviceName}
              </Text>
            </Group>
            <Group wrap="nowrap" m="xs" align="center">
              <BsPerson />
              <Text style={{ flexGrow: 1 }}>
                <strong>Empleado:</strong> {employeeName}
              </Text>
            </Group>
            <Group wrap="nowrap" m="xs" align="center">
              <BsCalendar />
              <Text style={{ flexGrow: 1 }}>
                <strong>Fecha y Hora:</strong>{" "}
                {bookingData.startDate
                  ? new Date(bookingData.startDate).toLocaleString()
                  : "No especificado"}
              </Text>
            </Group>
          </Box>

          <Divider />

          {/* Información del Cliente */}
          <Text fw={600} size="lg">
            Información del Cliente
          </Text>
          <Box>
            <Group wrap="nowrap" m="xs" align="center">
              <BsPerson />
              <Text style={{ flexGrow: 1 }}>
                <strong>Nombre:</strong> {customerDetails.name}
              </Text>
            </Group>
            <Group wrap="nowrap" m="xs" align="center">
              <BsTelephone />
              <Text style={{ flexGrow: 1 }}>
                <strong>Teléfono:</strong> {customerDetails.phone}
              </Text>
            </Group>
            <Group wrap="nowrap" m="xs" align="center">
              <BsEnvelope />
              <Text style={{ flexGrow: 1 }}>
                <strong>Email:</strong> {customerDetails.email}
              </Text>
            </Group>
          </Box>

          <Divider />

          {/* Alerta de depósito si está habilitado */}
          {organization?.requireReservationDeposit && (
            <ReservationDepositAlert
              clientName={customerDetails.name}
              serviceName={serviceName}
              servicePrice={servicePrice}
              appointmentDate={bookingData.startDate ? dayjs(bookingData.startDate).format("DD/MM/YYYY") : undefined}
              appointmentTime={bookingData.startDate ? dayjs(bookingData.startDate).format("HH:mm") : undefined}
            />
          )}
        </Stack>
      ) : (
        <Stack align="center" m="md">
          <Group align="center">
            <BsExclamationCircle size={32} color="red" />
            <Text size="xl" fw={700}>
              ¡Falta completar pasos!
            </Text>
          </Group>
          <Text ta="center">
            Asegúrate de completar todos los pasos antes de enviar la solicitud
            de reserva.
          </Text>
        </Stack>
      )}
    </Card>
  );
};

export default BookingCompleted;
