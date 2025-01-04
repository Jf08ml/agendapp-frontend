import { FC } from "react";
import { Box, Text } from "@mantine/core";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../DayModal";

interface HeaderProps {
  employees: Employee[];
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

const DayModalHeader: FC<HeaderProps> = ({ employees }) => {
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
        const textColor = getTextColor(color); // Determinar el color del texto

        return (
          <Box
            key={employee._id}
            style={{
              width: `${CARD_WIDTH}px`,
              textAlign: "center",
              marginLeft: "10px",
              border: "1px solid gray",
              borderRadius: "5px",
              backgroundColor: color,
            }}
          >
            <Text
              style={{
                fontSize: "14px",
                color: textColor,
              }}
            >
              {employee.names}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default DayModalHeader;
