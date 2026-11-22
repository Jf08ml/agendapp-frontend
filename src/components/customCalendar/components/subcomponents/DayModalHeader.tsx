import { FC } from "react";
import { Avatar, Box, Text, ActionIcon, Tooltip } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../dayGrid";

interface HeaderProps {
  employees: Employee[];
  hiddenEmployeeIds: string[];
  onToggleEmployeeHidden: (employeeId: string) => void;
  columnWidthMap?: Map<string, number>;
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Encabezado de columnas de la vista Día (AgendaEscritorio): neutro
// (surface-muted), con el avatar del profesional y un anillo de su color.
const DayModalHeader: FC<HeaderProps> = ({
  employees,
  hiddenEmployeeIds,
  onToggleEmployeeHidden,
  columnWidthMap,
}) => {
  return (
    <Box
      style={{
        display: "flex",
        borderBottom: "1px solid var(--line-strong)",
        backgroundColor: "var(--surface-muted)",
      }}
    >
      {/* Espacio de la columna de horas — sticky left para que la esquina
          superior-izquierda no desaparezca al hacer scroll horizontal */}
      <Box
        style={{
          width: "80px",
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 5,
          backgroundColor: "var(--surface-muted)",
        }}
      />

      {employees.map((employee) => {
        const color = employee.color || "var(--pro-8)";
        const isHidden = hiddenEmployeeIds.includes(employee._id);
        const width = columnWidthMap?.get(employee._id) ?? CARD_WIDTH;
        return (
          <Box
            key={employee._id}
            style={{
              width: `${width}px`,
              minWidth: `${width}px`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 8px 8px 10px",
              borderLeft: "1px solid var(--line)",
              opacity: isHidden ? 0.55 : 1,
              minHeight: 52,
            }}
          >
            <Avatar
              src={employee.profileImage || undefined}
              size={32}
              radius="xl"
              styles={{
                root: { boxShadow: `inset 0 0 0 2px ${color}`, background: "var(--surface-hover)", flex: "none" },
                placeholder: { color: "var(--ink-muted)", fontSize: 12, fontWeight: 600, background: "transparent" },
                image: { border: `2px solid ${color}`, borderRadius: "50%" },
              }}
            >
              {initials(employee.names)}
            </Avatar>
            <Text
              fw={600}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                lineHeight: "18px",
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={employee.names}
            >
              {employee.names}
            </Text>
            <Tooltip label={isHidden ? "Mostrar profesional" : "Ocultar profesional"} withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label={isHidden ? `Mostrar a ${employee.names}` : `Ocultar a ${employee.names}`}
                onClick={() => onToggleEmployeeHidden(employee._id)}
                style={{ flex: "none" }}
              >
                {isHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              </ActionIcon>
            </Tooltip>
          </Box>
        );
      })}
    </Box>
  );
};

export default DayModalHeader;
