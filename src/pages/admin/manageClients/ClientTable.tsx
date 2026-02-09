import React, { useState, useMemo } from "react";
import {
  Box,
  Text,
  Table,
  Modal,
  Loader,
  Select,
  Group,
  Pagination,
  ScrollArea,
  Alert,
  Card,
  Badge,
  Avatar,
  Button,
  Stack,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { useMediaQuery } from "@mantine/hooks";
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

// Opciones de filtro de estado
const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled_by_admin,cancelled_by_customer,cancelled", label: "Canceladas" },
];

// Mapeo de estados a texto y colores
const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return { label: "Pendiente", color: "yellow" };
    case "confirmed":
      return { label: "Confirmada", color: "green" };
    case "cancelled":
    case "cancelled_by_customer":
      return { label: "Cancelada por cliente", color: "red" };
    case "cancelled_by_admin":
      return { label: "Cancelada por admin", color: "orange" };
    default:
      return { label: status, color: "gray" };
  }
};

const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  handleDeleteClient,
  handleRegisterService,
  handleReferral,
  handleEditClient,
  error,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const [opened, setOpened] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientId, setLoadingClientId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [currentClientName, setCurrentClientName] = useState<string>("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(clients.length / pageSize);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, clients.length);

  const displayedClients = useMemo(
    () => clients.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [clients, currentPage, pageSize]
  );

  const fetchAppointments = async (
    clientId: string,
    clientName?: string,
    status?: string
  ) => {
    setLoading(true);
    setLoadingClientId(clientId);
    setCurrentClientId(clientId);
    if (clientName) setCurrentClientName(clientName);
    try {
      const response = await getAppointmentsByClient(
        clientId,
        status || undefined
      );
      setModalTitle(`Citas de ${clientName ?? currentClientName}`.trim());
      setAppointments(response); // Ya viene ordenado del backend
    } catch (err) {
      console.error("Error obteniendo las citas:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
      setLoadingClientId(null);
      setOpened(true);
    }
  };

  // Refiltrar cuando cambia el filtro de estado
  const handleStatusFilterChange = (value: string | null) => {
    const newStatus = value ?? "";
    setStatusFilter(newStatus);
    if (currentClientId) {
      fetchAppointments(currentClientId, currentClientName, newStatus);
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
      confirmProps: { color: actionType === "delete" ? "red" : "green" },
      onConfirm: action,
      centered: true,
    });
  };

  // Servicio más tomado (del modal)
  const getMostTakenServiceType = () => {
    if (appointments.length === 0) return "—";
    const typeCount: Record<string, number> = {};
    appointments.forEach((appointment) => {
      const type = appointment.service.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const most = Object.entries(typeCount).reduce((a, b) =>
      b[1] > a[1] ? b : a
    );
    return most[0];
  };

  return (
    <Box>
      {error && (
        <Alert color="red" mb="sm" title="Error">
          {error}
        </Alert>
      )}

      {/* Top controls (pager) */}
      <Group justify="space-between" align="center" mb="xs" wrap="wrap">
        <Text size="sm" c="dimmed">
          Mostrando {clients.length === 0 ? 0 : from}–{to} de {clients.length}
        </Text>
        <Group gap="xs" align="center">
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
            w={120}
          />
          <Pagination
            total={Math.max(totalPages, 1)}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      </Group>

      {/* Desktop: Tabla / Mobile: Cards */}
      {!isMobile ? (
        <ScrollArea.Autosize mah={560}>
          <Table
            withTableBorder
            withColumnBorders
            stickyHeader
            highlightOnHover
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ textAlign: "center" }}>Nombre</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>Teléfono</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>País</Table.Th>
                <Table.Th style={{ textAlign: "center" }}>
                  Servicios Tomados
                </Table.Th>
                <Table.Th style={{ textAlign: "center" }}>
                  Referidos Hechos
                </Table.Th>
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
                  fetchAppointments={(id) => fetchAppointments(id, client.name)}
                  confirmAction={confirmAction}
                  handleRegisterService={handleRegisterService}
                  handleReferral={handleReferral}
                  handleEditClient={handleEditClient}
                  handleDeleteClient={handleDeleteClient}
                />
              ))}
              {displayedClients.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="md">
                      No hay clientes para mostrar.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      ) : (
        <Stack gap="sm">
          {displayedClients.length === 0 && (
            <Card withBorder radius="md" p="md">
              <Text c="dimmed" ta="center">
                No hay clientes para mostrar.
              </Text>
            </Card>
          )}
          {displayedClients.map((c) => (
            <Card key={c._id} withBorder radius="md" p="md">
              <Group justify="space-between" align="center">
                <Group>
                  <Avatar radius="xl">{c.name.charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Text fw={600}>{c.name}</Text>
                    <Text size="sm" c="dimmed">
                      {c.phoneNumber} {c.phone_country && `(${c.phone_country})`}
                    </Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Badge variant="light" color="dark">
                    Servicios: {c.servicesTaken}
                  </Badge>
                  <Badge variant="light" color="dark">
                    Referidos: {c.referralsMade}
                  </Badge>
                </Group>
              </Group>

              <Group mt="sm" gap="xs" wrap="wrap">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setModalTitle(`Citas de ${c.name}`);
                    fetchAppointments(c._id, c.name);
                  }}
                  loading={loadingClientId === c._id}
                >
                  Ver citas
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() =>
                    confirmAction(
                      () => handleRegisterService(c._id),
                      "Registrar Servicio",
                      "¿Deseas registrar un servicio para este cliente?",
                      "register"
                    )
                  }
                >
                  Registrar servicio
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() =>
                    confirmAction(
                      () => handleReferral(c._id),
                      "Registrar Referido",
                      "¿Deseas registrar un referido para este cliente?",
                      "refer"
                    )
                  }
                >
                  Registrar referido
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => handleEditClient(c)}
                >
                  Editar
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  color="red"
                  onClick={() =>
                    confirmAction(
                      () => handleDeleteClient(c._id),
                      "Eliminar Cliente",
                      "¿Estás seguro? Esta acción no se puede deshacer.",
                      "delete"
                    )
                  }
                >
                  Eliminar
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {/* Bottom controls (pager) */}
      <Group justify="space-between" align="center" mt="md" wrap="wrap">
        <Text size="sm" c="dimmed">
          Mostrando {clients.length === 0 ? 0 : from}–{to} de {clients.length}
        </Text>
      </Group>

      {/* Modal historial de citas */}
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setStatusFilter("");
        }}
        title={modalTitle}
        centered
        size="xl"
      >
        {/* Filtro de estado */}
        <Group mb="md" justify="space-between" align="center">
          <Select
            placeholder="Filtrar por estado"
            data={STATUS_OPTIONS}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            w={200}
            clearable={false}
          />
          {!loading && (
            <Text size="sm" c="dimmed">
              {appointments.length} cita{appointments.length !== 1 ? "s" : ""}
            </Text>
          )}
        </Group>

        {loading ? (
          <Loader size="md" />
        ) : appointments.length > 0 ? (
          <>
            <Text mb="sm">
              <strong>Tipo de servicio más tomado:</strong>{" "}
              {getMostTakenServiceType()}
            </Text>
            <ScrollArea.Autosize mah={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Servicio</Table.Th>
                    <Table.Th>Empleado</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Estado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {appointments.map((a) => {
                    const statusBadge = getStatusBadge(a.status);
                    return (
                      <Table.Tr key={a._id}>
                        <Table.Td>{a.service.name}</Table.Td>
                        <Table.Td>{a.employee.names}</Table.Td>
                        <Table.Td>
                          {new Date(a.startDate).toLocaleString("es-ES")}
                        </Table.Td>
                        <Table.Td>
                          <Badge color={statusBadge.color} variant="light">
                            {statusBadge.label}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </>
        ) : (
          <Text c="dimmed">
            {statusFilter
              ? "No hay citas con el estado seleccionado"
              : "No hay citas registradas"}
          </Text>
        )}
      </Modal>
    </Box>
  );
};

export default ClientTable;
