/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Text,
  Title,
  Flex,
  Table,
  ScrollArea,
  Loader,
  Select,
  Divider,
  Group,
  Modal,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  Appointment,
  getAppointmentsByEmployee,
} from "../../../../services/appointmentService";
import {
  Advance,
  getAdvancesByEmployee,
} from "../../../../services/advanceService";
import { Employee } from "../../../../services/employeeService";
import dayjs from "dayjs";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

interface PayrollSummary {
  totalAppointments: number;
  totalEarnings: number;
  totalAdvances: number;
  finalEarnings: number;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [interval, setInterval] = useState<string>("daily");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (employee && isOpen) {
      calculateDates(interval);
    }
  }, [employee, isOpen, interval]);

  useEffect(() => {
    if (employee && startDate && endDate) {
      fetchAppointments();
      fetchAdvances();
    }
  }, [employee, startDate, endDate]);

  const calculateDates = (interval: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (interval) {
      case "daily":
        start = dayjs(now).startOf("day").toDate();
        end = dayjs(now).endOf("day").toDate();
        break;
      case "weekly":
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay() + 1
        ); // Lunes
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "biweekly":
        start =
          now.getDate() <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), now.getMonth(), 16);
        end =
          now.getDate() <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 15)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "custom":
        // Fechas personalizadas
        break;
      default:
        break;
    }

    if (interval !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  };

  const fetchAppointments = async () => {
    if (!employee || !startDate || !endDate) return;

    setLoadingAppointments(true);
    try {
      const employeeAppointments = await getAppointmentsByEmployee(
        employee._id
      );
      const filteredAppointments = employeeAppointments.filter(
        (appointment) =>
          new Date(appointment.startDate) >= startDate &&
          new Date(appointment.startDate) <= endDate
      );

      setAppointments(filteredAppointments);
      calculatePayroll(filteredAppointments, advances);
    } catch (error) {
      console.error("Error al cargar citas del empleado", error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchAdvances = async () => {
    if (!employee || !startDate || !endDate) return;

    setLoadingAdvances(true);
    try {
      const employeeAdvances = await getAdvancesByEmployee(employee._id);
      const filteredAdvances = employeeAdvances.filter(
        (advance) =>
          new Date(advance.date) >= startDate &&
          new Date(advance.date) <= endDate
      );

      setAdvances(filteredAdvances);
      calculatePayroll(appointments, filteredAdvances);
    } catch (error) {
      console.error("Error al cargar avances del empleado", error);
    } finally {
      setLoadingAdvances(false);
    }
  };

  const calculatePayroll = (
    appointments: Appointment[],
    advances: Advance[]
  ) => {
    const totalEarnings = appointments.reduce(
      (total, appointment) => total + (appointment.service?.price || 0),
      0
    );
    const totalAdvances = advances.reduce(
      (total, advance) => total + advance.amount,
      0
    );
    setPayroll({
      totalAppointments: appointments.length,
      totalEarnings,
      totalAdvances,
      finalEarnings: totalEarnings - totalAdvances,
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "Confirmado", color: "#28a745", bg: "#d4edda" };
      case "pending":
        return { label: "Pendiente", color: "#ffc107", bg: "#fff3cd" };
      case "cancelled":
        return { label: "Cancelado", color: "#dc3545", bg: "#f8d7da" };
      default:
        return { label: "Sin estado", color: "#007bff", bg: "#e2e3e5" };
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Detalles del Empleado"
      size="lg"
      centered
    >
      <Box>
        <Card shadow="lg" radius="md" p="md" withBorder>
          <Flex justify="space-between" align="center">
            <Box>
              <Title order={3}>{employee?.names}</Title>
              <Text c="dimmed">{employee?.position}</Text>
            </Box>
            <Select
              label="Intervalo de pago"
              placeholder="Selecciona intervalo"
              data={[
                { value: "daily", label: "Diario" },
                { value: "weekly", label: "Semanal" },
                { value: "biweekly", label: "Quincenal" },
                { value: "monthly", label: "Mensual" },
                { value: "custom", label: "Personalizado" },
              ]}
              value={interval}
              onChange={(value) => setInterval(value || "daily")}
            />
          </Flex>
          {interval === "custom" && (
            <Group mt="md">
              <DatePickerInput
                label="Fecha de inicio"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerInput
                label="Fecha de fin"
                value={endDate}
                onChange={setEndDate}
              />
            </Group>
          )}
          {interval !== "custom" && (
            <Group p="sm" justify="center">
              <Text>
                <strong>Fecha de inicio:</strong>{" "}
                {startDate?.toLocaleDateString() || "N/A"}
              </Text>
              <Text>
                <strong>Fecha de fin:</strong>{" "}
                {endDate?.toLocaleDateString() || "N/A"}
              </Text>
            </Group>
          )}
        </Card>

        <Divider my="lg" />

        <Card shadow="lg" radius="md" p="md" withBorder>
          <Title order={4}>Resumen de Nómina</Title>
          <Text>
            Total Ganado: {formatCurrency(payroll?.totalEarnings || 0)}
          </Text>
          <Text>
            Total Restado (Avances):{" "}
            {formatCurrency(payroll?.totalAdvances || 0)}
          </Text>
          <Text c="blue" fw={500}>
            Total a Recibir: {formatCurrency(payroll?.finalEarnings || 0)}
          </Text>
        </Card>

        <Divider my="lg" />

        <Card shadow="lg" radius="md" p="md" withBorder>
          <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
            <Title order={4} style={{ flexShrink: 0 }}>
              Citas Agendadas
            </Title>
            <Group
              mb="xs"
              style={{ flexWrap: "wrap", justifyContent: "flex-start" }}
            >
              {["confirmed", "pending", "cancelled"].map((status) => (
                <Box
                  key={status}
                  style={{
                    backgroundColor: getStatusStyles(status).bg,
                    paddingInline: "2px",
                    borderRadius: "8px",
                    flexShrink: 0,
                  }}
                >
                  <Text c={getStatusStyles(status).color}>
                    {getStatusStyles(status).label}
                  </Text>
                </Box>
              ))}
            </Group>
          </Flex>
          <ScrollArea style={{ height: "200px" }} scrollbarSize={10}>
            {loadingAppointments ? (
              <Loader />
            ) : (
              <Table stickyHeader stickyHeaderOffset={0}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Servicio</Table.Th>
                    <Table.Th>Precio</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {appointments.map((appointment) => (
                    <Table.Tr
                      key={appointment._id}
                      style={{
                        backgroundColor: getStatusStyles(appointment.status).bg,
                        color: getStatusStyles(appointment.status).color,
                      }}
                    >
                      <Table.Td>
                        {new Date(appointment.startDate).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>{appointment.client?.name}</Table.Td>
                      <Table.Td>{appointment.service?.name}</Table.Td>
                      <Table.Td>
                        {formatCurrency(appointment.service?.price || 0)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </ScrollArea>
        </Card>

        <Divider my="lg" />

        <Card shadow="lg" radius="md" p="md" withBorder>
          <Title order={4}>Avances</Title>
          <ScrollArea style={{ height: "150px" }} scrollbarSize={10}>
            {loadingAdvances ? (
              <Loader />
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Monto</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {advances.map((advance) => (
                    <Table.Tr key={advance._id}>
                      <Table.Td>
                        {new Date(advance.date).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>{formatCurrency(advance.amount)}</Table.Td>
                      <Table.Td>
                        {advance.description || "Sin descripción"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </ScrollArea>
        </Card>
      </Box>
    </Modal>
  );
};

export default EmployeeDetailsModal;
