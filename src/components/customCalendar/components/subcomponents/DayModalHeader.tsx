import { FC } from "react";
import { Box, Text, ActionIcon } from "@mantine/core";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../DayModal";
import { IoEye, IoEyeOff } from "react-icons/io5";

interface HeaderProps {
  employees: Employee[];
  hiddenEmployeeIds: string[];
  onToggleEmployeeHidden: (employeeId: string) => void;
}

// Función para calcular el contraste del color
const getTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF"; // Negro para fondos claros, blanco para fondos oscuros
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
        top: 0,
        zIndex: 2,
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      {/* Espacio para la columna de horas */}
      <Box style={{ width: "80px" }} />

      {/* Encabezados de cada empleado */}
      {employees.map((employee) => {
        const color = employee.color || "#ccc";
        const textColor = getTextColor(color);
        const isHidden = hiddenEmployeeIds.includes(employee._id);

        return (
          <Box
            key={employee._id}
            style={{
              width: `${CARD_WIDTH}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              textAlign: "center",
              marginLeft: "2px",
              border: "1px solid gray",
              borderRadius: "5px",
              backgroundColor: isHidden ? "#f2f2f2" : color,
              position: "relative",  // para posicionar el ícono
              padding: "4px",        // un poco de padding
            }}
          >
            {/* Nombre del empleado */}
            <Text style={{ fontSize: "10px", color: textColor }}>
              {employee.names}
            </Text>

            {/* Ícono para ocultar/mostrar */}
            <Box style={{ position: "absolute", top: 0, right: 1 }}>
              <ActionIcon
                variant="transparent"
                onClick={() => onToggleEmployeeHidden(employee._id)}
                title={isHidden ? "Mostrar empleado" : "Ocultar empleado"}
              >
                {isHidden ? (
                  <IoEyeOff size={16} color={textColor} />
                ) : (
                  <IoEye size={16} color={textColor} />
                )}
              </ActionIcon>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default DayModalHeader;
