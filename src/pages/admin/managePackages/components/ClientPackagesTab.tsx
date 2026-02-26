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
  NumberInput,
  Select,
  Box,
  SimpleGrid,
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
  IconRefresh,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import {
  getAllOrgClientPackages,
  cancelClientPackage,
  deleteClientPackage,
  addClientPackagePayment,
  removeClientPackagePayment,
  ClientPackage,
  ClientPackageService,
  PackagePaymentRecord,
} from "../../../../services/packageService";
import { formatCurrency } from "../../../../utils/formatCurrency";

interface ClientPackagesTabProps {
  currency: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:    { label: "Activo",    color: "green"  },
  expired:   { label: "Expirado", color: "gray"   },
  exhausted: { label: "Agotado",  color: "orange" },
  cancelled: { label: "Cancelado", color: "red"   },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid:    { label: "Pagado",     color: "green"  },
  partial: { label: "Abono",      color: "yellow" },
  unpaid:  { label: "Sin pagar",  color: "red"    },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro",
};

const STATUS_FILTER_OPTIONS = [
  { label: "Todos",     value: "all"       },
  { label: "Activos",   value: "active"    },
  { label: "Expirados", value: "expired"   },
  { label: "Agotados",  value: "exhausted" },
  { label: "Cancelados",value: "cancelled" },
];

const PAGE_SIZE = 10;

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

const getClientInfo = (pkg: ClientPackage): { name: string; phone: string } => {
  if (typeof pkg.clientId === "object" && pkg.clientId !== null) {
    const c = pkg.clientId as any;
    return { name: c.name || "—", phone: c.phoneNumber || "" };
  }
  return { name: "—", phone: "" };
};

const getTotalSessionsSummary = (pkg: ClientPackage): { remaining: number; total: number } => {
  const total     = pkg.services.reduce((s, svc) => s + svc.sessionsIncluded,  0);
  const remaining = pkg.services.reduce((s, svc) => s + svc.sessionsRemaining, 0);
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
  onUpdate,
}: {
  pkg: ClientPackage;
  currency: string;
  cancellingId: string | null;
  deletingId: string | null;
  onCancel: (pkg: ClientPackage) => void;
  onDelete: (pkg: ClientPackage) => void;
  onUpdate: (updated: ClientPackage) => void;
}) {
  const [expanded,      setExpanded]      = useState(false);
  const [payments,      setPayments]      = useState<PackagePaymentRecord[]>(pkg.payments || []);
  const [paymentStatus, setPaymentStatus] = useState(pkg.paymentStatus || "unpaid");
  const [newPayment,    setNewPayment]    = useState({ amount: 0, method: "cash", note: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  const statusInfo        = STATUS_MAP[pkg.status]         || STATUS_MAP.active;
  const paymentStatusInfo = PAYMENT_STATUS_MAP[paymentStatus] || PAYMENT_STATUS_MAP.unpaid;
  const pkgName           = getPackageName(pkg);
  const { name: clientName, phone: clientPhone } = getClientInfo(pkg);
  const { remaining, total } = getTotalSessionsSummary(pkg);
  const canCancel         = pkg.status === "active";

  const totalPaid     = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = Math.max(0, (pkg.totalPrice || 0) - totalPaid);
  const sessionPct    = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const clientInitial = clientName && clientName !== "—" ? clientName.charAt(0).toUpperCase() : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFullPayment = async () => {
    if (pendingAmount <= 0) return;
    setSavingPayment(true);
    try {
      const updated = await addClientPackagePayment(pkg._id, {
        amount: pendingAmount,
        method: newPayment.method as PackagePaymentRecord["method"],
        date:   new Date().toISOString(),
        note:   "",
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        onUpdate(updated);
        showNotification({ title: "Pago completo registrado", message: "Se registró el saldo pendiente como pagado", color: "green", autoClose: 3000, position: "top-right" });
      }
    } catch (err) {
      console.error(err);
      showNotification({ title: "Error", message: "No se pudo registrar el pago", color: "red", autoClose: 3000, position: "top-right" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || newPayment.amount <= 0) return;
    setSavingPayment(true);
    try {
      const updated = await addClientPackagePayment(pkg._id, {
        amount: newPayment.amount,
        method: newPayment.method as PackagePaymentRecord["method"],
        date:   new Date().toISOString(),
        note:   newPayment.note,
      });
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        setNewPayment({ amount: 0, method: "cash", note: "" });
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    try {
      const updated = await removeClientPackagePayment(pkg._id, paymentId);
      if (updated) {
        setPayments(updated.payments || []);
        setPaymentStatus(updated.paymentStatus || "unpaid");
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Dates ─────────────────────────────────────────────────────────────────
  const purchaseStr   = new Date(pkg.purchaseDate).toLocaleDateString("es-ES",   { day: "2-digit", month: "short", year: "numeric" });
  const expirationStr = new Date(pkg.expirationDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  const isExpiredDate = new Date(pkg.expirationDate) < new Date();

  return (
    <Paper
      withBorder
      radius="md"
      style={{ borderLeft: `4px solid var(--mantine-color-${statusInfo.color}-5)`, overflow: "hidden" }}
    >
      {/* ── Header section ─────────────────────────────────────────── */}
      <Box p="md">
        <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Avatar size="md" radius="xl" color={statusInfo.color} variant="light">
              {clientInitial ?? <IconUser size={18} />}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} size="sm" truncate>{clientName}</Text>
              {clientPhone && <Text size="xs" c="dimmed">{clientPhone}</Text>}
              <Group gap={4} mt={2}>
                <IconPackage size={11} color="gray" style={{ flexShrink: 0 }} />
                <Text size="xs" c="dimmed" truncate>{pkgName}</Text>
              </Group>
            </Box>
          </Group>
          <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
            <Badge variant="light"  color={statusInfo.color}        size="sm">{statusInfo.label}</Badge>
            <Badge variant="filled" color={paymentStatusInfo.color} size="sm">{paymentStatusInfo.label}</Badge>
          </Stack>
        </Group>

        {/* ── Overall sessions progress ── */}
        <Box mb="sm">
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed" fw={500}>Sesiones</Text>
            <Text size="xs" fw={700} c={remaining > 0 ? "teal" : "red"}>
              {remaining} de {total} disponibles
            </Text>
          </Group>
          <Progress value={sessionPct} color={remaining > 0 ? "teal" : "red"} size="sm" radius="xl" />
        </Box>

        {/* ── Financial stats ── */}
        <SimpleGrid cols={3} spacing="xs" mb="sm">
          <Box
            p="xs"
            style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8, border: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Text size="xs" c="dimmed">Precio</Text>
            <Text size="sm" fw={700}>{formatCurrency(pkg.totalPrice, currency)}</Text>
          </Box>
          <Box
            p="xs"
            style={{
              background: totalPaid > 0 ? "var(--mantine-color-teal-0)" : "var(--mantine-color-gray-0)",
              borderRadius: 8,
              border: `1px solid ${totalPaid > 0 ? "var(--mantine-color-teal-2)" : "var(--mantine-color-gray-2)"}`,
            }}
          >
            <Text size="xs" c="dimmed">Cobrado</Text>
            <Text size="sm" fw={700} c={totalPaid > 0 ? "teal" : "dimmed"}>{formatCurrency(totalPaid, currency)}</Text>
          </Box>
          <Box
            p="xs"
            style={{
              background: pendingAmount > 0 ? "var(--mantine-color-red-0)" : "var(--mantine-color-gray-0)",
              borderRadius: 8,
              border: `1px solid ${pendingAmount > 0 ? "var(--mantine-color-red-2)" : "var(--mantine-color-gray-2)"}`,
            }}
          >
            <Text size="xs" c={pendingAmount > 0 ? "red" : "dimmed"}>Pendiente</Text>
            <Text size="sm" fw={700} c={pendingAmount > 0 ? "red" : "dimmed"}>{formatCurrency(pendingAmount, currency)}</Text>
          </Box>
        </SimpleGrid>

        {/* ── Dates & method ── */}
        <Group gap="xl" mb="sm" wrap="wrap">
          <Box>
            <Text size="xs" c="dimmed">Compra</Text>
            <Text size="xs" fw={500}>{purchaseStr}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed">Vence</Text>
            <Text
              size="xs"
              fw={isExpiredDate && pkg.status === "active" ? 700 : 500}
              c={isExpiredDate && pkg.status === "active" ? "red" : undefined}
            >
              {expirationStr}
            </Text>
          </Box>
          {pkg.paymentMethod && (
            <Box>
              <Text size="xs" c="dimmed">Método inicial</Text>
              <Text size="xs" fw={500}>{pkg.paymentMethod}{pkg.paymentNotes ? ` · ${pkg.paymentNotes}` : ""}</Text>
            </Box>
          )}
        </Group>

        {/* ── Expand toggle ── */}
        <Button
          variant={expanded ? "light" : "subtle"}
          color="blue"
          size="xs"
          fullWidth
          leftSection={expanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Ocultar detalles" : "Ver sesiones y pagos"}
        </Button>
      </Box>

      {/* ── Collapse: session breakdown + payment management ── */}
      <Collapse in={expanded}>
        <Divider />
        <Box p="md" pt="sm">
          <Stack gap="md">

            {/* Per-service progress */}
            <Box>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>
                Sesiones por servicio
              </Text>
              <Stack gap="xs">
                {pkg.services.map((svc, idx) => {
                  const svcName      = getServiceName(svc);
                  const svcTotal     = svc.sessionsIncluded;
                  const svcUsed      = svc.sessionsUsed;
                  const svcRemaining = svc.sessionsRemaining;
                  const pct          = svcTotal > 0 ? (svcUsed / svcTotal) * 100 : 0;
                  return (
                    <Box
                      key={idx}
                      p="xs"
                      style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8, border: "1px solid var(--mantine-color-gray-2)" }}
                    >
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" fw={600}>{svcName}</Text>
                        <Badge size="xs" color={svcRemaining > 0 ? "teal" : "red"} variant="light">
                          {svcRemaining}/{svcTotal} restantes
                        </Badge>
                      </Group>
                      <Progress value={pct} color={svcRemaining > 0 ? "teal" : "red"} size="xs" radius="xl" />
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Payment history */}
            <Box>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: "0.05em" }}>
                Historial de pagos
              </Text>
              {payments.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py={8}>Sin pagos registrados</Text>
              ) : (
                <Stack gap={6}>
                  {payments.map((p) => (
                    <Group
                      key={p._id}
                      justify="space-between"
                      align="center"
                      px={10}
                      py={6}
                      style={{ borderRadius: 8, border: "1px solid var(--mantine-color-gray-2)", background: "white" }}
                    >
                      <Box>
                        <Group gap="xs">
                          <Text size="sm" fw={600}>{formatCurrency(p.amount, currency)}</Text>
                          <Badge size="xs" variant="outline" color="gray">
                            {PAYMENT_METHOD_LABELS[p.method] || p.method}
                          </Badge>
                        </Group>
                        <Group gap={4} mt={2}>
                          <Text size="xs" c="dimmed">
                            {new Date(p.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                          </Text>
                          {p.note && <Text size="xs" c="dimmed">· {p.note}</Text>}
                        </Group>
                      </Box>
                      <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemovePayment(p._id)}>
                        <Text size="xs" fw={700}>×</Text>
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Payment form */}
            {paymentStatus !== "paid" && (
              <Box style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: 10, padding: 12, background: "var(--mantine-color-gray-0)" }}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm" style={{ letterSpacing: "0.05em" }}>
                  Registrar pago
                </Text>

                {/* Quick action */}
                <Group gap="xs" align="flex-end" mb={8}>
                  <Select
                    size="xs"
                    label="Método de pago"
                    value={newPayment.method}
                    onChange={(v) => setNewPayment({ ...newPayment, method: v || "cash" })}
                    data={[
                      { value: "cash",     label: "Efectivo"      },
                      { value: "card",     label: "Tarjeta"       },
                      { value: "transfer", label: "Transferencia" },
                      { value: "other",    label: "Otro"          },
                    ]}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="xs"
                    color="teal"
                    variant="filled"
                    loading={savingPayment}
                    disabled={pendingAmount <= 0}
                    onClick={handleFullPayment}
                    style={{ flex: 1 }}
                  >
                    Pago completo ({formatCurrency(pendingAmount, currency)})
                  </Button>
                </Group>

                <Divider label="o ingresa un monto parcial" labelPosition="center" mb={8} size="xs" />

                <NumberInput
                  size="xs"
                  label="Monto parcial"
                  prefix="$ "
                  thousandSeparator=","
                  value={newPayment.amount || ""}
                  onChange={(v) => setNewPayment({ ...newPayment, amount: Number(v) || 0 })}
                  min={0}
                />
                <TextInput
                  size="xs"
                  label="Nota (opcional)"
                  value={newPayment.note}
                  onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                  mt={6}
                />
                <Button
                  fullWidth
                  mt={8}
                  size="xs"
                  variant="light"
                  loading={savingPayment}
                  disabled={!newPayment.amount || newPayment.amount <= 0}
                  onClick={handleAddPayment}
                >
                  Registrar monto parcial
                </Button>
              </Box>
            )}

          </Stack>
        </Box>
      </Collapse>

      {/* ── Action buttons ── */}
      <Divider />
      <Group px="md" py="xs" gap="xs" justify="flex-end">
        {canCancel && (
          <Button
            variant="subtle"
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
  const organizationId = useSelector((state: RootState) => state.auth.organizationId);

  const [allPackages, setAllPackages] = useState<ClientPackage[]>([]);
  const [loading,     setLoading]     = useState(false);

  const [search,          setSearch]          = useState("");
  const [debouncedSearch]                     = useDebouncedValue(search, 250);
  const [statusFilter,    setStatusFilter]    = useState("active");
  const [page,            setPage]            = useState(1);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

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
    if (statusFilter !== "all") data = data.filter((p) => p.status === statusFilter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter((p) => {
        const { name, phone } = getClientInfo(p);
        const pkgName = getPackageName(p);
        return name.toLowerCase().includes(q) || phone.includes(q) || pkgName.toLowerCase().includes(q);
      });
    }
    return data;
  }, [allPackages, statusFilter, debouncedSearch]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: allPackages.length };
    allPackages.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [allPackages]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCancel = (pkg: ClientPackage) => {
    const pkgName = getPackageName(pkg);
    openConfirmModal({
      title: "Cancelar paquete",
      children: (
        <Text size="sm">
          ¿Seguro que deseas cancelar &quot;{pkgName}&quot;? Las sesiones restantes no podrán usarse.
        </Text>
      ),
      labels: { confirm: "Cancelar paquete", cancel: "Volver" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        setCancellingId(pkg._id);
        try {
          await cancelClientPackage(pkg._id, organizationId!);
          setAllPackages((prev) => prev.map((p) => p._id === pkg._id ? { ...p, status: "cancelled" as const } : p));
          showNotification({ title: "Paquete cancelado", message: `"${pkgName}" cancelado`, color: "green" });
        } catch {
          showNotification({ title: "Error", message: "No se pudo cancelar", color: "red" });
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
          ¿Seguro que deseas eliminar permanentemente &quot;{pkgName}&quot;? Esta acción no se puede deshacer.
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
          showNotification({ title: "Paquete eliminado", message: `"${pkgName}" eliminado`, color: "green" });
        } catch {
          showNotification({ title: "Error", message: "No se pudo eliminar", color: "red" });
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
          <ActionIcon variant="light" size="lg" onClick={load} loading={loading}>
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
            <Text c="dimmed" ta="center">No hay paquetes asignados aún.</Text>
            <Text size="xs" c="dimmed" ta="center">
              Asigna un paquete a un cliente desde la pestaña &quot;Plantillas de paquetes&quot;.
            </Text>
          </Stack>
        </Center>
      ) : filtered.length === 0 ? (
        <Center mih={150}>
          <Stack align="center" gap="xs">
            <Text c="dimmed" ta="center">No se encontraron paquetes con los filtros aplicados.</Text>
            <Button variant="light" size="xs" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              Limpiar filtros
            </Button>
          </Stack>
        </Center>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            Mostrando {paginated.length} de {filtered.length} paquete{filtered.length !== 1 ? "s" : ""}
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
                onUpdate={(updated) => setAllPackages((prev) => prev.map((p) => p._id === updated._id ? updated : p))}
              />
            ))}
          </Stack>

          {totalPages > 1 && (
            <Group justify="center" mt="sm">
              <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
};

export default ClientPackagesTab;
