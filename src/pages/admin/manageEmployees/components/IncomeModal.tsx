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

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

const IncomeModal = ({ isOpen, onClose, employee }: IncomeModalProps) => {
  const [incomes, setIncomes] = useState<Advance[]>([]);
  const org = useSelector(selectOrganization);
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [incomeDescription, setIncomeDescription] = useState<string>("");
  const [incomeDate, setIncomeDate] = useState<Date | null>(new Date());
  const [editingIncome, setEditingIncome] = useState<Advance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      fetchIncomes();
    }
  }, [employee]);

  const fetchIncomes = async () => {
    if (!employee) return;

    try {
      setLoading(true);
      const employeeAdvances = await getAdvancesByEmployee(employee._id);
      const onlyIncomes = employeeAdvances.filter((a) => a.type === "income");
      // Ordenar descendente por fecha
      const sorted = [...onlyIncomes].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setIncomes(sorted);
    } catch (error) {
      console.error("Error al cargar los ingresos", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateIncome = async () => {
    if (!employee) return;

    if (incomeAmount <= 0) {
      showNotification({
        title: "Monto no válido",
        message: "Ingresa un monto mayor a 0",
        color: "yellow",
      });
      return;
    }

    try {
      if (editingIncome) {
        if (editingIncome._id) {
          await updateAdvance(editingIncome._id, {
            ...editingIncome,
            type: "income",
            amount: incomeAmount,
            description: incomeDescription,
            date: incomeDate || new Date(),
          });
        }
        showNotification({
          title: "Ingreso actualizado",
          message: "El ingreso ha sido actualizado exitosamente",
          color: "green",
        });
      } else {
        await createAdvance({
          employee: employee._id,
          type: "income",
          amount: incomeAmount,
          description: incomeDescription,
          date: incomeDate || new Date(),
        });
        showNotification({
          title: "Ingreso creado",
          message: "El ingreso ha sido registrado exitosamente",
          color: "green",
        });
      }
      setIncomeAmount(0);
      setIncomeDescription("");
      setIncomeDate(new Date());
      setEditingIncome(null);
      fetchIncomes();
    } catch (error) {
      console.error("Error al guardar ingreso", error);
      showNotification({
        title: "Error",
        message: "Error al guardar el ingreso",
        color: "red",
      });
    }
  };

  const handleEditIncome = (income: Advance) => {
    setIncomeAmount(income.amount);
    setIncomeDescription(income.description);
    setIncomeDate(new Date(income.date));
    setEditingIncome(income);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    try {
      await deleteAdvance(incomeId);
      showNotification({
        title: "Ingreso eliminado",
        message: "El ingreso ha sido eliminado correctamente",
        color: "green",
      });
      fetchIncomes();
    } catch (error) {
      console.error("Error al eliminar ingreso", error);
      showNotification({
        title: "Error",
        message: "Error al eliminar el ingreso",
        color: "red",
      });
    }
  };

  const clearForm = () => {
    setIncomeAmount(0);
    setIncomeDescription("");
    setIncomeDate(new Date());
    setEditingIncome(null);
  };

  return (
    <Modal
      opened={isOpen}
      onClose={() => {
        clearForm();
        onClose();
      }}
      title="Gestionar Ingresos"
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={700}>Nuevo ingreso</Text>
            {editingIncome && <Badge color="blue">Editando</Badge>}
          </Group>

          <Text size="xs" c="dimmed" mb="sm">
            Úsalo para registrar rápidamente lo que ganó el profesional en una
            cita que ya se realizó pero que no vas a registrar en el sistema.
            Suma directo a su nómina, igual que una cita atendida.
          </Text>

          <Stack gap="sm">
            <NumberInput
              label="Monto del ingreso"
              prefix="$ "
              thousandSeparator
              value={incomeAmount}
              onChange={(value) => setIncomeAmount(Number(value) || 0)}
              min={0}
            />

            <DateInput
              label="Fecha"
              value={incomeDate}
              onChange={setIncomeDate}
              locale="es"
            />

            <Textarea
              label="Descripción"
              placeholder="Ej: Corte a domicilio, no registrado en el sistema"
              value={incomeDescription}
              onChange={(e) => setIncomeDescription(e.currentTarget.value)}
            />

            <Group justify="flex-end" gap="sm" mt="sm">
              {editingIncome && (
                <Button variant="subtle" onClick={clearForm}>
                  Cancelar edición
                </Button>
              )}
              <Button onClick={handleCreateOrUpdateIncome}>
                {editingIncome ? "Actualizar ingreso" : "Crear ingreso"}
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={700}>Historial de ingresos</Text>
            <Text c="dimmed" size="sm">
              Total: {formatCurrency(incomes.reduce((a, b) => a + b.amount, 0), org?.currency || "COP")}
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
                {incomes.length > 0 ? (
                  incomes.map((income) => (
                    <Table.Tr key={income._id}>
                      <Table.Td>
                        {new Date(income.date).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>{formatCurrency(income.amount, org?.currency || "COP")}</Table.Td>
                      <Table.Td>{income.description || "Sin descripción"}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon
                            radius="lg"
                            color="blue"
                            onClick={() => handleEditIncome(income)}
                            aria-label="Editar ingreso"
                          >
                            <FaEdit />
                          </ActionIcon>
                          <ActionIcon
                            radius="lg"
                            color="red"
                            onClick={() =>
                              income._id &&
                              window.confirm("¿Eliminar ingreso?") &&
                              handleDeleteIncome(income._id)
                            }
                            aria-label="Eliminar ingreso"
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
                        No hay ingresos registrados
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

export default IncomeModal;
