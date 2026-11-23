/* eslint-disable react-hooks/exhaustive-deps */
// Profesionales (rediseño, ProfesionalesPanel): pestañas Equipo · Horarios
// (?tab=equipo|horarios). Equipo: buscador, segmento de estado y tabla (lista
// en móvil) con acciones con nombre en «⋯». El editor es un panel lateral.
import React, { useEffect, useMemo, useState } from "react";
import { Button, SegmentedControl, Text } from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { IconAlertTriangle, IconPlus, IconSearch, IconUsers } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByOrganizationId,
  type Employee,
} from "../../../services/employeeService";
import { getServicesByOrganizationId, type Service } from "../../../services/serviceService";
import ModalCreateEdit from "./components/ModalCreateEditEmployee";
import EmployeeRow from "./components/EmployeeRow";
import EmployeeDetailsModal from "./components/EmployeeDetailsModal";
import AdvanceModal from "./components/AdvanceModal";
import IncomeModal from "./components/IncomeModal";
import ScheduleOverview from "./components/ScheduleOverview";
import { RootState } from "../../../app/store";
import { selectOrganization } from "../../../features/organization/sliceOrganization";
import { formatCurrency } from "../../../utils/formatCurrency";
import { commissionLabel } from "./employeeView";

const AdminEmployees: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "horarios" ? "schedules" : "employees";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const currency = useSelector(selectOrganization)?.currency || "COP";

  useEffect(() => {
    if (!organizationId) return;
    void loadAll();
  }, [organizationId]);

  const loadAll = async () => {
    setLoadError(false);
    try {
      const [emps, svcs] = await Promise.all([
        getEmployeesByOrganizationId(organizationId!),
        getServicesByOrganizationId(organizationId!),
      ]);
      setEmployees(emps);
      setServices(svcs);
    } catch (error) {
      console.error(error);
      setLoadError(true);
    } finally {
      setInitialLoaded(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...employees];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (e) =>
          e.names.toLowerCase().includes(q) ||
          (e.position || "").toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.phoneNumber || "").includes(q)
      );
    }
    if (status !== "all") data = data.filter((e) => (status === "active" ? e.isActive : !e.isActive));
    // Por nombre, con los activos primero
    data.sort((a, b) => a.names.localeCompare(b.names, "es"));
    data.sort((a, b) => Number(b.isActive) - Number(a.isActive));
    return data;
  }, [employees, debouncedSearch, status]);

  // Guardar: el editor ya valida campos, servicios y correo/teléfono repetidos bajo cada campo
  const handleSaveEmployee = async (employee: Employee) => {
    const commission = employee.commissionValue ?? 0;
    try {
      if (employee._id) {
        await updateEmployee(employee._id, { ...employee, commissionValue: commission });
      } else {
        if (!organizationId) throw new Error("Organización no definida");
        await createEmployee({
          ...employee,
          organizationId,
          password: employee.password || "",
          commissionValue: commission,
        } as Parameters<typeof createEmployee>[0]);
      }
      await loadAll();
      setIsModalOpen(false);
      setEditingEmployee(null);
      showNotification({
        title: employee._id ? "Profesional actualizado" : "Profesional agregado",
        message: "Guardado correctamente",
        color: "green",
      });
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      showNotification({
        title: "No se pudo guardar",
        message: err.response?.data?.message || err.message || "No se pudo guardar el profesional",
        color: "red",
      });
      throw error; // el panel sigue abierto
    }
  };

  const setActive = async (employee: Employee, next: boolean) => {
    try {
      await updateEmployee(employee._id, { isActive: next });
      await loadAll();
      showNotification({
        title: next ? "Profesional activado" : "Profesional desactivado",
        message: next ? `${employee.names} vuelve a aparecer para agendar.` : `${employee.names} ya no aparece para agendar.`,
        color: "green",
      });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "No se pudo actualizar el estado", color: "red" });
    }
  };

  const handleActiveEmployee = (employee: Employee, next: boolean) => {
    openConfirmModal({
      title: next ? `Activar a ${employee.names}` : `Desactivar a ${employee.names}`,
      centered: true,
      children: (
        <Text size="sm">
          {next
            ? `${employee.names} volverá a aparecer para agendar.`
            : `${employee.names} dejará de aparecer para agendar. Sus citas futuras se mantienen.`}
        </Text>
      ),
      labels: { confirm: next ? "Activar" : "Desactivar", cancel: "Cancelar" },
      onConfirm: () => void setActive(employee, next),
    });
  };

  const handleDeleteEmployee = (employee: Employee) => {
    openConfirmModal({
      title: `Eliminar a ${employee.names}`,
      centered: true,
      children: (
        <Text size="sm">
          Se elimina del equipo. Si tiene citas registradas no se puede eliminar y se desactiva en su lugar.
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteEmployee(employee._id);
          await loadAll();
          showNotification({ title: "Eliminado", message: `${employee.names} se eliminó del equipo.`, color: "green" });
        } catch (error) {
          console.error(error);
          // Igual que antes: si no se puede eliminar, se desactiva
          if (employee.isActive) await setActive(employee, false);
          else showNotification({ title: "No se pudo eliminar", message: "Tiene citas registradas.", color: "yellow" });
        }
      },
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({
      ...employee,
      services: (employee.services || [])
        .map((srv) => services.find((s) => s._id === srv._id)!)
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

  const handleShowIncomeModal = (employee: Employee) => {
    setShowIncomeModal(true);
    setSelectedEmployee(employee);
  };

  const money = (n: number) => formatCurrency(n, currency);
  const commissionOf = (e: Employee) => commissionLabel(e.commissionType, e.commissionValue, money);
  const rowActions = {
    onOpenProfile: showEmployeeDetailsModal,
    onEdit: handleEditEmployee,
    onAdvance: handleShowAdvanceModal,
    onIncome: handleShowIncomeModal,
    onToggleActive: (e: Employee) => handleActiveEmployee(e, !e.isActive),
    onDelete: handleDeleteEmployee,
  };
  const openNew = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };
  const counts = {
    active: employees.filter((e) => e.isActive).length,
    inactive: employees.filter((e) => !e.isActive).length,
  };

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <div className="ag-stack" style={{ gap: "var(--space-3)" }}>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Profesionales</h1>
        <nav className="ag-subtabs" aria-label="Profesionales">
          <Link to="?tab=equipo" aria-current={activeTab === "employees" ? "page" : undefined}>
            Equipo <span className="ag-badge">{counts.active}</span>
          </Link>
          <Link to="?tab=horarios" aria-current={activeTab === "schedules" ? "page" : undefined}>
            Horarios
          </Link>
        </nav>
      </div>

      {activeTab === "schedules" ? (
        <ScheduleOverview organizationId={organizationId!} employees={employees.filter((e) => e.isActive)} />
      ) : (
        <>
          {/* Filtros y acción principal */}
          <div className="ag-row" style={{ gap: 8 }}>
            <div className="ag-search" style={{ flex: isMobile ? "1 1 100%" : "0 1 320px" }}>
              <input
                className="ag-input"
                type="search"
                placeholder="Buscar por nombre, cargo, correo o teléfono"
                aria-label="Buscar profesionales"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              <span aria-hidden="true">
                <IconSearch size={16} stroke={1.75} />
              </span>
            </div>
            <SegmentedControl
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              data={[
                { label: `Activos · ${counts.active}`, value: "active" },
                { label: `Inactivos · ${counts.inactive}`, value: "inactive" },
                { label: "Todos", value: "all" },
              ]}
              size="xs"
            />
            <span style={{ flex: 1 }} />
            {!isMobile && (
              <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
                Nuevo profesional
              </Button>
            )}
          </div>

          {loadError ? (
            <div className="ag-alert ag-alert--danger" role="alert">
              <IconAlertTriangle size={18} />
              <div style={{ flex: 1 }}>No se pudo cargar el equipo. Revisa tu conexión e inténtalo de nuevo.</div>
              <Button size="xs" variant="default" onClick={() => void loadAll()}>
                Reintentar
              </Button>
            </div>
          ) : !initialLoaded ? (
            <div className="ag-card" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                  <span className="ag-skeleton" style={{ width: 40, height: 40, borderRadius: 999 }} />
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="ag-skeleton" style={{ width: "35%" }} />
                    <span className="ag-skeleton" style={{ width: "20%" }} />
                  </span>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="ag-card">
              <div className="ag-empty">
                <div className="ag-empty__icon">
                  <IconUsers size={22} />
                </div>
                <h3>Aún no tienes profesionales</h3>
                <p>Agrega a tu equipo para asignar citas.</p>
                <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
                  Nuevo profesional
                </Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ag-card">
              <div className="ag-empty">
                <h3>No hay profesionales con estos filtros</h3>
                <Button variant="default" onClick={() => { setSearch(""); setStatus("all"); }}>
                  Limpiar filtros
                </Button>
              </div>
            </div>
          ) : isMobile ? (
            <>
              <div className="ag-card">
                {filtered.map((e) => (
                  <EmployeeRow key={e._id} employee={e} isMobile commission={commissionOf(e)} {...rowActions} />
                ))}
              </div>
              <Button
                size="lg"
                radius="xl"
                leftSection={<IconPlus size={18} />}
                onClick={openNew}
                style={{ position: "fixed", right: 16, bottom: "calc(var(--app-shell-footer-offset, 0px) + 16px)", zIndex: 150, boxShadow: "var(--shadow-lg)" }}
              >
                Nuevo profesional
              </Button>
            </>
          ) : (
            <div className="ag-card" style={{ overflowX: "auto" }}>
              <table className="ag-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Profesional</th>
                    <th>Estado</th>
                    <th className="num">Servicios</th>
                    <th>Reserva online</th>
                    <th className="num">Comisión</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <EmployeeRow key={e._id} employee={e} isMobile={false} commission={commissionOf(e)} {...rowActions} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ModalCreateEdit
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        services={services}
        employees={employees}
        onSave={handleSaveEmployee}
      />

      <EmployeeDetailsModal
        isOpen={showEmployeeDetails}
        onClose={() => setShowEmployeeDetails(false)}
        employee={selectedEmployee}
      />

      <AdvanceModal isOpen={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} employee={selectedEmployee} />

      <IncomeModal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} employee={selectedEmployee} />
    </div>
  );
};

export default AdminEmployees;
