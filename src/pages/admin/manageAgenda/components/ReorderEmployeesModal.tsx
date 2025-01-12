import React, { useState } from "react";
import { Modal, Button, Box, Text, Group, Title } from "@mantine/core";
import { useDrag, useDrop } from "react-dnd";
import { Employee } from "../../../../services/employeeService";

const ItemTypes = {
  EMPLOYEE: "employee",
};

interface ReorderEmployeesModalProps {
  opened: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (updatedEmployees: Employee[]) => void;
  onFetchEmployees: () => void;
}

interface DraggableEmployee {
  index: number;
}

const DraggableItem: React.FC<{
  employee: Employee;
  index: number;
  moveEmployee: (dragIndex: number, hoverIndex: number) => void;
}> = ({ employee, index, moveEmployee }) => {
  const [, dragRef] = useDrag({
    type: ItemTypes.EMPLOYEE,
    item: { index },
  });

  const [, dropRef] = useDrop<DraggableEmployee>({
    accept: ItemTypes.EMPLOYEE,
    hover: (item) => {
      if (item.index !== index) {
        moveEmployee(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <Box
      ref={(node) => dragRef(dropRef(node))}
      style={{
        padding: "8px",
        marginBottom: "4px",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        backgroundColor: "#fff",
        cursor: "move",
      }}
    >
      <Text>{index + 1} - {employee.names}</Text>
    </Box>
  );
};

const ReorderEmployeesModal: React.FC<ReorderEmployeesModalProps> = ({
  opened,
  onClose,
  employees,
  onSave,
  onFetchEmployees,
}) => {
  const [localEmployees, setLocalEmployees] = useState(employees);

  const moveEmployee = (dragIndex: number, hoverIndex: number) => {
    const updatedEmployees = [...localEmployees];
    const [draggedEmployee] = updatedEmployees.splice(dragIndex, 1);
    updatedEmployees.splice(hoverIndex, 0, draggedEmployee);
    setLocalEmployees(updatedEmployees);
  };

  const handleSave = () => {
    onSave(localEmployees);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} withCloseButton={false}>
      <Group justify="space-between" mb="md">
        <Title order={4}>Re ordenar empleados</Title>
        <Button variant="light" size="xs" onClick={() => onFetchEmployees()}>
          Refrescar
        </Button>
      </Group>
      <Box>
        {localEmployees.map((employee, index) => (
          <DraggableItem
            key={employee._id}
            employee={employee}
            index={index}
            moveEmployee={moveEmployee}
          />
        ))}
      </Box>
      <Group justify="start" mt="md">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>Guardar</Button>
      </Group>
    </Modal>
  );
};

export default ReorderEmployeesModal;
