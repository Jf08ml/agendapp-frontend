/* eslint-disable react-hooks/exhaustive-deps */
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
  Badge,
  Avatar,
  Paper,
  Divider,
  ThemeIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  Appointment,
  getAppointmentsByEmployee,
} from "../../services/appointmentService";
import { Advance, getAdvancesByEmployee } from "../../services/advanceService";
import {
  Employee,
  getEmployeeById,
} from "../../services/employeeService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency as formatCurrencyUtil } from "../../utils/formatCurrency";
import { addDays, startOfWeek, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import {
  IconCalendarEvent,
  IconCurrencyDollar,
  IconArrowDown,
  IconWallet,
  IconUser,
  IconPercentage,
} from "@tabler/icons-react";

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
  const [employeeData, setEmployeeData] = useState<Employee | undefined>(undefined);

  const userId = useSelector((state: RootState) => state.auth.userId);
  const org = useSelector(selectOrganization);
  const formatCurrency = (value: number) =>
    formatCurrencyUtil(value, org?.currency || "COP");

  useEffect(() => {
    if (userId) {
      getEmployeeById(userId).then((data) => setEmployeeData(data));
    }
  }, [userId]);

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

  // Recalculate payroll whenever any of its inputs change
  useEffect(() => {
    const confirmedAppointments = appointments.filter(
      (a) => a.status === "confirmed"
    );
    const totalRevenue = confirmedAppointments.reduce(
      (total, appointment) => total + (appointment.service?.price || 0),
      0
    );

    const commissionType = employeeData?.commissionType ?? "percentage";
    const commissionValue = employeeData?.commissionValue ?? 0;

    const totalEarnings =
      commissionType === "percentage"
        ? (totalRevenue * commissionValue) / 100
        : confirmedAppointments.length * commissionValue;

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
  }, [appointments, advances, employeeData]);

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
      const filteredAppointments = employeeAppointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.startDate);
        return (
          appointmentDate >= (startDate as Date) &&
          appointmentDate <= (endDate as Date)
        );
      });
      setAppointments(filteredAppointments);
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
    } catch (error) {
      console.error("Error al cargar avances del empleado", error);
    } finally {
      setLoadingAdvances(false);
    }
  };


  const getStatusStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "Confirmado", color: "green" as const, bg: "#d4edda", text: "#28a745" };
      case "pending":
        return { label: "Pendiente", color: "yellow" as const, bg: "#fff3cd", text: "#856404" };
      case "cancelled":
        return { label: "Cancelado", color: "red" as const, bg: "#f8d7da", text: "#dc3545" };
      default:
        return { label: "Sin estado", color: "blue" as const, bg: "#e2e3e5", text: "#007bff" };
    }
  };

  const commissionLabel =
    employeeData?.commissionType === "fixed"
      ? `${formatCurrency(employeeData?.commissionValue ?? 0)} por cita`
      : `${employeeData?.commissionValue ?? 0}% de comisión`;

  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

  return (
    <Container size="md" pb="xl">
      {/* Header del empleado */}
      <Card shadow="sm" radius="md" withBorder mb="md">
        <Flex align="center" gap="md">
          <Avatar size={56} radius="xl" color="blue">
            {employeeData?.names?.charAt(0)?.toUpperCase() ?? <IconUser size={28} />}
          </Avatar>
          <Box>
            <Title order={3} lh={1.2}>
              {employeeData?.names ?? "Cargando..."}
            </Title>
            {employeeData && (
              <Group gap={6} mt={4}>
                <ThemeIcon size="xs" variant="light" color="blue" radius="xl">
                  <IconPercentage size={10} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  {commissionLabel}
                </Text>
              </Group>
            )}
          </Box>
        </Flex>
      </Card>

      {/* Selector de intervalo */}
      <Card shadow="sm" radius="md" withBorder mb="md">
        <Stack gap="xs">
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
          {interval === "custom" ? (
            <Group grow>
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
          ) : (
            <Group gap="xl">
              <Text size="sm">
                <Text span fw={500} c="dimmed">Inicio: </Text>
                {startDate?.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
              </Text>
              <Text size="sm">
                <Text span fw={500} c="dimmed">Fin: </Text>
                {endDate?.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
              </Text>
            </Group>
          )}
        </Stack>
      </Card>

      {/* Resumen de nómina */}
      <Title order={5} c="dimmed" mb="xs" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
        Resumen de nómina
      </Title>
      <Flex gap="sm" mb="md" wrap="wrap">
        <Paper flex={1} shadow="xs" radius="md" withBorder p="md" style={{ minWidth: 130 }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconCalendarEvent size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" fw={500}>Citas confirmadas</Text>
              <Text fw={700} size="lg" lh={1.2}>{confirmedCount}</Text>
              <Text size="xs" c="dimmed">de {payroll?.totalAppointments ?? 0} en período</Text>
            </Box>
          </Group>
        </Paper>

        <Paper flex={1} shadow="xs" radius="md" withBorder p="md" style={{ minWidth: 130 }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
              <IconCurrencyDollar size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" fw={500}>Total ganado</Text>
              <Text fw={700} size="lg" lh={1.2}>{formatCurrency(payroll?.totalEarnings ?? 0)}</Text>
            </Box>
          </Group>
        </Paper>

        <Paper flex={1} shadow="xs" radius="md" withBorder p="md" style={{ minWidth: 130 }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md" color="red" variant="light">
              <IconArrowDown size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed" fw={500}>Avances</Text>
              <Text fw={700} size="lg" lh={1.2}>{formatCurrency(payroll?.totalAdvances ?? 0)}</Text>
            </Box>
          </Group>
        </Paper>

        <Paper flex={1} shadow="xs" radius="md" p="md" style={{ minWidth: 130, background: "var(--mantine-color-blue-6)" }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size="lg" radius="md" color="white" variant="light">
              <IconWallet size={18} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="white" fw={500} style={{ opacity: 0.85 }}>A recibir</Text>
              <Text fw={700} size="lg" lh={1.2} c="white">
                {formatCurrency(payroll?.finalEarnings ?? 0)}
              </Text>
            </Box>
          </Group>
        </Paper>
      </Flex>

      {/* Tabla de citas */}
      <Card shadow="sm" radius="md" withBorder mb="md">
        <Flex justify="space-between" align="center" mb="sm" wrap="wrap" gap="xs">
          <Title order={5}>Citas del período</Title>
          <Group gap={6}>
            {["confirmed", "pending", "cancelled"].map((status) => (
              <Badge
                key={status}
                color={getStatusStyles(status).color}
                variant="light"
                size="sm"
              >
                {getStatusStyles(status).label}
              </Badge>
            ))}
          </Group>
        </Flex>

        <Divider mb="sm" />

        <ScrollArea style={{ height: 220 }} scrollbarSize={6}>
          {loadingAppointments ? (
            <Flex justify="center" align="center" h={180} direction="column" gap="sm">
              <Loader size={32} />
              <Text size="sm" c="dimmed">Cargando citas...</Text>
            </Flex>
          ) : (
            <Table highlightOnHover verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Estado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <Table.Tr key={appointment._id}>
                      <Table.Td>
                        {new Date(appointment.startDate).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </Table.Td>
                      <Table.Td>{appointment.client?.name}</Table.Td>
                      <Table.Td>{appointment.service?.name}</Table.Td>
                      <Table.Td>{formatCurrency(appointment.service?.price || 0)}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={getStatusStyles(appointment.status).color}
                          variant="light"
                          size="sm"
                        >
                          {getStatusStyles(appointment.status).label}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="md" size="sm">
                        No hay citas en este período
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </ScrollArea>
      </Card>

      {/* Tabla de avances */}
      <Card shadow="sm" radius="md" withBorder>
        <Title order={5} mb="sm">Avances y descuentos</Title>
        <Divider mb="sm" />
        <ScrollArea style={{ height: 160 }} scrollbarSize={6}>
          {loadingAdvances ? (
            <Flex justify="center" align="center" h={120} direction="column" gap="sm">
              <Loader size={32} />
              <Text size="sm" c="dimmed">Cargando avances...</Text>
            </Flex>
          ) : (
            <Table highlightOnHover verticalSpacing="xs" fz="sm">
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
                        {new Date(advance.date).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </Table.Td>
                      <Table.Td>
                        <Text c="red" fw={500}>
                          -{formatCurrency(advance.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>{advance.description || "Sin descripción"}</Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text ta="center" c="dimmed" py="md" size="sm">
                        No hay avances en este período
                      </Text>
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
