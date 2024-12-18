import { Stack, Select, Group, Avatar, Text, Paper, Center } from "@mantine/core";
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

  return (
    <Stack>
      {/* Mostrar información del empleado seleccionado */}
      {selectedEmployee && (
        <Paper shadow="sm" radius="md" p="md" withBorder>
          <Center>
            <Group>
              <Avatar src={selectedEmployee.profileImage} size={80} radius="xl" />
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
        value={bookingData.employeeId as string || "none"}
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
