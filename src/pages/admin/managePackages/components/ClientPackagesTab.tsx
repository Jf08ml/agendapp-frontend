/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Text,
  Loader,
  Badge,
  Stack,
  Group,
  Paper,
  Progress,
  ScrollArea,
  Button,
  Select,
  Center,
  Tabs,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconPackage, IconSearch } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import {
  getClientPackages,
  cancelClientPackage,
  deleteClientPackage,
  ClientPackage,
  ClientPackageService,
} from "../../../../services/packageService";
import { formatCurrency } from "../../../../utils/formatCurrency";

interface ClientOption {
  _id: string;
  name: string;
  phoneNumber?: string;
}

interface ClientPackagesTabProps {
  clients: ClientOption[];
  currency: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "green" },
  expired: { label: "Expirado", color: "gray" },
  exhausted: { label: "Agotado", color: "orange" },
  cancelled: { label: "Cancelado", color: "red" },
};

const getServiceName = (svc: ClientPackageService): string => {
  if (typeof svc.serviceId === "object" && svc.serviceId !== null) {
    return (svc.serviceId as any).name || "Servicio";
  }
  return "Servicio";
};

const getPackageName = (pkg: ClientPackage): string => {
  if (typeof pkg.servicePackageId === "object" && pkg.servicePackageId !== null) {
    return (pkg.servicePackageId as any).name || "Paquete";
  }
  return "Paquete";
};

const getClientName = (pkg: ClientPackage): string => {
  if (typeof pkg.clientId === "object" && pkg.clientId !== null) {
    return (pkg.clientId as any).name || "";
  }
  return "";
};

const ClientPackagesTab: React.FC<ClientPackagesTabProps> = ({ clients, currency }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("active");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: `${c.name}${c.phoneNumber ? ` - ${c.phoneNumber}` : ""}`,
  }));

  useEffect(() => {
    if (!selectedClientId || !organizationId) {
      setPackages([]);
      return;
    }
    setLoading(true);
    getClientPackages(selectedClientId, organizationId)
      .then((data) => setPackages(data))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [selectedClientId, organizationId]);

  const handleCancel = (pkg: ClientPackage) => {
    const pkgName = getPackageName(pkg);
    openConfirmModal({
      title: "Cancelar paquete",
      children: (
        <Text size="sm">
          ¿Seguro que deseas cancelar el paquete &quot;{pkgName}&quot;? Las sesiones
          restantes se perderán y no se podrán usar para futuras citas.
        </Text>
      ),
      labels: { confirm: "Cancelar paquete", cancel: "Volver" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        setCancellingId(pkg._id);
        try {
          await cancelClientPackage(pkg._id, organizationId!);
          setPackages((prev) =>
            prev.map((p) =>
              p._id === pkg._id ? { ...p, status: "cancelled" as const } : p
            )
          );
          showNotification({
            title: "Paquete cancelado",
            message: `El paquete "${pkgName}" ha sido cancelado`,
            color: "green",
          });
        } catch {
          showNotification({
            title: "Error",
            message: "No se pudo cancelar el paquete",
            color: "red",
          });
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const handleDelete = (pkg: ClientPackage) => {
    const pkgName = getPackageName(pkg);
    openConfirmModal({
      title: "Eliminar paquete",
      children: (
        <Text size="sm">
          ¿Seguro que deseas eliminar permanentemente el paquete &quot;{pkgName}&quot;?
          Esta acción no se puede deshacer.
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Volver" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        setDeletingId(pkg._id);
        try {
          await deleteClientPackage(pkg._id, organizationId!);
          setPackages((prev) => prev.filter((p) => p._id !== pkg._id));
          showNotification({
            title: "Paquete eliminado",
            message: `El paquete "${pkgName}" ha sido eliminado`,
            color: "green",
          });
        } catch {
          showNotification({
            title: "Error",
            message: "No se pudo eliminar el paquete",
            color: "red",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const activePackages = packages.filter((p) => p.status === "active");
  const pastPackages = packages.filter((p) => p.status !== "active");

  const renderPackageCard = (pkg: ClientPackage) => {
    const statusInfo = STATUS_MAP[pkg.status] || STATUS_MAP.active;
    const pkgName = getPackageName(pkg);
    const clientName = getClientName(pkg);
    const canCancel = pkg.status === "active";

    return (
      <Paper key={pkg._id} withBorder p="md" radius="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconPackage size={18} />
            <Text fw={600} size="sm">
              {pkgName}
            </Text>
          </Group>
          <Badge variant="light" color={statusInfo.color} size="sm">
            {statusInfo.label}
          </Badge>
        </Group>

        {clientName && (
          <Text size="xs" c="dimmed" mb="xs">
            Cliente: {clientName}
          </Text>
        )}

        <Group gap="xl" mb="sm">
          <Text size="xs" c="dimmed">
            Precio: {formatCurrency(pkg.totalPrice, currency)}
          </Text>
          <Text size="xs" c="dimmed">
            Compra: {new Date(pkg.purchaseDate).toLocaleDateString("es-ES")}
          </Text>
          <Text size="xs" c="dimmed">
            Vence: {new Date(pkg.expirationDate).toLocaleDateString("es-ES")}
          </Text>
        </Group>

        {pkg.paymentMethod && (
          <Text size="xs" c="dimmed" mb="sm">
            Pago: {pkg.paymentMethod}
            {pkg.paymentNotes ? ` - ${pkg.paymentNotes}` : ""}
          </Text>
        )}

        <Stack gap="xs">
          {pkg.services.map((svc, idx) => {
            const svcName = getServiceName(svc);
            const total = svc.sessionsIncluded;
            const used = svc.sessionsUsed;
            const remaining = svc.sessionsRemaining;
            const pct = total > 0 ? (used / total) * 100 : 0;

            return (
              <Paper key={idx} p="xs" radius="sm" bg="gray.0">
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={500}>
                    {svcName}
                  </Text>
                  <Text size="xs" c={remaining > 0 ? "teal" : "red"} fw={600}>
                    {remaining}/{total} restantes
                  </Text>
                </Group>
                <Progress
                  value={pct}
                  color={remaining > 0 ? "teal" : "red"}
                  size="sm"
                  radius="xl"
                />
              </Paper>
            );
          })}
        </Stack>

        <Group mt="sm" gap="xs">
          {canCancel && (
            <Button
              variant="light"
              color="red"
              size="xs"
              style={{ flex: 1 }}
              loading={cancellingId === pkg._id}
              onClick={() => handleCancel(pkg)}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="subtle"
            color="red"
            size="xs"
            style={{ flex: canCancel ? undefined : 1 }}
            loading={deletingId === pkg._id}
            onClick={() => handleDelete(pkg)}
          >
            Eliminar
          </Button>
        </Group>
      </Paper>
    );
  };

  return (
    <Stack gap="md">
      <Select
        leftSection={<IconSearch size={16} />}
        placeholder="Buscar cliente por nombre o teléfono..."
        data={clientOptions}
        value={selectedClientId}
        onChange={setSelectedClientId}
        searchable
        clearable
        nothingFoundMessage="No se encontraron clientes"
      />

      {!selectedClientId ? (
        <Center mih={200}>
          <Stack align="center" gap="xs">
            <IconPackage size={48} color="gray" />
            <Text c="dimmed" ta="center">
              Selecciona un cliente para ver sus paquetes asignados.
            </Text>
          </Stack>
        </Center>
      ) : loading ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : packages.length === 0 ? (
        <Center mih={200}>
          <Text c="dimmed" ta="center">
            Este cliente no tiene paquetes asignados.
          </Text>
        </Center>
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="active">
              Activos ({activePackages.length})
            </Tabs.Tab>
            <Tabs.Tab value="history">
              Historial ({pastPackages.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="active">
            <ScrollArea.Autosize mah={500}>
              {activePackages.length > 0 ? (
                <Stack gap="sm">
                  {activePackages.map(renderPackageCard)}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="md">
                  No hay paquetes activos.
                </Text>
              )}
            </ScrollArea.Autosize>
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <ScrollArea.Autosize mah={500}>
              {pastPackages.length > 0 ? (
                <Stack gap="sm">
                  {pastPackages.map(renderPackageCard)}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="md">
                  No hay paquetes en el historial.
                </Text>
              )}
            </ScrollArea.Autosize>
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
};

export default ClientPackagesTab;
