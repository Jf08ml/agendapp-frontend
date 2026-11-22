// Profesional como fila de avatares («Cualquiera» primero), al inicio del paso
// «Fecha y hora» (rediseño, ReservaMovil). Misma lógica que tenía
// StepMultiServiceEmployee: solo profesionales activos que hacen el servicio,
// sin los de respaldo (el backend los asigna solo cuando los demás están
// ocupados) y, en agendamiento automático, el profesional es obligatorio salvo
// que el servicio tenga respaldo.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, type ReactNode } from "react";
import { IconUsers } from "@tabler/icons-react";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { SelectedService } from "../../types/multiBooking";
import { serviceHasBackupEmployee } from "./bookingUtilsMulti";

interface EmployeeAvatarPickerProps {
  services: Service[];
  employees: Employee[];
  value: SelectedService[];
  onChange: (next: SelectedService[]) => void;
  employeeRequired?: boolean;
}

const employeeServiceIds = (e: Employee): string[] =>
  (e.services || []).map((svc: any) => (typeof svc === "string" ? svc : svc._id));

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const firstName = (name = "") => name.split(/\s+/)[0] || name;

function AvatarOption({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        width: 72,
        flex: "none",
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12,
        lineHeight: "16px",
        textAlign: "center",
        color: selected ? "var(--ink)" : "var(--ink-muted)",
        fontWeight: selected ? 600 : 500,
      }}
    >
      <span
        className="ag-avatar ag-avatar--lg"
        style={{
          overflow: "hidden",
          boxShadow: selected ? "0 0 0 2px var(--surface), 0 0 0 4px var(--brand-text)" : undefined,
        }}
      >
        {children}
      </span>
      <span style={{ maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </button>
  );
}

export default function EmployeeAvatarPicker({
  services,
  employees,
  value,
  onChange,
  employeeRequired = false,
}: EmployeeAvatarPickerProps) {
  const activeEmployees = useMemo(() => employees.filter((e) => e.isActive), [employees]);

  // Con un solo profesional posible (modo obligatorio) se elige solo
  useEffect(() => {
    if (!employeeRequired) return;
    let changed = false;
    const next = value.map((sel) => {
      if (sel.employeeId) return sel;
      if (serviceHasBackupEmployee(activeEmployees, sel.serviceId)) return sel;
      const eligible = activeEmployees.filter((e) => employeeServiceIds(e).includes(sel.serviceId));
      if (eligible.length === 1) {
        changed = true;
        return { ...sel, employeeId: eligible[0]._id };
      }
      return sel;
    });
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRequired, value, activeEmployees]);

  const setEmployee = (serviceId: string, employeeId: string | null) =>
    onChange(value.map((s) => (s.serviceId === serviceId ? { ...s, employeeId } : s)));

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
      {value.map((sel) => {
        const service = services.find((s) => s._id === sel.serviceId);
        const eligible = activeEmployees.filter(
          (e) => e.onlineBookingBackup !== true && employeeServiceIds(e).includes(sel.serviceId)
        );
        const mustChoose = employeeRequired && !serviceHasBackupEmployee(activeEmployees, sel.serviceId);
        // Si nadie se puede elegir (solo respaldo o ninguno), no hay nada que mostrar
        if (eligible.length === 0) return null;
        // Un único profesional y sin «Cualquiera»: ya quedó elegido arriba
        const groupLabel = value.length > 1 ? service?.name : undefined;

        return (
          <div key={sel.serviceId} className="ag-stack" style={{ gap: "var(--space-2)" }}>
            {groupLabel && (
              <span className="ag-label" style={{ fontSize: 13 }}>
                {groupLabel}
                {mustChoose && <span className="req">*</span>}
              </span>
            )}
            <div
              role="radiogroup"
              aria-label={`Profesional${service ? ` para ${service.name}` : ""}`}
              style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, paddingTop: 4 }}
            >
              {!mustChoose && (
                <AvatarOption
                  label="Cualquiera"
                  selected={!sel.employeeId}
                  onClick={() => setEmployee(sel.serviceId, null)}
                >
                  <IconUsers size={20} stroke={1.75} />
                </AvatarOption>
              )}
              {eligible.map((emp) => (
                <AvatarOption
                  key={emp._id}
                  label={firstName(emp.names)}
                  selected={sel.employeeId === emp._id}
                  onClick={() => setEmployee(sel.serviceId, emp._id)}
                >
                  {emp.profileImage ? (
                    <img src={emp.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initials(emp.names)
                  )}
                </AvatarOption>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
