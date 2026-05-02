import { FC } from "react";
import { Box, Text, ActionIcon, Tooltip } from "@mantine/core";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../DayModal";
import { IoEye, IoEyeOff } from "react-icons/io5";

interface HeaderProps {
  employees: Employee[];
  hiddenEmployeeIds: string[];
  onToggleEmployeeHidden: (employeeId: string) => void;
  columnWidthMap?: Map<string, number>;
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
  columnWidthMap,
}) => {
  return (
    <Box
      style={{
        display: "flex",
        borderBottom: "1px solid #F0EBE0",
        backgroundColor: "#FAF7F2",
      }}
    >
      {/* Espacio reservado para la columna de horas — sticky left para que
          la esquina superior-izquierda no desaparezca al scrollear horizontalmente */}
      <Box
        style={{
          width: "80px",
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 5,
          backgroundColor: "#FAF7F2",
        }}
      />

      {/* Encabezados de cada profesional */}
      {employees.map((employee) => {
        const color = employee.color || "#dee2e6";
        const textColor = getTextColor(color);
        const isHidden = hiddenEmployeeIds.includes(employee._id);

        const width = columnWidthMap?.get(employee._id) ?? CARD_WIDTH;
        return (
          <Box
            key={employee._id}
            style={{
              width: `${width}px`,
              minWidth: `${width}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              textAlign: "center",
              marginLeft: "2px",
              padding: "6px 4px",
              backgroundColor: isHidden ? "#F0EBE0" : color,
              borderRadius: 8,
              border: isHidden
                ? "1px dashed #C9C2B5"
                : "1px solid rgba(0,0,0,0.08)",
              boxShadow: isHidden
                ? "none"
                : "0 1px 4px rgba(0,0,0,0.10)",
              opacity: isHidden ? 0.6 : 1,
              transition: "all 120ms ease",
            }}
          >
            {/* Nombre completo del profesional */}
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
                label={isHidden ? "Mostrar profesional" : "Ocultar profesional"}
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
