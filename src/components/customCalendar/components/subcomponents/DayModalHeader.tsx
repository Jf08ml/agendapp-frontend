import { FC } from "react";
import { Box, Text, ActionIcon, Tooltip } from "@mantine/core";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../DayModal";
import { IoEye, IoEyeOff } from "react-icons/io5";

interface HeaderProps {
  employees: Employee[];
  hiddenEmployeeIds: string[];
  onToggleEmployeeHidden: (employeeId: string) => void;
}

// Contraste de texto con color de fondo
const getTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace("#", "");
  if (hex.length < 6) return "#000000";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF";
};

const DayModalHeader: FC<HeaderProps> = ({
  employees,
  hiddenEmployeeIds,
  onToggleEmployeeHidden,
}) => {
  return (
    <Box
      style={{
        display: "flex",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        backgroundColor: "#f8f9fb",
      }}
    >
      {/* Espacio reservado para la columna de horas */}
      <Box style={{ width: "80px" }} />

      {/* Encabezados de cada empleado */}
      {employees.map((employee) => {
        const color = employee.color || "#dee2e6";
        const textColor = getTextColor(color);
        const isHidden = hiddenEmployeeIds.includes(employee._id);

        return (
          <Box
            key={employee._id}
            style={{
              width: `${CARD_WIDTH}px`,
              minWidth: `${CARD_WIDTH}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              textAlign: "center",
              marginLeft: "2px", // se mantiene igual que el layout original
              padding: "6px 4px",
              backgroundColor: isHidden ? "#f1f3f5" : color,
              borderRadius: 6,
              border: isHidden
                ? "1px dashed rgba(0,0,0,0.3)"
                : "1px solid rgba(0,0,0,0.08)",
              boxShadow: isHidden
                ? "none"
                : "0 1px 3px rgba(0,0,0,0.15)",
              opacity: isHidden ? 0.6 : 1,
              transition: "all 120ms ease",
            }}
          >
            {/* Nombre completo del empleado */}
            <Text
              size="xs"
              fw={600}
              style={{
                color: isHidden ? "#495057" : textColor,
                lineHeight: 1.2,
                textAlign: "center",
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {employee.names}
            </Text>

            {/* Ícono de visibilidad */}
            <Box style={{ position: "absolute", top: -4, right: 0 }}>
              <Tooltip
                label={isHidden ? "Mostrar empleado" : "Ocultar empleado"}
                withArrow
              >
                <ActionIcon
                  size="xxxs"
                  radius="xl"
                  variant="white"
                  onClick={() => onToggleEmployeeHidden(employee._id)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.8)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  }}
                >
                  {isHidden ? (
                    <IoEyeOff size={14} color="#212529" />
                  ) : (
                    <IoEye size={14} color="#212529" />
                  )}
                </ActionIcon>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default DayModalHeader;
