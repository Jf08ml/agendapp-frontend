/* eslint-disable react-hooks/exhaustive-deps */
import {
  Button,
  Modal,
  NumberInput,
  Textarea,
  Table,
  ActionIcon,
  Divider,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  createAdvance,
  updateAdvance,
  deleteAdvance,
  getAdvancesByEmployee,
  Advance,
} from "../../../../services/advanceService";
import { showNotification } from "@mantine/notifications";
import { Employee } from "../../../../services/employeeService";
import { FaEdit, FaTrash } from "react-icons/fa";
import { formatCurrency } from "../../../../utils/formatCurrency";

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const AdvanceModal = ({ isOpen, onClose, employee }: AdvanceModalProps) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceDescription, setAdvanceDescription] = useState<string>("");
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);

  useEffect(() => {
    if (employee) {
      fetchAdvances();
    }
  }, [employee]);

  const fetchAdvances = async () => {
    if (!employee) return;

    try {
      const employeeAdvances = await getAdvancesByEmployee(employee._id);
      setAdvances(employeeAdvances);
    } catch (error) {
      console.error("Error al cargar los adelantos", error);
    }
  };

  const handleCreateOrUpdateAdvance = async () => {
    if (!employee) return;

    if (advanceAmount <= 0) {
      showNotification({
        title: "Monto no válido",
        message: "Ingresa un monto mayor a 0",
        color: "yellow",
      });
      return;
    }

    try {
      if (editingAdvance) {
        if (editingAdvance._id) {
          await updateAdvance(editingAdvance._id, {
            ...editingAdvance,
            amount: advanceAmount,
            description: advanceDescription,
          });
        }
        showNotification({
          title: "Adelanto actualizado",
          message: "El adelanto ha sido actualizado exitosamente",
          color: "green",
        });
      } else {
        await createAdvance({
          employee: employee._id,
          amount: advanceAmount,
          description: advanceDescription,
          date: new Date(),
        });
        showNotification({
          title: "Adelanto creado",
          message: "El adelanto ha sido creado exitosamente",
          color: "green",
        });
      }
      setAdvanceAmount(0);
      setAdvanceDescription("");
      setEditingAdvance(null);
      fetchAdvances();
    } catch (error) {
      console.error("Error al guardar adelanto", error);
      showNotification({
        title: "Error",
        message: "Error al guardar el adelanto",
        color: "red",
      });
    }
  };

  const handleEditAdvance = (advance: Advance) => {
    setAdvanceAmount(advance.amount);
    setAdvanceDescription(advance.description);
    setEditingAdvance(advance);
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    try {
      await deleteAdvance(advanceId);
      showNotification({
        title: "Adelanto eliminado",
        message: "El adelanto ha sido eliminado correctamente",
        color: "green",
      });
      fetchAdvances();
    } catch (error) {
      console.error("Error al eliminar adelanto", error);
      showNotification({
        title: "Error",
        message: "Error al eliminar el adelanto",
        color: "red",
      });
    }
  };

  const clearForm = () => {
    setAdvanceAmount(0);
    setAdvanceDescription("");
    setEditingAdvance(null);
  };

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        clearForm();
        onClose();
      }}
      title="Gestionar Adelantos"
    >
      <NumberInput
        label="Monto del Adelanto"
        prefix="$ "
        thousandSeparator
        value={advanceAmount}
        onChange={(value) => setAdvanceAmount(Number(value) || 0)}
        min={0}
        mb="sm"
      />
      <Textarea
        label="Descripción"
        placeholder="Motivo del adelanto"
        value={advanceDescription}
        onChange={(e) => setAdvanceDescription(e.currentTarget.value)}
        mb="sm"
      />
      <Button onClick={handleCreateOrUpdateAdvance} mt="sm">
        {editingAdvance ? "Actualizar Adelanto" : "Crear Adelanto"}
      </Button>

      <Divider my="sm" label="Historial de Adelantos" />

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Descripción</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {advances.length > 0 ? (
            advances.map((advance) => (
              <Table.Tr key={advance._id}>
                <Table.Td>
                  {new Date(advance.date).toLocaleDateString()}
                </Table.Td>
                <Table.Td>{formatCurrency(advance.amount)}</Table.Td>
                <Table.Td>{advance.description}</Table.Td>
                <Table.Td>
                  <ActionIcon
                    radius="lg"
                    color="blue"
                    onClick={() => handleEditAdvance(advance)}
                  >
                    <FaEdit />
                  </ActionIcon>
                  <ActionIcon
                    radius="lg"
                    color="red"
                    onClick={() =>
                      advance._id && handleDeleteAdvance(advance._id)
                    }
                  >
                    <FaTrash />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))
          ) : (
            <Table.Tr ta={"center"}>
              <Table.Td colSpan={4}>No hay adelantos registrados</Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      <Divider my="sm" />
      <Text fw={600} ta="right">
        Total: {formatCurrency(advances.reduce((a, b) => a + b.amount, 0))}
      </Text>
    </Modal>
  );
};

export default AdvanceModal;
