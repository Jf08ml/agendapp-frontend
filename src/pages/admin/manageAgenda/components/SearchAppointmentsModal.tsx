import { useState, FC, useMemo } from "react";
import {
  Modal,
  TextInput,
  Stack,
  ScrollArea,
  Card,
  Text,
  Button,
} from "@mantine/core";
import { Appointment } from "../../../../services/appointmentService";

interface SearchAppointmentsModalProps {
  opened: boolean;
  onClose: () => void;
  appointments: Appointment[]; // Recibe la lista completa de citas para filtrar y ordenar
}

const SearchAppointmentsModal: FC<SearchAppointmentsModalProps> = ({
  opened,
  onClose,
  appointments,
}) => {
  const [searchText, setSearchText] = useState("");

  // 1. Ordenamos las citas de más recientes a más antiguas:
  const sortedAppointments = useMemo(() => {
    // Clonamos el array para no mutar el original
    const sorted = [...appointments];
    // Orden descendente por startDate
    sorted.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
    return sorted;
  }, [appointments]);

  // 2. Luego filtramos las citas según el texto ingresado
  const filteredAppointments = useMemo(() => {
    if (!searchText) return sortedAppointments;
    return sortedAppointments.filter((appt) => {
      const clientName = appt.client?.name?.toLowerCase() || "";
      return clientName.includes(searchText.toLowerCase());
    });
  }, [searchText, sortedAppointments]);

  return (
    <Modal opened={opened} onClose={onClose} title="Buscar Citas" centered size="lg">
      <Stack p="md">
        <TextInput
          placeholder="Ingresa el nombre del cliente"
          label="Buscar citas por cliente"
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
        />

        <ScrollArea style={{ height: 300 }}>
          {filteredAppointments.map((appt) => (
            <Card key={appt._id} shadow="sm" p="md" mb="sm" withBorder>
              <Text fw={500}>
                {appt.client?.name} - {appt.service?.name}
              </Text>
              <Text size="sm" c="dimmed">
                Empleado: {appt.employee?.names} <br />
                {new Date(appt.startDate).toLocaleString()} -{" "}
                {new Date(appt.endDate).toLocaleString()}
              </Text>
            </Card>
          ))}

          {filteredAppointments.length === 0 && (
            <Text size="sm" c="dimmed" ta="center">
              No se encontraron citas para "{searchText}"
            </Text>
          )}
        </ScrollArea>

        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </Stack>
    </Modal>
  );
};

export default SearchAppointmentsModal;
