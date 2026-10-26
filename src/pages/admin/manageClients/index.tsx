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
  Modal,
  Select,
  Text,
  Alert,
  Menu,
  ActionIcon,
  Tabs,
} from "@mantine/core";
import { useState, useEffect, useMemo } from "react";
import ClientFormModal from "./ClientFormModal";
import BulkUploadModal from "./BulkUploadModal";
import ClientList from "./ClientList";
import FollowUpsTab from "./FollowUpsTab";
import { IoAddCircleOutline } from "react-icons/io5";
import { BsSearch } from "react-icons/bs";
import { IconFileUpload, IconRefresh, IconAlertTriangle, IconDotsVertical } from "@tabler/icons-react";
import {
  deleteClient,
  forceDeleteClient,
  mergeClient,
  resetClientLoyalty,
  resetAllClientsLoyalty,
  registerReferral,
  registerService,
  Client,
  getClientsByOrganizationId,
} from "../../../services/clientService";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { useDebouncedValue, useDisclosure, useMediaQuery } from "@mantine/hooks";

// Minúsculas y sin tildes: "jose" encuentra "José"
const normalizeSearch = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const ClientsDashboard = () => {
  const [activeTab, setActiveTab] = useState<string>("clientes");
  const [openModal, setOpenModal] = useState(false);
  const [openBulkUploadModal, setOpenBulkUploadModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced] = useDebouncedValue(searchTerm, 250);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editCLient, setEditClient] = useState<Client | null>(null);

  // Merge state
  const [mergeOpened, { open: openMerge, close: closeMerge }] = useDisclosure(false);
  const [mergeSourceClient, setMergeSourceClient] = useState<Client | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

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

  // Busca en cualquier dato del cliente: antes solo nombre y teléfono, así que en
  // negocios que identifican a sus clientes por documento (u otro campo) no se
  // podía encontrar a nadie por ese dato.
  const filteredClients = useMemo(() => {
    const q = normalizeSearch(debounced);
    if (!q) return clients;
    const qDigits = q.replace(/\D/g, "");
    return clients.filter((c) => {
      const texts = [
        c.name,
        c.email,
        c.documentId,
        c.phone_e164,
        c.phoneNumber,
        ...Object.values(c.customFieldValues || {}).flatMap((v) =>
          Array.isArray(v) ? v : [v]
        ),
      ].filter((v): v is string | number => typeof v === "string" || typeof v === "number");
      if (texts.some((t) => normalizeSearch(String(t)).includes(q))) return true;
      // Teléfono y documento sin espacios, guiones ni puntos ("300 123" → "+573001234567")
      return (
        qDigits.length >= 3 &&
        [c.phone_e164, c.phoneNumber, c.documentId].some((t) =>
          (t || "").replace(/\D/g, "").includes(qDigits)
        )
      );
    });
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

  const handleForceDeleteClient = async (id: string) => {
    try {
      await forceDeleteClient(id);
      showNotification({
        title: "Cliente eliminado",
        message: "El cliente y sus registros han sido eliminados",
        color: "blue",
        autoClose: 1500,
        position: "top-right",
      });
      fetchClients();
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error al eliminar cliente",
        message: (error as Error).message || "No fue posible eliminar el cliente.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  // Permite que el Drawer parchee un cliente en el array compartido sin
  // esperar un refetch completo (ej. tras canjear un premio).
  const handleClientUpdated = (updated: Client) => {
    setClients((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  };

  const handleOpenMerge = (client: Client) => {
    setMergeSourceClient(client);
    setMergeTargetId(null);
    openMerge();
  };

  const handleResetClientLoyalty = async (clientId: string) => {
    try {
      await resetClientLoyalty(clientId);
      showNotification({
        title: "Contadores restablecidos",
        message: "Los servicios y referidos del cliente fueron reiniciados a 0",
        color: "blue",
        autoClose: 2000,
        position: "top-right",
      });
      fetchClients();
    } catch (error) {
      showNotification({
        title: "Error",
        message: (error as Error).message || "No fue posible restablecer los contadores.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    }
  };

  const handleResetAllLoyalty = () => {
    openConfirmModal({
      title: "Restablecer contadores de todos los clientes",
      children: (
        <Text size="sm">
          Esta acción restablecerá los <strong>servicios tomados</strong> y los <strong>referidos</strong> a 0 para{" "}
          <strong>todos los clientes</strong> de la organización. Los premios ya ganados no se eliminarán.
        </Text>
      ),
      labels: { confirm: "Restablecer todo", cancel: "Cancelar" },
      confirmProps: { color: "orange" },
      centered: true,
      onConfirm: async () => {
        try {
          const result = await resetAllClientsLoyalty();
          showNotification({
            title: "Contadores restablecidos",
            message: `${result?.modifiedCount ?? 0} clientes reiniciados a 0`,
            color: "blue",
            autoClose: 3000,
            position: "top-right",
          });
          fetchClients();
        } catch (error) {
          showNotification({
            title: "Error",
            message: (error as Error).message || "No fue posible restablecer los contadores.",
            color: "red",
            autoClose: 5000,
            position: "top-right",
          });
        }
      },
    });
  };

  const handleMerge = async () => {
    if (!mergeSourceClient || !mergeTargetId) return;
    setMerging(true);
    try {
      await mergeClient(mergeTargetId, mergeSourceClient._id);
      showNotification({
        title: "Clientes fusionados",
        message: `${mergeSourceClient.name} fue fusionado correctamente`,
        color: "green",
        autoClose: 2000,
        position: "top-right",
      });
      closeMerge();
      fetchClients();
    } catch (error) {
      showNotification({
        title: "Error al fusionar",
        message: (error as Error).message || "No fue posible fusionar los clientes.",
        color: "red",
        autoClose: 5000,
        position: "top-right",
      });
    } finally {
      setMerging(false);
    }
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? "clientes")} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="clientes">Clientes</Tabs.Tab>
          <Tabs.Tab value="seguimientos">Seguimientos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="clientes">
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
                  placeholder="Buscar por nombre, teléfono, documento, correo…"
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
                    {isMobile ? "Crear" : "Crear cliente"}
                  </Button>
                </Tooltip>
                <Menu shadow="sm" width={240} withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="default" size="lg" radius="md">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Acciones administrativas</Menu.Label>
                    <Menu.Item
                      leftSection={<IconRefresh size={16} />}
                      color="orange"
                      onClick={handleResetAllLoyalty}
                    >
                      Restablecer todo
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconFileUpload size={16} />}
                      color="blue"
                      onClick={() => setOpenBulkUploadModal(true)}
                    >
                      Carga masiva
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
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
              <ClientList
                clients={filteredClients}
                onDeleteClient={handleDeleteClient}
                onForceDeleteClient={handleForceDeleteClient}
                onMergeClient={handleOpenMerge}
                onResetClientLoyalty={handleResetClientLoyalty}
                onRegisterService={handleRegisterService}
                onReferral={handleReferral}
                onEditClient={handleOpenModal}
                onClientUpdated={handleClientUpdated}
                error={error}
              />
            </Card>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="seguimientos">
          <FollowUpsTab />
        </Tabs.Panel>
      </Tabs>

      <ClientFormModal
        opened={openModal}
        onClose={handleCloseModal}
        fetchClients={fetchClients}
        client={editCLient}
        setClient={setEditClient}
      />

      <BulkUploadModal
        opened={openBulkUploadModal}
        onClose={() => setOpenBulkUploadModal(false)}
        onUploadComplete={fetchClients}
      />

      <Modal
        opened={mergeOpened}
        onClose={closeMerge}
        title={`Fusionar cliente: ${mergeSourceClient?.name}`}
        size="md"
        zIndex={1000}
      >
        <Text size="sm" c="dimmed" mb="sm">
          Selecciona el cliente al que se transferirán las citas, paquetes y puntos de fidelidad.
          El cliente <strong>{mergeSourceClient?.name}</strong> será eliminado permanentemente.
        </Text>

        <Select
          label="Cliente destino"
          placeholder="Busca por nombre o teléfono..."
          searchable
          data={clients
            .filter((c) => c._id !== mergeSourceClient?._id)
            .map((c) => ({
              value: c._id,
              label: `${c.name} · ${c.phone_e164 || c.phoneNumber}`,
            }))}
          value={mergeTargetId}
          onChange={setMergeTargetId}
          mb="md"
        />

        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="red"
          variant="light"
          mb="lg"
        >
          Esta acción es irreversible. El cliente origen y su número de teléfono serán eliminados del sistema.
        </Alert>

        <Group justify="flex-end">
          <Button variant="default" onClick={closeMerge} disabled={merging}>
            Cancelar
          </Button>
          <Button
            color="orange"
            onClick={handleMerge}
            disabled={!mergeTargetId}
            loading={merging}
          >
            Fusionar
          </Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default ClientsDashboard;
