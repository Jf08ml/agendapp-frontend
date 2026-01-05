/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Title,
  Group,
  Divider,
  Button,
  Grid,
  TextInput,
  Container,
  Card,
  SegmentedControl,
  Skeleton,
  Center,
  Stack,
  Text,
  Tabs,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { BsSearch } from "react-icons/bs";
import { BiCalendar, BiGroup } from "react-icons/bi";
import { showNotification } from "@mantine/notifications";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByOrganizationId,
  type Employee,
} from "../../../services/employeeService";
import ModalCreateEdit from "./components/ModalCreateEditEmployee";
import {
  getServicesByOrganizationId,
  type Service,
} from "../../../services/serviceService";
import EmployeeCard from "./components/EmployeeCard";
import EmployeeDetailsModal from "./components/EmployeeDetailsModal";
import AdvanceModal from "./components/AdvanceModal";
import ScheduleOverview from "./components/ScheduleOverview";
import { openConfirmModal } from "@mantine/modals";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import CustomLoader from "../../../components/customLoader/CustomLoader";

const AdminEmployees: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);

  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<string | null>("employees");

  const organizationId = useSelector(
    (state: RootState) => (state.auth as any)?.organizationId
  );

  useEffect(() => {
    if (!organizationId) return;
    void loadAll();
  }, [organizationId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [emps, svcs] = await Promise.all([
        getEmployeesByOrganizationId(organizationId!),
        getServicesByOrganizationId(organizationId!),
      ]);
      // Activos arriba
      const ordered = [...emps].sort(
        (a, b) => Number(b.isActive) - Number(a.isActive)
      );
      setEmployees(ordered);
      setServices(svcs);
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "No se pudo cargar empleados/servicios",
        color: "red",
      });
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...employees];

    // Buscar
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (e) =>
          e.names.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phoneNumber.includes(q)
      );
    }

    // Estado
    if (status !== "all") {
      data = data.filter((e) =>
        status === "active" ? e.isActive : !e.isActive
      );
    }

    // Orden simple: por nombre para consistencia
    data.sort((a, b) => a.names.localeCompare(b.names, "es"));

    // Activos primero siempre
    data.sort((a, b) => Number(b.isActive) - Number(a.isActive));

    return data;
  }, [employees, debouncedSearch, status]);

  // Acciones CRUD
  const handleSaveEmployee = async (employee: Employee) => {
    const commission = employee.commissionPercentage ?? 0;

    // Validation: check for duplicate email or phone (excluding current employee)
    const duplicateEmail = employees.find(
      (e) => e._id !== employee._id && e.email === employee.email.trim()
    );
    if (duplicateEmail) {
      showNotification({
        title: "Validación",
        message: "Ya existe un empleado con ese correo electrónico",
        color: "orange",
      });
      throw new Error("Duplicate email");
    }

    const duplicatePhone = employees.find(
      (e) => e._id !== employee._id && e.phoneNumber === employee.phoneNumber.trim()
    );
    if (duplicatePhone) {
      showNotification({
        title: "Validación",
        message: "Ya existe un empleado con ese número de teléfono",
        color: "orange",
      });
      throw new Error("Duplicate phone");
    }

    // Validation: at least one service selected
    if (!employee.services || employee.services.length === 0) {
      showNotification({
        title: "Validación",
        message: "Debes seleccionar al menos un servicio para el empleado",
        color: "orange",
      });
      throw new Error("No services selected");
    }

    try {
      if (employee._id) {
        await updateEmployee(employee._id, {
          ...employee,
          commissionPercentage: commission,
        });
      } else {
        if (!organizationId) {
          showNotification({
            title: "Error",
            message: "Organización no definida",
            color: "red",
          });
          throw new Error("Organization not defined");
        }
        await createEmployee({
          ...employee,
          organizationId,
          password: employee.password || "",
          commissionPercentage: commission,
        } as any);
      }
      await loadAll();
      setIsModalOpen(false);
      setEditingEmployee(null);
      showNotification({
        title: employee._id ? "Empleado actualizado" : "Empleado agregado",
        message: "Guardado correctamente",
        color: "green",
      });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || error.message || "No se pudo guardar el empleado";
      showNotification({
        title: "Error",
        message,
        color: "red",
      });
      throw error; // Re-throw to keep modal open
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    openConfirmModal({
      title: "Eliminar empleado",
      centered: true,
      children: <Text>¿Seguro que deseas eliminar este empleado?</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteEmployee(employeeId);
          await loadAll();
          showNotification({
            title: "Eliminado",
            message: "Empleado eliminado",
            color: "green",
          });
        } catch (error) {
          console.error(error);
          // fallback a desactivar
          showNotification({
            title: "No se pudo eliminar",
            message: "Se intentará desactivar el empleado.",
            color: "yellow",
          });
          await handleActiveEmployee(employeeId, false);
        }
      },
    });
  };

  const handleActiveEmployee = async (employeeId: string, next = true) => {
    openConfirmModal({
      title: next ? "Activar empleado" : "Desactivar empleado",
      centered: true,
      children: (
        <Text>
          {next
            ? "Se mostrará para agendar citas. ¿Confirmas?"
            : "Se ocultará para agendar citas. ¿Confirmas?"}
        </Text>
      ),
      labels: { confirm: "Confirmar", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        try {
          await updateEmployee(employeeId, { isActive: next } as any);
          await loadAll();
          showNotification({
            title: next ? "Empleado activado" : "Empleado desactivado",
            message: "Cambio aplicado",
            color: "green",
          });
        } catch (error) {
          console.error(error);
          showNotification({
            title: "Error",
            message: "No se pudo actualizar el estado",
            color: "red",
          });
        }
      },
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({
      ...employee,
      services: (employee.services || [])
        .map((srv: any) => services.find((s) => s._id === srv._id)!)
        .filter(Boolean),
    });
    setIsModalOpen(true);
  };

  const showEmployeeDetailsModal = (employee: Employee) => {
    setShowEmployeeDetails(true);
    setSelectedEmployee(employee);
  };

  const handleShowAdvanceModal = (employee: Employee) => {
    setShowAdvanceModal(true);
    setSelectedEmployee(employee);
  };

  if (loading && !initialLoaded) return <CustomLoader />;

  return (
    <Container fluid>
      {/* Header */}
      <Card mb="md">
        <Group justify="space-between" align="center" mb="md">
          <Title order={isMobile ? 3 : 2}>Administrar Empleados</Title>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="employees" leftSection={<BiGroup size={16} />}>
              Empleados
            </Tabs.Tab>
            <Tabs.Tab value="schedules" leftSection={<BiCalendar size={16} />}>
              Vista de Horarios
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="employees" pt="md">
            {/* Toolbar de filtros simplificada */}
            <Card withBorder radius="md" p="md" mb="md">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
                  <TextInput
                    leftSection={<BsSearch />}
                    placeholder="Buscar por nombre, cargo, correo o teléfono…"
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    w={isMobile ? "100%" : 340}
                  />

                  <SegmentedControl
                    value={status}
                    onChange={(v: any) => setStatus(v)}
                    data={[
                      { label: "Todos", value: "all" },
                      { label: "Activos", value: "active" },
                      { label: "Inactivos", value: "inactive" },
                    ]}
                    size={isMobile ? "xs" : "sm"}
                  />

                  <Group gap="sm">
                    <Button variant="subtle" onClick={() => { setSearch(""); setStatus("all"); }}>
                      Limpiar filtros
                    </Button>
                    <Button
                      onClick={() => {
                        setIsModalOpen(true);
                        setEditingEmployee(null);
                      }}
                    >
                      Agregar empleado
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </Card>

            <Divider my="sm" />

            {/* Grid */}
            {!initialLoaded ? (
              <Grid>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid.Col span={{ base: 12, md: 6, lg: 3 }} key={i}>
                    <Card withBorder radius="md" p="md">
                      <Skeleton height={72} circle mb="sm" />
                      <Skeleton height={12} width="60%" mb="xs" />
                      <Skeleton height={10} width="40%" mb="xs" />
                      <Skeleton height={10} width="30%" />
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            ) : filtered.length === 0 ? (
              <Center mih={240}>
                <Stack align="center" gap="xs">
                  <Text c="dimmed">
                    No hay empleados para los filtros aplicados.
                  </Text>
                  <Button
                    variant="light"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </Stack>
              </Center>
            ) : (
              <Grid>
                {filtered.map((employee) => (
                  <Grid.Col
                    span={{ base: 12, md: 6, lg: 3 }}
                    key={employee._id}
                  >
                    <EmployeeCard
                      employee={employee}
                      onEdit={handleEditEmployee}
                      onDelete={handleDeleteEmployee}
                      onActive={(id) => handleActiveEmployee(id, true)}
                      onViewDetails={showEmployeeDetailsModal}
                      onShowAdvanceModal={handleShowAdvanceModal}
                    />
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="schedules" pt="md">
            {activeTab === "schedules" && (
              <ScheduleOverview
                organizationId={organizationId!}
                employees={employees.filter((e) => e.isActive)}
              />
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Modales */}
      <ModalCreateEdit
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        services={services}
        onSave={handleSaveEmployee}
      />

      <EmployeeDetailsModal
        isOpen={showEmployeeDetails}
        onClose={() => setShowEmployeeDetails(false)}
        employee={selectedEmployee}
      />

      <AdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        employee={selectedEmployee}
      />
    </Container>
  );
};

export default AdminEmployees;
