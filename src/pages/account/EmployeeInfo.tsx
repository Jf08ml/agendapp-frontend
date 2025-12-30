import React, { useEffect, useState } from "react";
import {
  Card,
  Box,
  Table,
  Text,
  ScrollArea,
  Title,
  Loader,
  Flex,
  Stack,
  Select,
  Group,
  Container,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  Appointment,
  getAppointmentsByEmployee,
} from "../../services/appointmentService";
import { Advance, getAdvancesByEmployee } from "../../services/advanceService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency as formatCurrencyUtil } from "../../utils/formatCurrency";
import { addDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";

interface PayrollSummary {
  totalAppointments: number;
  totalEarnings: number;
  totalAdvances: number;
  finalEarnings: number;
}

const EmployeeInfo: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [interval, setInterval] = useState<string>("daily");

  const userId = useSelector((state: RootState) => state.auth.userId);

  useEffect(() => {
    if (userId && interval !== "custom") {
      calculateDates(interval);
    }
  }, [interval, userId]);

  useEffect(() => {
    if (userId && startDate && endDate) {
      fetchAppointments();
      fetchAdvances();
    }
  }, [userId, startDate, endDate]);

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
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = addDays(start, 6);
        break;
      case "biweekly": {
        const day = now.getDate();
        start =
          day <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), now.getMonth(), 16);
        end =
          day <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 15)
            : endOfMonth(now);
        break;
      }
      case "monthly":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const employeeAppointments = await getAppointmentsByEmployee(userId!);
      const filteredAppointments = employeeAppointments.filter(
        (appointment) => {
          const appointmentDate = new Date(appointment.startDate);
          return (
            appointmentDate >= (startDate as Date) &&
            appointmentDate <= (endDate as Date)
          );
        }
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
    setLoadingAdvances(true);
    try {
      const employeeAdvances = await getAdvancesByEmployee(userId!);
      const filteredAdvances = employeeAdvances.filter((advance) => {
        const advanceDate = new Date(advance.date);
        return (
          advanceDate >= (startDate as Date) && advanceDate <= (endDate as Date)
        );
      });

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

  const org = useSelector(selectOrganization);
  const formatCurrency = (value: number) => formatCurrencyUtil(value, org?.currency || "COP");

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
    <Container>
      <Title order={2} ta="center" mb="md">
        Detalles del Empleado
      </Title>

      <Card shadow="lg" radius="md" withBorder>
        <Flex justify="space-between" align="center">
          <Stack m={0}>
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
            {interval === "custom" && (
              <Group p="sm">
                <DatePickerInput
                  label="Fecha de inicio"
                  placeholder="Seleccionar fecha"
                  value={startDate}
                  onChange={setStartDate}
                />
                <DatePickerInput
                  label="Fecha de fin"
                  placeholder="Seleccionar fecha"
                  value={endDate}
                  onChange={setEndDate}
                />
              </Group>
            )}
            {interval !== "custom" && (
              <Group  p="sm">
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
          </Stack>
          <Box style={{ textAlign: "right" }}>
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
          </Box>
        </Flex>
      </Card>

      <Card shadow="lg" radius="md" withBorder mt="xl">
        <Flex
          mt="md"
          justify="space-between"
          align="center"
          wrap="wrap"
          gap="sm"
        >
          <Title order={3} c="dark" style={{ flexShrink: 0 }}>
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
            <Flex justify="center" align="center" direction="column">
              <Loader size={40} />
              <Text mt="xl">Cargando citas...</Text>
            </Flex>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Precio</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <Table.Tr
                      key={appointment._id}
                      style={{
                        backgroundColor: getStatusStyles(appointment.status).bg,
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
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center">No hay citas registradas</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </ScrollArea>
      </Card>

      <Card shadow="lg" radius="md" withBorder my="xl">
        <Title order={3} c="dark">
          Avances / Descuentos
        </Title>
        <ScrollArea style={{ height: "150px" }} scrollbarSize={10}>
          {loadingAdvances ? (
            <Flex justify="center" align="center" direction="column">
              <Loader size={40} />
              <Text mt="xl">Cargando avances y descuentos...</Text>
            </Flex>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Monto</Table.Th>
                  <Table.Th>Descripción</Table.Th>
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
                      <Table.Td>
                        {advance.description || "Sin descripción"}
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text ta="center">No hay avances registrados</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </ScrollArea>
      </Card>
    </Container>
  );
};

export default EmployeeInfo;
