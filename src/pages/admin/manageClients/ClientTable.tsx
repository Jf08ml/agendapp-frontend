import React, { useState } from "react";
import { Box, Text, Table, Modal, Loader, Select, Group, Pagination } from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { Client as ClientType } from "../../../services/clientService";
import {
  Appointment,
  getAppointmentsByClient,
} from "../../../services/appointmentService";
import ClientRow from "./ClientRow";

interface ClientTableProps {
  clients: ClientType[];
  handleDeleteClient: (id: string) => void;
  handleRegisterService: (clientId: string) => void;
  handleReferral: (clientId: string) => void;
  handleEditClient: (client: ClientType) => void;
  error: string | null;
}

const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  handleDeleteClient,
  handleRegisterService,
  handleReferral,
  handleEditClient,
  error,
}) => {
  const [opened, setOpened] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientId, setLoadingClientId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Tamaño de página

  const fetchAppointments = async (clientId: string) => {
    setLoading(true);
    setLoadingClientId(clientId);
    try {
      const response = await getAppointmentsByClient(clientId);
      const recentAppointments = response
        .sort(
          (a: Appointment, b: Appointment) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
        .slice(0, 7);
      setAppointments(recentAppointments);
    } catch (err) {
      console.error("Error obteniendo las citas:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
      setLoadingClientId(null);
      setOpened(true);
    }
  };

  const confirmAction = (
    action: () => void,
    title: string,
    message: string,
    actionType: "register" | "refer" | "delete"
  ) => {
    openConfirmModal({
      title,
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: "Confirmar", cancel: "Cancelar" },
      confirmProps: {
        color: actionType === "delete" ? "red" : "green",
      },
      onConfirm: action,
    });
  };

  // Dividir en páginas
  const totalPages = Math.ceil(clients.length / pageSize);
  const displayedClients = clients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Obtener el tipo de servicio más tomado
  const getMostTakenServiceType = () => {
    if (appointments.length === 0) return "No hay datos disponibles";

    const typeCount: Record<string, number> = {};

    appointments.forEach((appointment) => {
      const type = appointment.service.type; // Suponemos que cada servicio tiene un campo `type`
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const mostTakenType = Object.entries(typeCount).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );

    return mostTakenType[0]; // Retorna el tipo de servicio más frecuente
  };

  return (
    <Box m="auto" mb="lg">
      {error && (
        <Text mt="md" color="red">
          {error}
        </Text>
      )}

      {/* Tabla */}
      <Table
        mt="md"
        withTableBorder
        withColumnBorders
        striped
        style={{ overflowX: "auto" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: "center" }}>Nombre</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Teléfono</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Servicios Tomados</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Referidos Hechos</Table.Th>
            <Table.Th style={{ textAlign: "center" }}>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayedClients.map((client) => (
            <ClientRow
              key={client._id}
              client={client}
              loadingClientId={loadingClientId}
              setModalTitle={setModalTitle}
              fetchAppointments={fetchAppointments}
              confirmAction={confirmAction}
              handleRegisterService={handleRegisterService}
              handleReferral={handleReferral}
              handleEditClient={handleEditClient}
              handleDeleteClient={handleDeleteClient}
            />
          ))}
        </Table.Tbody>
      </Table>

      {/* Controles de paginación */}
      <Group justify="flex-end" mt="md" align="center">
        {/* Selector de tamaño de página */}
        <Select
          placeholder="Seleccione"
          data={[
            { value: "5", label: "5" },
            { value: "10", label: "10" },
            { value: "20", label: "20" },
            { value: "50", label: "50" },
          ]}
          value={pageSize.toString()}
          onChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(1);
          }}
          style={{ width: "150px" }}
        />

        {/* Navegación de páginas */}
        <Pagination
          total={totalPages}
          value={currentPage}
          onChange={setCurrentPage}
        />
      </Group>

      {/* Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={modalTitle}
        centered
        size="lg"
      >
        {loading ? (
          <Loader size="md" />
        ) : appointments.length > 0 ? (
          <>
            <Text mb="md">
              <strong>Tipo de servicio más tomado:</strong> {getMostTakenServiceType()}
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Empleado</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {appointments.map((appointment: Appointment) => (
                  <Table.Tr key={appointment._id}>
                    <Table.Td>{appointment.service.name}</Table.Td>
                    <Table.Td>{appointment.employee.names}</Table.Td>
                    <Table.Td>
                      {new Date(appointment.startDate).toLocaleString("es-ES")}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        ) : (
          <Text>No hay citas recientes</Text>
        )}
      </Modal>
    </Box>
  );
};

export default ClientTable;
