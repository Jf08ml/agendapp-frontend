/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Text,
  Title,
  Table,
  ScrollArea,
  Loader,
  Select,
  Group,
  Modal,
  Tabs,
  Badge,
  NumberInput,
  Stack,
  Grid,
  Paper,
  ThemeIcon,
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
import EmployeeScheduleSection from "./EmployeeScheduleSection";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../../../features/organization/sliceOrganization";
import { formatCurrency as formatCurrencyUtil } from "../../../../utils/formatCurrency";
import { BiDollar, BiReceipt, BiMoney, BiTrendingUp } from "react-icons/bi";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

interface PayrollSummary {
  totalAppointments: number;
  totalRevenue: number; // Total facturado
  commissionPercentage: number; // % de comisión
  commissionAmount: number; // Monto de comisión calculado
  totalAdvances: number;
  finalEarnings: number; // Comisión - Avances
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
  const [customCommission, setCustomCommission] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    if (appointments.length > 0 || advances.length > 0) {
      calculatePayroll(appointments, advances);
    }
  }, [customCommission, appointments, advances]);

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
    const totalRevenue = appointments
      .filter((a) => a.status === "confirmed") // Solo confirmadas cuentan para comisión
      .reduce((total, appointment) => total + (appointment.service?.price || 0), 0);

    const commissionPercentage = customCommission ?? employee?.commissionPercentage ?? 0;
    const commissionAmount = (totalRevenue * commissionPercentage) / 100;

    const totalAdvances = advances.reduce(
      (total, advance) => total + advance.amount,
      0
    );

    setPayroll({
      totalAppointments: appointments.length,
      totalRevenue,
      commissionPercentage,
      commissionAmount,
      totalAdvances,
      finalEarnings: commissionAmount - totalAdvances,
    });
  };

  const org = useSelector(selectOrganization);
  const formatCurrency = (value: number) =>
    formatCurrencyUtil(value, org?.currency || "COP");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge color="green" variant="light">Confirmado</Badge>;
      case "pending":
        return <Badge color="yellow" variant="light">Pendiente</Badge>;
      case "cancelled":
        return <Badge color="red" variant="light">Cancelado</Badge>;
      default:
        return <Badge color="gray" variant="light">Sin estado</Badge>;
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={`Detalles - ${employee?.names || "Empleado"}`}
      size="xl"
      centered
    >
      <Box>
        <Tabs defaultValue="payroll">
          <Tabs.List>
            <Tabs.Tab value="payroll">Nómina y Pagos</Tabs.Tab>
            <Tabs.Tab value="schedule">Horario de Disponibilidad</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="payroll" pt="md">
            <Stack gap="md">
              {/* Filtros y período */}
              <Card shadow="sm" radius="md" p="md" withBorder>
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
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
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <NumberInput
                      label="% Comisión personalizado"
                      description="Deja vacío para usar el del empleado"
                      placeholder={`Por defecto: ${employee?.commissionPercentage ?? 0}%`}
                      min={0}
                      max={100}
                      value={customCommission}
                      onChange={(val) => setCustomCommission(val as number | undefined)}
                      rightSection={<Text size="xs" c="dimmed">%</Text>}
                    />
                  </Grid.Col>
                </Grid>

                {interval === "custom" ? (
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
                ) : (
                  <Group mt="sm" justify="center">
                    <Text size="sm" c="dimmed">
                      <strong>Período:</strong> {startDate?.toLocaleDateString() || "N/A"} -{" "}
                      {endDate?.toLocaleDateString() || "N/A"}
                    </Text>
                  </Group>
                )}
              </Card>

              {/* Resumen de nómina con métricas */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon color="blue" variant="light" size="lg">
                        <BiReceipt size={20} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Total Facturado
                        </Text>
                        <Text size="xl" fw={700}>
                          {formatCurrency(payroll?.totalRevenue || 0)}
                        </Text>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {payroll?.totalAppointments || 0} citas confirmadas
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon color="teal" variant="light" size="lg">
                        <BiTrendingUp size={20} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Comisión ({payroll?.commissionPercentage || 0}%)
                        </Text>
                        <Text size="xl" fw={700} c="teal">
                          {formatCurrency(payroll?.commissionAmount || 0)}
                        </Text>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Ganancia base
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon color="orange" variant="light" size="lg">
                        <BiMoney size={20} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Avances
                        </Text>
                        <Text size="xl" fw={700} c="orange">
                          -{formatCurrency(payroll?.totalAdvances || 0)}
                        </Text>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Adelantos solicitados
                    </Text>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper withBorder p="md" radius="md" bg="blue.0">
                    <Group gap="xs" mb="xs">
                      <ThemeIcon color="blue" size="lg">
                        <BiDollar size={20} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Total a Pagar
                        </Text>
                        <Text size="xl" fw={700} c="blue">
                          {formatCurrency(payroll?.finalEarnings || 0)}
                        </Text>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Neto después de avances
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              {/* Tabla de citas */}
              <Card shadow="sm" radius="md" p="md" withBorder>
                <Title order={4} mb="md">
                  Citas del Período
                </Title>
                <ScrollArea style={{ height: "300px" }}>
                  {loadingAppointments ? (
                    <Box ta="center" py="xl">
                      <Loader />
                    </Box>
                  ) : appointments.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No hay citas en este período
                    </Text>
                  ) : (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fecha</Table.Th>
                          <Table.Th>Cliente</Table.Th>
                          <Table.Th>Servicio</Table.Th>
                          <Table.Th>Estado</Table.Th>
                          <Table.Th>Precio</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {appointments.map((appointment) => (
                          <Table.Tr key={appointment._id}>
                            <Table.Td>
                              {new Date(appointment.startDate).toLocaleDateString()}
                            </Table.Td>
                            <Table.Td>{appointment.client?.name || "N/A"}</Table.Td>
                            <Table.Td>{appointment.service?.name || "N/A"}</Table.Td>
                            <Table.Td>{getStatusBadge(appointment.status)}</Table.Td>
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

              {/* Tabla de avances */}
              <Card shadow="sm" radius="md" p="md" withBorder>
                <Title order={4} mb="md">
                  Avances del Período
                </Title>
                <ScrollArea style={{ height: "200px" }}>
                  {loadingAdvances ? (
                    <Box ta="center" py="xl">
                      <Loader />
                    </Box>
                  ) : advances.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No hay avances en este período
                    </Text>
                  ) : (
                    <Table striped highlightOnHover>
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
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="schedule" pt="md">
            {employee && (
              <EmployeeScheduleSection
                employeeId={employee._id}
                employeeName={employee.names}
              />
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Modal>
  );
};

export default EmployeeDetailsModal;
