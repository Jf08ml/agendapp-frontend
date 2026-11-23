// Fila de profesional (rediseño, ProfesionalesPanel). Escritorio: fila de tabla
// (Profesional · Estado · Servicios · Reserva online · Comisión · «⋯»). Móvil:
// fila de lista con avatar de anillo de color, cargo y badge de reserva online.
// Tocar la fila abre el perfil; las acciones con nombre van en «⋯».
import React from "react";
import { ActionIcon, Avatar, Menu } from "@mantine/core";
import {
  IconCash,
  IconCircleCheck,
  IconCircleOff,
  IconDots,
  IconEyeOff,
  IconLifebuoy,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";
import { Employee } from "../../../../services/employeeService";
import { ONLINE_BOOKING_LABEL, initials, onlineBookingMode } from "../employeeView";

export interface EmployeeRowActions {
  onOpenProfile: (e: Employee) => void;
  onEdit: (e: Employee) => void;
  onAdvance: (e: Employee) => void;
  onIncome: (e: Employee) => void;
  onToggleActive: (e: Employee) => void;
  onDelete: (e: Employee) => void;
}

interface Props extends EmployeeRowActions {
  employee: Employee;
  isMobile: boolean;
  commission: string;
}

export function EmployeeAvatar({ employee, size = 36 }: { employee: Employee; size?: number }) {
  return (
    <span
      style={{
        padding: 2,
        borderRadius: 999,
        background: employee.color || "var(--line-strong)",
        display: "inline-flex",
        flex: "none",
      }}
    >
      <Avatar
        src={employee.profileImage || null}
        size={size}
        radius="xl"
        styles={{
          root: { background: "var(--surface-hover)", border: "2px solid var(--surface-raised)" },
          placeholder: { color: "var(--ink-muted)", fontWeight: 600, fontSize: size < 40 ? 12 : 15 },
        }}
      >
        {initials(employee.names)}
      </Avatar>
    </span>
  );
}

export function OnlineBookingBadge({ employee }: { employee: Employee }) {
  const mode = onlineBookingMode(employee);
  const Icon = mode === "visible" ? IconWorld : mode === "backup" ? IconLifebuoy : IconEyeOff;
  const tone = mode === "visible" ? "ag-badge--info" : mode === "backup" ? "ag-badge--warning" : "";
  return (
    <span className={`ag-badge ${tone}`}>
      <Icon size={12} stroke={2} /> {ONLINE_BOOKING_LABEL[mode]}
    </span>
  );
}

export function EmployeeStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="ag-badge ag-badge--success">
      <IconCircleCheck size={12} stroke={2} /> Activo
    </span>
  ) : (
    <span className="ag-badge">
      <IconCircleOff size={12} stroke={2} /> Inactivo
    </span>
  );
}

export function EmployeeActionsMenu({ employee, ...a }: EmployeeRowActions & { employee: Employee }) {
  return (
    <Menu position="bottom-end" withinPortal shadow="lg" width={220}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Acciones de ${employee.names}`}
          onClick={(e) => e.stopPropagation()}
        >
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item leftSection={<IconUser size={16} />} onClick={() => a.onOpenProfile(employee)}>
          Ver perfil y pagos
        </Menu.Item>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => a.onEdit(employee)}>
          Editar
        </Menu.Item>
        <Menu.Item leftSection={<IconCash size={16} />} onClick={() => a.onAdvance(employee)}>
          Registrar adelanto
        </Menu.Item>
        <Menu.Item leftSection={<IconTrendingUp size={16} />} onClick={() => a.onIncome(employee)}>
          Registrar ingreso
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={employee.isActive ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
          onClick={() => a.onToggleActive(employee)}
        >
          {employee.isActive ? "Desactivar" : "Activar"}
        </Menu.Item>
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => a.onDelete(employee)}>
          Eliminar
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

const EmployeeRow: React.FC<Props> = React.memo(({ employee, isMobile, commission, ...actions }) => {
  const servicesCount = employee.services?.length ?? 0;
  const open = () => actions.onOpenProfile(employee);

  if (isMobile) {
    return (
      <div
        className="ag-list-row"
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => e.key === "Enter" && open()}
        style={{ cursor: "pointer", padding: "var(--space-3)", opacity: employee.isActive ? 1 : 0.65 }}
      >
        <EmployeeAvatar employee={employee} size={40} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <b style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee.names}</b>
          <span className="ag-subtle" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {employee.position}
            {` · ${servicesCount} ${servicesCount === 1 ? "servicio" : "servicios"}`}
          </span>
          <div className="ag-row" style={{ gap: 4 }}>
            {employee.isActive ? <OnlineBookingBadge employee={employee} /> : <EmployeeStatusBadge active={false} />}
          </div>
        </div>
        <EmployeeActionsMenu employee={employee} {...actions} />
      </div>
    );
  }

  return (
    <tr onClick={open} style={{ cursor: "pointer", opacity: employee.isActive ? 1 : 0.7 }}>
      <td>
        <div className="ag-who" style={{ minWidth: 0 }}>
          <EmployeeAvatar employee={employee} />
          <div style={{ minWidth: 0 }}>
            <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee.names}</b>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {employee.position}
            </span>
          </div>
        </div>
      </td>
      <td>
        <EmployeeStatusBadge active={employee.isActive} />
      </td>
      <td className="num">{servicesCount}</td>
      <td>
        <OnlineBookingBadge employee={employee} />
      </td>
      <td className="num">{commission}</td>
      <td style={{ width: 48, textAlign: "right" }}>
        <EmployeeActionsMenu employee={employee} {...actions} />
      </td>
    </tr>
  );
});

EmployeeRow.displayName = "EmployeeRow";

export default EmployeeRow;
