/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Title,
  Card,
  Group,
  Button,
  Text,
  ActionIcon,
  Grid,
  TextInput,
  Badge,
  Menu,
  Tooltip,
  SegmentedControl,
  Skeleton,
  Center,
  Stack,
  Paper,
  Tabs,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  BsTrash,
  BsPencil,
  BsSearch,
  BsThreeDotsVertical,
  BsPlusCircle,
  BsCheckCircle,
  BsXCircle,
} from "react-icons/bs";
import { IconPackage, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { modals } from "@mantine/modals";
import {
  getServicePackages,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  assignPackageToClient,
  ServicePackage,
} from "../../../services/packageService";
import { getServicesByOrganizationId, Service } from "../../../services/serviceService";
import ModalCreateEditPackage from "./components/ModalCreateEditPackage";
import ModalAssignPackage from "./components/ModalAssignPackage";
import ClientPackagesTab from "./components/ClientPackagesTab";
import { formatCurrency } from "../../../utils/formatCurrency";
import { apiClient } from "../../../services/axiosConfig";

const AdminPackages: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 250);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [assigningPackage, setAssigningPackage] = useState<ServicePackage | null>(null);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);
  const currency = (organization as any)?.currency || "COP";

  useEffect(() => {
    if (!organizationId) return;
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      const [pkgs, svcs, clientsRes] = await Promise.all([
        getServicePackages(organizationId!),
        getServicesByOrganizationId(organizationId!),
        apiClient.get(`/organization/${organizationId}`).then((r) => r.data.data).catch(() => []),
      ]);
      setPackages(pkgs);
      setServices(svcs);
      setClients(clientsRes);
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "Error al cargar los datos", color: "red" });
    } finally {
      setInitialLoaded(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...packages];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase() ?? "").includes(q)
      );
    }

    if (status !== "all") {
      data = data.filter((p) => (status === "active" ? p.isActive : !p.isActive));
    }

    data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return data;
  }, [packages, debouncedSearch, status]);

  const handleSavePackage = async (data: any) => {
    try {
      if (data._id) {
        const updated = await updateServicePackage(data._id, {
          ...data,
          organizationId,
        });
        if (updated) {
          setPackages((prev) => prev.map((p) => (p._id === data._id ? updated : p)));
        }
      } else {
        const created = await createServicePackage({
          ...data,
          organizationId,
        });
        if (created) {
          setPackages((prev) => [...prev, created]);
        }
      }
      setIsCreateModalOpen(false);
      setEditingPackage(null);
      showNotification({
        title: data._id ? "Paquete actualizado" : "Paquete creado",
        message: "El paquete ha sido guardado correctamente",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "Error al guardar el paquete", color: "red" });
    }
  };

  const handleAssign = async (data: any) => {
    try {
      await assignPackageToClient({ ...data, organizationId });
      setIsAssignModalOpen(false);
      setAssigningPackage(null);
      showNotification({
        title: "Paquete asignado",
        message: "El paquete ha sido asignado al cliente exitosamente",
        color: "teal",
      });
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error al asignar el paquete",
        color: "red",
      });
    }
  };

  const confirmDelete = (pkg: ServicePackage) => {
    modals.openConfirmModal({
      title: "Desactivar paquete",
      children: (
        <Text size="sm">
          ¿Seguro que deseas desactivar el paquete "{pkg.name}"? Los paquetes ya
          asignados a clientes no se verán afectados.
        </Text>
      ),
      labels: { confirm: "Desactivar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteServicePackage(pkg._id, organizationId!);
          setPackages((prev) =>
            prev.map((p) => (p._id === pkg._id ? { ...p, isActive: false } : p))
          );
          showNotification({
            title: "Paquete desactivado",
            message: "Se desactivó correctamente",
            color: "green",
          });
        } catch (error) {
          console.error(error);
          showNotification({
            title: "Error",
            message: "No se pudo desactivar el paquete",
            color: "red",
          });
        }
      },
    });
  };

  const toggleStatus = async (pkg: ServicePackage) => {
    try {
      const updated = await updateServicePackage(pkg._id, {
        isActive: !pkg.isActive,
        organizationId,
      } as any);
      if (updated) {
        setPackages((prev) => prev.map((p) => (p._id === pkg._id ? updated : p)));
      }
      showNotification({ title: "Estado actualizado", message: "Cambio aplicado", color: "green" });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "No se pudo actualizar el estado", color: "red" });
    }
  };

  const getServiceName = (serviceId: string | any): string => {
    if (typeof serviceId === "object" && serviceId?.name) return serviceId.name;
    const svc = services.find((s) => s._id === serviceId);
    return svc?.name || "Servicio";
  };

  const Toolbar = (
    <Card withBorder radius="md" p="md" mb="md" shadow="sm">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs">
            <IconPackage size={28} />
            <Title order={isMobile ? 3 : 2}>Paquetes de Sesiones</Title>
          </Group>
          <Button
            leftSection={<BsPlusCircle size={18} />}
            onClick={() => {
              setIsCreateModalOpen(true);
              setEditingPackage(null);
            }}
            size={isMobile ? "sm" : "md"}
          >
            {isMobile ? "Nuevo" : "Nuevo Paquete"}
          </Button>
        </Group>

        <Group wrap="wrap" gap="sm" align="end">
          <TextInput
            leftSection={<BsSearch />}
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{
              flex: isMobile ? "1 1 100%" : "1 1 280px",
              minWidth: isMobile ? "100%" : 240,
            }}
          />
          <Box style={{ flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
            <Text size="xs" fw={500} mb={4}>Estado</Text>
            <SegmentedControl
              value={status}
              onChange={(v: any) => setStatus(v)}
              data={[
                { label: "Todos", value: "all" },
                { label: "Activos", value: "active" },
                { label: "Inactivos", value: "inactive" },
              ]}
              size={isMobile ? "xs" : "sm"}
              fullWidth={isMobile}
            />
          </Box>
        </Group>
      </Stack>
    </Card>
  );

  const PackageTemplatesContent = (
    <>
      {!initialLoaded ? (
        <Grid>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid.Col key={i} span={{ base: 12, xs: 6, md: 4 }}>
              <Card withBorder radius="md" p="md">
                <Skeleton height={20} width="60%" mb="sm" />
                <Skeleton height={14} width="80%" mb="xs" />
                <Skeleton height={14} width="40%" mb="xs" />
                <Skeleton height={30} width="30%" />
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Center mih={240}>
          <Stack align="center" gap="xs">
            <IconPackage size={48} color="gray" />
            <Text c="dimmed">No hay paquetes para los filtros aplicados.</Text>
            <Button
              variant="light"
              onClick={() => {
                setSearchTerm("");
                setStatus("all");
              }}
            >
              Limpiar filtros
            </Button>
          </Stack>
        </Center>
      ) : (
        <Grid>
          {filtered.map((pkg) => (
            <Grid.Col span={{ base: 12, xs: 6, md: 4 }} key={pkg._id}>
              <Card
                shadow="sm"
                radius="md"
                withBorder
                style={{
                  opacity: pkg.isActive ? 1 : 0.7,
                  transition: "all 0.2s ease",
                }}
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <Badge
                      variant="filled"
                      color={pkg.isActive ? "green" : "gray"}
                      leftSection={
                        pkg.isActive ? (
                          <BsCheckCircle size={12} />
                        ) : (
                          <BsXCircle size={12} />
                        )
                      }
                    >
                      {pkg.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="light" color="blue">
                      {pkg.validityDays} días
                    </Badge>
                  </Group>
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" aria-label="Acciones">
                        <BsThreeDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Acciones</Menu.Label>
                      <Menu.Item
                        leftSection={<IconUserPlus size={16} />}
                        onClick={() => {
                          setAssigningPackage(pkg);
                          setIsAssignModalOpen(true);
                        }}
                        color="teal"
                      >
                        Asignar a cliente
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<BsPencil />}
                        onClick={() => {
                          setEditingPackage(pkg);
                          setIsCreateModalOpen(true);
                        }}
                      >
                        Editar paquete
                      </Menu.Item>
                      <Menu.Item
                        leftSection={pkg.isActive ? <BsXCircle /> : <BsCheckCircle />}
                        onClick={() => toggleStatus(pkg)}
                        color={pkg.isActive ? "orange" : "green"}
                      >
                        {pkg.isActive ? "Desactivar" : "Activar"}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<BsTrash />}
                        onClick={() => confirmDelete(pkg)}
                      >
                        Desactivar paquete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Text fw={700} size="lg" mb={4} lineClamp={1}>
                  {pkg.name}
                </Text>

                {pkg.description && (
                  <Text size="sm" c="dimmed" mb="sm" lineClamp={2}>
                    {pkg.description}
                  </Text>
                )}

                <Paper withBorder p="xs" radius="sm" mb="sm" bg="gray.0">
                  <Text size="xs" fw={600} mb={4} c="dimmed">
                    SERVICIOS INCLUIDOS
                  </Text>
                  <Stack gap={4}>
                    {pkg.services.map((svc: any, idx: number) => (
                      <Group key={idx} justify="space-between" gap="xs">
                        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
                          {getServiceName(svc.serviceId)}
                        </Text>
                        <Badge variant="light" size="sm" color="violet">
                          {svc.sessionsIncluded} sesiones
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                </Paper>

                <Group justify="space-between" align="center">
                  <Badge color="teal" variant="light" size="xl" radius="md">
                    {formatCurrency(pkg.price, currency)}
                  </Badge>
                  <Tooltip label="Asignar a cliente">
                    <ActionIcon
                      variant="light"
                      color="teal"
                      size="lg"
                      onClick={() => {
                        setAssigningPackage(pkg);
                        setIsAssignModalOpen(true);
                      }}
                    >
                      <IconUserPlus size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </>
  );

  return (
    <Box>
      {Toolbar}

      <Tabs defaultValue="templates" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="templates" leftSection={<IconPackage size={16} />}>
            Plantillas de paquetes
          </Tabs.Tab>
          <Tabs.Tab value="assigned" leftSection={<IconUsers size={16} />}>
            Paquetes asignados
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates">
          {PackageTemplatesContent}
        </Tabs.Panel>

        <Tabs.Panel value="assigned">
          <ClientPackagesTab clients={clients} currency={currency} />
        </Tabs.Panel>
      </Tabs>

      <ModalCreateEditPackage
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPackage(null);
        }}
        servicePackage={editingPackage}
        onSave={handleSavePackage}
        availableServices={services}
      />

      <ModalAssignPackage
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssigningPackage(null);
        }}
        servicePackage={assigningPackage}
        clients={clients}
        onAssign={handleAssign}
        currency={currency}
      />
    </Box>
  );
};

export default AdminPackages;
