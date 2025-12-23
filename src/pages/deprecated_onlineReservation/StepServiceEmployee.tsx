import {
  Stack,
  Select,
  Group,
  Avatar,
  Text,
  Paper,
  Center,
  Modal,
  Image,
} from "@mantine/core";
import { useState } from "react";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { Reservation } from "../../services/reservationService";
import { filterEmployeesByService } from "./bookingUtils";

interface StepServiceEmployeeProps {
  services: Service[];
  employees: Employee[];
  filteredEmployees: Employee[];
  setFilteredEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
}

const StepServiceEmployee: React.FC<StepServiceEmployeeProps> = ({
  services,
  employees,
  filteredEmployees,
  setFilteredEmployees,
  bookingData,
  setBookingData,
}) => {
  const [modalOpened, setModalOpened] = useState(false); // Estado para controlar el modal
  const [modalImage, setModalImage] = useState<string | null>(null); // Imagen a mostrar en el modal

  const handleServiceSelection = (serviceId: string) => {
    setBookingData({
      ...bookingData,
      serviceId,
      employeeId: null,
    });
    setFilteredEmployees(filterEmployeesByService(employees, serviceId));
  };

  const handleEmployeeSelection = (employeeId: string | null) => {
    setBookingData({ ...bookingData, employeeId });
  };

  const selectedEmployee = filteredEmployees.find(
    (e) => e._id === bookingData.employeeId
  );

  const openImageModal = (imageSrc: string) => {
    setModalImage(imageSrc);
    setModalOpened(true);
  };

  return (
    <Stack>
      {/* Modal para ampliar la imagen */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        centered
        size="lg"
        title="Empleado"
      >
        {modalImage && (
          <Image src={modalImage} alt="Empleado" height={400} fit="contain" />
        )}
      </Modal>

      {/* Mostrar información del empleado seleccionado */}
      {selectedEmployee && (
        <Paper shadow="sm" radius="md" p="md" withBorder>
          <Center>
            <Group>
              <Avatar
                src={selectedEmployee.profileImage}
                size={120}
                radius="xl"
                style={{ cursor: "pointer" }}
                onClick={() => openImageModal(selectedEmployee.profileImage!)}
              />
              <Stack p={0}>
                <Text size="lg" fw={500}>
                  {selectedEmployee.names}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedEmployee.position || "Empleado"}
                </Text>
              </Stack>
            </Group>
          </Center>
        </Paper>
      )}

      {/* Select para servicios */}
      <Select
        label="Selecciona un servicio"
        placeholder="Elige un servicio"
        data={services.map((service) => ({
          value: service._id,
          label: service.name,
        }))}
        value={bookingData.serviceId as string}
        onChange={(value) => handleServiceSelection(value!)}
      />

      {/* Select para empleados */}
      <Select
        label="Selecciona un empleado"
        placeholder="Elige un empleado o selecciona 'Sin preferencia'"
        data={[
          { value: "none", label: "Sin preferencia" },
          ...filteredEmployees.map((employee) => ({
            value: employee._id,
            label: employee.names,
          })),
        ]}
        value={(bookingData.employeeId as string) || "none"}
        disabled={!bookingData.serviceId}
        onChange={(value) =>
          handleEmployeeSelection(value === "none" ? null : value!)
        }
        searchable
      />
    </Stack>
  );
};

export default StepServiceEmployee;
