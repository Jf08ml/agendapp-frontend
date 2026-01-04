/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Card,
  Text,
  Badge,
  Stack,
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

  const [initialLoading, setInitialLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<
    Record<string, RowAction | null>
  >({});
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

  // Modal de detalle de reserva
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedGroupReservations, setSelectedGroupReservations] = useState<Reservation[]>([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);

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
    if (typeof populated === "string" && populated.trim()) {
      return populated.trim();
    }
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

  // ------- MODAL DETALLE -------
  const handleOpenDetail = (reservation: Reservation, groupReservations?: Reservation[]) => {
    setSelectedReservation(reservation);
    setSelectedGroupReservations(groupReservations || [reservation]);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedReservation(null);
    setSelectedGroupReservations([]);
  };

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
    status: "pending" | "approved" | "rejected" | "auto_approved" | "cancelled_by_customer" | "cancelled_by_admin"
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
      case "cancelled_by_customer":
        return "Cancelada por Cliente";
      case "cancelled_by_admin":
        return "Cancelada por Admin";
      default:
        return "Desconocido";
    }
  };

  const getBadgeColor = (
    status: "pending" | "approved" | "rejected" | "auto_approved" | "cancelled_by_customer" | "cancelled_by_admin"
  ): string => {
    switch (status) {
      case "pending":
        return "yellow";
      case "approved":
        return "green";
      case "rejected":
        return "red";
      case "cancelled_by_customer":
        return "orange";
      case "cancelled_by_admin":
        return "gray";
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

  // 👥 Crear un mapa de groupId para identificar grupos rápidamente
  const groupsMap = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filteredReservations.forEach(reservation => {
      if (reservation.groupId) {
        if (!map.has(reservation.groupId)) {
          map.set(reservation.groupId, []);
        }
        map.get(reservation.groupId)!.push(reservation);
      }
    });
    return map;
  }, [filteredReservations]);

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
      setRowBusy(
        reservationId,
        newStatus === "approved" ? "approve" : "reject"
      );
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
    
    // Buscar si es un grupo para mostrar el mensaje correcto
    const reservation = reservations.find(r => r._id === deletingReservationId);
    const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
    const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;
    
    try {
      setRowBusy(deletingReservationId, "delete");
      await deleteReservation(deletingReservationId);
      
      showNotification({
        title: "Eliminada",
        message: isGroup 
          ? `Grupo de ${groupSize} reservas eliminado correctamente`
          : "Reserva eliminada correctamente",
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });
      setDeleteConfirmOpen(false);
      setDeletingReservationId(null);
      if (organization?._id) await loadPage(organization._id);
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al eliminar la reserva",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      if (deletingReservationId) setRowBusy(deletingReservationId, null);
    }
  };

  // 👥 ACCIONES GRUPALES
  const handleApproveGroup = async (groupId: string) => {
    const group = groupsMap.get(groupId);
    if (!group) return;

    try {
      for (const reservation of group) {
        if (reservation._id) {
          setRowBusy(reservation._id, "approve");
        }
      }

      const pendingReservations = group.filter(r => r._id && r.status === "pending");
      
      // Aprobar todas menos la última con skipNotification: true
      for (let i = 0; i < pendingReservations.length; i++) {
        const r = pendingReservations[i];
        const isLast = i === pendingReservations.length - 1;
        await updateReservation(r._id!, { 
          status: "approved",
          skipNotification: !isLast  // Solo la última envía WhatsApp
        } as any);
      }

      showNotification({
        title: "Grupo Aprobado",
        message: `${pendingReservations.length} reserva(s) aprobada(s) exitosamente`,
        color: "green",
        position: "top-right",
        autoClose: 3000,
      });

      if (organization?._id) await loadPage(organization._id);
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al aprobar el grupo de reservas",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      group.forEach(r => {
        if (r._id) setRowBusy(r._id, null);
      });
    }
  };

  const handleRejectGroup = async (groupId: string) => {
    const group = groupsMap.get(groupId);
    if (!group) return;

    try {
      for (const reservation of group) {
        if (reservation._id) {
          setRowBusy(reservation._id, "reject");
        }
      }

      const promises = group
        .filter(r => r._id && r.status === "pending")
        .map(r => updateReservation(r._id!, { status: "rejected" }));

      await Promise.all(promises);

      showNotification({
        title: "Grupo Rechazado",
        message: `${promises.length} reserva(s) rechazada(s)`,
        color: "orange",
        position: "top-right",
        autoClose: 3000,
      });

      if (organization?._id) await loadPage(organization._id);
    } catch (err) {
      console.error(err);
      showNotification({
        title: "Error",
        message: "Error al rechazar el grupo de reservas",
        color: "red",
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      group.forEach(r => {
        if (r._id) setRowBusy(r._id, null);
      });
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
          <Skeleton height={24} radius="xl" />
        </Table.Td>
      </Table.Tr>
    ));

  const renderMobileReservationCard = (reservation: Reservation, groupReservations?: Reservation[]) => {
    const serviceObj =
      typeof reservation.serviceId === "object" ? reservation.serviceId : null;
    const serviceName = serviceObj?.name || "Sin especificar";
    const isGroup = groupReservations && groupReservations.length > 1;

    return (
      <Card
        key={reservation._id}
        withBorder
        radius="lg"
        shadow="xs"
        mb="sm"
        p="md"
        style={{ cursor: 'pointer' }}
        onClick={() => handleOpenDetail(reservation, groupReservations)}
      >
        <Stack gap={8}>
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

            {isGroup && (
              <Badge size="xs" variant="dot" color="blue" radius="lg">
                Grupo
              </Badge>
            )}
          </Group>

          <Text fw={600} size="sm">
            {isGroup ? `${groupReservations.length} servicios` : serviceName}
          </Text>

          {isGroup && (
            <Text size="xs" c="dimmed">
              {groupReservations.map(r => {
                const sObj = typeof r.serviceId === "object" ? r.serviceId : null;
                return sObj?.name || "—";
              }).join(", ")}
            </Text>
          )}

          <Text size="xs" c="dimmed">
            Cliente:{" "}
            <Text span fw={500} c="dark">
              {reservation.customerDetails?.name ?? "—"}
            </Text>
          </Text>
        </Stack>
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
        {(() => {
          const reservation = reservations.find(r => r._id === deletingReservationId);
          const isGroup = reservation?.groupId ? groupsMap.has(reservation.groupId) : false;
          const groupSize = isGroup && reservation?.groupId ? groupsMap.get(reservation.groupId)?.length || 0 : 0;
          
          return (
            <Text size="sm">
              {isGroup ? (
                <>
                  ¿Seguro que deseas eliminar este <strong>grupo de {groupSize} reservas</strong>? 
                  Se eliminarán todas las reservas asociadas. Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  ¿Seguro que deseas eliminar esta reserva? Esta acción no se puede deshacer.
                </>
              )}
            </Text>
          );
        })()}
        <Group mt="md" justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeletingReservationId(null);
            }}
            disabled={
              !!(deletingReservationId && isRowBusy(deletingReservationId))
            }
          >
            Cancelar
          </Button>
          <Button
            color="red"
            onClick={confirmDelete}
            loading={
              !!(deletingReservationId && isRowBusy(deletingReservationId))
            }
          >
            Eliminar
          </Button>
        </Group>
      </Modal>

      {/* Modal Detalle de Reserva */}
      <Modal
        opened={detailModalOpen}
        onClose={handleCloseDetail}
        title={
          selectedGroupReservations.length > 1
            ? `Grupo de ${selectedGroupReservations.length} Reservas`
            : "Detalle de Reserva"
        }
        size="lg"
        centered
      >
        <div style={{ position: "relative" }}>
          <LoadingOverlay visible={detailModalLoading} zIndex={1000} />
          {selectedReservation ? (
          <Stack gap="md">
            {/* Información del Cliente */}
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb={4}>
                Cliente
              </Text>
              <Text size="lg" fw={500}>
                {selectedReservation.customerDetails?.name ?? "—"}
              </Text>
              {selectedReservation.customerDetails?.phone && (
                <Text size="sm" c="dimmed">
                  {selectedReservation.customerDetails.phone}
                </Text>
              )}
            </Box>

            <Divider />

            {/* Servicios */}
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb={8}>
                {selectedGroupReservations.length > 1 ? "Servicios" : "Servicio"}
              </Text>
              <Stack gap="xs">
                {selectedGroupReservations.map((res, idx) => {
                  const serviceObj = typeof res.serviceId === "object" ? res.serviceId : null;
                  const serviceName = serviceObj?.name || "Sin especificar";
                  const servicePrice = serviceObj?.price || 0;
                  const empName = getEmployeeName(res);
                  const hasEmp = hasEmployeeAssigned(res);

                  return (
                    <Card key={res._id || idx} withBorder p="sm" radius="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Text fw={500}>{serviceName}</Text>
                            <Badge size="sm" color={getBadgeColor(res.status)}>
                              {translateStatus(res.status)}
                            </Badge>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {dayjs(res.startDate).format("DD/MM/YYYY HH:mm")}
                          </Text>
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              Empleado:
                            </Text>
                            {hasEmp ? (
                              <Badge variant="light" color="grape" size="sm">
                                {empName ?? "Asignado"}
                              </Badge>
                            ) : (
                              <Badge variant="light" color="red" size="sm">
                                Sin asignar
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                        <Text fw={600} size="lg">
                          ${servicePrice}
                        </Text>
                      </Group>

                      {/* Acciones Individuales */}
                      {res.status === "pending" && (
                        <Group mt="sm" gap="xs">
                          {orgPolicy === "manual" && (
                            <>
                              <Button
                                size="xs"
                                variant="light"
                                color="green"
                                leftSection={<BiCheck />}
                                onClick={() => {
                                  handleUpdateStatus(res._id!, "approved");
                                  handleCloseDetail();
                                }}
                                loading={isRowBusy(res._id!)}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="xs"
                                variant="light"
                                color="red"
                                leftSection={<BiXCircle />}
                                onClick={() => {
                                  handleUpdateStatus(res._id!, "rejected");
                                  handleCloseDetail();
                                }}
                                loading={isRowBusy(res._id!)}
                              >
                                Rechazar
                              </Button>
                            </>
                          )}
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<BiUser />}
                            onClick={() => {
                              handleOpenAssignModal(res._id!);
                              handleCloseDetail();
                            }}
                            loading={isRowBusy(res._id!)}
                          >
                            Empleado
                          </Button>
                        </Group>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            </Box>

            {/* Información de Abono si aplica */}
            {selectedReservation.status === "pending" &&
              organization?.requireReservationDeposit && (
                <>
                  <Divider />
                  <Alert color="blue" icon={<BiInfoCircle />}>
                    {organization?.reservationDepositPercentage && organization.reservationDepositPercentage > 0 ? (
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Abono requerido:
                        </Text>
                        <Text size="sm" c="blue" fw={700}>
                          ${(() => {
                            const totalPrice = selectedGroupReservations.reduce((sum, r) => {
                              const sObj = typeof r.serviceId === "object" ? r.serviceId : null;
                              const price = sObj?.price || 0;
                              return sum + price;
                            }, 0);
                            const deposit = (totalPrice * organization.reservationDepositPercentage) / 100;
                            return deposit.toLocaleString('es-CL');
                          })()}
                        </Text>
                        <Text size="xs" c="dimmed">
                          ({organization.reservationDepositPercentage}% del total de ${selectedGroupReservations.reduce((sum, r) => {
                            const sObj = typeof r.serviceId === "object" ? r.serviceId : null;
                            return sum + (sObj?.price || 0);
                          }, 0).toLocaleString('es-CL')})
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        ⚠️ El porcentaje de depósito no está configurado. Ve a Configuración → Organización para establecerlo.
                      </Text>
                    )}
                  </Alert>
                </>
              )}

            <Divider />

            {/* Acciones Grupales */}
            {selectedGroupReservations.length > 1 &&
              selectedGroupReservations.every(r => r.status === "pending") && (
                <Group gap="xs" grow>
                  {orgPolicy === "manual" && (
                    <>
                      <Button
                        color="green"
                        leftSection={<BiCheck />}
                        onClick={async () => {
                          if (selectedReservation.groupId) {
                            setDetailModalLoading(true);
                            await handleApproveGroup(selectedReservation.groupId);
                            setDetailModalLoading(false);
                            handleCloseDetail();
                          }
                        }}
                        loading={detailModalLoading}
                        disabled={detailModalLoading}
                      >
                        Aprobar Todas
                      </Button>
                      <Button
                        color="red"
                        leftSection={<BiXCircle />}
                        onClick={async () => {
                          if (selectedReservation.groupId) {
                            setDetailModalLoading(true);
                            await handleRejectGroup(selectedReservation.groupId);
                            setDetailModalLoading(false);
                            handleCloseDetail();
                          }
                        }}
                        loading={detailModalLoading}
                        disabled={detailModalLoading}
                      >
                        Rechazar Todas
                      </Button>
                    </>
                  )}
                </Group>
              )}

            {/* Botón de Eliminar */}
            <Button
              variant="subtle"
              color="gray"
              leftSection={<BiTrash />}
              onClick={() => {
                handleDelete(selectedReservation._id!);
                handleCloseDetail();
              }}
            >
              Eliminar Reserva
            </Button>
          </Stack>
          ) : (
            <Text c="dimmed" ta="center">No hay información disponible</Text>
          )}
        </div>
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
                onChange={(val) =>
                  val && handleChangePolicy(val as ReservationPolicy)
                }
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
          <Group
            justify="space-between"
            align="center"
            mb={isMobile ? "xs" : 8}
          >
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
            <Group
              justify="space-between"
              align="flex-end"
              wrap="wrap"
              gap="sm"
            >
              <Group gap="sm" align="flex-end">
                <Select
                  label="Estado"
                  placeholder="Todos"
                  value={statusFilter}
                  onChange={(val) =>
                    setStatusFilter((val as typeof statusFilter) || "all")
                  }
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
                  onChange={(val) =>
                    setEmployeeFilter((val as string) || "all")
                  }
                  data={[
                    { value: "all", label: "Todos" },
                    ...employeesSelectData,
                  ]}
                  w={190}
                  searchable
                />

                <Select
                  label="Servicio"
                  placeholder="Todos"
                  value={serviceFilter}
                  onChange={(val) => setServiceFilter((val as string) || "all")}
                  data={[
                    { value: "all", label: "Todos" },
                    ...serviceSelectData,
                  ]}
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
                  onChange={(event) =>
                    setShowOnlyFuture(event.currentTarget.checked)
                  }
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
              Al crear una <strong>reserva</strong>, si existe cupo inmediato
              según el servicio, empleado (si aplica) y horario, se{" "}
              <strong>confirma</strong> y se crea la <strong>cita</strong>{" "}
              automáticamente. Si no, la reserva quedará <em>pendiente</em>.
            </Text>
          ) : (
            <Text size="sm">
              Las reservas requieren <strong>aprobación</strong> antes de crear
              una cita.
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
              <Table
                withTableBorder
                withColumnBorders
                striped
                highlightOnHover
                stickyHeader
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Servicios</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Estado</Table.Th>
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
                  Ajusta los filtros o limpia la búsqueda para ver más
                  resultados.
                </Text>
              )}
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack>
            {filteredReservations.map((reservation) => {
              // Filtrar para mostrar solo la primera del grupo
              const groupId = reservation.groupId;
              const groupReservations = groupId ? groupsMap.get(groupId) : null;
              const isPartOfGroup = !!groupReservations && groupReservations.length > 1;
              const groupIndex = groupReservations ? groupReservations.findIndex(r => r._id === reservation._id) : -1;
              const isFirstInGroup = groupIndex === 0;
              
              if (isPartOfGroup && !isFirstInGroup) {
                return null;
              }
              
              return renderMobileReservationCard(reservation, groupReservations || undefined);
            })}
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={760} type="native" mah={520}>
            <Table
              withTableBorder
              withColumnBorders
              striped
              highlightOnHover
              stickyHeader
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Servicios</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredReservations.map((reservation) => {
                  // 👥 Verificar si es parte de un grupo
                  const groupId = reservation.groupId;
                  const groupReservations = groupId ? groupsMap.get(groupId) : null;
                  const isPartOfGroup = !!groupReservations && groupReservations.length > 1;
                  const groupIndex = groupReservations ? groupReservations.findIndex(r => r._id === reservation._id) : -1;
                  const isFirstInGroup = groupIndex === 0;
                  
                  // Si es parte de un grupo y NO es la primera, no renderizar (ya se mostrará en la fila del grupo)
                  if (isPartOfGroup && !isFirstInGroup) {
                    return null;
                  }

                  const serviceObj =
                    typeof reservation.serviceId === "object"
                      ? reservation.serviceId
                      : null;
                  const serviceName = serviceObj?.name || "Sin especificar";

                  return (
                    <React.Fragment key={reservation._id}>
                      <Table.Tr 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleOpenDetail(reservation, groupReservations || undefined)}
                      >
                        <Table.Td>
                          {dayjs(reservation.startDate).format(
                            "DD/MM/YYYY HH:mm"
                          )}
                          {isPartOfGroup && (
                            <Tooltip label={`Grupo de ${groupReservations.length} reservas`}>
                              <Badge size="xs" variant="dot" color="blue" ml={8}>
                                Grupo
                              </Badge>
                            </Tooltip>
                          )}
                        </Table.Td>

                        <Table.Td>
                          {isPartOfGroup ? (
                            <div>
                              <Text size="sm" fw={500}>
                                {groupReservations.length} servicios
                              </Text>
                              <Text size="xs" c="dimmed">
                                {groupReservations.map(r => {
                                  const sObj = typeof r.serviceId === "object" ? r.serviceId : null;
                                  return sObj?.name || "—";
                                }).join(", ")}
                              </Text>
                            </div>
                          ) : (
                            serviceName
                          )}
                        </Table.Td>

                        <Table.Td>
                          {reservation.customerDetails?.name ?? "—"}
                        </Table.Td>

                        <Table.Td>
                          <Badge
                            fullWidth
                            color={getBadgeColor(reservation.status)}
                          >
                            {translateStatus(reservation.status)}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
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
