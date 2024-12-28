import { FC } from "react";
import { Box, Text } from "@mantine/core";
import { Employee } from "../../../../services/employeeService";
import { CARD_WIDTH } from "../DayModal";

interface HeaderProps {
  employees: Employee[];
}

const DayModalHeader: FC<HeaderProps> = ({ employees }) => {
  return (
    <Box
      bg="gray"
      style={{
        display: "flex",
        position: "sticky",
        top: 0,
        zIndex: 2,
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      {/* Espacio para la columna de horas */}
      <Box style={{ width: "80px" }} />

      {/* Encabezados de cada empleado */}
      {employees.map((employee) => (
        <Box
          bg="gray"
          key={employee._id}
          style={{
            width: `${CARD_WIDTH}px`,
            textAlign: "center",
            marginLeft: "10px",
            border: "1px solid gray",
            borderRadius: "5px",
          }}
        >
          <Text style={{ fontSize: "14px" }}>{employee.names}</Text>
        </Box>
      ))}
    </Box>
  );
};

export default DayModalHeader;
