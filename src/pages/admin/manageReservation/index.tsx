/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Card,
  Text,
  Badge,
  Stack,
  Menu,
  ActionIcon,
  Modal,
  Select,
  Button,
  Group,
  Skeleton,
  LoadingOverlay,
  Center,
  Tooltip,
  Alert,
  Loader,
  Collapse,
  useMantineTheme,
  useMantineColorScheme,
  TextInput,
  Switch,
  Box,
  Divider,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import {
  Reservation,
  getReservationsByOrganization,
  updateReservation,
  deleteReservation,
} from "../../../services/reservationService";
import {
  getEmployeesByOrganizationId,
  Employee,
} from "../../../services/employeeService";
import type { ReservationPolicy } from "../../../services/organizationService";
import { showNotification } from "@mantine/notifications";
import dayjs from "dayjs";
import {
  BiDotsVertical,
  BiTrash,
  BiXCircle,
  BiUser,
  BiCheck,
  BiInfoCircle,
  BiChevronDown,
  BiChevronUp,
  BiFilter,
} from "react-icons/bi";
import CustomLoader from "../../../components/customLoader/CustomLoader";
import { ReservationDepositAlert } from "../../../components/ReservationDepositAlert";
import {
  selectReservationPolicy,
  selectSavingPolicy,
  updateReservationPolicy,
} from "../../../features/organization/sliceOrganization";

type RowAction = "approve" | "reject" | "delete" | "assign";

const ReservationsList: React.FC = () => {
  const dispatch = useDispatch<any>();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [initialLoading, setInitialLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<Record<string, RowAction | null>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningReservationId, setAssigningReservationId] = useState<
    string | null
  >(null);
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingReservationId, setDeletingReservationId] = useState<
    string | null
  >(null);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgPolicy = useSelector(selectReservationPolicy);
  const savingPolicy = useSelector(selectSavingPolicy);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // ------- FILTROS -------
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "auto_approved"
  >("all");
  const [employeeFilter, setEmployeeFilter] = useState<string | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyFuture, setShowOnlyFuture] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    // En mobile, empezamos con filtros colapsados; en desktop, abiertos
    setFiltersOpen(!isMobile);
  }, [isMobile]);

  // ------- LOADERS HELPERS -------
  const setRowBusy = (id: string, action: RowAction | null) =>
    setRowLoading((prev) => ({ ...prev, [id]: action }));

  const isRowBusy = (id: string) => Boolean(rowLoading[id]);

  // ------- HELPERS: EMPLEADO -------
  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e._id, e.names));
    return map;
  }, [employees]);

  const getEmployeeName = (reservation: Reservation): string | null => {
    // 1) Si el backend lo trae poblado como "employee"
    const populated = (reservation as any)?.employeeId?.names;
    if (typeof populated === "string" && populated.trim()) return populated.trim();
    console.log(populated)
    // 2) Si solo viene employeeId
    if (
      typeof reservation.employeeId === "string" &&
      employeeNameById.has(reservation.employeeId)
    ) {
      return employeeNameById.get(reservation.employeeId) ?? null;
    }
    return null;
  };

  const hasEmployeeAssigned = (reservation: Reservation) =>
    Boolean((reservation as any)?.employee?._id || reservation.employeeId);

  // ------- FETCH DATA -------
  useEffect(() => {
    if (organization?._id) {
      void loadPage(organization._id);
      void fetchEmployees(organization._id);
    }
  }, [organization?._id]);

  const loadPage = async (organizationId: string) => {
    setInitialLoading(true);
    setError(null);
    try {
      const data = await getReservationsByOrganization(organizationId);
      const sorted = data.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      setReservations(sorted);
    } catch (err) {
      console.error(err);
      setError("Error al cargar las reservas. Intenta nuevamente.");
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchEmployees = async (organizationId: string) => {
    try {
      const data = await getEmployeesByOrganizationId(organizationId);
      setEmployees(data);
    } catch (err) {
      console.error("Error al cargar los empleados:", err);
    }
  };

  // ------- HELPERS UI -------
  const translateStatus = (
    status: "pending" | "approved" | "rejected" | "auto_approved"
  ) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "approved":
        return "Aprobada";
      case "rejected":
        return "Rechazada";
      case "auto_approved":
        return "Auto-Aprobada";
      default:
        return "Desconocido";
    }
  };

  const getBadgeColor = (
    status: "pending" | "approved" | "rejected" | "auto_approved"
  ): string => {
    switch (status) {
      case "pending":
        return "yellow";
      case "approved":
        return "green";
      case "rejected":
        return "red";
      case "auto_approved":
        return "teal";
      default:
        return "gray";
    }
  };

  const employeesSelectData = useMemo(
    () => employees.map((e) => ({ value: e._id, label: e.names })),
    [employees]
  );

  // Servicios únicos para el filtro
  const serviceSelectData = useMemo(() => {
    const map = new Map<string, string>();
    reservations.forEach((r) => {
      const serviceObj = typeof r.serviceId === "object" ? r.serviceId : null;
      if (serviceObj?._id && serviceObj?.name) {
        map.set(serviceObj._id, serviceObj.name);
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [reservations]);

  const policyBadge = useMemo(() => {
    return orgPolicy === "auto_if_available" ? (
      <Badge color="green" variant="filled">
        Agendamiento automático
      </Badge>
    ) : (
      <Badge color="gray" variant="light">
        Aprobación manual
      </Badge>
    );
  }, [orgPolicy]);

  const policyHelpText =
    orgPolicy === "auto_if_available"
      ? "Las reservas se confirman y crean la cita automáticamente si hay disponibilidad inmediata. Si no hay cupo, la reserva queda pendiente."
      : "Las reservas requieren aprobación manual. No se crean citas automáticamente.";

  // ------- LISTA FILTRADA + ORDENADA -------
  const filteredReservations = useMemo(() => {
    const now = dayjs();
    const statusPriority: Record<string, number> = {
      pending: 0,
      auto_approved: 1,
      approved: 2,
      rejected: 3,
    };

    let list = [...reservations];

    // 1) Solo futuras
    if (showOnlyFuture) {
      list = list.filter((r) =>
        dayjs(r.startDate).isAfter(now.subtract(1, "minute"))
      );
    }

    // 2) Filtro por estado
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // 3) Filtro por empleado
    if (employeeFilter !== "all") {
      list = list.filter((r) => r.employeeId === employeeFilter);
    }

    // 4) Filtro por servicio
    if (serviceFilter !== "all") {
      list = list.filter((r) => {
        const serviceObj = typeof r.serviceId === "object" ? r.serviceId : null;
        return serviceObj?._id === serviceFilter;
      });
    }

    // 5) Búsqueda por cliente (nombre / teléfono / email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r) => {
        const name = r.customerDetails?.name?.toLowerCase() ?? "";
        const phone = (r.customerDetails as any)?.phone?.toLowerCase?.() ?? "";
        const email = (r.customerDetails as any)?.email?.toLowerCase?.() ?? "";
        return (
          name.includes(term) || phone.includes(term) || email.includes(term)
        );
      });
    }

    // 6) Orden: estado (pendiente primero) + fecha ascendente
    list.sort((a, b) => {
      const statusDiff =
        (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;

      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    return list;
  }, [
    reservations,
    showOnlyFuture,
    statusFilter,
    employeeFilter,
    serviceFilter,
    searchTerm,
  ]);

  const hasReservations = reservations.length > 0;

  // ------- ACTIONS -------
  const handleUpdateStatus = async (
    reservationId: string,
    newStatus: "approved" | "rejected"
  ) => {
    const reservation = reservations.find((r) => r._id === reservationId);
    if (!reservation) {
      showNotification({
        title: "Error",
        message: "Reserva no encontrada",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (newStatus === "approved" && !hasEmployeeAssigned(reservation)) {
      setAssigningReservationId(reservationId);
      setAssignModalOpen(true);
      return;
    }

    try {
      setRowBusy(reservationId, newStatus === "approved" ? "approve" : "reject");
      await updateReservation(reservationId, { status: newStatus });
      showNotification({
        title: "Actualizado",
        message: `Reserva ${
          newStatus === "approved" ? "aprobada" : "rechazada"
        } correctamente`,
        color: "green",
      });
      if (organization?._id) await loadPage(organization._id);
    } catch (err: any) {
      console.error(err);
      showNotification({
        title: "Error",
        message: `${err?.message || err}`,
        color: "red",
        autoClose: 4000,
      });
    } finally {
      setRowBusy(reservationId, null);
    }
  };

  const handleOpenAssignModal = (reservationId: string) => {
    setAssigningReservationId(reservationId);
    setSelectedEmployee(null);
    setAssignModalOpen(true);
  };

  const handleEmployeeAssign = async () => {
    if (!selectedEmployee || !assigningReservationId) return;
    try {
      setAssignModalLoading(true);
      setRowBusy(assigningReservationId, "assign");
      await updateReservation(assigningReservationId, {
        employeeId: selectedEmployee,
      });
      showNotification({
        title: "Asignado",
        message: "Empleado asignado correctamente",
        color: "green",
      });
      setAssignModalOpen(false);
      setSelectedEmployee(null);
      setAssigningReservationId(null);
      if (organization?._id) await loadPage(organization._id);
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al asignar empleado",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setAssignModalLoading(false);
      if (assigningReservationId) setRowBusy(assigningReservationId, null);
    }
  };

  const handleDelete = async (reservationId: string) => {
    setDeletingReservationId(reservationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingReservationId) return;
    try {
      setRowBusy(deletingReservationId, "delete");
      await deleteReservation(deletingReservationId);
      showNotification({
        title: "Eliminada",
        message: "La reserva fue eliminada",
        color: "green",
      });
      if (organization?._id) await loadPage(organization._id);
    } catch (err) {
      console.error("Error al eliminar la reserva:", err);
      showNotification({
        title: "Error",
        message: "No se pudo eliminar la reserva",
        color: "red",
      });
    } finally {
      setRowBusy(deletingReservationId, null);
      setDeletingReservationId(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleChangePolicy = async (nextPolicy: ReservationPolicy) => {
    if (!organization?._id) return;
    try {
      await dispatch(
        updateReservationPolicy({
          organizationId: organization._id,
          policy: nextPolicy,
        })
      ).unwrap();

      showNotification({
        title: "Configuración guardada",
        message:
          nextPolicy === "auto_if_available"
            ? "Agendamiento automático activado (si hay disponibilidad inmediata)."
            : "Aprobación manual activada.",
        color: "green",
      });
    } catch {
      showNotification({
        title: "Error",
        message: "No se pudo actualizar la política de agendamiento",
        color: "red",
      });
    }
  };

  // ------- RENDER HELPERS -------
  const renderSkeletonRows = (rows = 6) =>
    Array.from({ length: rows }).map((_, idx) => (
      <Table.Tr key={`sk-${idx}`}>
        <Table.Td>
          <Skeleton height={12} radius="sm" />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} radius="sm" />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} radius="sm" />
        </Table.Td>
        <Table.Td>
          <Skeleton height={12} radius="sm" />
        </Table.Td>
        <Table.Td>
          <Skeleton height={24} radius="xl" />
        </Table.Td>
        <Table.Td>
          <Group justify="center">
            <Skeleton height={28} width={28} radius="md" />
          </Group>
        </Table.Td>
      </Table.Tr>
    ));

  const renderMobileReservationCard = (reservation: Reservation) => {
    const busy = isRowBusy(reservation._id!);
    const isExpanded = expandedRows[reservation._id!];
    const serviceObj =
      typeof reservation.serviceId === "object" ? reservation.serviceId : null;
    const servicePrice = serviceObj?.price || 0;
    const serviceName = serviceObj?.name || "Sin especificar";

    const empName = getEmployeeName(reservation);
    const hasEmp = hasEmployeeAssigned(reservation);

    return (
      <Card
        key={reservation._id}
        withBorder
        radius="lg"
        shadow="xs"
        mb="sm"
        p="md"
      >
        <Group justify="space-between" align="flex-start" mb="xs">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap={6} align="center" wrap="wrap">
              <Badge size="xs" variant="outline" radius="lg">
                {dayjs(reservation.startDate).format("DD/MM HH:mm")}
              </Badge>

              <Badge
                size="xs"
                color={getBadgeColor(reservation.status)}
                variant="light"
                radius="lg"
              >
                {translateStatus(reservation.status)}
              </Badge>

              {/* ✅ Requiere empleado (manual + pending + sin empleado) */}
              {orgPolicy === "manual" &&
                reservation.status === "pending" &&
                !hasEmp && (
                  <Badge size="xs" color="orange" variant="light" radius="lg">
                    Requiere empleado
                  </Badge>
                )}
            </Group>

            <Text fw={600} size="sm">
              {serviceName}
            </Text>

            <Text size="xs" c="dimmed">
              Cliente:{" "}
              <Text span fw={500} c="dark">
                {reservation.customerDetails?.name ?? "—"}
              </Text>
            </Text>

            {/* ✅ Empleado visible en la card */}
            <Text size="xs" c="dimmed">
              Empleado:{" "}
              {hasEmp ? (
                <Text span fw={500} c="dark">
                  {empName ?? "Asignado"}
                </Text>
              ) : (
                <Badge
                  size="xs"
                  color="red"
                  variant="light"
                  radius="lg"
                  style={{ verticalAlign: "middle" }}
                >
                  Sin asignar
                </Badge>
              )}
            </Text>
          </Stack>

          <Menu withArrow position="bottom-end" shadow="sm" disabled={busy}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                radius="xl"
                loading={busy}
                aria-label="Acciones"
              >
                <BiDotsVertical />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {orgPolicy === "manual" && reservation.status === "pending" && (
                <>
                  <Menu.Item
                    leftSection={
                      rowLoading[reservation._id!] === "approve" ? (
                        <Skeleton height={12} width={12} circle />
                      ) : (
                        <BiCheck size={16} />
                      )
                    }
                    onClick={() => handleUpdateStatus(reservation._id!, "approved")}
                    disabled={busy}
                  >
                    Aprobar
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      rowLoading[reservation._id!] === "reject" ? (
                        <Skeleton height={12} width={12} circle />
                      ) : (
                        <BiXCircle size={16} />
                      )
                    }
                    color="red"
                    onClick={() => handleUpdateStatus(reservation._id!, "rejected")}
                    disabled={busy}
                  >
                    Rechazar
                  </Menu.Item>
                </>
              )}

              <Menu.Item
                leftSection={<BiUser size={16} />}
                onClick={() => handleOpenAssignModal(reservation._id!)}
                disabled={busy}
              >
                Cambiar empleado
              </Menu.Item>

              <Menu.Item
                leftSection={
                  rowLoading[reservation._id!] === "delete" ? (
                    <Skeleton height={12} width={12} circle />
                  ) : (
                    <BiTrash size={16} />
                  )
                }
                color="gray"
                onClick={() => handleDelete(reservation._id!)}
                disabled={busy}
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {reservation.status === "pending" &&
          organization?.requireReservationDeposit && (
            <>
              <Button
                variant="subtle"
                size="xs"
                leftSection={isExpanded ? <BiChevronUp /> : <BiChevronDown />}
                onClick={() =>
                  setExpandedRows((prev) => ({
                    ...prev,
                    [reservation._id!]: !prev[reservation._id!],
                  }))
                }
              >
                {isExpanded ? "Ocultar info de depósito" : "Ver info de depósito"}
              </Button>

              <Collapse in={isExpanded}>
                <Box mt="xs">
                  <ReservationDepositAlert
                    reservationId={reservation._id}
                    clientName={reservation.customerDetails?.name}
                    serviceName={serviceName}
                    servicePrice={servicePrice}
                    appointmentDate={dayjs(reservation.startDate).format(
                      "DD/MM/YYYY"
                    )}
                    appointmentTime={dayjs(reservation.startDate).format("HH:mm")}
                  />
                </Box>
              </Collapse>
            </>
          )}
      </Card>
    );
  };

  // ------- RENDER -------
  return (
    <>
      {savingPolicy && (
        <CustomLoader overlay loadingText="Actualizando política..." />
      )}

      {/* Modal Asignar empleado */}
      <Modal
        opened={assignModalOpen}
        onClose={() => {
          if (!assignModalLoading) {
            setAssignModalOpen(false);
            setAssigningReservationId(null);
            setSelectedEmployee(null);
          }
        }}
        title="Asignar empleado"
        centered
      >
        <div style={{ position: "relative" }}>
          <LoadingOverlay visible={assignModalLoading} zIndex={1000} />
          <Select
            label="Selecciona un empleado"
            placeholder="Empleado"
            data={employeesSelectData}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            searchable
            nothingFoundMessage="Sin resultados"
          />
          <Button
            mt="md"
            fullWidth
            onClick={handleEmployeeAssign}
            disabled={!selectedEmployee}
            loading={assignModalLoading}
          >
            Asignar
          </Button>
        </div>
      </Modal>

      {/* Modal Confirmar eliminación */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => {
          if (!deletingReservationId || !isRowBusy(deletingReservationId)) {
            setDeleteConfirmOpen(false);
            setDeletingReservationId(null);
          }
        }}
        title="Confirmar eliminación"
        centered
      >
        <Text size="sm">
          ¿Seguro que deseas eliminar esta reserva? Esta acción no se puede
          deshacer.
        </Text>
        <Group mt="md" justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeletingReservationId(null);
            }}
            disabled={!!(deletingReservationId && isRowBusy(deletingReservationId))}
          >
            Cancelar
          </Button>
          <Button
            color="red"
            onClick={confirmDelete}
            loading={!!(deletingReservationId && isRowBusy(deletingReservationId))}
          >
            Eliminar
          </Button>
        </Group>
      </Modal>

      <Card shadow="sm" radius="lg" withBorder style={{ position: "relative" }}>
        {/* Header */}
        <Group justify="space-between" align="flex-start" mb="sm">
          <Stack gap={2}>
            <Text size={isMobile ? "lg" : "xl"} fw={600}>
              Reservas de la organización
            </Text>
            <Text size="xs" c="dimmed">
              Revisa, filtra y gestiona las reservas creadas desde tu página o
              WhatsApp.
            </Text>
          </Stack>

          <Stack gap={4} align="flex-end">
            <Tooltip label={policyHelpText} withArrow>
              <span>{policyBadge}</span>
            </Tooltip>
            <Group gap="xs" align="flex-end">
              <Select
                w={isMobile ? 200 : 260}
                label="Política de agendamiento"
                value={orgPolicy}
                onChange={(val) => val && handleChangePolicy(val as ReservationPolicy)}
                data={[
                  { value: "manual", label: "Aprobación manual" },
                  {
                    value: "auto_if_available",
                    label: "Automático si hay disponibilidad",
                  },
                ]}
                disabled={!organization?._id || savingPolicy}
                comboboxProps={{ withinPortal: true }}
                rightSection={savingPolicy ? <Loader size="xs" /> : null}
              />
              {savingPolicy && (
                <Group gap={6} align="center">
                  <Loader size="xs" />
                  <Text size="xs" c="dimmed" aria-live="polite">
                    Guardando…
                  </Text>
                </Group>
              )}
            </Group>
          </Stack>
        </Group>

        <Divider mb="md" />

        {/* FILTROS */}
        <Box
          mb="md"
          p="sm"
          bg={colorScheme === "dark" ? "dark.7" : "gray.0"}
          style={{ borderRadius: theme.radius.md }}
        >
          <Group justify="space-between" align="center" mb={isMobile ? "xs" : 8}>
            <Group gap={6}>
              <BiFilter size={16} />
              <Text size="sm" fw={500}>
                Filtros
              </Text>
              <Text size="xs" c="dimmed">
                Ajusta la vista según estado, empleado, servicio o cliente.
              </Text>
            </Group>

            {isMobile && (
              <Button
                variant="subtle"
                size="xs"
                leftSection={filtersOpen ? <BiChevronUp /> : <BiChevronDown />}
                onClick={() => setFiltersOpen((prev) => !prev)}
              >
                {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
              </Button>
            )}
          </Group>

          <Collapse in={filtersOpen}>
            <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
              <Group gap="sm" align="flex-end">
                <Select
                  label="Estado"
                  placeholder="Todos"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter((val as typeof statusFilter) || "all")}
                  data={[
                    { value: "all", label: "Todos" },
                    { value: "pending", label: "Pendiente" },
                    { value: "approved", label: "Aprobada" },
                    { value: "auto_approved", label: "Auto-aprobada" },
                    { value: "rejected", label: "Rechazada" },
                  ]}
                  w={170}
                />

                <Select
                  label="Empleado"
                  placeholder="Todos"
                  value={employeeFilter}
                  onChange={(val) => setEmployeeFilter((val as string) || "all")}
                  data={[{ value: "all", label: "Todos" }, ...employeesSelectData]}
                  w={190}
                  searchable
                />

                <Select
                  label="Servicio"
                  placeholder="Todos"
                  value={serviceFilter}
                  onChange={(val) => setServiceFilter((val as string) || "all")}
                  data={[{ value: "all", label: "Todos" }, ...serviceSelectData]}
                  w={190}
                  searchable
                />
              </Group>

              <Group gap="sm" align="flex-end">
                <TextInput
                  label="Buscar cliente"
                  placeholder="Nombre, teléfono o email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.currentTarget.value)}
                  w={220}
                />

                <Switch
                  size="sm"
                  checked={showOnlyFuture}
                  onChange={(event) => setShowOnlyFuture(event.currentTarget.checked)}
                  label="Solo futuras"
                />

                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setStatusFilter("all");
                    setEmployeeFilter("all");
                    setServiceFilter("all");
                    setSearchTerm("");
                    setShowOnlyFuture(true);
                  }}
                >
                  Limpiar filtros
                </Button>
              </Group>
            </Group>
          </Collapse>
        </Box>

        <Alert
          variant="light"
          color={orgPolicy === "auto_if_available" ? "green" : "gray"}
          icon={<BiInfoCircle />}
          mb="md"
        >
          {orgPolicy === "auto_if_available" ? (
            <Text size="sm">
              Al crear una <strong>reserva</strong>, si existe cupo inmediato según
              el servicio, empleado (si aplica) y horario, se{" "}
              <strong>confirma</strong> y se crea la <strong>cita</strong>{" "}
              automáticamente. Si no, la reserva quedará <em>pendiente</em>.
            </Text>
          ) : (
            <Text size="sm">
              Las reservas requieren <strong>aprobación</strong> antes de crear una
              cita.
            </Text>
          )}
        </Alert>

        {error && (
          <Stack align="center" mb="md">
            <Text c="red">{error}</Text>
            <Button
              variant="light"
              onClick={() => organization?._id && loadPage(organization._id)}
            >
              Reintentar
            </Button>
          </Stack>
        )}

        {initialLoading ? (
          isMobile ? (
            <Stack>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Card key={idx} withBorder radius="lg" shadow="xs" p="md">
                  <Skeleton height={10} mb="xs" />
                  <Skeleton height={10} mb="xs" />
                  <Skeleton height={10} width="60%" />
                </Card>
              ))}
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={760} type="native" mah={520}>
              <Table withTableBorder withColumnBorders striped highlightOnHover stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Servicio</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Empleado</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th style={{ width: 80, textAlign: "center" }}>
                      Acciones
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{renderSkeletonRows()}</Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )
        ) : filteredReservations.length === 0 ? (
          <Center py="xl">
            <Stack gap={6} align="center">
              <Text c="dimmed">
                {hasReservations
                  ? "No hay reservas que coincidan con los filtros."
                  : "No hay reservas para mostrar."}
              </Text>
              {hasReservations && (
                <Text size="sm" c="dimmed">
                  Ajusta los filtros o limpia la búsqueda para ver más resultados.
                </Text>
              )}
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack>
            {filteredReservations.map((reservation) => renderMobileReservationCard(reservation))}
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={760} type="native" mah={520}>
            <Table withTableBorder withColumnBorders striped highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Empleado</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th style={{ width: 80, textAlign: "center" }}>
                    Acciones
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredReservations.map((reservation) => {
                  const busy = isRowBusy(reservation._id!);
                  const isExpanded = expandedRows[reservation._id!];

                  const serviceObj =
                    typeof reservation.serviceId === "object" ? reservation.serviceId : null;
                  const servicePrice = serviceObj?.price || 0;
                  const serviceName = serviceObj?.name || "Sin especificar";

                  const empName = getEmployeeName(reservation);
                  const hasEmp = hasEmployeeAssigned(reservation);

                  return (
                    <React.Fragment key={reservation._id}>
                      <Table.Tr>
                        <Table.Td>
                          {reservation.status === "pending" &&
                            organization?.requireReservationDeposit && (
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [reservation._id!]: !prev[reservation._id!],
                                  }))
                                }
                                mr="xs"
                              >
                                {isExpanded ? <BiChevronUp /> : <BiChevronDown />}
                              </ActionIcon>
                            )}
                          {dayjs(reservation.startDate).format("DD/MM/YYYY HH:mm")}
                        </Table.Td>

                        <Table.Td>{serviceName}</Table.Td>

                        <Table.Td>{reservation.customerDetails?.name ?? "—"}</Table.Td>

                        {/* ✅ NUEVO: Empleado */}
                        <Table.Td>
                          {hasEmp ? (
                            <Badge variant="light" color="grape">
                              {empName ?? "Asignado"}
                            </Badge>
                          ) : (
                            <Badge variant="light" color="red">
                              Sin asignar
                            </Badge>
                          )}
                          {orgPolicy === "manual" &&
                            reservation.status === "pending" &&
                            !hasEmp && (
                              <Badge ml={6} variant="light" color="orange">
                                Requiere empleado
                              </Badge>
                            )}
                        </Table.Td>

                        <Table.Td>
                          <Badge fullWidth color={getBadgeColor(reservation.status)}>
                            {translateStatus(reservation.status)}
                          </Badge>
                        </Table.Td>

                        <Table.Td style={{ textAlign: "center" }}>
                          <Menu withArrow position="bottom-end" shadow="sm" disabled={busy}>
                            <Menu.Target>
                              <ActionIcon
                                variant="light"
                                radius="md"
                                loading={busy}
                                aria-label="Acciones"
                              >
                                <BiDotsVertical />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {orgPolicy === "manual" && reservation.status === "pending" && (
                                <>
                                  <Menu.Item
                                    leftSection={
                                      rowLoading[reservation._id!] === "approve" ? (
                                        <Skeleton height={12} width={12} circle />
                                      ) : (
                                        <BiCheck size={16} />
                                      )
                                    }
                                    onClick={() =>
                                      handleUpdateStatus(reservation._id!, "approved")
                                    }
                                    disabled={busy}
                                  >
                                    Aprobar
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={
                                      rowLoading[reservation._id!] === "reject" ? (
                                        <Skeleton height={12} width={12} circle />
                                      ) : (
                                        <BiXCircle size={16} />
                                      )
                                    }
                                    color="red"
                                    onClick={() =>
                                      handleUpdateStatus(reservation._id!, "rejected")
                                    }
                                    disabled={busy}
                                  >
                                    Rechazar
                                  </Menu.Item>
                                </>
                              )}

                              <Menu.Item
                                leftSection={<BiUser size={16} />}
                                onClick={() => handleOpenAssignModal(reservation._id!)}
                                disabled={busy}
                              >
                                Cambiar empleado
                              </Menu.Item>

                              <Menu.Item
                                leftSection={
                                  rowLoading[reservation._id!] === "delete" ? (
                                    <Skeleton height={12} width={12} circle />
                                  ) : (
                                    <BiTrash size={16} />
                                  )
                                }
                                color="gray"
                                onClick={() => handleDelete(reservation._id!)}
                                disabled={busy}
                              >
                                Eliminar
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Table.Td>
                      </Table.Tr>

                      {reservation.status === "pending" &&
                        organization?.requireReservationDeposit && (
                          <Table.Tr>
                            {/* ✅ colSpan actualizado por la nueva columna */}
                            <Table.Td colSpan={6} p={0}>
                              <Collapse in={isExpanded}>
                                <Box p="md">
                                  <ReservationDepositAlert
                                    reservationId={reservation._id}
                                    clientName={reservation.customerDetails?.name}
                                    serviceName={serviceName}
                                    servicePrice={servicePrice}
                                    appointmentDate={dayjs(reservation.startDate).format(
                                      "DD/MM/YYYY"
                                    )}
                                    appointmentTime={dayjs(reservation.startDate).format("HH:mm")}
                                  />
                                </Box>
                              </Collapse>
                            </Table.Td>
                          </Table.Tr>
                        )}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </>
  );
};

export default ReservationsList;
