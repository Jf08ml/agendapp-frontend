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
} from "@mantine/core";
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

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const orgPolicy = useSelector(selectReservationPolicy);
  const savingPolicy = useSelector(selectSavingPolicy);

  // ------- LOADERS HELPERS -------
  const setRowBusy = (id: string, action: RowAction | null) =>
    setRowLoading((prev) => ({ ...prev, [id]: action }));

  const isRowBusy = (id: string) => Boolean(rowLoading[id]);

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

    if (newStatus === "approved" && !reservation.employeeId) {
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

  // ------- RENDER -------
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
        <Table.Td>
          <Group justify="center">
            <Skeleton height={28} width={28} radius="md" />
          </Group>
        </Table.Td>
      </Table.Tr>
    ));

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

      <Card shadow="sm" radius="md" withBorder style={{ position: "relative" }}>
        <Group justify="space-between" align="center" mb="sm">
          <Group align="center" gap="sm">
            <Text size="xl" fw={600}>
              Reservas de la organización
            </Text>
            <Tooltip label={policyHelpText} withArrow>
              <span>{policyBadge}</span>
            </Tooltip>
          </Group>

          {/* Selector de política */}
          <Group gap="xs">
            <Select
              w={260}
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
              <Group gap={6} align="center" ml="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed" aria-live="polite">
                  Guardando…
                </Text>
              </Group>
            )}
          </Group>
        </Group>

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

        <Table.ScrollContainer minWidth={640} type="native" mah={520}>
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
                <Table.Th>Servicio</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th style={{ width: 80, textAlign: "center" }}>
                  Acciones
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {initialLoading ? (
                renderSkeletonRows()
              ) : reservations.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Stack gap={6} align="center">
                        <Text c="dimmed">No hay reservas para mostrar.</Text>
                        <Text size="sm" c="dimmed">
                          Cuando se creen reservas, aparecerán aquí.
                        </Text>
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                reservations.map((reservation) => {
                  const busy = isRowBusy(reservation._id!);
                  return (
                    <Table.Tr key={reservation._id}>
                      <Table.Td>
                        {dayjs(reservation.startDate).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </Table.Td>
                      <Table.Td>
                        {typeof reservation.serviceId === "string"
                          ? reservation.serviceId
                          : reservation.serviceId?.name || "Sin especificar"}
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
                      <Table.Td style={{ textAlign: "center" }}>
                        <Menu
                          withArrow
                          position="bottom-end"
                          shadow="sm"
                          disabled={busy}
                        >
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
                            {orgPolicy === "manual" &&
                              reservation.status === "pending" && (
                                <>
                                  <Menu.Item
                                    leftSection={
                                      rowLoading[reservation._id!] ===
                                      "approve" ? (
                                        <Skeleton
                                          height={12}
                                          width={12}
                                          circle
                                        />
                                      ) : (
                                        <BiCheck size={16} />
                                      )
                                    }
                                    onClick={() =>
                                      handleUpdateStatus(
                                        reservation._id!,
                                        "approved"
                                      )
                                    }
                                    disabled={busy}
                                  >
                                    Aprobar
                                  </Menu.Item>
                                  <Menu.Item
                                    leftSection={
                                      rowLoading[reservation._id!] ===
                                      "reject" ? (
                                        <Skeleton
                                          height={12}
                                          width={12}
                                          circle
                                        />
                                      ) : (
                                        <BiXCircle size={16} />
                                      )
                                    }
                                    color="red"
                                    onClick={() =>
                                      handleUpdateStatus(
                                        reservation._id!,
                                        "rejected"
                                      )
                                    }
                                    disabled={busy}
                                  >
                                    Rechazar
                                  </Menu.Item>
                                </>
                              )}

                            <Menu.Item
                              leftSection={<BiUser size={16} />}
                              onClick={() =>
                                handleOpenAssignModal(reservation._id!)
                              }
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
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </>
  );
};

export default ReservationsList;
