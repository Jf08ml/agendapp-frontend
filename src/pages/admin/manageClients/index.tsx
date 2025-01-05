/* eslint-disable react-hooks/exhaustive-deps */
import {
  Box,
  Flex,
  Divider,
  TextInput,
  Group,
  Title,
  Button,
} from "@mantine/core";
import { useState, useEffect } from "react";
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
import CustomLoader from "../../../components/customLoader/CustomLoader";

const Dashboard = () => {
  const [openModal, setOpenModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editCLient, setEditClient] = useState<Client | null>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  const handleOpenModal = (client: Client | null) => {
    if (client) {
      setEditClient(client);
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  // Función para obtener clientes
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }
      const response = await getClientsByOrganizationId(organizationId);
      setClients(response);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error al obtener la lista de clientes");
      showNotification({
        title: "Error al obtener clientes",
        message:
          "No fue posible cargar la lista de clientes. Por favor, intenta de nuevo.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchClients();
    }
  }, [organizationId]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

  const filterClients = () => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  };

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

  if (!organizationId || isLoading) {
    return <CustomLoader />;
  }

  return (
    <Box>
      <Flex
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
        mb="md"
      >
        <Title order={1}>Gestionar clientes</Title>
        <Button
          leftSection={<IoAddCircleOutline />}
          onClick={() => handleOpenModal(null)}
        >
          Crear cliente
        </Button>
      </Flex>

      <Divider mb="md" />

      <Group mb="md" justify="space-between">
        <TextInput
          leftSection={<BsSearch />}
          placeholder="Buscar por nombre o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          style={{ flexGrow: 1 }}
        />
      </Group>

      <ClientFormModal
        opened={openModal}
        onClose={handleCloseModal}
        fetchClients={fetchClients}
        client={editCLient}
        setClient={setEditClient}
      />
      <div>
        <ClientTable
          clients={filteredClients}
          handleDeleteClient={handleDeleteClient}
          handleRegisterService={handleRegisterService}
          handleReferral={handleReferral}
          handleEditClient={handleOpenModal}
          error={error}
        />
      </div>
    </Box>
  );
};

export default Dashboard;
