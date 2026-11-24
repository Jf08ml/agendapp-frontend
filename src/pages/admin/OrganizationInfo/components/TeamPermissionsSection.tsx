// Seguridad › Equipo y permisos (rediseño, AjustesSeguridad): tabla del equipo
// con rol, permisos de agenda («5 de 9»), acceso y «Permisos». Los permisos se
// editan con el mismo QuickPermissionsModal de la agenda (guarda en
// customPermissions; lo que da el rol no se puede quitar).
import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconAlertTriangle, IconShieldCheck } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import { getEmployeesByOrganizationId, type Employee } from "../../../../services/employeeService";
import { AGENDA_PERMISSIONS } from "../../../../constants/agendaPermissions";
import QuickPermissionsModal from "../../manageAgenda/components/QuickPermissionsModal";
import SectionCard from "./SectionCard";
import { EmployeeAvatar } from "../../manageEmployees/components/EmployeeRow";

const agendaCount = (e: Employee) => {
  const all = new Set([...(e.role?.permissions ?? []), ...(e.customPermissions ?? [])]);
  return AGENDA_PERMISSIONS.filter((p) => all.has(p.key)).length;
};

const hasLogin = (e: Employee) => !!e.email && !/@sin-acceso\.agenditapp\.com$/i.test(e.email);

const roleLabel = (e: Employee) => {
  const n = (e.role?.name || "").toLowerCase();
  return n.startsWith("admin") ? "Administrador" : "Profesional";
};

export default function TeamPermissionsSection() {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const load = async () => {
    if (!organizationId) return;
    setError(false);
    try {
      const list = await getEmployeesByOrganizationId(organizationId);
      setEmployees(list.filter((e) => e.isActive).sort((a, b) => a.names.localeCompare(b.names, "es")));
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const total = AGENDA_PERMISSIONS.length;

  return (
    <SectionCard
      title="Equipo y permisos"
      description="Qué puede hacer cada persona del equipo en la agenda. Lo que da su rol no se puede quitar desde aquí."
    >
      {error ? (
        <div className="ag-alert ag-alert--danger" role="alert">
          <IconAlertTriangle size={18} />
          <div style={{ flex: 1 }}>No se pudo cargar el equipo. Intenta de nuevo.</div>
          <Button size="xs" variant="default" onClick={() => void load()}>Reintentar</Button>
        </div>
      ) : !loaded ? (
        <span className="ag-skeleton" style={{ width: "50%" }} />
      ) : employees.length === 0 ? (
        <span className="ag-muted">Aún no tienes profesionales activos.</span>
      ) : (
        <div className="ag-card" style={{ overflow: "hidden" }}>
          {employees.map((e) => {
            const n = agendaCount(e);
            return (
              <div key={e._id} className="ag-list-row" style={{ padding: "10px 12px", gap: 12 }}>
                <EmployeeAvatar employee={e} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 14 }}>{e.names}</b>
                  <span className="ag-subtle">
                    {roleLabel(e)} · {n} de {total} permisos de agenda
                    {isMobile ? "" : ` · ${hasLogin(e) ? "Con acceso" : "Sin correo de acceso"}`}
                  </span>
                </div>
                <Button size="xs" variant="default" leftSection={<IconShieldCheck size={14} />} onClick={() => setEditing(e)}>
                  Permisos
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <QuickPermissionsModal
        employee={editing}
        onClose={() => setEditing(null)}
        onSaved={(u) => setEmployees((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...u, role: x.role } : x)))}
      />
    </SectionCard>
  );
}
