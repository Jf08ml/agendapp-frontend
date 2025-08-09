/* eslint-disable react-hooks/exhaustive-deps */
import {
  Box,
  Card,
  Flex,
  TextInput,
  Group,
  Title,
  Button,
  Badge,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import { useState, useEffect, useMemo } from "react";
import ClientFormModal from "./ClientFormModal";
import ClientTable from "./ClientTable";
import { IoAddCircleOutline } from "react-icons/io5";
import { BsSearch } from "react-icons/bs";
import {
  deleteClient,
  registerReferral,
  registerService,
  Client,
  getClientsByOrganizationId,
} from "../../../services/clientService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";

const ClientsDashboard = () => {
  const [openModal, setOpenModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced] = useDebouncedValue(searchTerm, 250);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editCLient, setEditClient] = useState<Client | null>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const handleOpenModal = (client: Client | null) => {
    setEditClient(client);
    setOpenModal(true);
  };

  const handleCloseModal = () => setOpenModal(false);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      if (!organizationId) throw new Error("Organization ID is required");
      const response = await getClientsByOrganizationId(organizationId);
      setClients(response);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error al obtener la lista de clientes");
      showNotification({
        title: "Error al obtener clientes",
        message: "No fue posible cargar la lista de clientes. Intenta de nuevo.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) void fetchClients();
  }, [organizationId]);

  const filteredClients = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q)
    );
  }, [debounced, clients]);

  const handleRegisterService = async (clientId: string) => {
    try {
      await registerService(clientId);
      showNotification({
        title: "Servicio registrado",
        message: "El servicio ha sido registrado correctamente",
        color: "blue",
        autoClose: 1000,
        position: "top-right",
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error al registrar servicio",
        message: "No fue posible registrar el servicio. Intenta nuevamente.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  const handleReferral = async (clientId: string) => {
    try {
      await registerReferral(clientId);
      showNotification({
        title: "Referido registrado",
        message: "El referido ha sido registrado correctamente",
        color: "blue",
        autoClose: 1000,
        position: "top-right",
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error al registrar referido",
        message: "No fue posible registrar el referido. Intenta nuevamente.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteClient(id);
      showNotification({
        title: "Cliente eliminado",
        message: "El cliente ha sido eliminado correctamente",
        color: "blue",
        autoClose: 1000,
        position: "top-right",
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      const errorMessage =
        (error as Error).message || "No fue posible eliminar el cliente.";
      showNotification({
        title: "Error al eliminar cliente",
        message: `${errorMessage}`,
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  return (
    <Box>
      <Card
        withBorder
        radius="md"
        p="md"
        mb="md"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--mantine-color-body)",
        }}
      >
        <Flex
          gap="sm"
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          direction={isMobile ? "column" : "row"}
          wrap="wrap"
        >
          <Group gap="sm">
            <Title order={2}>Clientes</Title>
            <Badge variant="light" size="sm">
              {filteredClients.length} de {clients.length}
            </Badge>
          </Group>

          <Group gap="sm" w={isMobile ? "100%" : "auto"}>
            <TextInput
              leftSection={<BsSearch />}
              placeholder="Buscar por nombre o teléfono…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              w={isMobile ? "100%" : 320}
              radius="md"
            />
            <Tooltip label="Crear nuevo cliente">
              <Button
                leftSection={<IoAddCircleOutline />}
                onClick={() => handleOpenModal(null)}
              >
                Crear cliente
              </Button>
            </Tooltip>
          </Group>
        </Flex>
      </Card>

      {isLoading ? (
        <Card withBorder radius="md" p="md">
          <Skeleton height={36} mb="sm" />
          <Skeleton height={36} mb="sm" />
          <Skeleton height={36} />
        </Card>
      ) : (
        <Card withBorder radius="md" p="md">
          <ClientTable
            clients={filteredClients}
            handleDeleteClient={handleDeleteClient}
            handleRegisterService={handleRegisterService}
            handleReferral={handleReferral}
            handleEditClient={handleOpenModal}
            error={error}
          />
        </Card>
      )}

      <ClientFormModal
        opened={openModal}
        onClose={handleCloseModal}
        fetchClients={fetchClients}
        client={editCLient}
        setClient={setEditClient}
      />
    </Box>
  );
};

export default ClientsDashboard;
