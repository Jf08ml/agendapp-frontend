/* eslint-disable react-hooks/exhaustive-deps */
import {
  Button,
  Modal,
  NumberInput,
  Textarea,
  Table,
  ActionIcon,
  Text,
  Group,
  Stack,
  Paper,
  Badge,
  Box,
  Loader,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import "dayjs/locale/es";
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
import { useSelector } from "react-redux";
import { selectOrganization } from "../../../../features/organization/sliceOrganization";

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const AdvanceModal = ({ isOpen, onClose, employee }: AdvanceModalProps) => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const org = useSelector(selectOrganization);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceDescription, setAdvanceDescription] = useState<string>("");
  const [advanceDate, setAdvanceDate] = useState<Date | null>(new Date());
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      fetchAdvances();
    }
  }, [employee]);

  const fetchAdvances = async () => {
    if (!employee) return;

    try {
      setLoading(true);
      const employeeAdvances = await getAdvancesByEmployee(employee._id);
      // Ordenar descendente por fecha
      const sorted = [...employeeAdvances].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAdvances(sorted);
    } catch (error) {
      console.error("Error al cargar los adelantos", error);
    } finally {
      setLoading(false);
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
            date: advanceDate || new Date(),
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
          date: advanceDate || new Date(),
        });
        showNotification({
          title: "Adelanto creado",
          message: "El adelanto ha sido creado exitosamente",
          color: "green",
        });
      }
      setAdvanceAmount(0);
      setAdvanceDescription("");
      setAdvanceDate(new Date());
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
    setAdvanceDate(new Date(advance.date));
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
    setAdvanceDate(new Date());
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
      <Stack gap="md">
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={700}>Nuevo adelanto</Text>
            {editingAdvance && <Badge color="blue">Editando</Badge>}
          </Group>

          <Stack gap="sm">
            <NumberInput
              label="Monto del adelanto"
              prefix="$ "
              thousandSeparator
              value={advanceAmount}
              onChange={(value) => setAdvanceAmount(Number(value) || 0)}
              min={0}
            />

            <DateInput
              label="Fecha"
              value={advanceDate}
              onChange={setAdvanceDate}
              locale="es"
            />

            <Textarea
              label="Descripción"
              placeholder="Motivo del adelanto"
              value={advanceDescription}
              onChange={(e) => setAdvanceDescription(e.currentTarget.value)}
            />

            <Group justify="flex-end" gap="sm" mt="sm">
              {editingAdvance && (
                <Button variant="subtle" onClick={clearForm}>
                  Cancelar edición
                </Button>
              )}
              <Button onClick={handleCreateOrUpdateAdvance}>
                {editingAdvance ? "Actualizar adelanto" : "Crear adelanto"}
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={700}>Historial de adelantos</Text>
            <Text c="dimmed" size="sm">
              Total: {formatCurrency(advances.reduce((a, b) => a + b.amount, 0), org?.currency || "COP")}
            </Text>
          </Group>

          {loading ? (
            <Box ta="center" py="lg">
              <Loader size="sm" />
            </Box>
          ) : (
            <Table highlightOnHover striped>
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
                      <Table.Td>{formatCurrency(advance.amount, org?.currency || "COP")}</Table.Td>
                      <Table.Td>{advance.description || "Sin descripción"}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon
                            radius="lg"
                            color="blue"
                            onClick={() => handleEditAdvance(advance)}
                            aria-label="Editar adelanto"
                          >
                            <FaEdit />
                          </ActionIcon>
                          <ActionIcon
                            radius="lg"
                            color="red"
                            onClick={() =>
                              advance._id &&
                              window.confirm("¿Eliminar adelanto?") &&
                              handleDeleteAdvance(advance._id)
                            }
                            aria-label="Eliminar adelanto"
                          >
                            <FaTrash />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" ta="center">
                        No hay adelantos registrados
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Modal>
  );
};

export default AdvanceModal;
