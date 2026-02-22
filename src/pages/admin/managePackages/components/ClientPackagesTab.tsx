/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import {
  Text,
  Loader,
  Badge,
  Stack,
  Group,
  Paper,
  Progress,
  Button,
  Center,
  TextInput,
  SegmentedControl,
  Pagination,
  Divider,
  Collapse,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Avatar,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import {
  IconPackage,
  IconSearch,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconCalendar,
  IconCreditCard,
  IconRefresh,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import {
  getAllOrgClientPackages,
  cancelClientPackage,
  deleteClientPackage,
  ClientPackage,
  ClientPackageService,
} from "../../../../services/packageService";
import { formatCurrency } from "../../../../utils/formatCurrency";

interface ClientPackagesTabProps {
  currency: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "green" },
  expired: { label: "Expirado", color: "gray" },
  exhausted: { label: "Agotado", color: "orange" },
  cancelled: { label: "Cancelado", color: "red" },
};

const STATUS_FILTER_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Expirados", value: "expired" },
  { label: "Agotados", value: "exhausted" },
  { label: "Cancelados", value: "cancelled" },
];

const PAGE_SIZE = 10;

const getServiceName = (svc: ClientPackageService): string => {
  if (typeof svc.serviceId === "object" && svc.serviceId !== null) {
    return (svc.serviceId as any).name || "Servicio";
  }
  return "Servicio";
};

const getPackageName = (pkg: ClientPackage): string => {
  if (
    typeof pkg.servicePackageId === "object" &&
    pkg.servicePackageId !== null
  ) {
    return (pkg.servicePackageId as any).name || "Paquete";
  }
  return "Paquete";
};

const getClientInfo = (
  pkg: ClientPackage
): { name: string; phone: string } => {
  if (typeof pkg.clientId === "object" && pkg.clientId !== null) {
    const c = pkg.clientId as any;
    return { name: c.name || "—", phone: c.phoneNumber || "" };
  }
  return { name: "—", phone: "" };
};

const getTotalSessionsSummary = (
  pkg: ClientPackage
): { remaining: number; total: number } => {
  const total = pkg.services.reduce((s, svc) => s + svc.sessionsIncluded, 0);
  const remaining = pkg.services.reduce(
    (s, svc) => s + svc.sessionsRemaining,
    0
  );
  return { remaining, total };
};

// ─── Package card ─────────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  currency,
  cancellingId,
  deletingId,
  onCancel,
  onDelete,
}: {
  pkg: ClientPackage;
  currency: string;
  cancellingId: string | null;
  deletingId: string | null;
  onCancel: (pkg: ClientPackage) => void;
  onDelete: (pkg: ClientPackage) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusInfo = STATUS_MAP[pkg.status] || STATUS_MAP.active;
  const pkgName = getPackageName(pkg);
  const { name: clientName, phone: clientPhone } = getClientInfo(pkg);
  const { remaining, total } = getTotalSessionsSummary(pkg);
  const canCancel = pkg.status === "active";

  const purchaseStr = new Date(pkg.purchaseDate).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const expirationStr = new Date(pkg.expirationDate).toLocaleDateString(
    "es-ES",
    { day: "2-digit", month: "short", year: "numeric" }
  );

  const isExpiredDate = new Date(pkg.expirationDate) < new Date();

  return (
    <Paper withBorder radius="md" p="md">
      {/* ── Header row ── */}
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Avatar size="md" radius="xl" color="blue" variant="light">
            <IconUser size={18} />
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text fw={600} size="sm" truncate>
              {clientName}
            </Text>
            {clientPhone && (
              <Text size="xs" c="dimmed">
                {clientPhone}
              </Text>
            )}
            <Group gap={6} mt={2} wrap="nowrap">
              <IconPackage size={12} color="gray" style={{ flexShrink: 0 }} />
              <Text size="xs" c="dimmed" truncate>
                {pkgName}
              </Text>
            </Group>
          </div>
        </Group>

        <Badge
          variant="light"
          color={statusInfo.color}
          size="sm"
          style={{ flexShrink: 0 }}
        >
          {statusInfo.label}
        </Badge>
      </Group>

      <Divider my="xs" />

      {/* ── Stats row ── */}
      <Group gap="xl" wrap="wrap">
        <div>
          <Text size="xs" c="dimmed" mb={2}>
            Sesiones restantes
          </Text>
          <Text
            size="sm"
            fw={600}
            c={
              remaining > 0
                ? "teal"
                : pkg.status === "active"
                ? "red"
                : "dimmed"
            }
          >
            {remaining} de {total}
          </Text>
        </div>

        <div>
          <Text size="xs" c="dimmed" mb={2}>
            Precio total
          </Text>
          <Text size="sm" fw={500}>
            {formatCurrency(pkg.totalPrice, currency)}
          </Text>
        </div>

        <div>
          <Group gap={4} mb={2}>
            <IconCalendar size={11} color="gray" />
            <Text size="xs" c="dimmed">
              Vigencia
            </Text>
          </Group>
          <Text size="xs">
            {purchaseStr} →{" "}
            <Text
              component="span"
              size="xs"
              c={isExpiredDate && pkg.status === "active" ? "red" : undefined}
              fw={isExpiredDate && pkg.status === "active" ? 600 : undefined}
            >
              {expirationStr}
            </Text>
          </Text>
        </div>

        {pkg.paymentMethod && (
          <div>
            <Group gap={4} mb={2}>
              <IconCreditCard size={11} color="gray" />
              <Text size="xs" c="dimmed">
                Pago
              </Text>
            </Group>
            <Text size="xs">
              {pkg.paymentMethod}
              {pkg.paymentNotes ? ` · ${pkg.paymentNotes}` : ""}
            </Text>
          </div>
        )}
      </Group>

      {/* ── Expand/collapse toggle ── */}
      <Group justify="flex-end" mt="xs">
        <Tooltip
          label={expanded ? "Ocultar servicios" : "Ver sesiones por servicio"}
        >
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            color="blue"
          >
            {expanded ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* ── Per-service progress bars ── */}
      <Collapse in={expanded}>
        <Stack gap="xs" mt="xs">
          {pkg.services.map((svc, idx) => {
            const svcName = getServiceName(svc);
            const svcTotal = svc.sessionsIncluded;
            const svcUsed = svc.sessionsUsed;
            const svcRemaining = svc.sessionsRemaining;
            const pct = svcTotal > 0 ? (svcUsed / svcTotal) * 100 : 0;

            return (
              <Paper key={idx} p="xs" radius="sm" bg="gray.0">
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={500}>
                    {svcName}
                  </Text>
                  <Text
                    size="xs"
                    c={svcRemaining > 0 ? "teal" : "red"}
                    fw={600}
                  >
                    {svcRemaining}/{svcTotal} restantes
                  </Text>
                </Group>
                <Progress
                  value={pct}
                  color={svcRemaining > 0 ? "teal" : "red"}
                  size="sm"
                  radius="xl"
                />
              </Paper>
            );
          })}
        </Stack>
      </Collapse>

      {/* ── Action buttons ── */}
      <Group mt="sm" gap="xs">
        {canCancel && (
          <Button
            variant="light"
            color="red"
            size="xs"
            loading={cancellingId === pkg._id}
            onClick={() => onCancel(pkg)}
          >
            Cancelar paquete
          </Button>
        )}
        <Button
          variant="subtle"
          color="red"
          size="xs"
          loading={deletingId === pkg._id}
          onClick={() => onDelete(pkg)}
        >
          Eliminar
        </Button>
      </Group>
    </Paper>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const ClientPackagesTab: React.FC<ClientPackagesTabProps> = ({ currency }) => {
  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  const [allPackages, setAllPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    if (!organizationId) return;
    setLoading(true);
    getAllOrgClientPackages(organizationId)
      .then(setAllPackages)
      .catch(() => setAllPackages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = allPackages;

    if (statusFilter !== "all") {
      data = data.filter((p) => p.status === statusFilter);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter((p) => {
        const { name, phone } = getClientInfo(p);
        const pkgName = getPackageName(p);
        return (
          name.toLowerCase().includes(q) ||
          phone.includes(q) ||
          pkgName.toLowerCase().includes(q)
        );
      });
    }

    return data;
  }, [allPackages, statusFilter, debouncedSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Count badges per status ────────────────────────────────────────────────
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: allPackages.length };
    allPackages.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [allPackages]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCancel = (pkg: ClientPackage) => {
    const pkgName = getPackageName(pkg);
    openConfirmModal({
      title: "Cancelar paquete",
      children: (
        <Text size="sm">
          ¿Seguro que deseas cancelar &quot;{pkgName}&quot;? Las sesiones
          restantes no podrán usarse.
        </Text>
      ),
      labels: { confirm: "Cancelar paquete", cancel: "Volver" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        setCancellingId(pkg._id);
        try {
          await cancelClientPackage(pkg._id, organizationId!);
          setAllPackages((prev) =>
            prev.map((p) =>
              p._id === pkg._id
                ? { ...p, status: "cancelled" as const }
                : p
            )
          );
          showNotification({
            title: "Paquete cancelado",
            message: `"${pkgName}" cancelado`,
            color: "green",
          });
        } catch {
          showNotification({
            title: "Error",
            message: "No se pudo cancelar",
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
          ¿Seguro que deseas eliminar permanentemente &quot;{pkgName}&quot;?
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
          setAllPackages((prev) => prev.filter((p) => p._id !== pkg._id));
          showNotification({
            title: "Paquete eliminado",
            message: `"${pkgName}" eliminado`,
            color: "green",
          });
        } catch {
          showNotification({
            title: "Error",
            message: "No se pudo eliminar",
            color: "red",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Stack gap="md">
      {/* Toolbar */}
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Buscar por cliente, teléfono o paquete..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 200 }}
          disabled={loading}
        />
        <Tooltip label="Recargar lista">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={load}
            loading={loading}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Status filter */}
      <SegmentedControl
        fullWidth
        size="xs"
        value={statusFilter}
        onChange={setStatusFilter}
        data={STATUS_FILTER_OPTIONS.map((opt) => ({
          value: opt.value,
          label: `${opt.label}${countByStatus[opt.value] !== undefined ? ` (${countByStatus[opt.value]})` : ""}`,
        }))}
      />

      {/* Content */}
      {loading ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : allPackages.length === 0 ? (
        <Center mih={200}>
          <Stack align="center" gap="xs">
            <ThemeIcon size="xl" radius="xl" color="gray" variant="light">
              <IconPackage size={24} />
            </ThemeIcon>
            <Text c="dimmed" ta="center">
              No hay paquetes asignados aún.
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Asigna un paquete a un cliente desde la pestaña
              &quot;Plantillas de paquetes&quot;.
            </Text>
          </Stack>
        </Center>
      ) : filtered.length === 0 ? (
        <Center mih={150}>
          <Stack align="center" gap="xs">
            <Text c="dimmed" ta="center">
              No se encontraron paquetes con los filtros aplicados.
            </Text>
            <Button
              variant="light"
              size="xs"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Limpiar filtros
            </Button>
          </Stack>
        </Center>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            Mostrando {paginated.length} de {filtered.length} paquete
            {filtered.length !== 1 ? "s" : ""}
          </Text>

          <Stack gap="sm">
            {paginated.map((pkg) => (
              <PackageCard
                key={pkg._id}
                pkg={pkg}
                currency={currency}
                cancellingId={cancellingId}
                deletingId={deletingId}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            ))}
          </Stack>

          {totalPages > 1 && (
            <Group justify="center" mt="sm">
              <Pagination
                value={page}
                onChange={setPage}
                total={totalPages}
                size="sm"
              />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
};

export default ClientPackagesTab;
