/* eslint-disable react-hooks/exhaustive-deps */
import {
  Box,
  Card,
  Flex,
  TextInput,
  Group,
  Button,
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
import LoyaltySettingsPart from "./LoyaltySettingsPart";
import { CLIENTS_TABS, resolveClientsTab } from "./clientsTabs";
import { useSearchParams } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import { computeNavPermissions } from "../../../layouts/adminNavigation";
import { IoAddCircleOutline } from "react-icons/io5";
import { BsSearch } from "react-icons/bs";
import { IconFileUpload, IconRefresh, IconAlertTriangle, IconDotsVertical, IconInfoCircle } from "@tabler/icons-react";
import {
  deleteClient,
  forceDeleteClient,
  mergeClient,
  resetClientLoyalty,
  resetAllClientsLoyalty,
  registerReferral,
  registerService,
  decrementLoyalty,
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

type LoyaltyFilter = "todos" | "premio" | "progreso";

const hasReward = (c: Client) => !!(c.hasServiceDiscount || c.hasReferralBenefit);
const inProgress = (c: Client) =>
  !hasReward(c) && ((c.servicesTaken ?? 0) > 0 || (c.referralsMade ?? 0) > 0);

// «Clientes y fidelidad» (decisión 6): una sola lista de clientes con sus
// filtros de fidelidad, más Seguimientos, Programa de fidelidad y Tarjeta.
// Las pestañas van en la URL (?tab=) para que los enlaces viejos de Ajustes
// lleguen directo a Programa o Tarjeta.
const ClientsDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const can = computeNavPermissions(hasPermission, organization?.planLimits);
  const loyaltyEnabled = organization?.showLoyaltyProgram !== false;
  const allowedTabs = CLIENTS_TABS.filter((t) => (t.key === "programa" || t.key === "tarjeta" ? can.businessInfo : true));
  const activeTab = resolveClientsTab(searchParams.get("tab"), allowedTabs.map((t) => t.key));
  const setActiveTab = (key: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!key || key === "clientes") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };
  const [loyaltyFilter, setLoyaltyFilter] = useState<LoyaltyFilter>("todos");
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

  // Filtros de fidelidad: premio listo = tiene un beneficio por servicios o por
  // referidos sin canjear (los mismos campos que muestran «Premio listo» en la fila).
  const loyaltyCounts = useMemo(
    () => ({
      todos: filteredClients.length,
      premio: filteredClients.filter(hasReward).length,
      progreso: filteredClients.filter(inProgress).length,
    }),
    [filteredClients]
  );
  const visibleClients = useMemo(() => {
    if (!loyaltyEnabled || loyaltyFilter === "todos") return filteredClients;
    return filteredClients.filter(loyaltyFilter === "premio" ? hasReward : inProgress);
  }, [filteredClients, loyaltyEnabled, loyaltyFilter]);

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

  const handleDecrementLoyalty = async (clientId: string, kind: "service" | "referral") => {
    try {
      const updated = await decrementLoyalty(clientId, kind);
      if (updated) handleClientUpdated(updated);
      showNotification({
        title: kind === "service" ? "Servicio descontado" : "Referido descontado",
        message: "Se quitó 1 del contador de fidelidad",
        color: "blue",
        autoClose: 1500,
        position: "top-right",
      });
    } catch (error) {
      showNotification({
        title: "No se pudo descontar",
        message: (error as Error).message || "Intenta nuevamente.",
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

  const loyaltyChips = loyaltyEnabled && (
    <div className="ag-tabs" style={{ marginBottom: "var(--space-3)" }} role="tablist" aria-label="Filtrar clientes del programa">
      {(
        [
          ["todos", "Todos"],
          ["premio", "Premio listo"],
          ["progreso", "En progreso"],
        ] as [LoyaltyFilter, string][]
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          className="ag-chip"
          aria-selected={loyaltyFilter === key}
          onClick={() => setLoyaltyFilter(key)}
          style={{ cursor: "pointer" }}
        >
          {label} <span className="count">{loyaltyCounts[key]}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Box p={{ base: "sm", md: "lg" }}>
      <h1 style={{ margin: "0 0 var(--space-3)", font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>
        Clientes y fidelidad
      </h1>
      <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
        <Tabs.List mb="md">
          {allowedTabs.map((t) => (
            <Tabs.Tab key={t.key} value={t.key}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {!loyaltyEnabled && activeTab !== "programa" && activeTab !== "seguimientos" && (
          <div className="ag-alert ag-alert--info" style={{ marginBottom: "var(--space-3)" }}>
            <IconInfoCircle size={20} />
            <div>
              El programa de fidelidad está oculto para tus clientes.{" "}
              {can.businessInfo && (
                <a href="?tab=programa" className="ag-link" onClick={(e) => { e.preventDefault(); setActiveTab("programa"); }}>
                  Actívalo en Programa de fidelidad
                </a>
              )}
            </div>
          </div>
        )}

        <Tabs.Panel value="clientes">
          <Box
            py="xs"
            mb="sm"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: "var(--surface-muted)",
            }}
          >
            <Flex
              gap="sm"
              justify="space-between"
              align={isMobile ? "stretch" : "center"}
              direction={isMobile ? "column" : "row"}
              wrap="wrap"
            >
              <Text size="sm" c="var(--ink-muted)">
                {filteredClients.length === clients.length
                  ? `${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`
                  : `${filteredClients.length} de ${clients.length} clientes`}
              </Text>

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
                      onClick={() => setOpenBulkUploadModal(true)}
                    >
                      Carga masiva
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Flex>
          </Box>

          {loyaltyChips}

          {isLoading ? (
            <Card withBorder radius="md" p="md">
              <Skeleton height={36} mb="sm" />
              <Skeleton height={36} mb="sm" />
              <Skeleton height={36} />
            </Card>
          ) : (
            <ClientList
                clients={visibleClients}
                onDeleteClient={handleDeleteClient}
                onForceDeleteClient={handleForceDeleteClient}
                onMergeClient={handleOpenMerge}
                onResetClientLoyalty={handleResetClientLoyalty}
                onRegisterService={handleRegisterService}
                onReferral={handleReferral}
                onDecrementLoyalty={handleDecrementLoyalty}
                onEditClient={handleOpenModal}
                onClientUpdated={handleClientUpdated}
                error={error}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="seguimientos">
          <FollowUpsTab />
        </Tabs.Panel>

        <Tabs.Panel value="programa">
          <LoyaltySettingsPart part="program" />
        </Tabs.Panel>

        <Tabs.Panel value="tarjeta">
          <LoyaltySettingsPart part="card" />
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
