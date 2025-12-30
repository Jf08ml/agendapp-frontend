import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Table,
  Text,
  Select,
  MultiSelect,
  ScrollArea,
  Flex,
  Loader,
  Container,
  ActionIcon,
  Badge,
  Accordion,
  Stack,
  Group,
  Tooltip,
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
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency } from "../../utils/formatCurrency";
import { startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/es";
import { registerService } from "../../services/clientService";
import { CheckIcon } from "@mantine/core";

dayjs.extend(localeData);
dayjs.locale("es");

const DailyCashbox: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Intervalo y fechas
  const [interval, setInterval] = useState<string>("daily");
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date()); // <= NUEVO
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Totales y filtros
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesSummary, setServicesSummary] = useState<
    Record<string, { count: number; total: number }>
  >({});

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  const org = useSelector(selectOrganization);

  // Recalcula rangos cuando cambia el intervalo
  useEffect(() => {
    calculateDates(interval, selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  // Recalcula rangos si cambias el día (solo aplica a "daily")
  useEffect(() => {
    if (interval === "daily") {
      calculateDates("daily", selectedDay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Trae citas cuando tengamos org y rango
  useEffect(() => {
    if (organizationId && startDate && endDate) {
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, startDate, endDate]);

  const calculateDates = (intervalValue: string, day?: Date | null) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (intervalValue) {
      case "daily": {
        const base = day ?? now;
        start = dayjs(base).startOf("day").toDate();
        end = dayjs(base).endOf("day").toDate();
        break;
      }
      case "weekly": {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = addDays(start, 6);
        // normalizamos a inicio/fin de día
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "biweekly": {
        const d = now.getDate();
        start =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), now.getMonth(), 16);
        end =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 15)
            : endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "monthly": {
        start = startOfMonth(now);
        end = endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "custom":
        // Se manejará con los DatePicker manuales
        break;
      default:
        break;
    }

    if (intervalValue !== "custom") {
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

      // Total general
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

      // Resumen por servicio
      const summary: Record<string, { count: number; total: number }> = {};

      sortedAppointments.forEach((appt) => {
        const serviceName = appt.service?.name || "Otro";
        const additional =
          appt.additionalItems?.reduce((s, item) => s + (item.price || 0), 0) ||
          0;
        const price =
          appt.customPrice || appt.totalPrice || appt.service?.price || 0;

        if (!summary[serviceName])
          summary[serviceName] = { count: 0, total: 0 };
        summary[serviceName].count += 1;
        summary[serviceName].total += price + additional;
      });

      setServicesSummary(summary);
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

  // Use shared formatCurrency util with organization's currency

  const formattedRangeLabel =
    startDate && endDate
      ? interval === "daily"
        ? dayjs(startDate).format("DD/MM/YYYY")
        : `${dayjs(startDate).format("DD/MM/YYYY")} – ${dayjs(endDate).format(
            "DD/MM/YYYY"
          )}`
      : "";

  return (
    <Container>
      <Title order={2} ta="center" mb="md">
        Caja Diaria
      </Title>

      <Card shadow="lg" radius="md" withBorder>
        <Stack
          p="md"
          styles={{
            root: {
              [`@media (min-width: 768px)`]: {
                flexDirection: "row",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              },
            },
          }}
        >
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
            onChange={(value) => {
              const v = value || "daily";
              setInterval(v);
              // si pasa a daily y no hay fecha elegida, usa hoy
              if (v === "daily" && !selectedDay) {
                setSelectedDay(new Date());
              }
            }}
            w="100%"
          />

          {interval === "daily" && (
            <DatePickerInput
              label="Día específico"
              locale="es"
              value={selectedDay}
              onChange={(d) => setSelectedDay(d)}
              clearable={false}
              w="100%"
            />
          )}

          <MultiSelect
            label="Filtrar por servicio"
            placeholder="Todos los servicios"
            data={Object.keys(servicesSummary).map((name) => ({
              value: name,
              label: name,
            }))}
            value={selectedServices}
            onChange={setSelectedServices}
            clearable
            searchable
            w="100%"
          />

          <div style={{ width: "100%", textAlign: "right" }}>
            <Text size="sm" c="dimmed">
              {formattedRangeLabel}
            </Text>
            <Text size="lg" fw={800}>
              Total Ingresos:{" "}
              <Badge variant="light" size="xl">
                {formatCurrency(totalIncome, org?.currency || "COP")}
              </Badge>
            </Text>
          </div>
        </Stack>

        {interval === "custom" && (
          <Flex justify="center" mt="md" gap="md" wrap="wrap">
            <DatePickerInput
              label="Inicio"
              locale="es"
              value={startDate}
              onChange={(d) =>
                setStartDate(d ? dayjs(d).startOf("day").toDate() : null)
              }
            />
            <DatePickerInput
              label="Fin"
              locale="es"
              value={endDate}
              onChange={(d) =>
                setEndDate(d ? dayjs(d).endOf("day").toDate() : null)
              }
            />
          </Flex>
        )}
      </Card>

      <Card shadow="sm" mt="md" withBorder>
        <Accordion variant="separated">
          <Accordion.Item value="resumen">
            <Accordion.Control>
              <Title order={4}>Resumen por servicio</Title>
            </Accordion.Control>
            <Accordion.Panel>
              {Object.entries(servicesSummary).length > 0 ? (
                Object.entries(servicesSummary).map(([serviceName, data]) => (
                    <Flex key={serviceName} justify="space-between" my="xs">
                    <Text>{serviceName}</Text>
                    <Text>
                      {data.count} cita(s) – {formatCurrency(data.total, org?.currency || "COP")}
                    </Text>
                  </Flex>
                ))
              ) : (
                <Text c="dimmed" ta="center">
                  No hay servicios en este intervalo.
                </Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Card>

      <Card shadow="lg" radius="md" withBorder my="md">
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
                  appointments
                    .filter((appointment) => {
                      if (selectedServices.length === 0) return true;
                      const name = appointment.service?.name || "Otro";
                      return selectedServices.includes(name);
                    })
                    .map((appointment) => {
                      // ---- CÁLCULO UNA SOLA VEZ POR FILA ----
                      const basePrice = appointment.service?.price || 0;

                      const additionalTotal =
                        appointment.additionalItems?.reduce(
                          (sum, item) => sum + (item?.price || 0),
                          0
                        ) || 0;

                      const usedPrice =
                        typeof appointment.customPrice === "number"
                          ? appointment.customPrice
                          : typeof appointment.totalPrice === "number"
                          ? appointment.totalPrice
                          : basePrice;

                      const total = usedPrice + additionalTotal;

                      const isCustom =
                        typeof appointment.customPrice === "number" &&
                        appointment.customPrice !== basePrice;
                      // ----------------------------------------

                      return (
                        <Table.Tr
                          key={appointment._id}
                          style={getRowStyles(appointment.status)}
                        >
                          <Table.Td>
                            {new Date(
                              appointment.startDate
                            ).toLocaleDateString()}
                          </Table.Td>

                          <Table.Td>{appointment.client?.name || "—"}</Table.Td>

                          <Table.Td>
                            {appointment.service?.name || "—"}
                          </Table.Td>

                          <Table.Td>
                            <Group gap="xs" wrap="nowrap">
                              <Text>{formatCurrency(total, org?.currency || "COP")}</Text>

                              {isCustom && (
                                <Tooltip
                                  label={
                                    <>
                                      <div>
                                        Base: {formatCurrency(basePrice, org?.currency || "COP")}
                                      </div>
                                      <div>
                                        Custom:{" "}
                                        {formatCurrency(
                                          appointment.customPrice!, org?.currency || "COP"
                                        )}
                                      </div>
                                      {additionalTotal > 0 && (
                                        <div>
                                          Adicionales:{" "}
                                          {formatCurrency(additionalTotal, org?.currency || "COP")}
                                        </div>
                                      )}
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Total: {formatCurrency(total, org?.currency || "COP")}
                                      </div>
                                    </>
                                  }
                                  withArrow
                                  position="top"
                                >
                                  <Badge
                                    size="sm"
                                    color="grape"
                                    variant="light"
                                  >
                                    Custom
                                  </Badge>
                                </Tooltip>
                              )}
                            </Group>

                            {isCustom && (
                              <Text size="xs" c="dimmed">
                                Base:{" "}
                                <Text span td="line-through">
                                  {formatCurrency(basePrice, org?.currency || "COP")}
                                </Text>{" "}
                                → {" "}
                                <Text span fw={600}>
                                  {formatCurrency(appointment.customPrice!, org?.currency || "COP")}
                                </Text>
                                {additionalTotal > 0 && (
                                  <>
                                    {" "}
                                    + Adic.: {formatCurrency(additionalTotal, org?.currency || "COP")}
                                  </>
                                )}
                              </Text>
                            )}
                          </Table.Td>

                          <Table.Td align="center">
                            {appointment.status !== "confirmed" && (
                              <ActionIcon
                                color="green"
                                onClick={() =>
                                  handleConfirmAppointment(
                                    appointment._id,
                                    appointment.client?._id || ""
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
