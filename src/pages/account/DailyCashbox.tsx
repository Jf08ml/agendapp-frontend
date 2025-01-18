import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Table,
  Text,
  Select,
  ScrollArea,
  Flex,
  Loader,
  Container,
  ActionIcon,
  Badge,
  CheckIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { openConfirmModal } from "@mantine/modals";
import {
  Appointment,
  getAppointmentsByOrganizationId,
  updateAppointment,
} from "../../services/appointmentService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/es";
import { registerService } from "../../services/clientService";

dayjs.extend(localeData);
dayjs.locale("es");

const DailyCashbox: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<string>("daily");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [totalIncome, setTotalIncome] = useState<number>(0);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

  useEffect(() => {
    calculateDates(interval);
  }, [interval]);

  useEffect(() => {
    if (organizationId && startDate && endDate) {
      fetchAppointments();
    }
  }, [organizationId, startDate, endDate]);

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
      case "custom":
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
    if (!organizationId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await getAppointmentsByOrganizationId(
        organizationId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      const sortedAppointments = response.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setAppointments(sortedAppointments);

      const total = sortedAppointments.reduce((sum, appointment) => {
        const additionalTotal =
          appointment.additionalItems?.reduce(
            (acc, item) => acc + (item.price || 0),
            0
          ) || 0;

        const usedPrice =
          appointment.customPrice ||
          appointment.totalPrice ||
          appointment.service?.price ||
          0;

        return sum + usedPrice + additionalTotal;
      }, 0);

      setTotalIncome(total);
    } catch (error) {
      console.error("Error al obtener citas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointment = (
    appointmentId: string,
    clientId: string
  ) => {
    openConfirmModal({
      title: "Confirmar cita",
      children: <p>¿Estás seguro de que deseas confirmar esta cita?</p>,
      centered: true,
      labels: { confirm: "Confirmar", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        try {
          await updateAppointment(appointmentId, { status: "confirmed" });
          await registerService(clientId);
          showNotification({
            title: "Éxito",
            message: "Cita confirmada y servicio registrado exitosamente",
            color: "green",
            autoClose: 3000,
            position: "top-right",
          });
          fetchAppointments();
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudo confirmar la cita.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        }
      },
    });
  };

  const getRowStyles = (status: string) => {
    switch (status) {
      case "confirmed":
        return { backgroundColor: "#d4edda", color: "#155724" };
      case "pending":
        return { backgroundColor: "#fff3cd", color: "#856404" };
      case "cancelled":
        return { backgroundColor: "#f8d7da", color: "#721c24" };
      default:
        return { backgroundColor: "#f0f4f8", color: "#333" };
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value);

  return (
    <Container>
      <Title order={2} ta="center" mb="md">
        Caja Diaria
      </Title>

      <Card shadow="lg" radius="md" withBorder>
        <Flex justify="space-between" align="center">
          <Select
            label="Intervalo de tiempo"
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
          <Text size="lg" fw={800} ta="right">
            Total Ingresos:{" "}
            <Badge variant="light" size="xl">
              {formatCurrency(totalIncome)}
            </Badge>
          </Text>
        </Flex>
        {interval === "custom" && (
          <Flex justify="center" mt="md">
            <DatePickerInput
              label="Inicio"
              locale="es"
              value={startDate}
              onChange={setStartDate}
            />
            <DatePickerInput
              label="Fin"
              locale="es"
              value={endDate}
              onChange={setEndDate}
            />
          </Flex>
        )}
      </Card>

      <Card shadow="lg" radius="md" withBorder my="xl">
        <Title order={3} mb="sm">
          Citas Registradas
        </Title>
        <ScrollArea style={{ height: "auto" }} scrollbarSize={10}>
          {loading ? (
            <Flex justify="center" align="center" direction="column">
              <Loader size={40} />
              <Text mt="xl">Cargando citas...</Text>
            </Flex>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {appointments.length > 0 ? (
                  appointments.map((appointment) => {
                    const additionalTotal =
                      appointment.additionalItems?.reduce(
                        (sum, item) => sum + (item.price || 0),
                        0
                      ) || 0;

                    const usedPrice =
                      appointment.customPrice ||
                      appointment.totalPrice ||
                      appointment.service?.price ||
                      0;

                    const total = usedPrice + additionalTotal;

                    return (
                      <Table.Tr
                        key={appointment._id}
                        style={getRowStyles(appointment.status)}
                      >
                        <Table.Td>
                          {new Date(appointment.startDate).toLocaleDateString()}
                        </Table.Td>
                        <Table.Td>{appointment.client?.name}</Table.Td>
                        <Table.Td>{appointment.service?.name}</Table.Td>
                        <Table.Td>{formatCurrency(total)}</Table.Td>

                        <Table.Td align="center">
                          {appointment.status !== "confirmed" && (
                            <ActionIcon
                              color="green"
                              onClick={() =>
                                handleConfirmAppointment(
                                  appointment._id,
                                  appointment.client._id
                                )
                              }
                            >
                              <CheckIcon />
                            </ActionIcon>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
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
    </Container>
  );
};

export default DailyCashbox;
